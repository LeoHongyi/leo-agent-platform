from datetime import datetime

from sqlalchemy import delete, func, insert, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from src.core.base_repository import BaseRepository
from src.modules.agent.model import (
    Agent,
    AgentInvocationLog,
    AgentVersion,
    agent_knowledge_bases,
    agent_tools,
)


class AgentRepository(BaseRepository[Agent]):
    """搜索字段：按名称或描述搜索"""
    SEARCH_FIELDS = ["name", "description"]

    def __init__(self, db: AsyncSession):
        super().__init__(Agent, db)

    async def get_by_name(self, name: str) -> Agent | None:
        stmt = select(Agent).where(Agent.name == name)
        result = await self.db.execute(stmt)
        return result.scalar_one_or_none()

    async def get_by_id_for_update(self, agent_id: int) -> Agent | None:
        """锁定 Agent，串行化更新、发布、回滚和状态流转。"""
        stmt = (
            select(Agent)
            .where(Agent.id == agent_id)
            .with_for_update()
        )
        result = await self.db.execute(stmt)
        return result.scalar_one_or_none()

    async def get_by_status(self, status: str) -> list[Agent]:
        stmt = select(Agent).where(Agent.status == status)
        result = await self.db.execute(stmt)
        return result.scalars().all()

    async def search_page(
        self, offset: int, limit: int, keyword: str | None
    ) -> tuple[list[Agent], int]:
        """分页 + 搜索"""
        return await self.get_page(
            offset=offset,
            limit=limit,
            keyword=keyword,
            search_fields=self.SEARCH_FIELDS,
        )

    async def replace_knowledge_bases(
        self,
        *,
        agent_id: int,
        knowledge_base_ids: list[int],
    ) -> None:
        await self.db.execute(
            delete(agent_knowledge_bases).where(
                agent_knowledge_bases.c.agent_id == agent_id
            )
        )
        if knowledge_base_ids:
            await self.db.execute(
                insert(agent_knowledge_bases),
                [
                    {
                        "agent_id": agent_id,
                        "knowledge_base_id": knowledge_base_id,
                    }
                    for knowledge_base_id in knowledge_base_ids
                ],
            )

    async def replace_tools(
        self,
        *,
        agent_id: int,
        tool_ids: list[int],
    ) -> None:
        await self.db.execute(
            delete(agent_tools).where(agent_tools.c.agent_id == agent_id)
        )
        if tool_ids:
            await self.db.execute(
                insert(agent_tools),
                [
                    {"agent_id": agent_id, "tool_id": tool_id}
                    for tool_id in tool_ids
                ],
            )


class AgentVersionRepository(BaseRepository[AgentVersion]):
    def __init__(self, db: AsyncSession):
        super().__init__(AgentVersion, db)

    async def get_versions_by_agent(
        self,
        agent_id: int,
        *,
        for_update: bool = False,
    ) -> list[AgentVersion]:
        stmt = (
            select(AgentVersion)
            .where(AgentVersion.agent_id == agent_id)
            .order_by(AgentVersion.id.desc())
        )
        if for_update:
            stmt = stmt.with_for_update()
        result = await self.db.execute(stmt)
        return list(result.scalars().all())

    async def clear_current(self, agent_id: int) -> None:
        stmt = (
            update(AgentVersion)
            .where(AgentVersion.agent_id == agent_id)
            .values(is_current=False)
        )
        await self.db.execute(stmt)


class AgentInvocationRepository(BaseRepository[AgentInvocationLog]):
    def __init__(self, db: AsyncSession):
        super().__init__(AgentInvocationLog, db)

    async def get_stats_since(
        self,
        *,
        agent_id: int,
        since: datetime,
    ) -> tuple[int, float]:
        stmt = select(
            func.count(AgentInvocationLog.id),
            func.coalesce(
                func.avg(AgentInvocationLog.success * 100),
                0,
            ),
        ).where(
            AgentInvocationLog.agent_id == agent_id,
            AgentInvocationLog.created_at >= since,
        )
        result = await self.db.execute(stmt)
        count, success_rate = result.one()
        return int(count), float(success_rate)

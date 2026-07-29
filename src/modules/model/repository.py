from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from src.core.base_repository import BaseRepository
from src.modules.model.model import LLMModel


class ModelRepository(BaseRepository[LLMModel]):
    """搜索字段：按模型名称或模型标识符搜索"""
    SEARCH_FIELDS = ["name", "model_id"]

    def __init__(self, db: AsyncSession):
        super().__init__(LLMModel, db)

    async def get_by_model_id(self, model_id: str) -> LLMModel | None:
        """按模型标识符查找（用于去重）"""
        stmt = select(LLMModel).where(LLMModel.model_id == model_id)
        result = await self.db.execute(stmt)
        return result.scalar_one_or_none()

    async def get_default_model(self) -> LLMModel | None:
        """获取默认模型"""
        stmt = select(LLMModel).where(LLMModel.is_default.is_(True))
        result = await self.db.execute(stmt)
        return result.scalar_one_or_none()

    async def search_page(
        self,
        *,
        offset: int,
        limit: int,
        keyword: str | None,
        provider_id: int | None = None,
    ) -> tuple[list[LLMModel], int]:
        """分页查询模型，支持关键词和供应商筛选。"""
        stmt = select(LLMModel)
        if provider_id is not None:
            stmt = stmt.where(LLMModel.provider_id == provider_id)
        if keyword:
            stmt = stmt.where(
                or_(
                    LLMModel.name.like(f"%{keyword}%"),
                    LLMModel.model_id.like(f"%{keyword}%"),
                )
            )

        count_stmt = select(func.count()).select_from(stmt.subquery())
        total_result = await self.db.execute(count_stmt)
        total = total_result.scalar_one()

        stmt = stmt.order_by(LLMModel.id.desc()).offset(offset).limit(limit)
        result = await self.db.execute(stmt)
        return list(result.scalars().all()), total

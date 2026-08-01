from sqlalchemy import select, func, or_
from sqlalchemy.ext.asyncio import AsyncSession
from src.core.base_repository import BaseRepository
from src.modules.KnowledgeBase.model import Document, KnowledgeBase, Segment


class KnowledgeBaseRepository(BaseRepository[KnowledgeBase]):
    """搜索字段：按名称或描述搜索"""
    SEARCH_FIELDS = ["name", "description"]

    def __init__(self, db: AsyncSession):
        super().__init__(KnowledgeBase, db)

    async def search_page(
        self, offset: int, limit: int, keyword: str | None
    ) -> tuple[list[KnowledgeBase], int]:
        """分页 + 搜索"""
        return await self.get_page(
            offset=offset,
            limit=limit,
            keyword=keyword,
            search_fields=self.SEARCH_FIELDS,
        )


class DocumentRepository(BaseRepository[Document]):
    def __init__(self, db: AsyncSession):
        super().__init__(Document, db)

    async def get_page_by_knowledge_base(
        self, kb_id: int, offset: int = 0, limit: int = 20, keyword: str | None = None
    ) -> tuple[list[Document], int]:
        """按知识库分页查询文档，支持按文件名搜索"""
        stmt = select(Document).where(Document.knowledge_base_id == kb_id)
        if keyword:
            stmt = stmt.where(Document.file_name.like(f"%{keyword}%"))

        # 查总数
        count_stmt = select(func.count()).select_from(stmt.subquery())
        total_result = await self.db.execute(count_stmt)
        total = total_result.scalar_one()

        # 查分页数据
        stmt = stmt.offset(offset).limit(limit).order_by(Document.id.desc())
        result = await self.db.execute(stmt)
        items = list(result.scalars().all())
        return items, total


class SegmentRepository(BaseRepository[Segment]):
    def __init__(self, db: AsyncSession):
        super().__init__(Segment, db)

    async def get_page_by_knowledge_base(
        self, kb_id: int, offset: int = 0, limit: int = 20, keyword: str | None = None
    ) -> tuple[list[Segment], int]:
        """按知识库分页查询分段，支持按内容搜索"""
        stmt = select(Segment).where(Segment.knowledge_base_id == kb_id)
        if keyword:
            stmt = stmt.where(Segment.content.like(f"%{keyword}%"))

        # 查总数
        count_stmt = select(func.count()).select_from(stmt.subquery())
        total_result = await self.db.execute(count_stmt)
        total = total_result.scalar_one()

        # 查分页数据
        stmt = stmt.order_by(Segment.document_id, Segment.position).offset(offset).limit(limit)
        result = await self.db.execute(stmt)
        items = list(result.scalars().all())
        return items, total

    async def get_by_document(self, doc_id: int) -> list[Segment]:
        stmt = (
            select(Segment)
            .where(Segment.document_id == doc_id)
            .order_by(Segment.position)
        )
        result = await self.db.execute(stmt)
        return result.scalars().all()

    async def retrieve_for_agent(
        self,
        *,
        knowledge_base_ids: list[int],
        query: str,
        limit: int,
    ) -> list[Segment]:
        """从指定知识库召回与输入匹配的分段。"""
        if not knowledge_base_ids:
            return []

        stmt = select(Segment).where(
            Segment.knowledge_base_id.in_(knowledge_base_ids)
        )
        terms = [
            term
            for term in query.replace("\n", " ").split(" ")
            if len(term.strip()) >= 2
        ][:8]
        if terms:
            stmt = stmt.where(
                or_(
                    *[
                        Segment.content.like(f"%{term.strip()}%")
                        for term in terms
                    ]
                )
            )
        stmt = stmt.order_by(
            Segment.hit_count.desc(),
            Segment.id.desc(),
        ).limit(limit)
        result = await self.db.execute(stmt)
        return list(result.scalars().all())

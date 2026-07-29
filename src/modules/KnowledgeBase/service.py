from sqlalchemy.ext.asyncio import AsyncSession
from src.core.exceptions import BizException
from src.core.base_schema import PageResult
from src.core.deps import PageParams
from src.modules.KnowledgeBase.model import Document, KnowledgeBase, Segment
from src.modules.KnowledgeBase.repository import (
    KnowledgeBaseRepository, DocumentRepository, SegmentRepository,
)
from src.modules.KnowledgeBase.schema import (
    KnowledgeBaseCreate, KnowledgeBaseUpdate, KnowledgeBaseRead,
    DocumentRead, SegmentRead, SegmentUpdate,
)


class KnowledgeService:
    def __init__(self, db: AsyncSession):
        self.kb_repo = KnowledgeBaseRepository(db)
        self.doc_repo = DocumentRepository(db)
        self.seg_repo = SegmentRepository(db)

    # ===== 知识库 CRUD =====

    async def create_kb(self, data: KnowledgeBaseCreate, current_user: str = None) -> KnowledgeBaseRead:
        kb = KnowledgeBase(
            name=data.name,
            description=data.description,
            embedding_model=data.embedding_model,
            created_by=current_user,
        )
        kb = await self.kb_repo.create(kb)
        return KnowledgeBaseRead.model_validate(kb)

    async def get_kb(self, kb_id: int) -> KnowledgeBaseRead:
        kb = await self.kb_repo.get_by_id(kb_id)
        if not kb:
            raise BizException(code=43001, message="知识库不存在")
        return KnowledgeBaseRead.model_validate(kb)

    async def list_kbs(self, params: PageParams) -> PageResult[KnowledgeBaseRead]:
        """分页查询知识库列表"""
        items, total = await self.kb_repo.search_page(
            offset=params.offset,
            limit=params.page_size,
            keyword=params.keyword,
        )
        return PageResult(
            items=[KnowledgeBaseRead.model_validate(kb) for kb in items],
            total=total,
            page=params.page,
            page_size=params.page_size,
        )

    async def update_kb(self, kb_id: int, data: KnowledgeBaseUpdate) -> KnowledgeBaseRead:
        kb = await self.kb_repo.get_by_id(kb_id)
        if not kb:
            raise BizException(code=43001, message="知识库不存在")

        if data.name is not None:
            kb.name = data.name
        if data.description is not None:
            kb.description = data.description
        if data.embedding_model is not None:
            kb.embedding_model = data.embedding_model

        kb = await self.kb_repo.update(kb)
        return KnowledgeBaseRead.model_validate(kb)

    async def delete_kb(self, kb_id: int) -> None:
        kb = await self.kb_repo.get_by_id(kb_id)
        if not kb:
            raise BizException(code=43001, message="知识库不存在")
        # cascade 会自动删除关联的文档和分段
        await self.kb_repo.delete(kb)

    # ===== 文档管理 =====

    async def upload_document(
        self, kb_id: int, file_name: str, file_type: str,
        file_size: str, file_path: str, current_user: str = None
    ) -> DocumentRead:
        """记录文档上传信息（文件已上传到 MinIO）"""
        kb = await self.kb_repo.get_by_id(kb_id)
        if not kb:
            raise BizException(code=43001, message="知识库不存在")

        doc = Document(
            knowledge_base_id=kb_id,
            file_name=file_name,
            file_type=file_type,
            file_size=file_size,
            file_path=file_path,
            status="pending",
            uploaded_by=current_user,
        )
        doc = await self.doc_repo.create(doc)

        # 更新知识库文档计数
        kb.document_count += 1
        await self.kb_repo.update(kb)

        # TODO: 触发异步文档处理任务（解析 → 分段 → 向量化）
        # 可以使用 Celery / BackgroundTasks / asyncio.create_task

        return DocumentRead.model_validate(doc)

    async def list_documents(self, kb_id: int, params: PageParams) -> PageResult[DocumentRead]:
        """分页查询文档列表"""
        items, total = await self.doc_repo.get_page_by_knowledge_base(
            kb_id, offset=params.offset, limit=params.page_size, keyword=params.keyword,
        )
        return PageResult(
            items=[DocumentRead.model_validate(d) for d in items],
            total=total,
            page=params.page,
            page_size=params.page_size,
        )

    async def delete_document(self, kb_id: int, doc_id: int) -> None:
        doc = await self.doc_repo.get_by_id(doc_id)
        if not doc or doc.knowledge_base_id != kb_id:
            raise BizException(code=43002, message="文档不存在")

        # 更新计数
        kb = await self.kb_repo.get_by_id(kb_id)
        kb.document_count = max(0, kb.document_count - 1)
        kb.segment_count = max(0, kb.segment_count - doc.segment_count)
        await self.kb_repo.update(kb)

        # cascade 会自动删除关联的分段
        await self.doc_repo.delete(doc)

        # TODO: 从 MinIO 删除文件
        # TODO: 从向量数据库删除对应向量

    # ===== 分段管理 =====

    async def list_segments(self, kb_id: int, params: PageParams) -> PageResult[SegmentRead]:
        """分页查询分段列表"""
        items, total = await self.seg_repo.get_page_by_knowledge_base(
            kb_id, offset=params.offset, limit=params.page_size, keyword=params.keyword,
        )
        return PageResult(
            items=[SegmentRead.model_validate(s) for s in items],
            total=total,
            page=params.page,
            page_size=params.page_size,
        )

    async def update_segment(self, kb_id: int, seg_id: int, data: SegmentUpdate) -> SegmentRead:
        seg = await self.seg_repo.get_by_id(seg_id)
        if not seg or seg.knowledge_base_id != kb_id:
            raise BizException(code=43003, message="分段不存在")

        if data.content is not None:
            seg.content = data.content
            seg.word_count = len(data.content)
        if data.keywords is not None:
            seg.keywords = data.keywords

        seg = await self.seg_repo.update(seg)
        return SegmentRead.model_validate(seg)

    async def delete_segment(self, kb_id: int, seg_id: int) -> None:
        seg = await self.seg_repo.get_by_id(seg_id)
        if not seg or seg.knowledge_base_id != kb_id:
            raise BizException(code=43003, message="分段不存在")

        # 更新计数
        kb = await self.kb_repo.get_by_id(kb_id)
        kb.segment_count = max(0, kb.segment_count - 1)
        await self.kb_repo.update(kb)

        doc = await self.doc_repo.get_by_id(seg.document_id)
        if doc:
            doc.segment_count = max(0, doc.segment_count - 1)
            await self.doc_repo.update(doc)

        await self.seg_repo.delete(seg)

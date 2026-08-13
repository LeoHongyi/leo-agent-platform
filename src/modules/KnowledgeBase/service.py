import asyncio
import mimetypes
import uuid
from dataclasses import dataclass
from pathlib import Path

from fastapi import BackgroundTasks
from loguru import logger
from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from src.core.base_schema import PageResult
from src.core.config import get_settings
from src.core.deps import PageParams
from src.core.exceptions import BizException
from src.infra.minio_client import delete_file as minio_delete
from src.infra.minio_client import download_file as minio_download
from src.infra.minio_client import upload_file
from src.modules.KnowledgeBase.model import (
    Document,
    KnowledgeBase,
    Segment,
    StorageCleanupJob,
)
from src.modules.KnowledgeBase.repository import (
    DocumentRepository,
    KnowledgeBaseRepository,
    SegmentRepository,
)
from src.modules.KnowledgeBase.schema import (
    DocumentRead,
    DocumentStatus,
    KnowledgeBaseConfigUpdate,
    KnowledgeBaseCreate,
    KnowledgeBaseRead,
    KnowledgeBaseUpdate,
    RetrievalStrategy,
    RetrievalTestRequest,
    RetrievalTestResult,
    SegmentRead,
    SegmentUpdate,
)
from src.modules.KnowledgeBase.tasks import (
    SUPPORTED_DOCUMENT_TYPES,
    count_tokens,
    count_words,
    process_document_task,
    process_storage_cleanup_jobs,
)


@dataclass(frozen=True, slots=True)
class DocumentDownload:
    data: bytes
    file_name: str
    content_type: str


class KnowledgeService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.kb_repo = KnowledgeBaseRepository(db)
        self.doc_repo = DocumentRepository(db)
        self.seg_repo = SegmentRepository(db)
        self.settings = get_settings()

    @staticmethod
    def _to_kb_read(kb: KnowledgeBase) -> KnowledgeBaseRead:
        return KnowledgeBaseRead.model_validate(kb)

    @staticmethod
    def _to_document_read(doc: Document) -> DocumentRead:
        return DocumentRead.model_validate(doc)

    @staticmethod
    def _to_segment_read(segment: Segment) -> SegmentRead:
        return SegmentRead.model_validate(segment)

    async def create_kb(
        self,
        *,
        data: KnowledgeBaseCreate,
        current_user: str | None = None,
    ) -> KnowledgeBaseRead:
        kb = KnowledgeBase(
            name=data.name,
            description=data.description,
            embedding_model=data.embedding_model,
            chunk_method=data.chunk_method.value,
            chunk_size=data.chunk_size,
            chunk_overlap=data.chunk_overlap,
            retrieval_strategy=data.retrieval_strategy.value,
            top_k=data.top_k,
            similarity_threshold=data.similarity_threshold,
            created_by=current_user,
        )
        return self._to_kb_read(await self.kb_repo.create(kb))

    async def get_kb(self, *, kb_id: int) -> KnowledgeBaseRead:
        return self._to_kb_read(await self._get_kb(kb_id=kb_id))

    async def list_kbs(
        self,
        *,
        params: PageParams,
    ) -> PageResult[KnowledgeBaseRead]:
        items, total = await self.kb_repo.search_page(
            offset=params.offset,
            limit=params.page_size,
            keyword=params.keyword,
        )
        return PageResult(
            items=[self._to_kb_read(kb) for kb in items],
            total=total,
            page=params.page,
            page_size=params.page_size,
        )

    async def update_kb(
        self,
        *,
        kb_id: int,
        data: KnowledgeBaseUpdate,
    ) -> KnowledgeBaseRead:
        kb = await self._get_kb_for_update(kb_id=kb_id)
        fields = data.model_fields_set
        if "name" in fields:
            kb.name = data.name
        if "description" in fields:
            kb.description = data.description
        if "embedding_model" in fields:
            kb.embedding_model = data.embedding_model
        return self._to_kb_read(await self.kb_repo.update(kb))

    async def update_kb_config(
        self,
        *,
        kb_id: int,
        data: KnowledgeBaseConfigUpdate,
    ) -> KnowledgeBaseRead:
        """Update ingestion/retrieval defaults used by subsequent processing."""

        kb = await self._get_kb_for_update(kb_id=kb_id)
        fields = data.model_fields_set
        chunk_size = data.chunk_size if "chunk_size" in fields else kb.chunk_size
        chunk_overlap = (
            data.chunk_overlap
            if "chunk_overlap" in fields
            else kb.chunk_overlap
        )
        if chunk_overlap >= chunk_size:
            raise BizException(
                code=43010,
                message="chunk_overlap 必须小于 chunk_size",
            )

        for field_name in fields:
            value = getattr(data, field_name)
            if hasattr(value, "value"):
                value = value.value
            setattr(kb, field_name, value)
        return self._to_kb_read(await self.kb_repo.update(kb))

    async def delete_kb(self, *, kb_id: int) -> None:
        kb = await self._get_kb_for_update(kb_id=kb_id)
        documents = await self.doc_repo.get_all_by_kb(kb_id)
        object_names = [doc.file_path for doc in documents if doc.file_path]
        try:
            cleanup_job_ids = await self._create_cleanup_jobs(object_names)
            await self.kb_repo.delete(kb)
            await self.db.commit()
        except IntegrityError as exc:
            await self.db.rollback()
            raise BizException(
                code=43004,
                message="知识库正在被 Agent 使用，不能删除",
            ) from exc

        await self._process_cleanup_jobs_best_effort(cleanup_job_ids)

    async def upload_document(
        self,
        *,
        kb_id: int,
        file_name: str,
        file_type: str,
        file_bytes: bytes,
        background_tasks: BackgroundTasks,
        content_type: str | None = None,
        current_user: str | None = None,
    ) -> DocumentRead:
        """Persist the object and metadata before scheduling ingestion.

        FastAPI executes response background tasks before a request-scoped
        ``get_db`` dependency reaches its post-yield commit.  The explicit
        commit here is therefore required so the task-owned session can see the
        new document.
        """

        safe_name = Path(file_name.replace("\\", "/")).name.strip()
        normalized_type = file_type.lower().lstrip(".")
        if not safe_name:
            raise BizException(code=43010, message="文件名不能为空")
        if len(safe_name) > 500:
            raise BizException(code=43010, message="文件名不能超过 500 个字符")
        if normalized_type not in SUPPORTED_DOCUMENT_TYPES:
            raise BizException(
                code=43010,
                message=f"不支持的文件类型: {file_type}",
            )
        if not file_bytes:
            raise BizException(code=43010, message="上传文件不能为空")
        max_bytes = self.settings.KNOWLEDGE_MAX_FILE_SIZE_MB * 1024 * 1024
        if len(file_bytes) > max_bytes:
            raise BizException(
                code=43010,
                message=(
                    "文件大小不能超过 "
                    f"{self.settings.KNOWLEDGE_MAX_FILE_SIZE_MB} MB"
                ),
            )

        object_name = f"kb/{kb_id}/{uuid.uuid4().hex}_{safe_name}"
        resolved_content_type = (
            content_type
            or mimetypes.guess_type(safe_name)[0]
            or "application/octet-stream"
        )
        await asyncio.to_thread(
            upload_file,
            object_name,
            file_bytes,
            resolved_content_type,
        )
        try:
            # Re-check and lock the KB after the external upload.  This keeps
            # upload/delete/task lock ordering consistently KB -> Document.
            kb = await self._get_kb_for_update(kb_id=kb_id)
            doc = await self.doc_repo.create(
                Document(
                    knowledge_base_id=kb_id,
                    file_name=safe_name,
                    file_type=normalized_type,
                    file_size=self._format_file_size(len(file_bytes)),
                    file_path=object_name,
                    status=DocumentStatus.PENDING.value,
                    uploaded_by=current_user,
                )
            )
            await self._refresh_kb_stats(kb)
            await self.db.commit()
        except Exception:
            await self.db.rollback()
            try:
                await asyncio.to_thread(minio_delete, object_name)
            except Exception:
                logger.exception(
                    "Failed to compensate MinIO upload: {}",
                    object_name,
                )
            raise

        background_tasks.add_task(process_document_task, doc.id)
        return self._to_document_read(doc)

    async def get_document(
        self,
        *,
        kb_id: int,
        doc_id: int,
    ) -> DocumentRead:
        await self._get_kb(kb_id=kb_id)
        return self._to_document_read(
            await self._get_document(kb_id=kb_id, doc_id=doc_id)
        )

    async def download_document(
        self,
        *,
        kb_id: int,
        doc_id: int,
    ) -> DocumentDownload:
        await self._get_kb(kb_id=kb_id)
        doc = await self._get_document(kb_id=kb_id, doc_id=doc_id)
        if not doc.file_path:
            raise BizException(code=43002, message="文档文件不存在")
        try:
            data = await asyncio.to_thread(minio_download, doc.file_path)
        except Exception as exc:
            logger.exception("MinIO document download failed: document_id={}", doc_id)
            raise BizException(code=43012, message="文档下载失败") from exc
        return DocumentDownload(
            data=data,
            file_name=doc.file_name,
            content_type=(
                mimetypes.guess_type(doc.file_name)[0]
                or "application/octet-stream"
            ),
        )

    async def list_documents(
        self,
        *,
        kb_id: int,
        params: PageParams,
        status: DocumentStatus | None = None,
    ) -> PageResult[DocumentRead]:
        await self._get_kb(kb_id=kb_id)
        items, total = await self.doc_repo.get_page_by_kb(
            kb_id,
            offset=params.offset,
            limit=params.page_size,
            keyword=params.keyword,
            status=status,
        )
        return PageResult(
            items=[self._to_document_read(item) for item in items],
            total=total,
            page=params.page,
            page_size=params.page_size,
        )

    async def retry_document(
        self,
        *,
        kb_id: int,
        doc_id: int,
        background_tasks: BackgroundTasks,
    ) -> DocumentRead:
        kb = await self._get_kb_for_update(kb_id=kb_id)
        doc = await self.doc_repo.get_by_kb_and_id_for_update(kb_id, doc_id)
        if not doc:
            raise BizException(code=43002, message="文档不存在")
        if doc.status in {
            DocumentStatus.PENDING.value,
            DocumentStatus.PROCESSING.value,
        }:
            raise BizException(code=43005, message="文档正在处理中")

        doc.status = DocumentStatus.PENDING.value
        doc.error_message = None
        doc.processed_at = None
        await self._refresh_kb_stats(kb)
        await self.db.commit()
        background_tasks.add_task(process_document_task, doc.id)
        return self._to_document_read(doc)

    async def delete_document(self, *, kb_id: int, doc_id: int) -> None:
        kb = await self._get_kb_for_update(kb_id=kb_id)
        doc = await self.doc_repo.get_by_kb_and_id_for_update(kb_id, doc_id)
        if not doc:
            raise BizException(code=43002, message="文档不存在")
        if doc.status == DocumentStatus.PROCESSING.value:
            raise BizException(code=43005, message="处理中的文档不能删除")
        object_name = doc.file_path
        cleanup_job_ids = await self._create_cleanup_jobs(
            [object_name] if object_name else []
        )
        await self.doc_repo.delete(doc)
        await self._refresh_kb_stats(kb)
        await self.db.commit()

        await self._process_cleanup_jobs_best_effort(cleanup_job_ids)

    async def list_segments(
        self,
        *,
        kb_id: int,
        params: PageParams,
        document_id: int | None = None,
    ) -> PageResult[SegmentRead]:
        await self._get_kb(kb_id=kb_id)
        if document_id is not None:
            await self._get_document(kb_id=kb_id, doc_id=document_id)
        items, total = await self.seg_repo.get_page_by_kb(
            kb_id,
            offset=params.offset,
            limit=params.page_size,
            document_id=document_id,
            keyword=params.keyword,
        )
        return PageResult(
            items=[self._to_segment_read(item) for item in items],
            total=total,
            page=params.page,
            page_size=params.page_size,
        )

    async def list_document_segments(
        self,
        *,
        kb_id: int,
        doc_id: int,
        params: PageParams,
    ) -> PageResult[SegmentRead]:
        await self._get_kb(kb_id=kb_id)
        await self._get_document(kb_id=kb_id, doc_id=doc_id)
        items, total = await self.seg_repo.get_page_by_document(
            kb_id,
            doc_id,
            offset=params.offset,
            limit=params.page_size,
            keyword=params.keyword,
        )
        return PageResult(
            items=[self._to_segment_read(item) for item in items],
            total=total,
            page=params.page,
            page_size=params.page_size,
        )

    async def update_segment(
        self,
        *,
        kb_id: int,
        seg_id: int,
        data: SegmentUpdate,
    ) -> SegmentRead:
        await self._get_kb_for_update(kb_id=kb_id)
        existing = await self.seg_repo.get_by_kb_and_id(kb_id, seg_id)
        if not existing:
            raise BizException(code=43003, message="分段不存在")
        document = await self.doc_repo.get_by_kb_and_id_for_update(
            kb_id,
            existing.document_id,
        )
        if not document:
            raise BizException(code=43002, message="文档不存在")
        if document.status != DocumentStatus.COMPLETED.value:
            raise BizException(code=43005, message="只能编辑已处理文档的分段")
        segment = await self.seg_repo.get_by_kb_and_id(
            kb_id,
            seg_id,
            for_update=True,
        )
        if not segment:
            raise BizException(code=43003, message="分段不存在")
        if "content" in data.model_fields_set:
            segment.content = data.content.strip()
            segment.word_count = count_words(segment.content)
            segment.token_count = count_tokens(segment.content)
        if "keywords" in data.model_fields_set:
            segment.keywords = data.keywords
        return self._to_segment_read(await self.seg_repo.update(segment))

    async def delete_segment(self, *, kb_id: int, seg_id: int) -> None:
        kb = await self._get_kb_for_update(kb_id=kb_id)
        existing = await self.seg_repo.get_by_kb_and_id(kb_id, seg_id)
        if not existing:
            raise BizException(code=43003, message="分段不存在")
        doc = await self.doc_repo.get_by_kb_and_id_for_update(
            kb_id,
            existing.document_id,
        )
        if not doc:
            raise BizException(code=43002, message="文档不存在")
        if doc.status != DocumentStatus.COMPLETED.value:
            raise BizException(code=43005, message="只能删除已处理文档的分段")
        segment = await self.seg_repo.get_by_kb_and_id(
            kb_id,
            seg_id,
            for_update=True,
        )
        if not segment:
            raise BizException(code=43003, message="分段不存在")
        document_id = segment.document_id
        await self.seg_repo.delete(segment)
        await self.db.flush()

        doc.segment_count = int(
            await self.db.scalar(
                select(func.count(Segment.id)).where(
                    Segment.document_id == document_id
                )
            )
            or 0
        )
        await self._refresh_kb_stats(kb)

    async def retrieval_test(
        self,
        *,
        kb_id: int,
        data: RetrievalTestRequest,
    ) -> list[RetrievalTestResult]:
        await self._get_kb(kb_id=kb_id)
        if data.strategy == RetrievalStrategy.SEMANTIC:
            raise BizException(
                code=43011,
                message="语义检索需要先配置向量索引",
            )

        # Hybrid currently uses the available keyword candidate stage.  The
        # route never claims that lexical scores are embedding similarity.
        candidates = await self.seg_repo.retrieve_candidates(
            knowledge_base_ids=[kb_id],
            query=data.query,
            limit=data.top_k,
            similarity_threshold=data.similarity_threshold,
        )
        await self.seg_repo.increment_hit_counts(
            [item.segment.id for item in candidates]
        )
        return [
            RetrievalTestResult(
                segment_id=item.segment.id,
                document_id=item.segment.document_id,
                document_name=item.document_name,
                content=item.segment.content,
                score=item.score,
                position=item.segment.position,
            )
            for item in candidates
        ]

    async def _get_kb(self, *, kb_id: int) -> KnowledgeBase:
        kb = await self.kb_repo.get_by_id(kb_id)
        if not kb:
            raise BizException(code=43001, message="知识库不存在")
        return kb

    async def _get_kb_for_update(self, *, kb_id: int) -> KnowledgeBase:
        kb = await self.kb_repo.get_by_id_for_update(kb_id)
        if not kb:
            raise BizException(code=43001, message="知识库不存在")
        return kb

    async def _get_document(self, *, kb_id: int, doc_id: int) -> Document:
        doc = await self.doc_repo.get_by_kb_and_id(kb_id, doc_id)
        if not doc:
            raise BizException(code=43002, message="文档不存在")
        return doc

    async def _refresh_kb_stats(self, kb: KnowledgeBase) -> None:
        await self.db.flush()
        document_count, segment_count = await self.kb_repo.get_aggregate_counts(
            kb.id
        )
        statuses = await self.doc_repo.get_status_counts_by_kb(kb.id)
        kb.document_count = document_count
        kb.segment_count = segment_count
        if document_count == 0:
            kb.status = "empty"
        elif statuses.get(DocumentStatus.COMPLETED.value, 0):
            kb.status = "ready"
        elif statuses.get(DocumentStatus.PENDING.value, 0) or statuses.get(
            DocumentStatus.PROCESSING.value,
            0,
        ):
            kb.status = "indexing"
        elif statuses.get(DocumentStatus.FAILED.value, 0):
            kb.status = "error"
        else:
            kb.status = "empty"
        await self.kb_repo.update(kb)

    async def _create_cleanup_jobs(self, object_names: list[str]) -> list[int]:
        jobs = [
            StorageCleanupJob(object_name=object_name)
            for object_name in dict.fromkeys(object_names)
        ]
        if not jobs:
            return []
        self.db.add_all(jobs)
        await self.db.flush()
        return [job.id for job in jobs]

    @staticmethod
    async def _process_cleanup_jobs_best_effort(job_ids: list[int]) -> None:
        if not job_ids:
            return
        try:
            await process_storage_cleanup_jobs(job_ids)
        except Exception:
            # The durable rows remain available for startup recovery. Logical
            # deletion has already committed and must still return success.
            logger.exception("Unable to run MinIO cleanup jobs: {}", job_ids)

    @staticmethod
    def _format_file_size(size_bytes: int) -> str:
        if size_bytes < 1024:
            return f"{size_bytes} B"
        if size_bytes < 1024 * 1024:
            return f"{size_bytes / 1024:.2f} KB"
        return f"{size_bytes / (1024 * 1024):.2f} MB"

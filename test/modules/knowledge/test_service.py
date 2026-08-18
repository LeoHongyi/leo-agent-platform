from __future__ import annotations

from datetime import datetime
from types import SimpleNamespace
from unittest.mock import AsyncMock, MagicMock

import pytest
from fastapi import BackgroundTasks

from src.core.exceptions import BizException
from src.modules.KnowledgeBase import service as service_module
from src.modules.KnowledgeBase.model import Document, KnowledgeBase, Segment
from src.modules.KnowledgeBase.repository import RetrievalCandidate
from src.modules.KnowledgeBase.schema import (
    DocumentStatus,
    RetrievalTestRequest,
)
from src.modules.KnowledgeBase.service import KnowledgeService


def build_kb(*, kb_id: int = 3) -> KnowledgeBase:
    now = datetime.now()
    kb = KnowledgeBase(
        name="Product docs",
        description=None,
        status="empty",
        document_count=0,
        segment_count=0,
        embedding_model="text-embedding-ada-002",
        chunk_method="fixed",
        chunk_size=500,
        chunk_overlap=50,
        retrieval_strategy="hybrid",
        top_k=5,
        similarity_threshold=0.7,
        created_by="admin",
    )
    kb.id = kb_id
    kb.created_at = now
    kb.updated_at = now
    return kb


def build_document(
    *,
    doc_id: int = 7,
    kb_id: int = 3,
    status: str = "failed",
) -> Document:
    now = datetime.now()
    doc = Document(
        knowledge_base_id=kb_id,
        file_name="guide.txt",
        file_type="txt",
        file_size="11 B",
        file_path=f"kb/{kb_id}/guide.txt",
        status=status,
        segment_count=0,
        word_count=0,
        error_message="old error" if status == "failed" else None,
        uploaded_by="admin",
        processed_at=now if status in {"failed", "completed"} else None,
    )
    doc.id = doc_id
    doc.created_at = now
    doc.updated_at = now
    return doc


def build_segment(*, segment_id: int = 11) -> Segment:
    now = datetime.now()
    segment = Segment(
        knowledge_base_id=3,
        document_id=7,
        position=0,
        content="knowledge retrieval",
        word_count=2,
        token_count=5,
        keywords=["knowledge", "retrieval"],
        hit_count=1,
    )
    segment.id = segment_id
    segment.created_at = now
    segment.updated_at = now
    return segment


def build_service() -> KnowledgeService:
    db = AsyncMock()
    service = KnowledgeService(db)
    service.kb_repo = AsyncMock()
    service.doc_repo = AsyncMock()
    service.seg_repo = AsyncMock()
    service.settings = SimpleNamespace(KNOWLEDGE_MAX_FILE_SIZE_MB=1)
    return service


class RecordingBackgroundTasks:
    def __init__(self, events: list[object]) -> None:
        self.events = events
        self.calls: list[tuple[object, tuple[object, ...], dict[str, object]]] = []

    def add_task(self, func, *args, **kwargs) -> None:
        self.events.append("schedule")
        self.calls.append((func, args, kwargs))


@pytest.mark.asyncio
async def test_upload_commits_before_scheduling_only_document_id(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    service = build_service()
    kb = build_kb()
    events: list[object] = []
    background_tasks = RecordingBackgroundTasks(events)
    upload = MagicMock(return_value="unused")
    process = MagicMock()
    monkeypatch.setattr(service_module, "upload_file", upload)
    monkeypatch.setattr(service_module, "process_document_task", process)
    service.kb_repo.get_by_id.return_value = kb
    service._refresh_kb_stats = AsyncMock()

    def persist(doc: Document) -> Document:
        persisted = build_document(status=doc.status)
        persisted.file_name = doc.file_name
        persisted.file_path = doc.file_path
        persisted.file_size = doc.file_size
        persisted.uploaded_by = doc.uploaded_by
        return persisted

    service.doc_repo.create.side_effect = persist

    async def commit() -> None:
        events.append("commit")

    service.db.commit.side_effect = commit

    result = await service.upload_document(
        kb_id=kb.id,
        file_name="../guide.txt",
        file_type="TXT",
        file_bytes=b"hello world",
        background_tasks=background_tasks,
        content_type="text/plain",
        current_user="admin",
    )

    assert events == ["commit", "schedule"]
    assert len(background_tasks.calls) == 1
    func, args, kwargs = background_tasks.calls[0]
    assert func is process
    assert args == (result.id,)
    assert kwargs == {}
    upload.assert_called_once()
    object_name, content, content_type = upload.call_args.args
    assert object_name.startswith(f"kb/{kb.id}/")
    assert object_name.endswith("_guide.txt")
    assert ".." not in object_name
    assert content == b"hello world"
    assert content_type == "text/plain"
    assert result.status is DocumentStatus.PENDING
    assert result.uploaded_by == "admin"


@pytest.mark.asyncio
async def test_upload_database_failure_rolls_back_and_deletes_minio_object(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    service = build_service()
    service.kb_repo.get_by_id.return_value = build_kb()
    service.doc_repo.create.side_effect = RuntimeError("database unavailable")
    upload = MagicMock()
    delete = MagicMock()
    monkeypatch.setattr(service_module, "upload_file", upload)
    monkeypatch.setattr(service_module, "minio_delete", delete)
    background_tasks = BackgroundTasks()

    with pytest.raises(RuntimeError, match="database unavailable"):
        await service.upload_document(
            kb_id=3,
            file_name="guide.txt",
            file_type="txt",
            file_bytes=b"content",
            background_tasks=background_tasks,
        )

    service.db.rollback.assert_awaited_once()
    service.db.commit.assert_not_awaited()
    delete.assert_called_once()
    assert delete.call_args.args == (upload.call_args.args[0],)
    assert background_tasks.tasks == []


@pytest.mark.asyncio
async def test_upload_rejects_overlong_file_name_before_minio(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    service = build_service()
    upload = MagicMock()
    monkeypatch.setattr(service_module, "upload_file", upload)

    with pytest.raises(BizException) as exc_info:
        await service.upload_document(
            kb_id=3,
            file_name=f"{'a' * 501}.txt",
            file_type="txt",
            file_bytes=b"content",
            background_tasks=BackgroundTasks(),
        )

    assert exc_info.value.code == 43010
    upload.assert_not_called()


@pytest.mark.asyncio
@pytest.mark.parametrize("status", ["pending", "processing"])
async def test_retry_rejects_document_already_being_processed(status: str) -> None:
    service = build_service()
    service.kb_repo.get_by_id_for_update.return_value = build_kb()
    service.doc_repo.get_by_kb_and_id_for_update.return_value = build_document(
        status=status
    )
    background_tasks = BackgroundTasks()

    with pytest.raises(BizException) as exc_info:
        await service.retry_document(
            kb_id=3,
            doc_id=7,
            background_tasks=background_tasks,
        )

    assert exc_info.value.code == 43005
    service.db.commit.assert_not_awaited()
    assert background_tasks.tasks == []


@pytest.mark.asyncio
async def test_retry_resets_failed_document_commits_then_schedules_id(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    service = build_service()
    kb = build_kb()
    doc = build_document(status="failed")
    service.kb_repo.get_by_id_for_update.return_value = kb
    service.doc_repo.get_by_kb_and_id_for_update.return_value = doc
    service._refresh_kb_stats = AsyncMock()
    events: list[object] = []
    background_tasks = RecordingBackgroundTasks(events)
    process = MagicMock()
    monkeypatch.setattr(service_module, "process_document_task", process)

    async def commit() -> None:
        events.append("commit")

    service.db.commit.side_effect = commit

    result = await service.retry_document(
        kb_id=kb.id,
        doc_id=doc.id,
        background_tasks=background_tasks,
    )

    assert events == ["commit", "schedule"]
    assert result.status is DocumentStatus.PENDING
    assert doc.error_message is None
    assert doc.processed_at is None
    assert background_tasks.calls == [(process, (doc.id,), {})]


@pytest.mark.asyncio
async def test_semantic_retrieval_is_explicitly_rejected() -> None:
    service = build_service()
    service.kb_repo.get_by_id.return_value = build_kb()

    with pytest.raises(BizException) as exc_info:
        await service.retrieval_test(
            kb_id=3,
            data=RetrievalTestRequest(
                query="knowledge",
                strategy="semantic",
            ),
        )

    assert exc_info.value.code == 43011
    service.seg_repo.retrieve_candidates.assert_not_awaited()
    service.seg_repo.increment_hit_counts.assert_not_awaited()


@pytest.mark.asyncio
async def test_keyword_retrieval_maps_candidates_and_increments_hits() -> None:
    service = build_service()
    segment = build_segment()
    service.kb_repo.get_by_id.return_value = build_kb()
    service.seg_repo.retrieve_candidates.return_value = [
        RetrievalCandidate(
            segment=segment,
            document_name="guide.txt",
            score=0.75,
        )
    ]
    request = RetrievalTestRequest(
        query="knowledge",
        strategy="keyword",
        top_k=3,
        similarity_threshold=0.5,
    )

    result = await service.retrieval_test(kb_id=3, data=request)

    service.seg_repo.retrieve_candidates.assert_awaited_once_with(
        knowledge_base_ids=[3],
        query="knowledge",
        limit=3,
        similarity_threshold=0.5,
    )
    service.seg_repo.increment_hit_counts.assert_awaited_once_with([segment.id])
    assert len(result) == 1
    assert result[0].segment_id == segment.id
    assert result[0].document_name == "guide.txt"
    assert result[0].score == 0.75

from datetime import datetime
from types import SimpleNamespace

import pytest
from pydantic import ValidationError

from src.modules.KnowledgeBase.schema import (
    ChunkMethod,
    DocumentRead,
    KnowledgeBaseConfigUpdate,
    KnowledgeBaseCreate,
    KnowledgeBaseUpdate,
    RetrievalStrategy,
    RetrievalTestRequest,
    SegmentUpdate,
)


def test_knowledge_base_create_normalizes_values_and_applies_defaults() -> None:
    data = KnowledgeBaseCreate(name="  Product docs  ", description="   ")

    assert data.name == "Product docs"
    assert data.description is None
    assert data.chunk_method is ChunkMethod.FIXED
    assert data.retrieval_strategy is RetrievalStrategy.HYBRID
    assert data.chunk_size == 500
    assert data.chunk_overlap == 50


@pytest.mark.parametrize(
    "payload",
    [
        {"name": ""},
        {"name": "KB", "chunk_method": "characters"},
        {"name": "KB", "retrieval_strategy": "vector"},
        {"name": "KB", "chunk_size": 100, "chunk_overlap": 100},
        {"name": "KB", "top_k": 0},
        {"name": "KB", "similarity_threshold": 1.1},
        {"name": "KB", "unknown": True},
    ],
)
def test_knowledge_base_create_rejects_invalid_contract(payload: dict) -> None:
    with pytest.raises(ValidationError):
        KnowledgeBaseCreate.model_validate(payload)


def test_partial_update_schemas_require_at_least_one_field() -> None:
    with pytest.raises(ValidationError):
        KnowledgeBaseUpdate()
    with pytest.raises(ValidationError):
        KnowledgeBaseConfigUpdate()


def test_config_rejects_overlap_not_smaller_than_size() -> None:
    with pytest.raises(ValidationError, match="chunk_overlap"):
        KnowledgeBaseConfigUpdate(chunk_size=200, chunk_overlap=200)


def test_segment_update_rejects_blank_content_and_deduplicates_keywords() -> None:
    with pytest.raises(ValidationError, match="content"):
        SegmentUpdate(content=" \n ")

    data = SegmentUpdate(keywords=["rag", " rag ", "agent"])

    assert data.keywords == ["rag", "agent"]


def test_segment_update_respects_mysql_text_capacity() -> None:
    SegmentUpdate(content="a" * 16_000)

    with pytest.raises(ValidationError, match="16000"):
        SegmentUpdate(content="a" * 16_001)


def test_retrieval_request_trims_query_and_validates_strategy_and_bounds() -> None:
    data = RetrievalTestRequest(
        query="  knowledge search  ",
        strategy="keyword",
        top_k=20,
        similarity_threshold=0,
    )

    assert data.query == "knowledge search"
    assert data.strategy is RetrievalStrategy.KEYWORD

    for payload in (
        {"query": "   "},
        {"query": "q", "strategy": "vector"},
        {"query": "q", "top_k": 21},
        {"query": "q", "similarity_threshold": -0.1},
    ):
        with pytest.raises(ValidationError):
            RetrievalTestRequest.model_validate(payload)


def test_document_read_keeps_created_at_and_maps_storage_aliases() -> None:
    now = datetime.now()
    source = SimpleNamespace(
        id=7,
        knowledge_base_id=3,
        file_name="guide.txt",
        file_type="txt",
        file_size="12 B",
        file_path="kb/3/guide.txt",
        status="completed",
        segment_count=2,
        word_count=8,
        error_message=None,
        uploaded_by="admin",
        created_at=now,
        processed_at=now,
        updated_at=now,
    )

    result = DocumentRead.model_validate(source)

    assert result.minio_path == "kb/3/guide.txt"
    assert result.created_at == now
    assert result.uploaded_at == now

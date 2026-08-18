from datetime import datetime
from enum import StrEnum
from typing import Annotated, Self

from pydantic import (
    AliasChoices,
    BaseModel,
    ConfigDict,
    Field,
    StringConstraints,
    field_validator,
    model_validator,
)


Name = Annotated[
    str,
    StringConstraints(strip_whitespace=True, min_length=1, max_length=200),
]
EmbeddingModelName = Annotated[
    str,
    StringConstraints(strip_whitespace=True, min_length=1, max_length=100),
]
Keyword = Annotated[
    str,
    StringConstraints(strip_whitespace=True, min_length=1, max_length=100),
]
RetrievalQuery = Annotated[
    str,
    StringConstraints(strip_whitespace=True, min_length=1, max_length=10_000),
]


class KnowledgeBaseStatus(StrEnum):
    EMPTY = "empty"
    INDEXING = "indexing"
    READY = "ready"
    ERROR = "error"


class DocumentStatus(StrEnum):
    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"


class ChunkMethod(StrEnum):
    FIXED = "fixed"
    SENTENCE = "sentence"
    PARAGRAPH = "paragraph"


class RetrievalStrategy(StrEnum):
    KEYWORD = "keyword"
    SEMANTIC = "semantic"
    HYBRID = "hybrid"


class StrictInputSchema(BaseModel):
    model_config = ConfigDict(extra="forbid")


class ChunkConfigValidationMixin:
    chunk_size: int | None
    chunk_overlap: int | None

    @model_validator(mode="after")
    def validate_chunk_overlap(self) -> Self:
        if (
            self.chunk_size is not None
            and self.chunk_overlap is not None
            and self.chunk_overlap >= self.chunk_size
        ):
            raise ValueError("chunk_overlap 必须小于 chunk_size")
        return self


# ===== 知识库 =====


class KnowledgeBaseCreate(ChunkConfigValidationMixin, StrictInputSchema):
    name: Name
    description: str | None = Field(default=None, max_length=500)
    embedding_model: EmbeddingModelName = "text-embedding-ada-002"
    chunk_method: ChunkMethod = ChunkMethod.FIXED
    chunk_size: int = Field(default=500, ge=100, le=2_000)
    chunk_overlap: int = Field(default=50, ge=0, le=500)
    retrieval_strategy: RetrievalStrategy = RetrievalStrategy.HYBRID
    top_k: int = Field(default=5, ge=1, le=20)
    similarity_threshold: float = Field(default=0.7, ge=0.0, le=1.0)

    @field_validator("description")
    @classmethod
    def normalize_description(cls, value: str | None) -> str | None:
        if value is None:
            return None
        normalized = value.strip()
        return normalized or None


class KnowledgeBaseUpdate(StrictInputSchema):
    name: Name | None = None
    description: str | None = Field(default=None, max_length=500)
    embedding_model: EmbeddingModelName | None = None

    @field_validator("description")
    @classmethod
    def normalize_description(cls, value: str | None) -> str | None:
        if value is None:
            return None
        normalized = value.strip()
        return normalized or None

    @model_validator(mode="after")
    def require_update_field(self) -> Self:
        if not self.model_fields_set:
            raise ValueError("至少提供一个要更新的字段")
        for field_name in {"name", "embedding_model"}:
            if field_name in self.model_fields_set and getattr(self, field_name) is None:
                raise ValueError(f"{field_name} 不能为 null")
        return self


class KnowledgeBaseConfigUpdate(ChunkConfigValidationMixin, StrictInputSchema):
    """单独更新分段或检索配置。"""

    embedding_model: EmbeddingModelName | None = None
    chunk_method: ChunkMethod | None = None
    chunk_size: int | None = Field(default=None, ge=100, le=2_000)
    chunk_overlap: int | None = Field(default=None, ge=0, le=500)
    retrieval_strategy: RetrievalStrategy | None = None
    top_k: int | None = Field(default=None, ge=1, le=20)
    similarity_threshold: float | None = Field(default=None, ge=0.0, le=1.0)

    @model_validator(mode="after")
    def require_config_field(self) -> Self:
        if not self.model_fields_set:
            raise ValueError("至少提供一个要更新的配置字段")
        for field_name in self.model_fields_set:
            if getattr(self, field_name) is None:
                raise ValueError(f"{field_name} 不能为 null")
        return self


class KnowledgeBaseRead(BaseModel):
    id: int
    name: str
    description: str | None
    status: KnowledgeBaseStatus
    document_count: int = Field(ge=0)
    segment_count: int = Field(ge=0)
    embedding_model: str
    chunk_method: ChunkMethod
    chunk_size: int = Field(ge=1)
    chunk_overlap: int = Field(ge=0)
    retrieval_strategy: RetrievalStrategy
    top_k: int = Field(ge=1)
    similarity_threshold: float = Field(ge=0.0, le=1.0)
    created_by: str | None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


# ===== 文档 =====


class DocumentRead(BaseModel):
    id: int
    knowledge_base_id: int
    file_name: str
    file_type: str
    file_size: str | None
    minio_path: str | None = Field(
        validation_alias=AliasChoices("minio_path", "file_path")
    )
    status: DocumentStatus
    segment_count: int = Field(ge=0)
    word_count: int = Field(ge=0)
    error_message: str | None
    uploaded_by: str | None
    # created_at is retained for clients using the original API contract.
    created_at: datetime
    uploaded_at: datetime | None = Field(
        validation_alias=AliasChoices("uploaded_at", "created_at")
    )
    processed_at: datetime | None
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


# ===== 分段 =====


class SegmentRead(BaseModel):
    id: int
    knowledge_base_id: int
    document_id: int
    position: int = Field(ge=0)
    content: str
    word_count: int = Field(ge=0)
    token_count: int = Field(ge=0)
    keywords: list[str] | None
    hit_count: int = Field(ge=0)
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class SegmentUpdate(StrictInputSchema):
    # MySQL TEXT stores at most 65,535 bytes. 16k characters is safe under
    # utf8mb4 and comfortably above the configured ingestion chunk size.
    content: str | None = Field(default=None, max_length=16_000)
    keywords: list[Keyword] | None = Field(default=None, max_length=100)

    @field_validator("content")
    @classmethod
    def reject_blank_content(cls, value: str | None) -> str | None:
        if value is not None and not value.strip():
            raise ValueError("content 不能为空")
        return value

    @field_validator("keywords")
    @classmethod
    def unique_keywords(cls, values: list[str] | None) -> list[str] | None:
        if values is None:
            return None
        return list(dict.fromkeys(values))

    @model_validator(mode="after")
    def require_update_field(self) -> Self:
        if not self.model_fields_set:
            raise ValueError("至少提供一个要更新的字段")
        if "content" in self.model_fields_set and self.content is None:
            raise ValueError("content 不能为 null")
        return self


# ===== 检索测试 =====


class RetrievalTestRequest(StrictInputSchema):
    query: RetrievalQuery
    strategy: RetrievalStrategy = Field(
        default=RetrievalStrategy.HYBRID,
        description=(
            "检索策略；keyword 使用词法检索，hybrid 当前使用词法候选阶段，"
            "semantic 在向量索引接入前返回业务错误"
        ),
    )
    top_k: int = Field(default=5, ge=1, le=20)
    similarity_threshold: float = Field(default=0.7, ge=0.0, le=1.0)


class RetrievalTestResult(BaseModel):
    segment_id: int
    document_id: int
    document_name: str
    content: str
    score: float = Field(ge=0.0, le=1.0)
    position: int = Field(ge=0)

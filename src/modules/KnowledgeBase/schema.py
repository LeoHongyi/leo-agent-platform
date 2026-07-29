from pydantic import BaseModel
from datetime import datetime


# ===== 知识库 =====
class KnowledgeBaseCreate(BaseModel):
    name: str
    description: str | None = None
    embedding_model: str = "text-embedding-ada-002"


class KnowledgeBaseUpdate(BaseModel):
    name: str | None = None
    description: str | None = None
    embedding_model: str | None = None


class KnowledgeBaseRead(BaseModel):
    id: int
    name: str
    description: str | None
    status: str
    document_count: int
    segment_count: int
    embedding_model: str
    created_by: str | None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


# ===== 文档 =====
class DocumentRead(BaseModel):
    id: int
    knowledge_base_id: int
    file_name: str
    file_type: str
    file_size: str | None
    status: str
    segment_count: int
    word_count: int
    error_message: str | None
    uploaded_by: str | None
    created_at: datetime

    model_config = {"from_attributes": True}


# ===== 分段 =====
class SegmentRead(BaseModel):
    id: int
    knowledge_base_id: int
    document_id: int
    position: int
    content: str
    word_count: int
    token_count: int
    keywords: list[str] | None
    hit_count: int
    created_at: datetime

    model_config = {"from_attributes": True}


class SegmentUpdate(BaseModel):
    content: str | None = None
    keywords: list[str] | None = None
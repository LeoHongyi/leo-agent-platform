from datetime import datetime

from sqlalchemy import (
    BigInteger,
    DateTime,
    Float,
    ForeignKey,
    Integer,
    JSON,
    Index,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from src.core.base_model import BaseModel


class KnowledgeBase(BaseModel):
    """知识库表"""
    __tablename__ = "knowledge_bases"

    name: Mapped[str] = mapped_column(String(200), comment="知识库名称")
    description: Mapped[str | None] = mapped_column(
        String(500), nullable=True, comment="描述"
    )
    status: Mapped[str] = mapped_column(
        String(50), default="empty", comment="状态: ready/indexing/error/empty"
    )
    document_count: Mapped[int] = mapped_column(
        Integer, default=0, comment="文档数量"
    )
    segment_count: Mapped[int] = mapped_column(
        Integer, default=0, comment="分段数量"
    )
    embedding_model: Mapped[str] = mapped_column(
        String(100), default="text-embedding-ada-002", comment="向量化模型"
    )
    chunk_method: Mapped[str] = mapped_column(
        String(20), default="fixed", comment="分段方式: fixed/sentence/paragraph"
    )
    chunk_size: Mapped[int] = mapped_column(
        Integer, default=500, comment="分段大小（tokens）"
    )
    chunk_overlap: Mapped[int] = mapped_column(
        Integer, default=50, comment="重叠大小（tokens）"
    )
    retrieval_strategy: Mapped[str] = mapped_column(
        String(20), default="hybrid", comment="检索策略: keyword/semantic/hybrid"
    )
    top_k: Mapped[int] = mapped_column(Integer, default=5, comment="返回结果数")
    similarity_threshold: Mapped[float] = mapped_column(
        Float, default=0.7, comment="相似度阈值"
    )
    created_by: Mapped[str | None] = mapped_column(
        String(100), nullable=True, comment="创建者"
    )

    # 关联文档列表
    documents: Mapped[list["Document"]] = relationship(
        "Document", back_populates="knowledge_base",
        cascade="all, delete-orphan",  # 删除知识库时级联删除文档
        passive_deletes=True,
    )


class Document(BaseModel):
    """文档表"""
    __tablename__ = "documents"
    __table_args__ = (
        Index(
            "ix_documents_knowledge_base_status",
            "knowledge_base_id",
            "status",
        ),
    )

    knowledge_base_id: Mapped[int] = mapped_column(
        BigInteger, ForeignKey("knowledge_bases.id", ondelete="CASCADE"),
        comment="所属知识库ID"
    )
    file_name: Mapped[str] = mapped_column(String(500), comment="文件名")
    file_type: Mapped[str] = mapped_column(
        String(50), comment="文件类型: pdf/docx/md/txt/html/csv"
    )
    file_size: Mapped[str | None] = mapped_column(
        String(50), nullable=True, comment="文件大小"
    )
    file_path: Mapped[str | None] = mapped_column(
        String(1000), nullable=True, comment="MinIO 存储路径"
    )
    status: Mapped[str] = mapped_column(
        String(50), default="pending",
        comment="处理状态: pending/processing/completed/failed"
    )
    segment_count: Mapped[int] = mapped_column(
        Integer, default=0, comment="分段数量"
    )
    word_count: Mapped[int] = mapped_column(
        Integer, default=0, comment="字数"
    )
    error_message: Mapped[str | None] = mapped_column(
        Text, nullable=True, comment="错误信息"
    )
    uploaded_by: Mapped[str | None] = mapped_column(
        String(100), nullable=True, comment="上传者"
    )
    processed_at: Mapped[datetime | None] = mapped_column(
        DateTime, nullable=True, comment="处理完成时间"
    )

    # 关联
    knowledge_base: Mapped["KnowledgeBase"] = relationship(
        "KnowledgeBase", back_populates="documents"
    )
    segments: Mapped[list["Segment"]] = relationship(
        "Segment", back_populates="document",
        cascade="all, delete-orphan",
        passive_deletes=True,
    )


class Segment(BaseModel):
    """文档分段表"""
    __tablename__ = "segments"
    __table_args__ = (
        UniqueConstraint(
            "document_id",
            "position",
            name="uq_segments_document_position",
        ),
        Index(
            "ix_segments_knowledge_base_document_position",
            "knowledge_base_id",
            "document_id",
            "position",
        ),
    )

    knowledge_base_id: Mapped[int] = mapped_column(
        BigInteger, ForeignKey("knowledge_bases.id", ondelete="CASCADE"),
        comment="所属知识库ID"
    )
    document_id: Mapped[int] = mapped_column(
        BigInteger, ForeignKey("documents.id", ondelete="CASCADE"),
        comment="所属文档ID"
    )
    position: Mapped[int] = mapped_column(
        Integer, comment="在文档中的位置序号"
    )
    content: Mapped[str] = mapped_column(Text, comment="分段内容")
    word_count: Mapped[int] = mapped_column(
        Integer, default=0, comment="字数"
    )
    token_count: Mapped[int] = mapped_column(
        Integer, default=0, comment="Token 数"
    )
    keywords: Mapped[list[str] | None] = mapped_column(
        JSON, nullable=True, comment="关键词列表"
    )
    hit_count: Mapped[int] = mapped_column(
        Integer, default=0, comment="检索命中次数"
    )

    # 关联
    document: Mapped["Document"] = relationship(
        "Document", back_populates="segments"
    )


class StorageCleanupJob(BaseModel):
    """Durable MinIO cleanup work created in the same DB delete transaction."""

    __tablename__ = "knowledge_storage_cleanup_jobs"

    object_name: Mapped[str] = mapped_column(
        String(1000),
        comment="待删除的 MinIO 对象路径",
    )
    attempts: Mapped[int] = mapped_column(
        Integer,
        default=0,
        index=True,
        comment="清理尝试次数",
    )
    last_error: Mapped[str | None] = mapped_column(
        String(500),
        nullable=True,
        comment="最近一次脱敏错误",
    )

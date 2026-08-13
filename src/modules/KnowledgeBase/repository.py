import re
from dataclasses import dataclass

from sqlalchemy import and_, delete, func, or_, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from src.core.base_repository import BaseRepository
from src.modules.KnowledgeBase.model import Document, KnowledgeBase, Segment


def _escape_like(value: str) -> str:
    """Escape user input used in a SQL LIKE pattern."""
    return value.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_")


def _normalized_filter(value: str | None) -> str | None:
    if value is None:
        return None
    normalized = value.strip()
    return normalized or None


def _enum_value(value: object) -> object:
    return getattr(value, "value", value)


def _extract_search_terms(query: str, *, max_terms: int = 16) -> list[str]:
    """Build portable lexical candidates for English and CJK input."""
    terms: list[str] = []
    for token in re.findall(r"[A-Za-z0-9_]+|[\u3400-\u9fff]+", query.casefold()):
        if any("\u3400" <= char <= "\u9fff" for char in token):
            if len(token) <= 2:
                terms.append(token)
            else:
                terms.extend(
                    token[index : index + 2] for index in range(len(token) - 1)
                )
        elif len(token) >= 2:
            terms.append(token)
        if len(terms) >= max_terms:
            break
    return list(dict.fromkeys(terms))[:max_terms]


@dataclass(frozen=True, slots=True)
class RetrievalCandidate:
    """A lexical retrieval candidate joined with its source document."""

    segment: Segment
    document_name: str
    score: float


class KnowledgeBaseRepository(BaseRepository[KnowledgeBase]):
    SEARCH_FIELDS = ["name", "description"]

    def __init__(self, db: AsyncSession):
        super().__init__(KnowledgeBase, db)

    async def get_by_id_for_update(self, kb_id: int) -> KnowledgeBase | None:
        stmt = (
            select(KnowledgeBase)
            .where(KnowledgeBase.id == kb_id)
            .with_for_update()
        )
        result = await self.db.execute(stmt)
        return result.scalar_one_or_none()

    async def search_page(
        self,
        offset: int,
        limit: int,
        keyword: str | None,
        status: str | None = None,
    ) -> tuple[list[KnowledgeBase], int]:
        stmt = select(KnowledgeBase)
        normalized_keyword = _normalized_filter(keyword)
        if normalized_keyword:
            pattern = f"%{_escape_like(normalized_keyword)}%"
            stmt = stmt.where(
                or_(
                    KnowledgeBase.name.like(pattern, escape="\\"),
                    KnowledgeBase.description.like(pattern, escape="\\"),
                )
            )
        if status is not None:
            stmt = stmt.where(KnowledgeBase.status == _enum_value(status))

        total = await self._count(stmt)
        page_stmt = (
            stmt.order_by(KnowledgeBase.id.desc()).offset(offset).limit(limit)
        )
        items = list((await self.db.execute(page_stmt)).scalars().all())
        return items, total

    async def get_aggregate_counts(self, kb_id: int) -> tuple[int, int]:
        """Return authoritative document and segment counts for one KB."""
        document_stmt = select(func.count(Document.id)).where(
            Document.knowledge_base_id == kb_id
        )
        segment_stmt = select(func.count(Segment.id)).where(
            Segment.knowledge_base_id == kb_id
        )
        document_count = (await self.db.execute(document_stmt)).scalar_one()
        segment_count = (await self.db.execute(segment_stmt)).scalar_one()
        return int(document_count), int(segment_count)

    async def _count(self, stmt) -> int:
        count_stmt = select(func.count()).select_from(stmt.order_by(None).subquery())
        return int((await self.db.execute(count_stmt)).scalar_one())


class DocumentRepository(BaseRepository[Document]):
    def __init__(self, db: AsyncSession):
        super().__init__(Document, db)

    async def get_page_by_kb(
        self,
        kb_id: int,
        offset: int = 0,
        limit: int = 20,
        keyword: str | None = None,
        status: str | None = None,
    ) -> tuple[list[Document], int]:
        stmt = select(Document).where(Document.knowledge_base_id == kb_id)
        normalized_keyword = _normalized_filter(keyword)
        if normalized_keyword:
            pattern = f"%{_escape_like(normalized_keyword)}%"
            stmt = stmt.where(Document.file_name.like(pattern, escape="\\"))
        if status is not None:
            stmt = stmt.where(Document.status == _enum_value(status))

        total = await self._count(stmt)
        page_stmt = stmt.order_by(Document.id.desc()).offset(offset).limit(limit)
        items = list((await self.db.execute(page_stmt)).scalars().all())
        return items, total

    async def get_by_kb_and_id(
        self,
        kb_id: int,
        doc_id: int,
        *,
        for_update: bool = False,
    ) -> Document | None:
        stmt = select(Document).where(
            Document.id == doc_id,
            Document.knowledge_base_id == kb_id,
        )
        if for_update:
            stmt = stmt.with_for_update()
        result = await self.db.execute(stmt)
        return result.scalar_one_or_none()

    async def get_by_kb_and_id_for_update(
        self,
        kb_id: int,
        doc_id: int,
    ) -> Document | None:
        return await self.get_by_kb_and_id(kb_id, doc_id, for_update=True)

    async def get_by_id_for_update(self, doc_id: int) -> Document | None:
        stmt = select(Document).where(Document.id == doc_id).with_for_update()
        result = await self.db.execute(stmt)
        return result.scalar_one_or_none()

    async def get_all_by_kb(self, kb_id: int) -> list[Document]:
        stmt = (
            select(Document)
            .where(Document.knowledge_base_id == kb_id)
            .order_by(Document.id)
        )
        result = await self.db.execute(stmt)
        return list(result.scalars().all())

    async def get_status_counts_by_kb(self, kb_id: int) -> dict[str, int]:
        stmt = (
            select(Document.status, func.count(Document.id))
            .where(Document.knowledge_base_id == kb_id)
            .group_by(Document.status)
        )
        rows = (await self.db.execute(stmt)).all()
        return {str(status): int(count) for status, count in rows}

    async def _count(self, stmt) -> int:
        count_stmt = select(func.count()).select_from(stmt.order_by(None).subquery())
        return int((await self.db.execute(count_stmt)).scalar_one())


class SegmentRepository(BaseRepository[Segment]):
    def __init__(self, db: AsyncSession):
        super().__init__(Segment, db)

    async def get_page_by_kb(
        self,
        kb_id: int,
        offset: int = 0,
        limit: int = 20,
        document_id: int | None = None,
        keyword: str | None = None,
    ) -> tuple[list[Segment], int]:
        """Page segments within one KB, optionally filtered by document/content."""
        stmt = select(Segment).where(Segment.knowledge_base_id == kb_id)
        if document_id is not None:
            stmt = stmt.where(Segment.document_id == document_id)
        normalized_keyword = _normalized_filter(keyword)
        if normalized_keyword:
            pattern = f"%{_escape_like(normalized_keyword)}%"
            stmt = stmt.where(Segment.content.like(pattern, escape="\\"))

        total = await self._count(stmt)
        page_stmt = (
            stmt.order_by(Segment.document_id, Segment.position, Segment.id)
            .offset(offset)
            .limit(limit)
        )
        items = list((await self.db.execute(page_stmt)).scalars().all())
        return items, total

    async def get_page_by_document(
        self,
        kb_id: int,
        doc_id: int,
        offset: int = 0,
        limit: int = 20,
        keyword: str | None = None,
    ) -> tuple[list[Segment], int]:
        return await self.get_page_by_kb(
            kb_id,
            offset=offset,
            limit=limit,
            document_id=doc_id,
            keyword=keyword,
        )

    async def get_by_kb_and_id(
        self,
        kb_id: int,
        segment_id: int,
        *,
        for_update: bool = False,
    ) -> Segment | None:
        stmt = select(Segment).where(
            Segment.id == segment_id,
            Segment.knowledge_base_id == kb_id,
        )
        if for_update:
            stmt = stmt.with_for_update()
        result = await self.db.execute(stmt)
        return result.scalar_one_or_none()

    async def get_all_by_kb(self, kb_id: int) -> list[Segment]:
        stmt = (
            select(Segment)
            .where(Segment.knowledge_base_id == kb_id)
            .order_by(Segment.document_id, Segment.position, Segment.id)
        )
        result = await self.db.execute(stmt)
        return list(result.scalars().all())

    async def get_all_by_document(self, kb_id: int, doc_id: int) -> list[Segment]:
        stmt = (
            select(Segment)
            .where(
                Segment.knowledge_base_id == kb_id,
                Segment.document_id == doc_id,
            )
            .order_by(Segment.position, Segment.id)
        )
        result = await self.db.execute(stmt)
        return list(result.scalars().all())

    async def bulk_create(self, segments: list[Segment]) -> None:
        if not segments:
            return
        self.db.add_all(segments)
        await self.db.flush()

    async def delete_by_document(
        self,
        doc_id: int,
        *,
        kb_id: int | None = None,
    ) -> None:
        stmt = delete(Segment).where(Segment.document_id == doc_id)
        if kb_id is not None:
            stmt = stmt.where(Segment.knowledge_base_id == kb_id)
        await self.db.execute(stmt)

    async def retrieve_candidates(
        self,
        *,
        knowledge_base_ids: list[int],
        query: str,
        limit: int,
        similarity_threshold: float = 0.0,
    ) -> list[RetrievalCandidate]:
        """Return scored lexical candidates from completed documents only.

        This is the keyword candidate stage. Semantic or hybrid retrieval can add
        vector candidates and re-rank these results in the service layer later.
        """
        normalized_ids = list(dict.fromkeys(knowledge_base_ids))
        terms = _extract_search_terms(query)
        if limit <= 0:
            raise ValueError("limit 必须大于 0")
        if not 0.0 <= similarity_threshold <= 1.0:
            raise ValueError("similarity_threshold 必须在 0 到 1 之间")
        if not normalized_ids or not terms:
            return []

        conditions = [
            func.lower(Segment.content).like(
                f"%{_escape_like(term)}%",
                escape="\\",
            )
            for term in terms
        ]
        stmt = (
            select(Segment, Document.file_name)
            .join(
                Document,
                and_(
                    Document.id == Segment.document_id,
                    Document.knowledge_base_id == Segment.knowledge_base_id,
                ),
            )
            .where(
                Segment.knowledge_base_id.in_(normalized_ids),
                Document.status == "completed",
                or_(*conditions),
            )
            .order_by(Segment.hit_count.desc(), Segment.id.desc())
            .limit(min(max(limit * 20, 100), 1_000))
        )
        rows = (await self.db.execute(stmt)).all()

        candidates: list[RetrievalCandidate] = []
        normalized_query = " ".join(query.casefold().split())
        threshold = similarity_threshold
        for segment, document_name in rows:
            normalized_content = " ".join(segment.content.casefold().split())
            if normalized_query and normalized_query in normalized_content:
                score = 1.0
            else:
                matched = sum(term in normalized_content for term in terms)
                score = matched / len(terms)
            if score >= threshold:
                candidates.append(
                    RetrievalCandidate(
                        segment=segment,
                        document_name=document_name,
                        score=round(score, 6),
                    )
                )

        candidates.sort(
            key=lambda item: (
                item.score,
                item.segment.hit_count,
                item.segment.id,
            ),
            reverse=True,
        )
        return candidates[:limit]

    async def increment_hit_counts(self, segment_ids: list[int]) -> None:
        normalized_ids = list(dict.fromkeys(segment_ids))
        if not normalized_ids:
            return
        stmt = (
            update(Segment)
            .where(Segment.id.in_(normalized_ids))
            .values(hit_count=Segment.hit_count + 1)
        )
        await self.db.execute(stmt)

    async def retrieve_for_agent(
        self,
        *,
        knowledge_base_ids: list[int],
        query: str,
        limit: int,
        similarity_threshold: float = 0.0,
    ) -> list[Segment]:
        """Backward-compatible Agent lookup, restricted to completed documents."""
        candidates = await self.retrieve_candidates(
            knowledge_base_ids=knowledge_base_ids,
            query=query,
            limit=limit,
            similarity_threshold=similarity_threshold,
        )
        await self.increment_hit_counts(
            [candidate.segment.id for candidate in candidates]
        )
        return [candidate.segment for candidate in candidates]

    async def _count(self, stmt) -> int:
        count_stmt = select(func.count()).select_from(stmt.order_by(None).subquery())
        return int((await self.db.execute(count_stmt)).scalar_one())

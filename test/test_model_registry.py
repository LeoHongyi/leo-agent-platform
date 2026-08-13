from src.core.base_model import Base
from src.modules.KnowledgeBase.model import (
    Document,
    KnowledgeBase,
    Segment,
    StorageCleanupJob,
)
from src.modules.model.model import LLMModel


def test_domain_models_register_unique_tables() -> None:
    assert LLMModel.__table__ is Base.metadata.tables["models"]
    assert KnowledgeBase.__table__ is Base.metadata.tables["knowledge_bases"]
    assert Document.__table__ is Base.metadata.tables["documents"]
    assert Segment.__table__ is Base.metadata.tables["segments"]
    assert StorageCleanupJob.__table__ is Base.metadata.tables[
        "knowledge_storage_cleanup_jobs"
    ]

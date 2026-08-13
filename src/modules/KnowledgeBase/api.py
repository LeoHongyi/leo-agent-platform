from urllib.parse import quote

from fastapi import (
    APIRouter,
    BackgroundTasks,
    Depends,
    File,
    Query,
    Response,
    UploadFile,
)
from sqlalchemy.ext.asyncio import AsyncSession

from src.core.base_schema import PageResult, ResponseSchema
from src.core.config import get_settings
from src.core.deps import PageParams, get_current_user
from src.core.exceptions import BizException
from src.infra.database import get_db
from src.modules.KnowledgeBase.schema import (
    DocumentRead,
    DocumentStatus,
    KnowledgeBaseConfigUpdate,
    KnowledgeBaseCreate,
    KnowledgeBaseRead,
    KnowledgeBaseUpdate,
    RetrievalTestRequest,
    RetrievalTestResult,
    SegmentRead,
    SegmentUpdate,
)
from src.modules.KnowledgeBase.service import KnowledgeService
from src.modules.user.model import User

router = APIRouter(
    prefix="/knowledge-bases",
    tags=["知识库管理"],
    dependencies=[Depends(get_current_user)],
)


def get_knowledge_service(
    db: AsyncSession = Depends(get_db),
) -> KnowledgeService:
    return KnowledgeService(db)


# ===== 知识库 CRUD =====


@router.post(
    "",
    response_model=ResponseSchema[KnowledgeBaseRead],
    summary="创建知识库",
)
async def create_kb(
    data: KnowledgeBaseCreate,
    current_user: User = Depends(get_current_user),
    svc: KnowledgeService = Depends(get_knowledge_service),
) -> ResponseSchema[KnowledgeBaseRead]:
    result = await svc.create_kb(
        data=data,
        current_user=current_user.username,
    )
    return ResponseSchema(data=result)


@router.get(
    "",
    response_model=ResponseSchema[PageResult[KnowledgeBaseRead]],
    summary="知识库列表",
)
async def list_kbs(
    params: PageParams = Depends(),
    svc: KnowledgeService = Depends(get_knowledge_service),
) -> ResponseSchema[PageResult[KnowledgeBaseRead]]:
    return ResponseSchema(data=await svc.list_kbs(params=params))


@router.get(
    "/{kb_id}",
    response_model=ResponseSchema[KnowledgeBaseRead],
    summary="知识库详情",
)
async def get_kb(
    kb_id: int,
    svc: KnowledgeService = Depends(get_knowledge_service),
) -> ResponseSchema[KnowledgeBaseRead]:
    return ResponseSchema(data=await svc.get_kb(kb_id=kb_id))


@router.put(
    "/{kb_id}",
    response_model=ResponseSchema[KnowledgeBaseRead],
    summary="更新知识库",
)
async def update_kb(
    kb_id: int,
    data: KnowledgeBaseUpdate,
    svc: KnowledgeService = Depends(get_knowledge_service),
) -> ResponseSchema[KnowledgeBaseRead]:
    return ResponseSchema(
        data=await svc.update_kb(kb_id=kb_id, data=data)
    )


@router.put(
    "/{kb_id}/config",
    response_model=ResponseSchema[KnowledgeBaseRead],
    summary="更新知识库分段与检索配置",
)
async def update_kb_config(
    kb_id: int,
    data: KnowledgeBaseConfigUpdate,
    svc: KnowledgeService = Depends(get_knowledge_service),
) -> ResponseSchema[KnowledgeBaseRead]:
    return ResponseSchema(
        data=await svc.update_kb_config(kb_id=kb_id, data=data)
    )


@router.delete(
    "/{kb_id}",
    response_model=ResponseSchema[None],
    summary="删除知识库",
)
async def delete_kb(
    kb_id: int,
    svc: KnowledgeService = Depends(get_knowledge_service),
) -> ResponseSchema[None]:
    await svc.delete_kb(kb_id=kb_id)
    return ResponseSchema(message="删除成功")


# ===== 文档管理 =====


@router.post(
    "/{kb_id}/documents",
    response_model=ResponseSchema[DocumentRead],
    summary="上传并异步处理文档",
)
async def upload_document(
    kb_id: int,
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    svc: KnowledgeService = Depends(get_knowledge_service),
) -> ResponseSchema[DocumentRead]:
    settings = get_settings()
    max_bytes = settings.KNOWLEDGE_MAX_FILE_SIZE_MB * 1024 * 1024
    file_name = file.filename or ""
    file_type = file_name.rsplit(".", 1)[-1] if "." in file_name else "unknown"
    try:
        content = await file.read(max_bytes + 1)
    finally:
        await file.close()
    if len(content) > max_bytes:
        raise BizException(
            code=43010,
            message=f"文件大小不能超过 {settings.KNOWLEDGE_MAX_FILE_SIZE_MB} MB",
        )

    result = await svc.upload_document(
        kb_id=kb_id,
        file_name=file_name,
        file_type=file_type,
        file_bytes=content,
        background_tasks=background_tasks,
        content_type=file.content_type,
        current_user=current_user.username,
    )
    return ResponseSchema(data=result)


@router.get(
    "/{kb_id}/documents",
    response_model=ResponseSchema[PageResult[DocumentRead]],
    summary="文档列表",
)
async def list_documents(
    kb_id: int,
    params: PageParams = Depends(),
    status: DocumentStatus | None = Query(default=None, description="处理状态"),
    svc: KnowledgeService = Depends(get_knowledge_service),
) -> ResponseSchema[PageResult[DocumentRead]]:
    return ResponseSchema(
        data=await svc.list_documents(
            kb_id=kb_id,
            params=params,
            status=status,
        )
    )


@router.get(
    "/{kb_id}/documents/{doc_id}",
    response_model=ResponseSchema[DocumentRead],
    summary="文档详情",
)
async def get_document(
    kb_id: int,
    doc_id: int,
    svc: KnowledgeService = Depends(get_knowledge_service),
) -> ResponseSchema[DocumentRead]:
    return ResponseSchema(
        data=await svc.get_document(kb_id=kb_id, doc_id=doc_id)
    )


@router.get(
    "/{kb_id}/documents/{doc_id}/download",
    response_class=Response,
    summary="下载文档原文件",
    responses={
        200: {
            "content": {"application/octet-stream": {}},
            "description": "文档二进制内容",
        }
    },
)
async def download_document(
    kb_id: int,
    doc_id: int,
    svc: KnowledgeService = Depends(get_knowledge_service),
) -> Response:
    result = await svc.download_document(kb_id=kb_id, doc_id=doc_id)
    return Response(
        content=result.data,
        media_type=result.content_type,
        headers={
            "Content-Disposition": (
                "attachment; filename*=UTF-8''" + quote(result.file_name)
            )
        },
    )


@router.post(
    "/{kb_id}/documents/{doc_id}/retry",
    response_model=ResponseSchema[DocumentRead],
    summary="重新处理文档",
)
async def retry_document(
    kb_id: int,
    doc_id: int,
    background_tasks: BackgroundTasks,
    svc: KnowledgeService = Depends(get_knowledge_service),
) -> ResponseSchema[DocumentRead]:
    return ResponseSchema(
        data=await svc.retry_document(
            kb_id=kb_id,
            doc_id=doc_id,
            background_tasks=background_tasks,
        )
    )


@router.delete(
    "/{kb_id}/documents/{doc_id}",
    response_model=ResponseSchema[None],
    summary="删除文档",
)
async def delete_document(
    kb_id: int,
    doc_id: int,
    svc: KnowledgeService = Depends(get_knowledge_service),
) -> ResponseSchema[None]:
    await svc.delete_document(kb_id=kb_id, doc_id=doc_id)
    return ResponseSchema(message="删除成功")


# ===== 分段管理 =====


@router.get(
    "/{kb_id}/segments",
    response_model=ResponseSchema[PageResult[SegmentRead]],
    summary="分段列表",
)
async def list_segments(
    kb_id: int,
    params: PageParams = Depends(),
    document_id: int | None = Query(default=None, ge=1, description="文档 ID"),
    svc: KnowledgeService = Depends(get_knowledge_service),
) -> ResponseSchema[PageResult[SegmentRead]]:
    return ResponseSchema(
        data=await svc.list_segments(
            kb_id=kb_id,
            params=params,
            document_id=document_id,
        )
    )


@router.get(
    "/{kb_id}/documents/{doc_id}/segments",
    response_model=ResponseSchema[PageResult[SegmentRead]],
    summary="文档分段列表",
)
async def list_document_segments(
    kb_id: int,
    doc_id: int,
    params: PageParams = Depends(),
    svc: KnowledgeService = Depends(get_knowledge_service),
) -> ResponseSchema[PageResult[SegmentRead]]:
    return ResponseSchema(
        data=await svc.list_document_segments(
            kb_id=kb_id,
            doc_id=doc_id,
            params=params,
        )
    )


@router.put(
    "/{kb_id}/segments/{seg_id}",
    response_model=ResponseSchema[SegmentRead],
    summary="编辑分段",
)
async def update_segment(
    kb_id: int,
    seg_id: int,
    data: SegmentUpdate,
    svc: KnowledgeService = Depends(get_knowledge_service),
) -> ResponseSchema[SegmentRead]:
    return ResponseSchema(
        data=await svc.update_segment(kb_id=kb_id, seg_id=seg_id, data=data)
    )


@router.delete(
    "/{kb_id}/segments/{seg_id}",
    response_model=ResponseSchema[None],
    summary="删除分段",
)
async def delete_segment(
    kb_id: int,
    seg_id: int,
    svc: KnowledgeService = Depends(get_knowledge_service),
) -> ResponseSchema[None]:
    await svc.delete_segment(kb_id=kb_id, seg_id=seg_id)
    return ResponseSchema(message="删除成功")


# ===== 检索测试 =====


@router.post(
    "/{kb_id}/retrieval-test",
    response_model=ResponseSchema[list[RetrievalTestResult]],
    summary="测试知识库检索",
)
async def retrieval_test(
    kb_id: int,
    data: RetrievalTestRequest,
    svc: KnowledgeService = Depends(get_knowledge_service),
) -> ResponseSchema[list[RetrievalTestResult]]:
    return ResponseSchema(
        data=await svc.retrieval_test(kb_id=kb_id, data=data)
    )

from fastapi import APIRouter, Depends, UploadFile, File
from sqlalchemy.ext.asyncio import AsyncSession
from src.infra.database import get_db
from src.core.base_schema import ResponseSchema, PageResult
from src.core.deps import PageParams, get_current_user
from src.modules.KnowledgeBase.schema import (
    KnowledgeBaseCreate, KnowledgeBaseUpdate, KnowledgeBaseRead,
    DocumentRead, SegmentRead, SegmentUpdate,
)
from src.modules.KnowledgeBase.service import KnowledgeService
from src.modules.user.model import User

router = APIRouter(
    prefix="/knowledge-bases",
    tags=["知识库管理"],
    dependencies=[Depends(get_current_user)],
)


def get_knowledge_service(db: AsyncSession = Depends(get_db)) -> KnowledgeService:
    return KnowledgeService(db)


# ===== 知识库 CRUD =====

@router.post("", response_model=ResponseSchema[KnowledgeBaseRead], summary="创建知识库")
async def create_kb(
    data: KnowledgeBaseCreate,
    current_user: User = Depends(get_current_user),
    svc: KnowledgeService = Depends(get_knowledge_service),
):
    result = await svc.create_kb(data, current_user=current_user.username)
    return ResponseSchema(data=result)


@router.get("", response_model=ResponseSchema[PageResult[KnowledgeBaseRead]], summary="知识库列表")
async def list_kbs(
    params: PageParams = Depends(),
    svc: KnowledgeService = Depends(get_knowledge_service),
):
    page_result = await svc.list_kbs(params)
    return ResponseSchema(data=page_result)


@router.get("/{kb_id}", response_model=ResponseSchema[KnowledgeBaseRead], summary="知识库详情")
async def get_kb(
    kb_id: int,
    svc: KnowledgeService = Depends(get_knowledge_service),
):
    result = await svc.get_kb(kb_id)
    return ResponseSchema(data=result)


@router.put("/{kb_id}", response_model=ResponseSchema[KnowledgeBaseRead], summary="更新知识库")
async def update_kb(
    kb_id: int, data: KnowledgeBaseUpdate,
    svc: KnowledgeService = Depends(get_knowledge_service),
):
    result = await svc.update_kb(kb_id, data)
    return ResponseSchema(data=result)


@router.delete("/{kb_id}", response_model=ResponseSchema, summary="删除知识库")
async def delete_kb(
    kb_id: int,
    svc: KnowledgeService = Depends(get_knowledge_service),
):
    await svc.delete_kb(kb_id)
    return ResponseSchema(message="删除成功")


# ===== 文档管理 =====

@router.post("/{kb_id}/documents", response_model=ResponseSchema[DocumentRead], summary="上传文档")
async def upload_document(
    kb_id: int,
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    svc: KnowledgeService = Depends(get_knowledge_service),
):
    # 1. 获取文件信息
    file_name = file.filename
    file_type = file_name.rsplit(".", 1)[-1] if "." in file_name else "unknown"
    content = await file.read()
    file_size = f"{len(content) / (1024 * 1024):.2f} MB"

    # 2. TODO: 上传到 MinIO
    # from src.infra.minio_client import upload_file
    # file_path = await upload_file(f"knowledge/{kb_id}/{file_name}", content)
    file_path = f"knowledge/{kb_id}/{file_name}"  # 临时占位

    # 3. 记录到数据库
    result = await svc.upload_document(
        kb_id=kb_id,
        file_name=file_name,
        file_type=file_type,
        file_size=file_size,
        file_path=file_path,
        current_user=current_user.username,
    )
    return ResponseSchema(data=result)


@router.get("/{kb_id}/documents", response_model=ResponseSchema[PageResult[DocumentRead]], summary="文档列表")
async def list_documents(
    kb_id: int,
    params: PageParams = Depends(),
    svc: KnowledgeService = Depends(get_knowledge_service),
):
    page_result = await svc.list_documents(kb_id, params)
    return ResponseSchema(data=page_result)


@router.delete("/{kb_id}/documents/{doc_id}", response_model=ResponseSchema, summary="删除文档")
async def delete_document(
    kb_id: int, doc_id: int,
    svc: KnowledgeService = Depends(get_knowledge_service),
):
    await svc.delete_document(kb_id, doc_id)
    return ResponseSchema(message="删除成功")


# ===== 分段管理 =====

@router.get("/{kb_id}/segments", response_model=ResponseSchema[PageResult[SegmentRead]], summary="分段列表")
async def list_segments(
    kb_id: int,
    params: PageParams = Depends(),
    svc: KnowledgeService = Depends(get_knowledge_service),
):
    page_result = await svc.list_segments(kb_id, params)
    return ResponseSchema(data=page_result)


@router.put("/{kb_id}/segments/{seg_id}", response_model=ResponseSchema[SegmentRead], summary="编辑分段")
async def update_segment(
    kb_id: int, seg_id: int, data: SegmentUpdate,
    svc: KnowledgeService = Depends(get_knowledge_service),
):
    result = await svc.update_segment(kb_id, seg_id, data)
    return ResponseSchema(data=result)


@router.delete("/{kb_id}/segments/{seg_id}", response_model=ResponseSchema, summary="删除分段")
async def delete_segment(
    kb_id: int, seg_id: int,
    svc: KnowledgeService = Depends(get_knowledge_service),
):
    await svc.delete_segment(kb_id, seg_id)
    return ResponseSchema(message="删除成功")

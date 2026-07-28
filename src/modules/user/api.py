from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from src.core.deps import get_current_user
from src.infra.database import get_db
from src.core.base_schema import ResponseSchema
from src.modules.user.schema import UserCreate, UserRead, UserWithRolesRead, UserAssignRoles
from src.modules.user.service import UserService
from src.modules.user.model import User

router = APIRouter(prefix="/users", tags=["User"])


def get_user_service(db: AsyncSession = Depends(get_db)) -> UserService:
    return UserService(db)


@router.post("", response_model=ResponseSchema[UserRead])
async def create_user(
    data: UserCreate,
    svc: UserService = Depends(get_user_service),
):
    user = await svc.create_user(data)
    return ResponseSchema(data=UserRead.model_validate(user))


@router.get("/me", response_model=ResponseSchema[UserRead])
async def get_me(current_user: User = Depends(get_current_user)):
    """获取当前登录用户信息（需要 token）"""
    return ResponseSchema(data=UserRead.model_validate(current_user))


@router.get("", response_model=ResponseSchema[list[UserRead]])
async def list_users(
    offset: int = 0,
    limit: int = 100,
    svc: UserService = Depends(get_user_service),
):
    users = await svc.list_users(offset, limit)
    return ResponseSchema(data=[UserRead.model_validate(u) for u in users])


@router.get("/{user_id}", response_model=ResponseSchema[UserWithRolesRead])
async def get_user(
    user_id: int,
    svc: UserService = Depends(get_user_service),
):
    user = await svc.get_user(user_id)
    return ResponseSchema(data=UserRead.model_validate(user))

# PUT   /api/v1/users/{user_id}/roles   给用户分配角色
@router.put("/{user_id}/roles", response_model=ResponseSchema[UserRead], summary="给用户分配角色")
async def assign_roles_to_user(
    user_id: int,
    role_ids: UserAssignRoles,
    svc: UserService = Depends(get_user_service),
):
    user = await svc.assign_roles(user_id, role_ids)
    return ResponseSchema(data=UserRead.model_validate(user))

# GET   /api/v1/users/{user_id}/roles   查看用户的角色列表
@router.get("/{user_id}/roles", response_model=ResponseSchema[list[UserWithRolesRead]], summary="查看用户的角色列表")
async def get_user_roles(
    user_id: int,
    svc: UserService = Depends(get_user_service),
):
    user = await svc.get_user_with_roles(user_id)
    return ResponseSchema(data=[UserWithRolesRead.model_validate(user)])

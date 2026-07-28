from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import noload

from src.core.base_repository import BaseRepository
from src.modules.permission.model import Permission
from src.modules.role.model import Role, role_permissions, user_roles
from src.modules.user.model import User


class UserRepository(BaseRepository[User]):
    SEARCH_FIELDS = ["username", "email"]

    def __init__(self, db: AsyncSession):
        super().__init__(User, db)

    async def get_by_username(self, username: str) -> User | None:
        stmt = (
            select(User)
            .options(noload(User.roles))
            .where(User.username == username)
        )
        result = await self.db.execute(stmt)
        return result.scalar_one_or_none()

    async def get_by_email(self, email: str) -> User | None:
        stmt = (
            select(User)
            .options(noload(User.roles))
            .where(User.email == email)
        )
        result = await self.db.execute(stmt)
        return result.scalar_one_or_none()

    async def get_for_auth(self, user_id: int) -> User | None:
        """查询认证用户，但不预加载角色与权限。"""
        stmt = (
            select(User)
            .options(noload(User.roles))
            .where(User.id == user_id)
        )
        result = await self.db.execute(stmt)
        return result.scalar_one_or_none()

    async def get_access_codes(
        self,
        user_id: int,
    ) -> tuple[set[str], set[str]]:
        """查询用户的全部权限 code 和角色 code。"""
        role_stmt = (
            select(Role.code)
            .join(user_roles, user_roles.c.role_id == Role.id)
            .where(user_roles.c.user_id == user_id)
        )
        permission_stmt = (
            select(Permission.code)
            .join(
                role_permissions,
                role_permissions.c.permission_id == Permission.id,
            )
            .join(
                user_roles,
                user_roles.c.role_id == role_permissions.c.role_id,
            )
            .where(user_roles.c.user_id == user_id)
        )
        roles = set((await self.db.scalars(role_stmt)).all())
        permissions = set((await self.db.scalars(permission_stmt)).all())
        return permissions, roles

    async def search_page(
        self,
        offset: int,
        limit: int,
        keyword: str | None,
    ) -> tuple[list[User], int]:
        return await self.get_page(
            offset=offset,
            limit=limit,
            keyword=keyword,
            search_fields=self.SEARCH_FIELDS,
        )

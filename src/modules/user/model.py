from datetime import datetime

from sqlalchemy import DateTime, String
from sqlalchemy.orm import Mapped, mapped_column, relationship
from src.core.base_model import BaseModel
from src.modules.role.model import user_roles


class User(BaseModel):
    __tablename__ = "users"

    username: Mapped[str] = mapped_column(String(50), unique=True, index=True, comment="用户名")
    email: Mapped[str] = mapped_column(String(100), unique=True, index=True, comment="邮箱")
    hashed_password: Mapped[str] = mapped_column(String(255), comment="密码哈希")
    is_active: Mapped[bool] = mapped_column(default=True, comment="是否启用")
    is_superuser: Mapped[bool] = mapped_column(default=False, comment="是否为超级管理员")
    last_login: Mapped[datetime | None] = mapped_column(DateTime, nullable=True, comment="最后登录时间")
    roles: Mapped[list["Role"]]= relationship(
        "Role",
        secondary=user_roles,
        lazy="selectin",
    )
from datetime import datetime
from sqlalchemy.ext.asyncio import AsyncSession
from redis.asyncio import Redis
from src.core.exceptions import BizException
from src.modules.user.repository import UserRepository
from src.modules.auth.schema import LoginRequest, TokenResponse
from src.utils.jwt_utils import encode_jwt
from src.utils.password_utils import verify_password

CAPTCHA_PREFIX = "captcha:"

class AuthService:
    def __init__(self, db: AsyncSession, redis: Redis):
        self.user_repo = UserRepository(db)
        self.redis = redis
        self.db = db

    async def login(self, data: LoginRequest) -> TokenResponse:
        # 1. 验证验证码
        redis_key = f"{CAPTCHA_PREFIX}{data.captcha_key}"
        stored_code = await self.redis.get(redis_key)

        if not stored_code or stored_code != data.captcha_code.lower():
            raise BizException(code=400, message="验证码错误或已过期")

        await self.redis.delete(redis_key)

        # 2. 查找用户
        user = await self.user_repo.get_by_username(data.username)
        if not user:
            raise BizException(code=400, message="用户名或密码错误")

        # 3. 校验密码
        if not verify_password(data.password, user.hashed_password):
            raise BizException(code=400, message="用户名或密码错误")

        # 4. 检查账号状态
        if not user.is_active:
            raise BizException(code=400, message="账号已被禁用")

        # 5. 更新最后登录时间
        user.last_login = datetime.now()
        await self.db.flush()

        # 6. 签发 JWT
        token = encode_jwt({"sub": str(user.id), "username": user.username})

        return TokenResponse(access_token=token)
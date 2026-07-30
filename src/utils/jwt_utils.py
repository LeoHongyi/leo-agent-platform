from datetime import datetime, timedelta, timezone
import jwt
from fastapi.security import HTTPBearer

SECRET_KEY = "e7b6e89119d3d77d8a8b4c9aba7a425903e0658bff817637893e44bf1d581a54"
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30

# Swagger 中直接粘贴登录接口返回的 JWT，无需模拟 OAuth2 密码流。
bearer_scheme = HTTPBearer(
    scheme_name="BearerAuth",
    description="粘贴登录接口返回的 JWT Token；无需输入 Bearer 前缀",
    bearerFormat="JWT",
    auto_error=False,
)

def encode_jwt(payload: dict) -> str:
    payload_copy = payload.copy()
    # 更新过期时间为30分钟后。注意使用 utc 时间
    payload_copy["exp"] = datetime.now(timezone.utc) + timedelta(
        minutes=ACCESS_TOKEN_EXPIRE_MINUTES
    )
    payload_copy["iat"] = datetime.now(timezone.utc)

    token = jwt.encode(payload_copy, key =SECRET_KEY, algorithm=ALGORITHM)
    return token

def verify_jwt(token: str) -> dict:
    try:
        payload = jwt.decode(token, key=SECRET_KEY, algorithms=[ALGORITHM])
        return payload
    except jwt.ExpiredSignatureError:
        raise Exception("token已经过期")
    except jwt.InvalidTokenError:
        raise Exception("非法token")
    except Exception as e:
        raise Exception(f"token校验失败: {str(e)}")

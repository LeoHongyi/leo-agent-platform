import uuid
import base64
import random
import string
from io import BytesIO
from captcha.image import ImageCaptcha
from fastapi import APIRouter, Depends
from redis.asyncio import Redis
from src.core.base_schema import ResponseSchema
from src.core.exceptions import BizException
from src.modules.captcha.schema import CaptchaVerifyRequest, CaptchaRead
from src.infra.redis_cache import get_redis_client

router = APIRouter(prefix="/captcha", tags=["Captcha"])

CAPTCHA_EXPIRE = 300  # 5分钟
CAPTCHA_PREFIX = "captcha:"


def _random_code(length: int = 4) -> str:
    """生成随机字母+数字验证码"""
    chars = string.ascii_uppercase + string.digits
    # 去掉容易混淆的字符
    chars = chars.replace("O", "").replace("0", "").replace("I", "").replace("1", "")
    return "".join(random.choices(chars, k=length))

@router.get("", response_model=ResponseSchema[CaptchaRead])
async def get_captcha(redis: Redis = Depends(get_redis_client)):
    """获取图片验证码，返回 key 和 base64 图片"""
    code = _random_code()
    key = str(uuid.uuid4())

    # 生成图片
    image_captcha = ImageCaptcha(width=162, height=54)
    image_data = image_captcha.generate(code)
    b64 = base64.b64encode(image_data.read()).decode()

    # 存入 Redis，不区分大小写统一转小写
    await redis.set(f"{CAPTCHA_PREFIX}{key}", code.lower(), ex=CAPTCHA_EXPIRE)

    return ResponseSchema(data=CaptchaRead(key=key, image=f"data:image/png;base64,{b64}"))

@router.post("/verify", response_model=ResponseSchema[None])
async def verify_captcha(
    body: CaptchaVerifyRequest,
    redis: Redis = Depends(get_redis_client),
):
    """验证验证码，验证成功后立即删除（一次性）"""
    redis_key = f"{CAPTCHA_PREFIX}{body.key}"
    stored = await redis.get(redis_key)

    if not stored:
        raise BizException(code=400, message="验证码已过期或不存在")

    if stored != body.code.lower():
        raise BizException(code=400, message="验证码错误")

    await redis.delete(redis_key)
    return ResponseSchema(message="验证成功")

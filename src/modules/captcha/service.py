import base64
import secrets
import string
import uuid

from captcha.image import ImageCaptcha
from redis.asyncio import Redis

from src.core.exceptions import BizException
from src.modules.captcha.schema import CaptchaRead, CaptchaVerifyRequest

CAPTCHA_CODE_LENGTH = 4
CAPTCHA_EXPIRE_SECONDS = 300
CAPTCHA_KEY_PREFIX = "captcha:"
CAPTCHA_CHARACTERS = (
    string.ascii_uppercase + string.digits
).translate(str.maketrans("", "", "O0I1"))


class CaptchaService:
    """验证码服务"""

    def __init__(self, redis: Redis) -> None:
        self.redis = redis

    async def create(self) -> CaptchaRead:
        """生成并存储图片验证码"""
        code = self._generate_code()
        key = str(uuid.uuid4())
        image = self._generate_image(code)
        await self.redis.set(
            f"{CAPTCHA_KEY_PREFIX}{key}",
            code.lower(),
            ex=CAPTCHA_EXPIRE_SECONDS,
        )
        return CaptchaRead(key=key, image=image)

    async def verify(self, *, data: CaptchaVerifyRequest) -> None:
        """校验并消费图片验证码"""
        redis_key = f"{CAPTCHA_KEY_PREFIX}{data.key}"
        stored_code = await self.redis.get(redis_key)
        if not stored_code:
            raise BizException(code=400, message="验证码已过期或不存在")
        if stored_code != data.code.lower():
            raise BizException(code=400, message="验证码错误")
        await self.redis.delete(redis_key)

    @staticmethod
    def _generate_code() -> str:
        return "".join(
            secrets.choice(CAPTCHA_CHARACTERS)
            for _ in range(CAPTCHA_CODE_LENGTH)
        )

    @staticmethod
    def _generate_image(code: str) -> str:
        image_captcha = ImageCaptcha(width=162, height=54)
        image_data = image_captcha.generate(code)
        encoded_image = base64.b64encode(image_data.read()).decode("ascii")
        return f"data:image/png;base64,{encoded_image}"

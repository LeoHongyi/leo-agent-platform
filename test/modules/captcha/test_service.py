import base64
from unittest.mock import AsyncMock

import pytest

from src.core.exceptions import BizException
from src.modules.captcha.schema import CaptchaVerifyRequest
from src.modules.captcha.service import (
    CAPTCHA_CODE_LENGTH,
    CAPTCHA_EXPIRE_SECONDS,
    CAPTCHA_KEY_PREFIX,
    CaptchaService,
)


@pytest.mark.asyncio
async def test_create_captcha() -> None:
    redis = AsyncMock()
    service = CaptchaService(redis)

    captcha = await service.create()

    redis_key, stored_code = redis.set.await_args.args
    assert redis_key == f"{CAPTCHA_KEY_PREFIX}{captcha.key}"
    assert len(stored_code) == CAPTCHA_CODE_LENGTH
    assert stored_code == stored_code.lower()
    assert set(stored_code).isdisjoint({"o", "0", "i", "1"})
    assert redis.set.await_args.kwargs == {"ex": CAPTCHA_EXPIRE_SECONDS}
    image = base64.b64decode(captcha.image.removeprefix("data:image/png;base64,"))
    assert image.startswith(b"\x89PNG")


@pytest.mark.asyncio
async def test_verify_captcha_success() -> None:
    redis = AsyncMock()
    redis.get.return_value = "ab2c"
    service = CaptchaService(redis)
    data = CaptchaVerifyRequest(key="captcha-key", code="AB2C")

    await service.verify(data=data)

    redis.get.assert_awaited_once_with(f"{CAPTCHA_KEY_PREFIX}{data.key}")
    redis.delete.assert_awaited_once_with(f"{CAPTCHA_KEY_PREFIX}{data.key}")


@pytest.mark.asyncio
@pytest.mark.parametrize(
    ("stored_code", "submitted_code", "message"),
    [
        (None, "AB2C", "验证码已过期或不存在"),
        ("ab2c", "WRONG", "验证码错误"),
    ],
)
async def test_verify_captcha_failure(
    stored_code: str | None,
    submitted_code: str,
    message: str,
) -> None:
    redis = AsyncMock()
    redis.get.return_value = stored_code
    service = CaptchaService(redis)
    data = CaptchaVerifyRequest(key="captcha-key", code=submitted_code)

    with pytest.raises(BizException) as exc_info:
        await service.verify(data=data)

    assert exc_info.value.message == message
    redis.delete.assert_not_awaited()

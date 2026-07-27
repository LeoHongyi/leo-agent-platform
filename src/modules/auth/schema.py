from pydantic import BaseModel, Field

class LoginRequest(BaseModel):
    username: str = Field(..., description="用户名")
    password: str = Field(..., description="密码")
    captcha_key: str = Field(..., description="验证码 key")
    captcha_code: str = Field(..., description="验证码 code")


class TokenResponse(BaseModel):
    access_token: str = Field(..., description="访问令牌")
    token_type: str = Field(default="bearer", description="令牌类型")
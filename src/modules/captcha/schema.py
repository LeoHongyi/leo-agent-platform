from pydantic import BaseModel

class CaptchaResponse(BaseModel):

    key: str
    images: str


class  VerifyCaptchaRequest(BaseModel):

    key: str
    code: str

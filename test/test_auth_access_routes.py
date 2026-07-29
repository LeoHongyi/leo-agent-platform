from src.main import app


def test_access_and_logout_routes_require_bearer_auth() -> None:
    paths = app.openapi()["paths"]
    access = paths["/api/v1/auth/access"]["get"]
    logout = paths["/api/v1/auth/logout"]["post"]

    assert access["security"]
    assert logout["security"]


def test_openapi_uses_pasteable_http_bearer_token() -> None:
    security_schemes = app.openapi()["components"]["securitySchemes"]

    assert "OAuth2PasswordBearer" not in security_schemes
    assert security_schemes["BearerAuth"] == {
        "type": "http",
        "description": "粘贴登录接口返回的 JWT Token；无需输入 Bearer 前缀",
        "scheme": "bearer",
        "bearerFormat": "JWT",
    }

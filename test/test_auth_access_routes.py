from src.main import app


def test_access_and_logout_routes_require_bearer_auth() -> None:
    paths = app.openapi()["paths"]
    access = paths["/api/v1/auth/access"]["get"]
    logout = paths["/api/v1/auth/logout"]["post"]

    assert access["security"]
    assert logout["security"]

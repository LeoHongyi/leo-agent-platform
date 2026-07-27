from src.utils.jwt_utils import encode_jwt, verify_jwt

def test_encode_jwt():
    payload = {"sub": "testuser", "role": "admin"}
    token = encode_jwt(payload)
    print(f"token: {token}")

    payload_verify = verify_jwt(token)
    print(f"payload_verify: {payload_verify}")
    assert payload_verify is not None
    assert token is not None

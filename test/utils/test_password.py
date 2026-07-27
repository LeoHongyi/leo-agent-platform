from src.utils.password_utils import verify_password, hash_password
import pytest

@pytest.mark.parametrize("password", ["123456", "password123", "Abc@123"])
def test_password_utils(password: str):
    hashed_password = hash_password(password)
    print(f"原密码：{password} 加密后: {hashed_password}")
    assert verify_password(password, hashed_password) is True
    assert verify_password("wrong_password", hashed_password) is False

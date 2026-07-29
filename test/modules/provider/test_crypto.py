import pytest
from cryptography.fernet import Fernet

from src.utils.provider_crypto import (
    ProviderApiKeyCipher,
    ProviderCryptoError,
)


def test_provider_api_key_round_trip_does_not_store_plaintext() -> None:
    cipher = ProviderApiKeyCipher(Fernet.generate_key().decode())

    encrypted = cipher.encrypt("sk-test-secret")

    assert encrypted.startswith(ProviderApiKeyCipher.PREFIX)
    assert "sk-test-secret" not in encrypted
    assert cipher.decrypt(encrypted) == "sk-test-secret"


def test_provider_api_key_cannot_be_decrypted_with_another_key() -> None:
    cipher = ProviderApiKeyCipher(Fernet.generate_key().decode())
    another_cipher = ProviderApiKeyCipher(Fernet.generate_key().decode())

    with pytest.raises(ProviderCryptoError):
        another_cipher.decrypt(cipher.encrypt("sk-test-secret"))


def test_provider_cipher_rejects_missing_key_and_legacy_plaintext() -> None:
    with pytest.raises(ProviderCryptoError):
        ProviderApiKeyCipher("")

    cipher = ProviderApiKeyCipher(Fernet.generate_key().decode())
    with pytest.raises(ProviderCryptoError):
        cipher.decrypt("sk-legacy-plaintext")

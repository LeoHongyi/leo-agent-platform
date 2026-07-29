from cryptography.fernet import Fernet, InvalidToken


class ProviderCryptoError(Exception):
    """Raised when provider credentials cannot be encrypted or decrypted."""


class ProviderApiKeyCipher:
    """Encrypt and decrypt provider API keys using authenticated encryption."""

    PREFIX = "fernet:v1:"

    def __init__(self, encryption_key: str):
        key = encryption_key.strip()
        if not key:
            raise ProviderCryptoError("PROVIDER_ENCRYPTION_KEY is not configured")

        try:
            self._fernet = Fernet(key.encode("utf-8"))
        except (TypeError, ValueError) as exc:
            raise ProviderCryptoError(
                "PROVIDER_ENCRYPTION_KEY is not a valid Fernet key"
            ) from exc

    def encrypt(self, plaintext: str) -> str:
        if not plaintext:
            raise ProviderCryptoError("API key cannot be empty")

        token = self._fernet.encrypt(plaintext.encode("utf-8")).decode("utf-8")
        return f"{self.PREFIX}{token}"

    def decrypt(self, ciphertext: str) -> str:
        if not ciphertext.startswith(self.PREFIX):
            raise ProviderCryptoError("unsupported provider API key format")

        token = ciphertext.removeprefix(self.PREFIX)
        try:
            return self._fernet.decrypt(token.encode("utf-8")).decode("utf-8")
        except (InvalidToken, UnicodeDecodeError) as exc:
            raise ProviderCryptoError("provider API key cannot be decrypted") from exc

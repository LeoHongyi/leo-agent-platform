from unittest.mock import MagicMock

import pytest
from minio.error import S3Error

from src.infra import minio_client


def s3_error(code: str) -> S3Error:
    return S3Error(
        response=None,
        code=code,
        message="storage error",
        resource="/knowledge-docs/object",
        request_id="request-id",
        host_id="host-id",
        bucket_name="knowledge-docs",
        object_name="object",
    )


def test_upload_uses_configured_bucket_length_and_content_type(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    client = MagicMock()
    monkeypatch.setattr(minio_client, "_minio_client", client)

    result = minio_client.upload_file(
        "kb/3/guide.txt",
        b"content",
        "text/plain",
    )

    assert result == "kb/3/guide.txt"
    kwargs = client.put_object.call_args.kwargs
    assert kwargs["bucket_name"] == minio_client.settings.MINIO_BUCKET
    assert kwargs["object_name"] == "kb/3/guide.txt"
    assert kwargs["length"] == 7
    assert kwargs["content_type"] == "text/plain"
    assert kwargs["data"].read() == b"content"


def test_download_always_closes_and_releases_response(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    response = MagicMock()
    response.read.return_value = b"document"
    client = MagicMock()
    client.get_object.return_value = response
    monkeypatch.setattr(minio_client, "_minio_client", client)

    assert minio_client.download_file("kb/3/guide.txt") == b"document"

    response.close.assert_called_once_with()
    response.release_conn.assert_called_once_with()


@pytest.mark.parametrize("code", ["NoSuchKey", "NoSuchObject", "NoSuchBucket"])
def test_delete_ignores_only_not_found_errors(
    monkeypatch: pytest.MonkeyPatch,
    code: str,
) -> None:
    client = MagicMock()
    client.remove_object.side_effect = s3_error(code)
    monkeypatch.setattr(minio_client, "_minio_client", client)

    minio_client.delete_file("kb/3/missing.txt")

    client.remove_object.assert_called_once_with(
        minio_client.settings.MINIO_BUCKET,
        "kb/3/missing.txt",
    )


@pytest.mark.parametrize("code", ["SignatureDoesNotMatch", "AccessDenied"])
def test_delete_propagates_authentication_and_authorization_errors(
    monkeypatch: pytest.MonkeyPatch,
    code: str,
) -> None:
    client = MagicMock()
    error = s3_error(code)
    client.remove_object.side_effect = error
    monkeypatch.setattr(minio_client, "_minio_client", client)

    with pytest.raises(S3Error) as exc_info:
        minio_client.delete_file("kb/3/guide.txt")

    assert exc_info.value is error


def test_ensure_bucket_creates_only_when_missing(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    client = MagicMock()
    monkeypatch.setattr(minio_client, "_minio_client", client)

    client.bucket_exists.return_value = True
    minio_client.ensure_bucket_exists()
    client.make_bucket.assert_not_called()

    client.bucket_exists.return_value = False
    minio_client.ensure_bucket_exists()
    client.make_bucket.assert_called_once_with(minio_client.settings.MINIO_BUCKET)

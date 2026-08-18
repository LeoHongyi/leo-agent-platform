import sys
from pathlib import Path

from minio.error import S3Error

PROJECT_ROOT = Path(__file__).resolve().parents[1]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from src.core.config import get_settings  # noqa: E402
from src.infra.minio_client import get_minio_client  # noqa: E402


def upload() -> None:
    """使用项目 MinIO 配置上传本地测试文件。"""
    settings = get_settings()
    client = get_minio_client()
    source_file = Path(__file__).with_name("bbb.txt")
    if not source_file.is_file():
        raise FileNotFoundError(f"测试文件不存在: {source_file}")

    bucket_name = settings.MINIO_BUCKET
    destination_file = f"smoke-tests/{source_file.name}"
    if not client.bucket_exists(bucket_name):
        client.make_bucket(bucket_name)
        print(f"Created bucket: {bucket_name}")

    client.fput_object(
        bucket_name,
        destination_file,
        str(source_file),
    )
    protocol = "https" if settings.MINIO_SECURE else "http"
    print(
        f"Uploaded {source_file} to "
        f"{protocol}://{settings.MINIO_ENDPOINT}/{bucket_name}/{destination_file}"
    )


if __name__ == "__main__":
    try:
        upload()
    except (OSError, S3Error) as exc:
        raise SystemExit(f"MinIO upload failed: {exc}") from exc

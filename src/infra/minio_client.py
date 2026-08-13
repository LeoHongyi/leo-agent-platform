import io
from minio import Minio
from minio.error import S3Error
from src.core.config import get_settings

settings = get_settings()

# 模块级别创建单例（应用启动时初始化一次，全局复用）
# Minio 客户端是线程安全的，多协程下可以安全共享同一个实例
_minio_client = Minio(
    endpoint=settings.MINIO_ENDPOINT,
    access_key=settings.MINIO_ACCESS_KEY,
    secret_key=settings.MINIO_SECRET_KEY,
    secure=settings.MINIO_SECURE,
)


def get_minio_client() -> Minio:
    """
    返回全局单例 MinIO 客户端。
    供 FastAPI Depends() 注入或直接调用。
    """
    return _minio_client


def ensure_bucket_exists() -> None:
    """
    确保默认 bucket 存在，不存在则创建。
    只在应用启动时调用一次（在 lifespan 中），不在每次上传时调用。
    """
    if not _minio_client.bucket_exists(settings.MINIO_BUCKET):
        _minio_client.make_bucket(settings.MINIO_BUCKET)


def upload_file(
    object_name: str,
    data: bytes,
    content_type: str = "application/octet-stream",
) -> str:
    """
    上传文件到默认 bucket。
    返回 object_name（MinIO 存储路径），供数据库记录。
    """
    _minio_client.put_object(
        bucket_name=settings.MINIO_BUCKET,
        object_name=object_name,
        data=io.BytesIO(data),
        length=len(data),
        content_type=content_type,
    )
    return object_name


def download_file(object_name: str) -> bytes:
    """从默认 bucket 下载文件，返回字节内容。"""
    response = _minio_client.get_object(settings.MINIO_BUCKET, object_name)
    try:
        return response.read()
    finally:
        response.close()
        response.release_conn()


def delete_file(object_name: str) -> None:
    """从默认 bucket 删除文件，文件不存在时静默忽略。"""
    try:
        _minio_client.remove_object(settings.MINIO_BUCKET, object_name)
    except S3Error as exc:
        if exc.code not in {"NoSuchKey", "NoSuchObject", "NoSuchBucket"}:
            raise

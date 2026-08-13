import asyncio
from contextlib import asynccontextmanager

from fastapi import FastAPI
from loguru import logger

from src.core.config import get_settings
from src.core.logger import setup_logger
from src.infra.database import engine
from src.core.exceptions import register_exception_handlers
from src.middlewares.logging import LoggingMiddleware
from src.modules.user.api import router as user_router
from src.modules.captcha.api import router as captcha_router
from src.modules.auth.api import router as auth_router
from src.modules.permission.api import router as permission_router
from src.modules.role.api import router as role_router
from src.modules.provider.api import router as provider_router
from src.modules.model.api import router as model_router
from src.modules.prompt.api import router as prompt_router
from src.modules.KnowledgeBase.api import router as knowledge_router
from src.modules.tool.api import router as tool_router
from src.modules.agent.api import router as agent_router
from src.infra.minio_client import ensure_bucket_exists
from src.modules.KnowledgeBase.tasks import process_storage_cleanup_jobs


@asynccontextmanager
async def lifespan(app: FastAPI):
    setup_logger()
    settings = get_settings()
    logger.info(f"{settings.APP_NAME} starting | env={settings.APP_ENV}")
    try:
        await asyncio.to_thread(ensure_bucket_exists)
        logger.info(f"MinIO 连接成功，bucket: {settings.MINIO_BUCKET}")
    except Exception as exc:
        logger.warning(f"MinIO 连接失败，文档上传功能不可用: {exc}")
    else:
        try:
            cleaned = await process_storage_cleanup_jobs()
            if cleaned:
                logger.info(f"已恢复并完成 {cleaned} 个 MinIO 清理任务")
        except Exception as exc:
            logger.warning(f"MinIO 清理任务恢复失败: {exc}")

    yield
    await engine.dispose()
    logger.info(f"{settings.APP_NAME} shutdown")


def create_app() -> FastAPI:
    settings = get_settings()
    app = FastAPI(
        title=settings.APP_NAME,
        debug=settings.APP_DEBUG,
        lifespan=lifespan,
        swagger_ui_parameters={"persistAuthorization": True},
    )

    # 异常处理
    register_exception_handlers(app)

    # 中间件
    app.add_middleware(LoggingMiddleware)

    # 注册模块路由
    app.include_router(user_router, prefix="/api/v1")

    app.include_router(captcha_router, prefix="/api/v1")
    app.include_router(auth_router, prefix="/api/v1")
    app.include_router(permission_router, prefix="/api/v1")
    app.include_router(role_router, prefix="/api/v1")

    app.include_router(provider_router, prefix="/api/v1")
    app.include_router(model_router, prefix="/api/v1")

    app.include_router(prompt_router, prefix="/api/v1")

    app.include_router(knowledge_router, prefix="/api/v1")

    app.include_router(tool_router, prefix="/api/v1")

    app.include_router(agent_router, prefix="/api/v1")
    return app

app = create_app()

# 健康检查端点
@app.get("/health")
async def root():
    return {"status": "ok"}

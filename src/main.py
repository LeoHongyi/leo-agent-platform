from contextlib import asynccontextmanager
from fastapi import FastAPI
from loguru import logger
from src.core.config import get_settings
from src.core.logger import setup_logger
from src.infra.database import engine
from src.core.exceptions import register_exception_handlers
from src.middlewares.logging import LoggingMiddleware
from src.modules.user.api import router as user_router

@asynccontextmanager
async def lifespan(app: FastAPI):
    setup_logger()
    settings = get_settings()
    logger.info(f"{settings.APP_NAME} starting | env={settings.APP_ENV}")
    yield
    await engine.dispose()
    logger.info(f"{settings.APP_NAME} shutdown")

def create_app() -> FastAPI:
    settings = get_settings()
    app = FastAPI(
        title=settings.APP_NAME,
        debug=settings.APP_DEBUG,
        lifespan=lifespan,
    )

    # 异常处理
    register_exception_handlers(app)

    # 中间件
    app.add_middleware(LoggingMiddleware)

    # 注册模块路由
    app.include_router(user_router, prefix="/api/v1")

    return app

app = create_app()

# 健康检查端点
@app.get("/health")
async def root():
    return {"status": "ok"}
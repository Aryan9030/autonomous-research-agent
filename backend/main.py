# backend/main.py

from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from contextlib import asynccontextmanager
from loguru import logger
import uvicorn
import sys
import os

from api.routes import router
from api.websockets import websocket_manager
from database.postgres import init_db, check_db_connection
from core.config import settings


# ═══════════════════════════════════════════════════════
#   LOGGING
# ═══════════════════════════════════════════════════════

logger.remove()
logger.add(
    sys.stdout,
    format=(
        "<green>{time:HH:mm:ss}</green> | "
        "<level>{level: <8}</level> | "
        "<level>{message}</level>"
    ),
    level="INFO"
)

# Create logs directory
os.makedirs("logs", exist_ok=True)

logger.add(
    "logs/app.log",
    rotation="10 MB",
    retention="7 days",
    level="DEBUG"
)


# ═══════════════════════════════════════════════════════
#   LIFESPAN
# ═══════════════════════════════════════════════════════

@asynccontextmanager
async def lifespan(app: FastAPI):
    """App startup and shutdown"""

    # STARTUP
    logger.info("🚀 Starting Autonomous Research Agent API...")

    try:
        init_db()
        logger.info("✅ Database initialized")
    except Exception as e:
        logger.error(f"DB init failed: {e}")

    if check_db_connection():
        logger.info("✅ Database ready")

    logger.info(f"✅ API Ready | Model: {settings.PRIMARY_MODEL}")
    logger.info(f"📡 Frontend: {settings.FRONTEND_URL}")
    logger.info(f"🌐 Backend: http://localhost:8000")
    logger.info(f"📚 Docs: http://localhost:8000/docs")

    yield

    # SHUTDOWN
    logger.info("Shutting down...")


# ═══════════════════════════════════════════════════════
#   FASTAPI APP
# ═══════════════════════════════════════════════════════

app = FastAPI(
    title="Autonomous Research Agent API",
    description="Multi-agent AI research system",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan
)


# ═══════════════════════════════════════════════════════
#   MIDDLEWARE
# ═══════════════════════════════════════════════════════

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"]
)


# ═══════════════════════════════════════════════════════
#   ROUTES
# ═══════════════════════════════════════════════════════

app.include_router(router, prefix="/api/v1", tags=["Research"])


# ═══════════════════════════════════════════════════════
#   WEBSOCKET
# ═══════════════════════════════════════════════════════

@app.websocket("/ws/{session_id}")
async def websocket_endpoint(websocket: WebSocket, session_id: str):
    """WebSocket for real-time updates"""

    await websocket_manager.connect(websocket, session_id)

    try:
        while True:
            data = await websocket.receive_text()

            if data == "ping":
                await websocket.send_json({
                    "event_type": "pong",
                    "data": {"status": "alive"}
                })

    except WebSocketDisconnect:
        websocket_manager.disconnect(session_id)
    except Exception as e:
        logger.error(f"WebSocket error: {e}")
        websocket_manager.disconnect(session_id)


# ═══════════════════════════════════════════════════════
#   ROOT
# ═══════════════════════════════════════════════════════

@app.get("/", tags=["Root"])
async def root():
    return {
        "name": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "status": "running",
        "docs": "/docs",
        "api": "/api/v1"
    }


@app.get("/ping", tags=["Root"])
async def ping():
    return {"ping": "pong", "status": "ok"}


# ═══════════════════════════════════════════════════════
#   ERROR HANDLERS
# ═══════════════════════════════════════════════════════

@app.exception_handler(404)
async def not_found_handler(request, exc):
    return JSONResponse(
        status_code=404,
        content={"error": "Not found", "message": str(exc.detail)}
    )


@app.exception_handler(500)
async def server_error_handler(request, exc):
    logger.error(f"Server error: {exc}")
    return JSONResponse(
        status_code=500,
        content={
            "error": "Internal server error",
            "message": "Something went wrong"
        }
    )


# ═══════════════════════════════════════════════════════
#   RUN
# ═══════════════════════════════════════════════════════

if __name__ == "__main__":
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_level="info"
    )
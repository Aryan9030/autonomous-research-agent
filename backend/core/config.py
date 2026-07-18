# backend/core/config.py

from pydantic_settings import BaseSettings
from typing import Optional
from functools import lru_cache


class Settings(BaseSettings):

    # ─── APP ───────────────────────────────────────────
    APP_NAME: str = "Autonomous Research Agent"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = True
    FRONTEND_URL: str = "http://localhost:5173"
    BACKEND_URL: str = "http://localhost:8000"

    # ─── API KEYS ──────────────────────────────────────
    GROQ_API_KEY: str
    OPENAI_API_KEY: Optional[str] = "not-used"
    GOOGLE_API_KEY: Optional[str] = "not-used"
    SEMANTIC_SCHOLAR_API_KEY: Optional[str] = None

    # ─── DATABASE ──────────────────────────────────────
    DATABASE_URL: str = "sqlite:///./research.db"

    # ─── REDIS ─────────────────────────────────────────
    REDIS_URL: str = "redis://localhost:6379"

    # ─── VECTOR DB ─────────────────────────────────────
    CHROMA_PERSIST_DIR: str = "./chroma_db"

    # ─── AGENT SETTINGS ────────────────────────────────
    MAX_PAPERS_PER_SEARCH: int = 20
    MAX_AGENT_ITERATIONS: int = 10
    AGENT_TIMEOUT: int = 300

    # ─── MODEL SETTINGS (Groq - FREE & FAST) ───────────
    PRIMARY_MODEL: str = "llama-3.3-70b-versatile"
    FAST_MODEL: str = "llama-3.1-8b-instant"
    EMBEDDING_MODEL: str = "sentence-transformers/all-MiniLM-L6-v2"

    class Config:
        env_file = ".env"
        case_sensitive = True
        extra = "ignore"


@lru_cache()
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
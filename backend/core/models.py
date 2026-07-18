# backend/core/models.py

from sqlalchemy import (
    Column, String, DateTime,
    JSON, Text, Integer, Boolean
)
from sqlalchemy.ext.declarative import declarative_base
from datetime import datetime
import uuid

Base = declarative_base()


# ─── STATUS CONSTANTS ─────────────────────────────────

class ResearchStatus:
    PENDING = "pending"
    PLANNING = "planning"
    RESEARCHING = "researching"
    ANALYZING = "analyzing"
    WRITING = "writing"
    FACT_CHECKING = "fact_checking"
    COMPLETED = "completed"
    FAILED = "failed"


# ─── MODELS ────────────────────────────────────────────

class ResearchSession(Base):
    __tablename__ = "research_sessions"

    id = Column(
        String,
        primary_key=True,
        default=lambda: str(uuid.uuid4())
    )
    query = Column(Text, nullable=False)
    status = Column(String, default="pending")
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(
        DateTime,
        default=datetime.utcnow,
        onupdate=datetime.utcnow
    )
    completed_at = Column(DateTime, nullable=True)

    # Results
    final_report = Column(Text, nullable=True)
    outline = Column(Text, nullable=True)
    key_themes = Column(JSON, default=list)
    knowledge_gaps = Column(JSON, default=list)

    # Stats
    papers_found = Column(Integer, default=0)
    papers_analyzed = Column(Integer, default=0)
    claims_verified = Column(Integer, default=0)

    # Meta
    agent_logs = Column(JSON, default=list)
    error = Column(Text, nullable=True)
    session_metadata = Column(JSON, default=dict)


class Paper(Base):
    __tablename__ = "papers"

    id = Column(String, primary_key=True)
    session_id = Column(String, nullable=True)

    # Paper Info
    title = Column(Text, nullable=False)
    authors = Column(JSON, default=list)
    abstract = Column(Text, nullable=True)
    url = Column(String, nullable=True)
    pdf_url = Column(String, nullable=True)
    published_date = Column(String, nullable=True)
    year = Column(Integer, nullable=True)
    source = Column(String, nullable=True)

    # Metrics
    citations = Column(Integer, default=0)
    relevance_score = Column(Integer, default=0)

    # AI Analysis
    summary = Column(Text, nullable=True)
    key_contributions = Column(JSON, default=list)
    methodology = Column(Text, nullable=True)
    results = Column(Text, nullable=True)
    limitations = Column(JSON, default=list)
    key_terms = Column(JSON, default=list)

    # Meta
    embedding_stored = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)


class AgentLog(Base):
    __tablename__ = "agent_logs"

    id = Column(
        String,
        primary_key=True,
        default=lambda: str(uuid.uuid4())
    )
    session_id = Column(String, nullable=False)
    agent_name = Column(String, nullable=False)
    action = Column(Text, nullable=False)
    result = Column(Text, nullable=True)
    status = Column(String, default="success")
    timestamp = Column(DateTime, default=datetime.utcnow)
    duration_ms = Column(Integer, nullable=True)
    log_metadata = Column(JSON, default=dict)
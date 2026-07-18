# backend/database/postgres.py

from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker, Session
from sqlalchemy.exc import SQLAlchemyError
from contextlib import contextmanager
from typing import Generator, Optional, List
from loguru import logger
from core.config import settings
from core.models import Base, ResearchSession, Paper, ResearchStatus
from datetime import datetime
import uuid


# ─── Database Engine (SQLite - No Docker!) ─────────────
engine = create_engine(
    settings.DATABASE_URL,
    connect_args={"check_same_thread": False},
    echo=False
)

# ─── Session Factory ─────────────────────────────────────
SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine
)


# ═══════════════════════════════════════════════════════
#   DATABASE INITIALIZATION
# ═══════════════════════════════════════════════════════

def init_db() -> None:
    try:
        Base.metadata.create_all(bind=engine)
        logger.info("✅ Database tables created (SQLite)")
    except SQLAlchemyError as e:
        logger.error(f"Database init error: {e}")
        raise


def check_db_connection() -> bool:
    try:
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        logger.info("✅ SQLite database ready")
        return True
    except Exception as e:
        logger.error(f"Database check failed: {e}")
        return False


# ═══════════════════════════════════════════════════════
#   SESSION MANAGERS
# ═══════════════════════════════════════════════════════

@contextmanager
def get_db_session() -> Generator[Session, None, None]:
    session = SessionLocal()
    try:
        yield session
        session.commit()
    except SQLAlchemyError as e:
        session.rollback()
        logger.error(f"DB error: {e}")
        raise
    finally:
        session.close()


def get_db() -> Generator[Session, None, None]:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


# ═══════════════════════════════════════════════════════
#   RESEARCH SESSION OPERATIONS
# ═══════════════════════════════════════════════════════

class ResearchSessionDB:

    @staticmethod
    def create_session(session_id: str, query: str) -> Optional[ResearchSession]:
        try:
            with get_db_session() as db:
                session = ResearchSession(
                    id=session_id,
                    query=query,
                    status=ResearchStatus.PENDING
                )
                db.add(session)
                db.flush()
                db.refresh(session)
                logger.info(f"Created session: {session_id}")
                # Detach from session
                db.expunge(session)
                return session
        except Exception as e:
            logger.error(f"Create session error: {e}")
            return None

    @staticmethod
    def update_status(session_id: str, status: str) -> bool:
        try:
            with get_db_session() as db:
                session = db.query(ResearchSession).filter(
                    ResearchSession.id == session_id
                ).first()
                if session:
                    session.status = status
                    session.updated_at = datetime.utcnow()
                    if status == ResearchStatus.COMPLETED:
                        session.completed_at = datetime.utcnow()
                    return True
                return False
        except Exception as e:
            logger.error(f"Update status error: {e}")
            return False

    @staticmethod
    def save_results(
        session_id: str,
        final_report: str,
        key_themes: List[str],
        knowledge_gaps: List[str],
        papers_found: int,
        papers_analyzed: int
    ) -> bool:
        try:
            with get_db_session() as db:
                session = db.query(ResearchSession).filter(
                    ResearchSession.id == session_id
                ).first()
                if session:
                    session.final_report = final_report
                    session.key_themes = key_themes
                    session.knowledge_gaps = knowledge_gaps
                    session.papers_found = papers_found
                    session.papers_analyzed = papers_analyzed
                    session.status = ResearchStatus.COMPLETED
                    session.completed_at = datetime.utcnow()
                    return True
                return False
        except Exception as e:
            logger.error(f"Save results error: {e}")
            return False

    @staticmethod
    def get_session(session_id: str) -> Optional[ResearchSession]:
        try:
            with get_db_session() as db:
                session = db.query(ResearchSession).filter(
                    ResearchSession.id == session_id
                ).first()
                if session:
                    db.expunge(session)
                return session
        except Exception as e:
            logger.error(f"Get session error: {e}")
            return None

    @staticmethod
    def get_all_sessions(limit: int = 20, offset: int = 0) -> List[ResearchSession]:
        try:
            with get_db_session() as db:
                sessions = db.query(ResearchSession)\
                    .order_by(ResearchSession.created_at.desc())\
                    .limit(limit).offset(offset).all()
                for s in sessions:
                    db.expunge(s)
                return sessions
        except Exception as e:
            logger.error(f"Get all error: {e}")
            return []

    @staticmethod
    def save_error(session_id: str, error: str) -> bool:
        try:
            with get_db_session() as db:
                session = db.query(ResearchSession).filter(
                    ResearchSession.id == session_id
                ).first()
                if session:
                    session.error = error
                    session.status = ResearchStatus.FAILED
                    session.updated_at = datetime.utcnow()
                    return True
                return False
        except Exception as e:
            logger.error(f"Save error failed: {e}")
            return False


# ═══════════════════════════════════════════════════════
#   PAPER OPERATIONS
# ═══════════════════════════════════════════════════════

class PaperDB:

    @staticmethod
    def save_paper(paper_data: dict) -> Optional[Paper]:
        try:
            with get_db_session() as db:
                existing = db.query(Paper).filter(
                    Paper.id == paper_data.get("id")
                ).first()
                if existing:
                    return existing

                paper = Paper(
                    id=str(paper_data.get("id", str(uuid.uuid4()))),
                    session_id=paper_data.get("session_id"),
                    title=paper_data.get("title", ""),
                    authors=paper_data.get("authors", []),
                    abstract=paper_data.get("abstract", ""),
                    url=paper_data.get("url", ""),
                    pdf_url=paper_data.get("pdf_url", ""),
                    published_date=paper_data.get("published", ""),
                    year=paper_data.get("year"),
                    source=paper_data.get("source", "unknown"),
                    citations=paper_data.get("citations", 0),
                    relevance_score=paper_data.get("relevance_score", 0)
                )
                db.add(paper)
                db.flush()
                return paper
        except Exception as e:
            logger.error(f"Save paper error: {e}")
            return None

    @staticmethod
    def update_paper_analysis(paper_id: str, analysis: dict) -> bool:
        try:
            with get_db_session() as db:
                paper = db.query(Paper).filter(Paper.id == paper_id).first()
                if paper:
                    paper.summary = analysis.get("summary", "")
                    paper.key_contributions = analysis.get("key_contributions", [])
                    paper.methodology = analysis.get("methodology", "")
                    paper.results = analysis.get("results", "")
                    paper.limitations = analysis.get("limitations", [])
                    paper.key_terms = analysis.get("key_terms", [])
                    paper.relevance_score = analysis.get("relevance_score", 0)
                    return True
                return False
        except Exception as e:
            logger.error(f"Update paper error: {e}")
            return False

    @staticmethod
    def get_session_papers(session_id: str) -> List[Paper]:
        try:
            with get_db_session() as db:
                papers = db.query(Paper).filter(
                    Paper.session_id == session_id
                ).order_by(Paper.relevance_score.desc()).all()
                for p in papers:
                    db.expunge(p)
                return papers
        except Exception as e:
            logger.error(f"Get papers error: {e}")
            return []
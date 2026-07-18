# backend/api/routes.py

from fastapi import APIRouter, BackgroundTasks, HTTPException
from pydantic import BaseModel, Field
from typing import Optional
from loguru import logger
from datetime import datetime
import uuid

from agents.orchestrator import OrchestratorAgent
from core.memory import AgentMemory
from database.postgres import ResearchSessionDB, PaperDB


router = APIRouter()
memory = AgentMemory()


class ResearchRequest(BaseModel):
    query: str = Field(..., min_length=3, max_length=500)
    depth: Optional[str] = Field(default="comprehensive")


class ChatRequest(BaseModel):
    question: str = Field(..., min_length=3, max_length=500)


class ResearchResponse(BaseModel):
    session_id: str
    status: str
    message: str
    websocket_url: str


@router.post("/research/start", response_model=ResearchResponse)
async def start_research(request: ResearchRequest, background_tasks: BackgroundTasks):
    session_id = str(uuid.uuid4())
    logger.info(f"New research: {request.query[:50]} [{session_id[:8]}]")
    background_tasks.add_task(run_research_background, session_id, request.query)
    return ResearchResponse(
        session_id=session_id,
        status="started",
        message="Research started. Connect to WebSocket for updates.",
        websocket_url=f"ws://localhost:8000/ws/{session_id}"
    )


@router.get("/research/{session_id}/status")
async def get_research_status(session_id: str):
    progress = memory.get_progress(session_id)
    logs = memory.get_agent_logs(session_id)
    logs_count = memory.get_logs_count(session_id)
    session = ResearchSessionDB.get_session(session_id)

    if not session and not progress:
        raise HTTPException(status_code=404, detail="Session not found")

    return {
        "session_id": session_id,
        "status": session.status if session else "unknown",
        "progress": progress,
        "logs_count": logs_count,
        "recent_logs": logs[-5:] if logs else [],
        "created_at": session.created_at.isoformat() if session else None,
        "completed_at": session.completed_at.isoformat() if session and session.completed_at else None
    }


@router.get("/research/{session_id}/report")
async def get_research_report(session_id: str):
    report = memory.get_short_term(session_id, "final_report")
    if not report:
        session = ResearchSessionDB.get_session(session_id)
        if session and session.final_report:
            report = session.final_report

    if not report:
        raise HTTPException(status_code=404, detail="Report not ready")

    session = ResearchSessionDB.get_session(session_id)
    return {
        "session_id": session_id,
        "report": report,
        "word_count": len(report.split()),
        "papers_analyzed": session.papers_analyzed if session else 0,
        "themes_count": len(session.key_themes) if session else 0,
        "generated_at": session.completed_at.isoformat() if session and session.completed_at else None
    }


@router.get("/research/{session_id}/papers")
async def get_papers(session_id: str):
    papers = memory.get_short_term(session_id, "analyzed_papers")
    if not papers:
        papers = memory.get_short_term(session_id, "raw_papers")
    if not papers:
        db_papers = PaperDB.get_session_papers(session_id)
        papers = [
            {
                "id": p.id, "title": p.title, "authors": p.authors,
                "abstract": p.abstract, "year": p.year, "url": p.url,
                "citations": p.citations, "relevance_score": p.relevance_score,
                "summary": p.summary, "key_contributions": p.key_contributions
            }
            for p in db_papers
        ]
    return {
        "session_id": session_id,
        "papers_count": len(papers) if papers else 0,
        "papers": papers or []
    }


@router.get("/research/{session_id}/themes")
async def get_themes(session_id: str):
    themes_data = memory.get_short_term(session_id, "themes_data")
    session = ResearchSessionDB.get_session(session_id)

    if not themes_data and not session:
        raise HTTPException(status_code=404, detail="Session not found")

    return {
        "session_id": session_id,
        "themes": themes_data.get("major_themes", []) if themes_data else (session.key_themes if session else []),
        "knowledge_gaps": themes_data.get("knowledge_gaps", []) if themes_data else (session.knowledge_gaps if session else []),
        "consensus_findings": themes_data.get("consensus_findings", []) if themes_data else [],
        "future_directions": themes_data.get("future_directions", []) if themes_data else [],
        "field_maturity": themes_data.get("field_maturity", "unknown") if themes_data else "unknown"
    }


@router.get("/research/{session_id}/logs")
async def get_agent_logs(session_id: str, start: int = 0, limit: int = 50):
    logs = memory.get_agent_logs(session_id, start=start, end=start + limit - 1)
    total = memory.get_logs_count(session_id)
    return {
        "session_id": session_id, "total_logs": total,
        "logs": logs, "start": start, "limit": limit
    }


@router.get("/research/{session_id}/fact-check")
async def get_fact_check_results(session_id: str):
    verified_claims = memory.get_short_term(session_id, "verified_claims")
    if not verified_claims:
        raise HTTPException(status_code=404, detail="Fact check not ready")

    verified_count = sum(1 for c in verified_claims if c.get("verified", False))
    return {
        "session_id": session_id,
        "total_claims": len(verified_claims),
        "verified_count": verified_count,
        "unverified_count": len(verified_claims) - verified_count,
        "avg_confidence": sum(c.get("confidence", 0) for c in verified_claims) / max(len(verified_claims), 1),
        "claims": verified_claims
    }


@router.get("/research/{session_id}/github")
async def get_github_repos(session_id: str):
    repos = memory.get_short_term(session_id, "github_repos")
    return {
        "session_id": session_id,
        "repos": repos or [],
        "count": len(repos) if repos else 0
    }


@router.post("/research/{session_id}/chat")
async def chat_with_research(session_id: str, request: ChatRequest):
    question = request.question
    logger.info(f"Chat [{session_id[:8]}]: {question[:50]}")

    similar_papers = memory.search_similar_papers(query=question, k=4, session_id=session_id)
    if not similar_papers:
        similar_papers = memory.search_similar_papers(query=question, k=4)

    context = "\n\n".join([
        f"Paper: {paper['metadata'].get('title', 'Unknown')}\n"
        f"Content: {paper['content'][:400]}"
        for paper in similar_papers
    ])

    if not context:
        context = "No papers found."

    from langchain_groq import ChatGroq
    from langchain_core.messages import SystemMessage, HumanMessage
    from core.config import settings

    llm = ChatGroq(
        model=settings.PRIMARY_MODEL,
        temperature=0.2,
        groq_api_key=settings.GROQ_API_KEY
    )

    messages = [
        SystemMessage(content=f"""You are a research assistant.
Answer questions based on paper context.

Context:
{context}"""),
        HumanMessage(content=question)
    ]

    try:
        response = llm.invoke(messages)
        answer = response.content
    except Exception as e:
        logger.error(f"Chat error: {e}")
        answer = "Sorry, I could not process your question."

    return {
        "session_id": session_id,
        "question": question,
        "answer": answer,
        "sources": [
            {
                "title": p["metadata"].get("title", "Unknown"),
                "url": p["metadata"].get("url", ""),
                "year": p["metadata"].get("year", ""),
                "similarity": round(p["similarity_score"], 3)
            }
            for p in similar_papers
        ],
        "sources_count": len(similar_papers)
    }


@router.get("/research/history/all")
async def get_research_history(limit: int = 20, offset: int = 0):
    sessions = ResearchSessionDB.get_all_sessions(limit=limit, offset=offset)
    return {
        "sessions": [
            {
                "id": s.id, "query": s.query, "status": s.status,
                "papers_found": s.papers_found, "papers_analyzed": s.papers_analyzed,
                "created_at": s.created_at.isoformat(),
                "completed_at": s.completed_at.isoformat() if s.completed_at else None
            }
            for s in sessions
        ],
        "total": len(sessions),
        "limit": limit,
        "offset": offset
    }


@router.get("/health")
async def health_check():
    memory_health = memory.health_check()
    return {
        "status": "healthy",
        "timestamp": datetime.utcnow().isoformat(),
        "services": {
            "api": True,
            "redis": memory_health["redis"],
            "vector_db": memory_health["chroma"],
            "database": True
        },
        "version": "1.0.0"
    }


async def run_research_background(session_id: str, query: str) -> None:
    logger.info(f"Starting background: {query[:50]} [{session_id[:8]}]")
    orchestrator = OrchestratorAgent()

    try:
        await orchestrator.run(session_id, query)
        logger.info(f"✅ Background completed: [{session_id[:8]}]")
    except Exception as e:
        logger.error(f"Background failed [{session_id[:8]}]: {e}")
        memory.publish_event(session_id, "research_error", {"error": str(e), "session_id": session_id})
        ResearchSessionDB.save_error(session_id, str(e))
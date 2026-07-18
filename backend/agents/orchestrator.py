# backend/agents/orchestrator.py

from langchain_groq import ChatGroq
from langchain_core.messages import SystemMessage, HumanMessage
from langgraph.graph import StateGraph, END
from typing import TypedDict, List, Dict, Any, Optional
from loguru import logger
from datetime import datetime
from core.memory import AgentMemory
from core.config import settings
from database.postgres import ResearchSessionDB
from core.models import ResearchStatus
import json
import re


class ResearchState(TypedDict):
    session_id: str
    query: str
    status: str
    research_plan: Dict
    search_results: List[Dict]
    papers_found: List[Dict]
    analyzed_papers: List[Dict]
    key_themes: List[str]
    knowledge_gaps: List[str]
    consensus_findings: List[str]
    future_directions: List[str]
    outline: str
    draft_report: str
    final_report: str
    verified_claims: List[Dict]
    agent_logs: List[Dict]
    errors: List[str]
    iteration_count: int
    started_at: str
    completed_at: Optional[str]


class OrchestratorAgent:
    """Master agent - Controls entire research workflow"""

    def __init__(self):
        self.llm = ChatGroq(
            model=settings.PRIMARY_MODEL,
            temperature=0.1,
            groq_api_key=settings.GROQ_API_KEY
        )
        self.memory = AgentMemory()
        self.graph = self._build_workflow()
        logger.info("✅ OrchestratorAgent initialized")

    def _build_workflow(self) -> StateGraph:
        from agents.research_agent import ResearchAgent
        from agents.analysis_agent import AnalysisAgent
        from agents.writing_agent import WritingAgent
        from agents.factcheck_agent import FactCheckAgent

        research_agent = ResearchAgent()
        analysis_agent = AnalysisAgent()
        writing_agent = WritingAgent()
        factcheck_agent = FactCheckAgent()

        workflow = StateGraph(ResearchState)

        workflow.add_node("plan_research", self._plan_research)
        workflow.add_node("search_papers", research_agent.search_papers)
        workflow.add_node("filter_papers", research_agent.filter_relevant_papers)
        workflow.add_node("analyze_papers", analysis_agent.analyze_papers)
        workflow.add_node("identify_themes", analysis_agent.identify_themes)
        workflow.add_node("create_outline", writing_agent.create_outline)
        workflow.add_node("write_report", writing_agent.write_report)
        workflow.add_node("fact_check", factcheck_agent.verify_claims)
        workflow.add_node("finalize_report", writing_agent.finalize_report)
        workflow.add_node("complete_research", self._complete_research)

        workflow.set_entry_point("plan_research")
        workflow.add_edge("plan_research", "search_papers")
        workflow.add_edge("search_papers", "filter_papers")
        workflow.add_edge("filter_papers", "analyze_papers")
        workflow.add_edge("analyze_papers", "identify_themes")
        workflow.add_edge("identify_themes", "create_outline")
        workflow.add_edge("create_outline", "write_report")
        workflow.add_edge("write_report", "fact_check")
        workflow.add_edge("fact_check", "finalize_report")
        workflow.add_edge("finalize_report", "complete_research")
        workflow.add_edge("complete_research", END)

        logger.info("✅ Workflow built")
        return workflow.compile()

    def _plan_research(self, state: ResearchState) -> ResearchState:
        session_id = state["session_id"]
        query = state["query"]

        logger.info(f"Planning research for: {query}")

        self.memory.publish_event(
            session_id, "agent_started",
            {"agent": "Orchestrator", "action": "Planning research strategy", "icon": "🧠"}
        )
        self.memory.update_progress(session_id, "planning", 5, "Creating research plan...")
        ResearchSessionDB.update_status(session_id, ResearchStatus.PLANNING)

        messages = [
            SystemMessage(content="""You are an expert research orchestrator.
Create a comprehensive research plan in JSON format:
{
    "main_topics": ["topic1", "topic2", "topic3"],
    "search_queries": ["query1", "query2", "query3", "query4", "query5"],
    "focus_areas": ["area1", "area2", "area3"],
    "expected_sections": ["Intro", "Background", "Analysis", "Conclusion"],
    "research_depth": "comprehensive",
    "key_questions": ["q1", "q2", "q3"]
}
Return ONLY valid JSON."""),
            HumanMessage(content=f"Create research plan for: {query}")
        ]

        try:
            response = self.llm.invoke(messages)
            json_match = re.search(r'\{.*\}', response.content, re.DOTALL)
            if json_match:
                plan = json.loads(json_match.group())
            else:
                plan = self._default_plan(query)
        except Exception as e:
            logger.error(f"Plan error: {e}")
            plan = self._default_plan(query)

        self.memory.store_short_term(session_id, "research_plan", plan)
        self.memory.store_agent_log(
            session_id, "Orchestrator", "Research Plan Created",
            f"Generated {len(plan.get('search_queries', []))} queries"
        )
        self.memory.publish_event(
            session_id, "plan_created",
            {
                "queries_count": len(plan.get("search_queries", [])),
                "topics": plan.get("main_topics", []),
                "plan": plan
            }
        )

        return {**state, "research_plan": plan, "status": "planning_complete", "iteration_count": 0}

    def _default_plan(self, query: str) -> Dict:
        return {
            "main_topics": [query],
            "search_queries": [query, f"{query} recent advances", f"{query} survey", f"{query} applications"],
            "focus_areas": ["theory", "applications"],
            "expected_sections": ["Introduction", "Analysis", "Conclusion"],
            "research_depth": "comprehensive",
            "key_questions": [f"What is {query}?"]
        }

    def _complete_research(self, state: ResearchState) -> ResearchState:
        session_id = state["session_id"]
        logger.info(f"Completing research: {session_id}")

        ResearchSessionDB.save_results(
            session_id=session_id,
            final_report=state.get("final_report", ""),
            key_themes=state.get("key_themes", []),
            knowledge_gaps=state.get("knowledge_gaps", []),
            papers_found=len(state.get("papers_found", [])),
            papers_analyzed=len(state.get("analyzed_papers", []))
        )

        self.memory.store_short_term(session_id, "final_report", state.get("final_report", ""), expire=86400)
        self.memory.store_short_term(session_id, "analyzed_papers", state.get("analyzed_papers", []), expire=86400)
        self.memory.update_progress(session_id, "completed", 100, "Research completed!")

        self.memory.publish_event(
            session_id, "research_completed",
            {
                "papers_found": len(state.get("papers_found", [])),
                "papers_analyzed": len(state.get("analyzed_papers", [])),
                "themes_count": len(state.get("key_themes", [])),
                "report_length": len(state.get("final_report", "")),
                "claims_verified": len(state.get("verified_claims", []))
            }
        )
        self.memory.store_agent_log(
            session_id, "Orchestrator", "Research Completed",
            f"Generated {len(state.get('final_report', '').split())} word report"
        )
        logger.info(f"✅ Research completed: {session_id}")
        return {**state, "status": "completed", "completed_at": datetime.utcnow().isoformat()}

    async def run(self, session_id: str, query: str) -> Dict[str, Any]:
        logger.info(f"Starting research: {query}")
        ResearchSessionDB.create_session(session_id, query)

        initial_state = ResearchState(
            session_id=session_id, query=query, status="starting",
            research_plan={}, search_results=[], papers_found=[],
            analyzed_papers=[], key_themes=[], knowledge_gaps=[],
            consensus_findings=[], future_directions=[], outline="",
            draft_report="", final_report="", verified_claims=[],
            agent_logs=[], errors=[], iteration_count=0,
            started_at=datetime.utcnow().isoformat(), completed_at=None
        )

        self.memory.publish_event(
            session_id, "research_started",
            {"query": query, "session_id": session_id, "started_at": initial_state["started_at"]}
        )

        try:
            final_state = await self.graph.ainvoke(initial_state)
            logger.info(f"✅ Workflow completed: {session_id}")
            return final_state
        except Exception as e:
            logger.error(f"Workflow error: {e}")
            ResearchSessionDB.save_error(session_id, str(e))
            self.memory.publish_event(session_id, "research_error", {"error": str(e), "session_id": session_id})
            raise e
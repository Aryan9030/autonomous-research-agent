# backend/agents/analysis_agent.py

from langchain_groq import ChatGroq
from langchain_core.messages import SystemMessage, HumanMessage
from core.memory import AgentMemory
from core.config import settings
from database.postgres import PaperDB
from typing import List, Dict
from loguru import logger
import json
import re


class AnalysisAgent:
    """Deep Research Analyzer"""

    def __init__(self):
        self.llm = ChatGroq(
            model=settings.PRIMARY_MODEL,
            temperature=0.1,
            groq_api_key=settings.GROQ_API_KEY
        )
        self.fast_llm = ChatGroq(
            model=settings.FAST_MODEL,
            temperature=0.1,
            groq_api_key=settings.GROQ_API_KEY
        )
        self.memory = AgentMemory()
        logger.info("✅ AnalysisAgent initialized")

    def analyze_papers(self, state: Dict) -> Dict:
        session_id = state["session_id"]
        papers = state["papers_found"]
        query = state["query"]

        self.memory.publish_event(
            session_id, "agent_started",
            {"agent": "AnalysisAgent", "action": f"Analyzing {len(papers)} papers", "icon": "🧪"}
        )
        self.memory.update_progress(session_id, "analyzing", 40, f"Analyzing {len(papers)} papers...")

        analyzed_papers = []
        for i, paper in enumerate(papers):
            progress = 40 + int((i / max(len(papers), 1)) * 20)
            self.memory.publish_event(
                session_id, "analyzing_paper",
                {"current": i + 1, "total": len(papers),
                 "paper_title": paper.get("title", "Unknown")[:60], "progress": progress}
            )
            self.memory.update_progress(session_id, "analyzing", progress, f"Analyzing paper {i+1}/{len(papers)}")

            analysis = self._analyze_single_paper(paper, query)
            analyzed_paper = {**paper, "analysis": analysis}
            analyzed_papers.append(analyzed_paper)

            paper_id = str(paper.get("id", hash(paper.get("title", ""))))
            PaperDB.update_paper_analysis(paper_id, analysis)

            self.memory.store_agent_log(
                session_id, "AnalysisAgent",
                f"Analyzed: {paper.get('title', '')[:50]}",
                f"Score: {analysis.get('relevance_score', 0)}/10"
            )
            logger.info(f"Analyzed {i+1}/{len(papers)}")

        analyzed_papers.sort(key=lambda x: x.get("analysis", {}).get("relevance_score", 0), reverse=True)
        self.memory.store_short_term(session_id, "analyzed_papers", analyzed_papers, expire=86400)
        self.memory.publish_event(
            session_id, "analysis_complete",
            {"analyzed_count": len(analyzed_papers),
             "avg_relevance": sum(p.get("analysis", {}).get("relevance_score", 0) for p in analyzed_papers) / max(len(analyzed_papers), 1)}
        )
        logger.info(f"Analysis complete: {len(analyzed_papers)} papers")
        return {**state, "analyzed_papers": analyzed_papers}

    def _analyze_single_paper(self, paper: Dict, query: str) -> Dict:
        messages = [
            SystemMessage(content="""You are a research paper analyst.
Return ONLY valid JSON:
{
    "summary": "2-3 sentence summary",
    "key_contributions": ["contribution 1", "contribution 2"],
    "methodology": "approach used",
    "results": "main results",
    "limitations": ["limitation 1"],
    "relevance_score": 8,
    "key_terms": ["term1", "term2", "term3"],
    "paper_type": "empirical/theoretical/survey",
    "novelty": "what makes it unique"
}"""),
            HumanMessage(content=f"""
Research Query: {query}
Paper:
Title: {paper.get('title', 'No title')}
Authors: {', '.join(paper.get('authors', [])[:5])}
Year: {paper.get('year', 'Unknown')}
Abstract: {paper.get('abstract', 'No abstract')}
Analyze this paper.
""")
        ]
        try:
            response = self.fast_llm.invoke(messages)
            json_match = re.search(r'\{.*\}', response.content, re.DOTALL)
            if json_match:
                return json.loads(json_match.group())
            return self._default_analysis(paper)
        except Exception as e:
            logger.error(f"Analysis error: {e}")
            return self._default_analysis(paper)

    def _default_analysis(self, paper: Dict) -> Dict:
        return {
            "summary": paper.get("abstract", "")[:300],
            "key_contributions": ["See abstract"],
            "methodology": "Not extracted",
            "results": "See abstract",
            "limitations": [],
            "relevance_score": 5,
            "key_terms": [],
            "paper_type": "unknown",
            "novelty": "Not extracted"
        }

    def identify_themes(self, state: Dict) -> Dict:
        session_id = state["session_id"]
        papers = state["analyzed_papers"]
        query = state["query"]

        self.memory.publish_event(
            session_id, "agent_started",
            {"agent": "AnalysisAgent", "action": "Synthesizing themes", "icon": "🔬"}
        )
        self.memory.update_progress(session_id, "synthesizing", 62, "Identifying themes...")

        all_findings = self._compile_findings(papers)
        messages = [
            SystemMessage(content="""You are a research synthesis expert.
Return ONLY valid JSON:
{
    "major_themes": ["theme 1", "theme 2", "theme 3"],
    "consensus_findings": ["finding 1", "finding 2"],
    "conflicting_views": ["conflict 1"],
    "knowledge_gaps": ["gap 1", "gap 2"],
    "future_directions": ["direction 1", "direction 2"],
    "research_timeline": "how field evolved",
    "dominant_methods": ["method1"],
    "key_researchers": ["names"],
    "field_maturity": "emerging/growing/mature"
}"""),
            HumanMessage(content=f"""
Research Query: {query}
Analysis of {len(papers)} papers:
{all_findings}
Identify themes and gaps.
""")
        ]
        try:
            response = self.llm.invoke(messages)
            json_match = re.search(r'\{.*\}', response.content, re.DOTALL)
            if json_match:
                themes_data = json.loads(json_match.group())
            else:
                themes_data = self._default_themes(query)
        except Exception as e:
            logger.error(f"Theme error: {e}")
            themes_data = self._default_themes(query)

        self.memory.store_short_term(session_id, "themes_data", themes_data)
        self.memory.store_agent_log(
            session_id, "AnalysisAgent", "Themes Identified",
            f"Found {len(themes_data.get('major_themes', []))} themes"
        )
        self.memory.update_progress(session_id, "synthesizing", 65, f"Found {len(themes_data.get('major_themes', []))} themes")
        self.memory.publish_event(
            session_id, "themes_identified",
            {
                "themes_count": len(themes_data.get("major_themes", [])),
                "gaps_count": len(themes_data.get("knowledge_gaps", [])),
                "themes": themes_data.get("major_themes", []),
                "gaps": themes_data.get("knowledge_gaps", []),
                "field_maturity": themes_data.get("field_maturity", "unknown")
            }
        )
        return {
            **state,
            "key_themes": themes_data.get("major_themes", []),
            "knowledge_gaps": themes_data.get("knowledge_gaps", []),
            "consensus_findings": themes_data.get("consensus_findings", []),
            "future_directions": themes_data.get("future_directions", [])
        }

    def _compile_findings(self, papers: List[Dict]) -> str:
        findings = []
        for i, paper in enumerate(papers[:10]):
            analysis = paper.get("analysis", {})
            findings.append(
                f"Paper {i+1}: {paper.get('title', 'Unknown')}\n"
                f"  Year: {paper.get('year', 'N/A')}\n"
                f"  Summary: {analysis.get('summary', '')[:200]}\n"
                f"  Contributions: {analysis.get('key_contributions', [])}\n"
                f"  Methodology: {analysis.get('methodology', '')[:100]}\n"
                f"  Limitations: {analysis.get('limitations', [])}\n"
            )
        return "\n".join(findings)

    def _default_themes(self, query: str) -> Dict:
        return {
            "major_themes": [f"Core concepts in {query}", f"Applications of {query}"],
            "consensus_findings": ["Multiple papers show progress"],
            "conflicting_views": [],
            "knowledge_gaps": ["More research needed"],
            "future_directions": ["Further exploration"],
            "research_timeline": "Active area",
            "dominant_methods": [],
            "key_researchers": [],
            "field_maturity": "growing"
        }
# backend/agents/research_agent.py

from langchain_groq import ChatGroq
from langchain_core.messages import SystemMessage, HumanMessage
from core.tools import (
    search_arxiv_papers,
    search_semantic_scholar,
    search_github_implementations,
    calculate_paper_score
)
from core.memory import AgentMemory
from core.config import settings
from database.postgres import PaperDB
from typing import Dict
from loguru import logger
import json
import re


class ResearchAgent:
    """Paper Discovery Specialist"""

    def __init__(self):
        self.llm = ChatGroq(
            model=settings.PRIMARY_MODEL,
            temperature=0.1,
            groq_api_key=settings.GROQ_API_KEY
        )
        self.memory = AgentMemory()
        logger.info("✅ ResearchAgent initialized")

    def search_papers(self, state: Dict) -> Dict:
        session_id = state["session_id"]
        query = state["query"]
        research_plan = state.get("research_plan", {})
        search_queries = research_plan.get("search_queries", [query])

        self.memory.publish_event(
            session_id, "agent_started",
            {"agent": "ResearchAgent", "action": f"Searching papers for: {query}", "icon": "🔍"}
        )
        self.memory.update_progress(session_id, "searching", 10, "Searching databases...")

        all_papers = []
        seen_titles = set()

        for i, search_query in enumerate(search_queries[:3]):
            logger.info(f"Searching query {i+1}: {search_query}")
            self.memory.publish_event(
                session_id, "searching_query",
                {"query": search_query, "progress": f"{i+1}/{min(3, len(search_queries))}"}
            )

            try:
                arxiv_papers = search_arxiv_papers.invoke({"query": search_query, "max_results": 8})
                for paper in arxiv_papers:
                    title = paper.get("title", "")
                    if title and title not in seen_titles and "error" not in paper:
                        seen_titles.add(title)
                        paper["session_id"] = session_id
                        all_papers.append(paper)
                self.memory.store_agent_log(
                    session_id, "ResearchAgent",
                    f"ArXiv Search: {search_query[:50]}",
                    f"Found {len(arxiv_papers)} papers"
                )
            except Exception as e:
                logger.error(f"ArXiv error: {e}")

            try:
                scholar_papers = search_semantic_scholar.invoke({"query": search_query, "limit": 8})
                for paper in scholar_papers:
                    title = paper.get("title", "")
                    if title and title not in seen_titles and "error" not in paper:
                        seen_titles.add(title)
                        paper["session_id"] = session_id
                        all_papers.append(paper)
                self.memory.store_agent_log(
                    session_id, "ResearchAgent",
                    f"Scholar Search: {search_query[:50]}",
                    f"Found {len(scholar_papers)} papers"
                )
            except Exception as e:
                logger.error(f"Scholar error: {e}")

        try:
            github_repos = search_github_implementations.invoke({"query": query})
            self.memory.store_short_term(session_id, "github_repos", github_repos)
            self.memory.store_agent_log(
                session_id, "ResearchAgent", "GitHub Search",
                f"Found {len(github_repos)} repos"
            )
        except Exception as e:
            logger.error(f"GitHub error: {e}")

        scored_papers = []
        for paper in all_papers:
            try:
                score_result = calculate_paper_score.invoke({"paper": paper})
                paper["quality_score"] = score_result.get("total_score", 0)
                paper["quality_grade"] = score_result.get("grade", "C")
                scored_papers.append(paper)
            except:
                paper["quality_score"] = 0
                scored_papers.append(paper)

        scored_papers.sort(key=lambda x: x.get("quality_score", 0), reverse=True)
        self.memory.store_short_term(session_id, "raw_papers", scored_papers)
        self.memory.update_progress(session_id, "searching", 20, f"Found {len(scored_papers)} papers")
        self.memory.publish_event(
            session_id, "papers_found",
            {
                "count": len(scored_papers),
                "sources": {
                    "arxiv": sum(1 for p in scored_papers if p.get("source") == "arxiv"),
                    "semantic_scholar": sum(1 for p in scored_papers if p.get("source") == "semantic_scholar")
                }
            }
        )
        logger.info(f"Total papers found: {len(scored_papers)}")
        return {**state, "search_results": scored_papers, "papers_found": scored_papers}

    def filter_relevant_papers(self, state: Dict) -> Dict:
        session_id = state["session_id"]
        papers = state["papers_found"]
        query = state["query"]

        self.memory.publish_event(
            session_id, "agent_started",
            {"agent": "ResearchAgent", "action": f"Filtering {len(papers)} papers", "icon": "🎯"}
        )
        self.memory.update_progress(session_id, "filtering", 30, "AI filtering papers...")

        if not papers:
            return {**state, "papers_found": []}

        paper_list = "\n".join([
            f"{i}. Title: {p.get('title', 'No title')}\n"
            f"   Abstract: {p.get('abstract', '')[:150]}...\n"
            f"   Year: {p.get('year', 'N/A')} | Citations: {p.get('citations', 0)}"
            for i, p in enumerate(papers[:25])
        ])

        messages = [
            SystemMessage(content="""You are a research paper relevance judge.
Select the MOST RELEVANT papers (maximum 12).
Return ONLY valid JSON:
{
    "selected_indices": [0, 2, 5, 8],
    "reasoning": "brief explanation"
}"""),
            HumanMessage(content=f"""
Research Query: {query}
Papers to evaluate:
{paper_list}
Select the most relevant papers.
""")
        ]

        try:
            response = self.llm.invoke(messages)
            json_match = re.search(r'\{.*\}', response.content, re.DOTALL)
            if json_match:
                result = json.loads(json_match.group())
                selected_indices = result.get("selected_indices", [])
                filtered_papers = [papers[i] for i in selected_indices if i < len(papers)]
            else:
                filtered_papers = papers[:12]
        except Exception as e:
            logger.error(f"Filter error: {e}")
            filtered_papers = papers[:12]

        embedded_count = 0
        for paper in filtered_papers:
            if paper.get("abstract"):
                content = (
                    f"Title: {paper.get('title', '')}\n"
                    f"Abstract: {paper.get('abstract', '')}\n"
                    f"Year: {paper.get('year', '')}"
                )
                success = self.memory.store_paper_embedding(
                    paper_id=str(paper.get("id", hash(paper.get("title", "")))),
                    content=content,
                    metadata={
                        "title": paper.get("title", ""),
                        "url": paper.get("url", ""),
                        "year": str(paper.get("year", "")),
                        "session_id": session_id,
                        "source": paper.get("source", "")
                    }
                )
                if success:
                    embedded_count += 1
            PaperDB.save_paper(paper)

        self.memory.store_agent_log(
            session_id, "ResearchAgent", "Papers Filtered",
            f"Selected {len(filtered_papers)} from {len(papers)} papers"
        )
        self.memory.update_progress(session_id, "filtering", 35, f"Selected {len(filtered_papers)} papers")
        self.memory.publish_event(
            session_id, "papers_filtered",
            {
                "original_count": len(papers),
                "selected_count": len(filtered_papers),
                "embedded_count": embedded_count
            }
        )
        logger.info(f"Filtered: {len(filtered_papers)} papers")
        return {**state, "papers_found": filtered_papers}
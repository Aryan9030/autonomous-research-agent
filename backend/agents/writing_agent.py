# backend/agents/writing_agent.py

from langchain_groq import ChatGroq
from langchain_core.messages import SystemMessage, HumanMessage
from core.memory import AgentMemory
from core.config import settings
from typing import List, Dict
from loguru import logger


class WritingAgent:
    """Professional Report Generator"""

    def __init__(self):
        self.llm = ChatGroq(
            model=settings.PRIMARY_MODEL,
            temperature=0.3,
            groq_api_key=settings.GROQ_API_KEY
        )
        self.memory = AgentMemory()
        logger.info("✅ WritingAgent initialized")

    def create_outline(self, state: Dict) -> Dict:
        session_id = state["session_id"]
        query = state["query"]
        themes = state.get("key_themes", [])
        gaps = state.get("knowledge_gaps", [])
        papers = state.get("analyzed_papers", [])
        future = state.get("future_directions", [])

        self.memory.publish_event(
            session_id, "agent_started",
            {"agent": "WritingAgent", "action": "Creating outline", "icon": "📝"}
        )
        self.memory.update_progress(session_id, "writing", 68, "Creating outline...")

        messages = [
            SystemMessage(content="""You are an expert academic report writer.
Create a detailed report outline in Markdown format.

Include these sections:
1. Executive Summary
2. Introduction
3. Background & Context
4. Literature Review
5. Key Findings & Analysis
6. Discussion
7. Knowledge Gaps & Limitations
8. Future Research Directions
9. Conclusion
10. References"""),
            HumanMessage(content=f"""
Research Query: {query}
Papers Analyzed: {len(papers)}
Major Themes: {themes}
Knowledge Gaps: {gaps}
Future Directions: {future}
Create a comprehensive outline.
""")
        ]

        try:
            response = self.llm.invoke(messages)
            outline = response.content
        except Exception as e:
            logger.error(f"Outline error: {e}")
            outline = self._default_outline(query, themes)

        self.memory.store_agent_log(
            session_id, "WritingAgent", "Outline Created", "Generated outline"
        )
        self.memory.update_progress(session_id, "writing", 70, "Writing report...")
        self.memory.publish_event(
            session_id, "outline_created",
            {"sections_count": outline.count("\n#")}
        )
        return {**state, "outline": outline}

    def write_report(self, state: Dict) -> Dict:
        session_id = state["session_id"]
        query = state["query"]
        outline = state.get("outline", "")
        papers = state.get("analyzed_papers", [])
        themes = state.get("key_themes", [])
        gaps = state.get("knowledge_gaps", [])
        consensus = state.get("consensus_findings", [])
        future = state.get("future_directions", [])

        self.memory.publish_event(
            session_id, "agent_started",
            {"agent": "WritingAgent", "action": "Writing report", "icon": "✍️"}
        )
        self.memory.update_progress(session_id, "writing", 72, "Writing report...")

        paper_refs = self._build_paper_references(papers)
        findings_summary = self._build_findings_summary(papers)

        messages = [
            SystemMessage(content="""You are a world-class academic writer.
Write a comprehensive research report.

Guidelines:
- Formal academic tone
- Cite papers as [Author et al., Year]
- Include specific findings
- Markdown formatting
- Minimum 1500 words"""),
            HumanMessage(content=f"""
Research Query: {query}

Outline:
{outline}

Papers ({len(papers)}):
{paper_refs}

Findings:
{findings_summary}

Themes:
{chr(10).join(f"- {t}" for t in themes)}

Consensus:
{chr(10).join(f"- {c}" for c in consensus)}

Gaps:
{chr(10).join(f"- {g}" for g in gaps)}

Future Directions:
{chr(10).join(f"- {f}" for f in future)}

Write the complete report.
""")
        ]

        try:
            response = self.llm.invoke(messages)
            draft_report = response.content
        except Exception as e:
            logger.error(f"Write error: {e}")
            draft_report = self._default_report(query, papers, themes, gaps)

        word_count = len(draft_report.split())
        self.memory.store_agent_log(
            session_id, "WritingAgent", "Draft Written", f"{word_count} words"
        )
        self.memory.update_progress(session_id, "writing", 82, f"Draft: {word_count} words")
        self.memory.publish_event(
            session_id, "report_drafted",
            {"word_count": word_count, "sections": draft_report.count("\n##")}
        )
        return {**state, "draft_report": draft_report}

    def finalize_report(self, state: Dict) -> Dict:
        session_id = state["session_id"]
        draft = state.get("draft_report", "")
        verified_claims = state.get("verified_claims", [])
        papers = state.get("analyzed_papers", [])

        self.memory.publish_event(
            session_id, "agent_started",
            {"agent": "WritingAgent", "action": "Finalizing report", "icon": "✨"}
        )
        self.memory.update_progress(session_id, "finalizing", 92, "Polishing report...")

        issues = [c for c in verified_claims if not c.get("verified", True)]
        issues_text = "\n".join([f"- Unverified: {issue.get('claim', '')}" for issue in issues[:5]])
        references = self._build_references_section(papers)

        messages = [
            SystemMessage(content="""Polish this research report.
Fix issues, improve flow, add references."""),
            HumanMessage(content=f"""
Draft:
{draft}

Issues: {issues_text if issues_text else "None"}

References to add:
{references}

Return polished report.
""")
        ]

        try:
            response = self.llm.invoke(messages)
            final_report = response.content
        except Exception as e:
            logger.error(f"Finalize error: {e}")
            final_report = draft + "\n\n" + references

        final_word_count = len(final_report.split())
        self.memory.store_agent_log(
            session_id, "WritingAgent", "Report Finalized",
            f"Final: {final_word_count} words"
        )
        self.memory.update_progress(session_id, "finalizing", 95, f"Finalized: {final_word_count} words")
        self.memory.publish_event(
            session_id, "report_finalized",
            {"word_count": final_word_count, "issues_fixed": len(issues)}
        )
        return {**state, "final_report": final_report}

    def _build_paper_references(self, papers: List[Dict]) -> str:
        refs = []
        for i, paper in enumerate(papers[:10]):
            analysis = paper.get("analysis", {})
            refs.append(
                f"[{i+1}] {paper.get('title', 'Unknown')}\n"
                f"    Authors: {', '.join(paper.get('authors', [])[:3])}\n"
                f"    Year: {paper.get('year', 'N/A')}\n"
                f"    Summary: {analysis.get('summary', '')[:200]}\n"
            )
        return "\n".join(refs)

    def _build_findings_summary(self, papers: List[Dict]) -> str:
        findings = []
        for paper in papers[:8]:
            analysis = paper.get("analysis", {})
            if analysis.get("results"):
                findings.append(
                    f"- {paper.get('title', '')[:50]}: {analysis.get('results', '')[:150]}"
                )
        return "\n".join(findings) if findings else "See analyses"

    def _build_references_section(self, papers: List[Dict]) -> str:
        refs = ["## References\n"]
        for i, paper in enumerate(papers):
            authors = paper.get("authors", ["Unknown"])
            author_str = ", ".join(authors[:3]) + (" et al." if len(authors) > 3 else "")
            year = paper.get("year", "n.d.")
            title = paper.get("title", "Unknown")
            url = paper.get("url", "")
            source = paper.get("source", "").replace("_", " ").title()
            refs.append(f"[{i+1}] {author_str} ({year}). *{title}*. {source}. {url}")
        return "\n".join(refs)

    def _default_outline(self, query: str, themes: List[str]) -> str:
        return f"""# Research Report: {query}

## 1. Executive Summary
## 2. Introduction
## 3. Background
## 4. Literature Review
## 5. Key Findings
## 6. Discussion
## 7. Knowledge Gaps
## 8. Future Directions
## 9. Conclusion
## 10. References"""

    def _default_report(self, query: str, papers: List[Dict], themes: List[str], gaps: List[str]) -> str:
        paper_list = "\n".join([
            f"- {p.get('title', 'Unknown')} ({p.get('year', 'N/A')})"
            for p in papers[:10]
        ])
        return f"""# Research Report: {query}

## Executive Summary
This report analyzes {len(papers)} papers on {query}.

## Papers Analyzed
{paper_list}

## Major Themes
{chr(10).join(f'- {t}' for t in themes)}

## Knowledge Gaps
{chr(10).join(f'- {g}' for g in gaps)}

## Conclusion
Further research needed."""
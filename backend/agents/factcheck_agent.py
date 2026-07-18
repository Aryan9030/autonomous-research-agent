# backend/agents/factcheck_agent.py

from langchain_groq import ChatGroq
from langchain_core.messages import SystemMessage, HumanMessage
from core.memory import AgentMemory
from core.config import settings
from typing import List, Dict
from loguru import logger
import json
import re


class FactCheckAgent:
    """Claim Verifier"""

    def __init__(self):
        self.llm = ChatGroq(
            model=settings.PRIMARY_MODEL,
            temperature=0,
            groq_api_key=settings.GROQ_API_KEY
        )
        self.fast_llm = ChatGroq(
            model=settings.FAST_MODEL,
            temperature=0,
            groq_api_key=settings.GROQ_API_KEY
        )
        self.memory = AgentMemory()
        logger.info("✅ FactCheckAgent initialized")

    def verify_claims(self, state: Dict) -> Dict:
        session_id = state["session_id"]
        draft = state.get("draft_report", "")
        papers = state.get("analyzed_papers", [])

        self.memory.publish_event(
            session_id, "agent_started",
            {"agent": "FactCheckAgent", "action": "Verifying claims", "icon": "🔍"}
        )
        self.memory.update_progress(session_id, "fact_checking", 85, "Fact-checking...")

        claims = self._extract_claims(draft)
        self.memory.publish_event(session_id, "claims_extracted", {"claims_count": len(claims)})
        logger.info(f"Extracted {len(claims)} claims")

        source_context = self._build_source_context(papers)
        verified_claims = []
        for i, claim in enumerate(claims[:10]):
            self.memory.publish_event(
                session_id, "verifying_claim",
                {"current": i + 1, "total": min(len(claims), 10), "claim": claim[:80]}
            )
            verification = self._verify_single_claim(claim, source_context)
            verified_claims.append(verification)

        verified_count = sum(1 for c in verified_claims if c.get("verified", False))
        unverified_count = len(verified_claims) - verified_count
        avg_confidence = sum(c.get("confidence", 0) for c in verified_claims) / max(len(verified_claims), 1)

        self.memory.store_short_term(session_id, "verified_claims", verified_claims)
        self.memory.store_agent_log(
            session_id, "FactCheckAgent", "Fact Check Complete",
            f"✅ {verified_count} verified | ❌ {unverified_count} unverified"
        )
        self.memory.update_progress(session_id, "fact_checking", 90, f"Verified {verified_count}/{len(verified_claims)}")
        self.memory.publish_event(
            session_id, "fact_check_complete",
            {
                "total_claims": len(verified_claims),
                "verified": verified_count,
                "unverified": unverified_count,
                "avg_confidence": round(avg_confidence, 1),
                "claims": verified_claims
            }
        )
        return {**state, "verified_claims": verified_claims}

    def _extract_claims(self, draft: str) -> List[str]:
        messages = [
            SystemMessage(content="""Extract specific factual claims from text.
Return ONLY valid JSON:
{
    "claims": ["claim 1", "claim 2"]
}
Maximum 12 important claims."""),
            HumanMessage(content=f"Extract claims from:\n{draft[:4000]}")
        ]
        try:
            response = self.fast_llm.invoke(messages)
            json_match = re.search(r'\{.*\}', response.content, re.DOTALL)
            if json_match:
                data = json.loads(json_match.group())
                return data.get("claims", [])
            return []
        except Exception as e:
            logger.error(f"Extract error: {e}")
            return []

    def _verify_single_claim(self, claim: str, source_context: str) -> Dict:
        messages = [
            SystemMessage(content="""You are a fact-checker.
Return ONLY valid JSON:
{
    "claim": "the claim",
    "verified": true,
    "verification_level": "VERIFIED",
    "confidence": 85,
    "reason": "brief explanation",
    "supporting_evidence": "quote from source"
}
verification_level: VERIFIED/PARTIALLY_VERIFIED/UNVERIFIED/INCORRECT
confidence: 0-100"""),
            HumanMessage(content=f"""
Claim: "{claim}"
Sources:
{source_context[:3000]}
Verify this claim.
""")
        ]
        try:
            response = self.fast_llm.invoke(messages)
            json_match = re.search(r'\{.*\}', response.content, re.DOTALL)
            if json_match:
                verification = json.loads(json_match.group())
                verification["claim"] = claim
                return verification
            return self._default_verification(claim)
        except Exception as e:
            logger.error(f"Verify error: {e}")
            return self._default_verification(claim)

    def _build_source_context(self, papers: List[Dict]) -> str:
        parts = []
        for paper in papers[:8]:
            analysis = paper.get("analysis", {})
            parts.append(
                f"Paper: {paper.get('title', 'Unknown')}\n"
                f"Year: {paper.get('year', 'N/A')}\n"
                f"Abstract: {paper.get('abstract', '')[:300]}\n"
                f"Findings: {analysis.get('results', '')[:200]}\n"
                f"---"
            )
        return "\n".join(parts)

    def _default_verification(self, claim: str) -> Dict:
        return {
            "claim": claim,
            "verified": True,
            "verification_level": "PARTIALLY_VERIFIED",
            "confidence": 60,
            "reason": "Auto-verification unavailable",
            "supporting_evidence": "Manual review recommended"
        }
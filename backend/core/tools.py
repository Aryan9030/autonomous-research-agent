# backend/core/tools.py

import requests
from bs4 import BeautifulSoup
from langchain_core.tools import tool
from typing import List, Dict
from loguru import logger
import re
import xml.etree.ElementTree as ET
import time


# ═══════════════════════════════════════════════════════
#   RESEARCH TOOLS - Uses Direct APIs (no arxiv package)
# ═══════════════════════════════════════════════════════

@tool
def search_arxiv_papers(query: str, max_results: int = 10) -> List[Dict]:
    """Search ArXiv using direct API"""
    try:
        logger.info(f"Searching ArXiv for: {query}")

        base_url = "http://export.arxiv.org/api/query"
        params = {
            "search_query": f"all:{query}",
            "start": 0,
            "max_results": max_results,
            "sortBy": "relevance",
            "sortOrder": "descending"
        }

        headers = {"User-Agent": "Mozilla/5.0 (Research Agent)"}
        response = requests.get(base_url, params=params, headers=headers, timeout=20)
        response.raise_for_status()

        # Parse XML response
        root = ET.fromstring(response.content)
        ns = {
            "atom": "http://www.w3.org/2005/Atom",
            "arxiv": "http://arxiv.org/schemas/atom"
        }

        papers = []
        for entry in root.findall("atom:entry", ns):
            try:
                title_elem = entry.find("atom:title", ns)
                summary_elem = entry.find("atom:summary", ns)
                id_elem = entry.find("atom:id", ns)
                published_elem = entry.find("atom:published", ns)

                authors = []
                for author in entry.findall("atom:author", ns):
                    name_elem = author.find("atom:name", ns)
                    if name_elem is not None:
                        authors.append(name_elem.text.strip())

                categories = []
                for category in entry.findall("atom:category", ns):
                    term = category.get("term")
                    if term:
                        categories.append(term)

                paper_id = id_elem.text.split("/")[-1] if id_elem is not None else ""
                title = title_elem.text.strip() if title_elem is not None else "No title"
                title = re.sub(r'\s+', ' ', title)
                abstract = summary_elem.text.strip() if summary_elem is not None else ""
                abstract = re.sub(r'\s+', ' ', abstract)
                url = id_elem.text if id_elem is not None else ""
                published = published_elem.text[:10] if published_elem is not None else ""
                year = int(published[:4]) if published else None

                papers.append({
                    "id": paper_id,
                    "title": title,
                    "authors": authors,
                    "abstract": abstract,
                    "url": url,
                    "pdf_url": url.replace("abs", "pdf") if url else "",
                    "published": published,
                    "year": year,
                    "categories": categories,
                    "citations": 0,
                    "doi": "",
                    "source": "arxiv"
                })
            except Exception as e:
                logger.warning(f"Error parsing entry: {e}")
                continue

        logger.info(f"ArXiv: Found {len(papers)} papers")
        return papers

    except Exception as e:
        logger.error(f"ArXiv error: {e}")
        return []


@tool
def search_semantic_scholar(query: str, limit: int = 10) -> List[Dict]:
    """Search Semantic Scholar with retry logic"""
    url = "https://api.semanticscholar.org/graph/v1/paper/search"
    params = {
        "query": query,
        "limit": limit,
        "fields": "title,authors,abstract,year,citationCount,url,externalIds"
    }
    
    headers = {"User-Agent": "Research Agent"}

    # Try 3 times with backoff
    for attempt in range(3):
        try:
            logger.info(f"Searching Semantic Scholar for: {query} (attempt {attempt+1})")
            
            if attempt > 0:
                time.sleep(2 * attempt)  # Wait 2s, 4s
            
            response = requests.get(url, params=params, headers=headers, timeout=20)
            
            # Handle rate limit
            if response.status_code == 429:
                logger.warning(f"Rate limited, waiting...")
                time.sleep(5)
                continue
            
            response.raise_for_status()
            data = response.json()

            papers = []
            for paper in data.get("data", []):
                papers.append({
                    "id": paper.get("paperId", ""),
                    "title": paper.get("title", "No title"),
                    "authors": [a.get("name", "") for a in paper.get("authors", [])],
                    "abstract": paper.get("abstract", "") or "",
                    "year": paper.get("year"),
                    "citations": paper.get("citationCount", 0),
                    "url": paper.get("url", ""),
                    "published": "",
                    "source": "semantic_scholar"
                })

            logger.info(f"Semantic Scholar: Found {len(papers)} papers")
            return papers

        except Exception as e:
            logger.error(f"Scholar attempt {attempt+1} error: {e}")
            if attempt == 2:
                return []
    
    return []


@tool
def fetch_paper_content(url: str) -> str:
    """Fetch paper content from URL"""
    try:
        headers = {"User-Agent": "Mozilla/5.0"}
        response = requests.get(url, headers=headers, timeout=15)
        response.raise_for_status()

        soup = BeautifulSoup(response.content, "html.parser")
        for tag in soup(["script", "style", "nav", "footer"]):
            tag.decompose()

        text = soup.get_text(separator=" ")
        lines = (line.strip() for line in text.splitlines())
        text = " ".join(line for line in lines if line)
        text = re.sub(r'\s+', ' ', text)
        return text[:6000]
    except Exception as e:
        logger.error(f"Fetch error: {e}")
        return f"Could not fetch: {str(e)}"


@tool
def get_paper_citations(paper_id: str) -> Dict:
    """Get citations for a paper"""
    url = f"https://api.semanticscholar.org/graph/v1/paper/{paper_id}/citations"
    params = {"fields": "title,authors,year,citationCount", "limit": 10}

    try:
        response = requests.get(url, params=params, timeout=10)
        response.raise_for_status()
        data = response.json()

        citations = []
        for item in data.get("data", []):
            citing = item.get("citingPaper", {})
            citations.append({
                "title": citing.get("title"),
                "authors": [a.get("name") for a in citing.get("authors", [])],
                "year": citing.get("year"),
                "citations": citing.get("citationCount", 0)
            })

        return {
            "paper_id": paper_id,
            "total_citations": len(citations),
            "citing_papers": citations
        }
    except Exception as e:
        return {"error": str(e)}


@tool
def search_github_implementations(query: str) -> List[Dict]:
    """Search GitHub for implementations"""
    url = "https://api.github.com/search/repositories"
    params = {
        "q": f"{query} paper implementation",
        "sort": "stars",
        "order": "desc",
        "per_page": 5
    }

    try:
        headers = {"Accept": "application/vnd.github.v3+json"}
        response = requests.get(url, params=params, headers=headers, timeout=10)
        response.raise_for_status()
        data = response.json()

        repos = []
        for repo in data.get("items", [])[:5]:
            repos.append({
                "name": repo.get("name"),
                "description": repo.get("description"),
                "stars": repo.get("stargazers_count", 0),
                "url": repo.get("html_url"),
                "language": repo.get("language"),
                "updated_at": repo.get("updated_at"),
                "topics": repo.get("topics", [])
            })

        logger.info(f"GitHub: Found {len(repos)} repos")
        return repos
    except Exception as e:
        logger.error(f"GitHub error: {e}")
        return []


@tool
def extract_key_concepts(text: str) -> Dict:
    """Extract key concepts from text"""
    try:
        from collections import Counter

        text_lower = text.lower()
        stopwords = {
            "the", "a", "an", "is", "in", "of", "and", "or", "to", "for",
            "this", "that", "with", "are", "was", "were", "be", "been",
            "has", "have", "had", "but", "not", "from", "by", "we", "our"
        }

        words = re.findall(r'\b[a-zA-Z]{4,}\b', text_lower)
        filtered = [w for w in words if w not in stopwords]
        word_freq = Counter(filtered)
        top = word_freq.most_common(20)

        return {
            "concepts": [{"term": t, "frequency": f} for t, f in top],
            "total_words": len(words),
            "unique_concepts": len(word_freq)
        }
    except Exception as e:
        return {"concepts": [], "error": str(e)}


@tool
def calculate_paper_score(paper: Dict) -> Dict:
    """Calculate quality score for paper"""
    try:
        score = 0
        reasons = []

        citations = paper.get("citations", 0)
        if citations > 1000:
            score += 40
            reasons.append("Highly cited")
        elif citations > 100:
            score += 30
            reasons.append("Well cited")
        elif citations > 10:
            score += 20
            reasons.append("Moderately cited")
        else:
            score += 10

        year = paper.get("year", 2020)
        age = 2024 - (year or 2020)
        if age <= 1:
            score += 30
        elif age <= 3:
            score += 25
        elif age <= 5:
            score += 15
        else:
            score += 5

        if paper.get("abstract"):
            score += 15
        if paper.get("authors"):
            score += 10
        if paper.get("url"):
            score += 5

        return {
            "paper_id": paper.get("id", ""),
            "title": paper.get("title", ""),
            "total_score": score,
            "max_score": 100,
            "grade": "A" if score >= 80 else "B" if score >= 60 else "C" if score >= 40 else "D",
            "reasons": reasons
        }
    except Exception as e:
        return {"total_score": 0, "error": str(e)}


@tool
def compare_papers(paper1: Dict, paper2: Dict) -> Dict:
    """Compare two papers"""
    try:
        common_authors = list(
            set(paper1.get("authors", [])) & set(paper2.get("authors", []))
        )
        year1 = paper1.get("year") or 0
        year2 = paper2.get("year") or 0

        return {
            "paper1_title": paper1.get("title"),
            "paper2_title": paper2.get("title"),
            "common_authors": common_authors,
            "year_difference": abs(int(year1) - int(year2))
        }
    except Exception as e:
        return {"error": str(e)}
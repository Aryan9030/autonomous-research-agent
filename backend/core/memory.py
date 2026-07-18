# backend/core/memory.py

import json
from typing import List, Dict, Any, Optional
from datetime import datetime, timedelta
from loguru import logger
from core.config import settings

# Try local embeddings (no API needed - completely free!)
try:
    from langchain_huggingface import HuggingFaceEmbeddings
    from langchain_chroma import Chroma
    CHROMA_AVAILABLE = True
except ImportError:
    try:
        from langchain_community.embeddings import HuggingFaceEmbeddings
        from langchain_chroma import Chroma
        CHROMA_AVAILABLE = True
    except ImportError:
        CHROMA_AVAILABLE = False
        logger.warning("Embeddings not available - Chat feature will be limited")


class InMemoryStore:
    """Simple in-memory storage (replaces Redis)"""

    def __init__(self):
        self.data = {}
        self.expiry = {}
        self.logs = {}
        self.subscribers = {}

    def set(self, key: str, value: str, expire: int = 3600):
        self.data[key] = value
        self.expiry[key] = datetime.utcnow() + timedelta(seconds=expire)

    def get(self, key: str) -> Optional[str]:
        if key in self.expiry:
            if datetime.utcnow() > self.expiry[key]:
                del self.data[key]
                del self.expiry[key]
                return None
        return self.data.get(key)

    def delete(self, key: str):
        self.data.pop(key, None)
        self.expiry.pop(key, None)

    def keys(self, pattern: str) -> List[str]:
        prefix = pattern.replace("*", "")
        return [k for k in self.data.keys() if k.startswith(prefix)]

    def push_log(self, session_id: str, log: str):
        if session_id not in self.logs:
            self.logs[session_id] = []
        self.logs[session_id].append(log)

    def get_logs(self, session_id: str, start: int = 0, end: int = -1) -> List[str]:
        logs = self.logs.get(session_id, [])
        if end == -1:
            return logs[start:]
        return logs[start:end + 1]

    def logs_count(self, session_id: str) -> int:
        return len(self.logs.get(session_id, []))

    def subscribe(self, session_id: str, callback):
        if session_id not in self.subscribers:
            self.subscribers[session_id] = []
        self.subscribers[session_id].append(callback)

    def publish(self, session_id: str, event: Dict):
        events_key = f"events:{session_id}"
        events = self.data.get(events_key, [])
        if not isinstance(events, list):
            events = []
        events.append(event)
        self.data[events_key] = events

        for callback in self.subscribers.get(session_id, []):
            try:
                callback(event)
            except Exception as e:
                logger.error(f"Subscriber error: {e}")


memory_store = InMemoryStore()


class AgentMemory:
    """Shared memory system for all agents"""

    def __init__(self):
        self.store = memory_store
        self.vector_store = None

        if CHROMA_AVAILABLE:
            try:
                embeddings = HuggingFaceEmbeddings(
                    model_name="sentence-transformers/all-MiniLM-L6-v2"
                )
                self.vector_store = Chroma(
                    persist_directory=settings.CHROMA_PERSIST_DIR,
                    embedding_function=embeddings,
                    collection_name="research_papers"
                )
                logger.info("✅ Vector store initialized (local embeddings)")
            except Exception as e:
                logger.warning(f"Vector store init failed: {e}")

        logger.info("✅ AgentMemory initialized (in-memory mode)")

    def store_short_term(self, session_id, key, value, expire=3600):
        try:
            redis_key = f"session:{session_id}:{key}"
            self.store.set(redis_key, json.dumps(value, default=str), expire)
            return True
        except Exception as e:
            logger.error(f"Store error: {e}")
            return False

    def get_short_term(self, session_id, key):
        try:
            redis_key = f"session:{session_id}:{key}"
            data = self.store.get(redis_key)
            return json.loads(data) if data else None
        except:
            return None

    def delete_short_term(self, session_id, key):
        try:
            self.store.delete(f"session:{session_id}:{key}")
            return True
        except:
            return False

    def get_all_session_keys(self, session_id):
        try:
            keys = self.store.keys(f"session:{session_id}:*")
            return [k.replace(f"session:{session_id}:", "") for k in keys]
        except:
            return []

    def store_agent_log(self, session_id, agent_name, action, result, status="success"):
        try:
            log_entry = {
                "agent": agent_name,
                "action": action,
                "result": result,
                "status": status,
                "timestamp": datetime.utcnow().isoformat()
            }
            self.store.push_log(session_id, json.dumps(log_entry))
            logger.info(f"[{agent_name}] {action}: {result[:100]}")
            return True
        except Exception as e:
            logger.error(f"Log error: {e}")
            return False

    def get_agent_logs(self, session_id, start=0, end=-1):
        try:
            logs = self.store.get_logs(session_id, start, end)
            return [json.loads(log) for log in logs]
        except:
            return []

    def get_logs_count(self, session_id):
        return self.store.logs_count(session_id)

    def store_paper_embedding(self, paper_id, content, metadata):
        if not self.vector_store:
            return False
        try:
            clean_metadata = {k: str(v) if v is not None else "" for k, v in metadata.items()}
            self.vector_store.add_texts(
                texts=[content],
                metadatas=[clean_metadata],
                ids=[paper_id]
            )
            return True
        except Exception as e:
            logger.error(f"Embedding error: {e}")
            return False

    def search_similar_papers(self, query, k=5, session_id=None):
        if not self.vector_store:
            return []
        try:
            if session_id:
                results = self.vector_store.similarity_search_with_score(
                    query, k=k, filter={"session_id": session_id}
                )
            else:
                results = self.vector_store.similarity_search_with_score(query, k=k)
            return [
                {
                    "content": doc.page_content,
                    "metadata": doc.metadata,
                    "similarity_score": float(score)
                }
                for doc, score in results
            ]
        except Exception as e:
            logger.error(f"Search error: {e}")
            return []

    def delete_session_embeddings(self, session_id):
        return True

    def publish_event(self, session_id, event_type, data):
        try:
            event = {
                "session_id": session_id,
                "event_type": event_type,
                "data": data,
                "timestamp": datetime.utcnow().isoformat()
            }
            self.store.publish(session_id, event)
            return True
        except Exception as e:
            logger.error(f"Publish error: {e}")
            return False

    def subscribe_to_events(self, session_id, callback):
        self.store.subscribe(session_id, callback)

    def get_pending_events(self, session_id):
        events_key = f"events:{session_id}"
        events = self.store.get(events_key)
        if events:
            if isinstance(events, str):
                events = json.loads(events)
            self.store.delete(events_key)
            return events
        return []

    def update_progress(self, session_id, stage, percentage, message):
        progress_data = {
            "stage": stage,
            "percentage": percentage,
            "message": message,
            "timestamp": datetime.utcnow().isoformat()
        }
        self.store_short_term(session_id, "progress", progress_data)
        self.publish_event(session_id, "progress_update", progress_data)

    def get_progress(self, session_id):
        return self.get_short_term(session_id, "progress")

    def health_check(self):
        return {
            "redis": True,
            "chroma": self.vector_store is not None,
            "overall": True
        }
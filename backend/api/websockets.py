# backend/api/websockets.py

from fastapi import WebSocket
from typing import Dict, Any
from loguru import logger
import json
import asyncio
from core.memory import memory_store


class WebSocketManager:
    """
    Manages WebSocket connections
    Uses in-memory event system (no Redis needed)
    """

    def __init__(self):
        self.active_connections: Dict[str, WebSocket] = {}
        logger.info("✅ WebSocketManager initialized")

    async def connect(self, websocket: WebSocket, session_id: str) -> None:
        """Accept new WebSocket connection"""
        await websocket.accept()
        self.active_connections[session_id] = websocket

        logger.info(f"WebSocket connected: {session_id[:8]}")

        # Send welcome message
        await self.send_to_session(
            session_id,
            {
                "event_type": "connected",
                "data": {
                    "session_id": session_id,
                    "message": "Connected to research system"
                }
            }
        )

        # Start event polling
        asyncio.create_task(self._poll_events(session_id))

    def disconnect(self, session_id: str) -> None:
        """Handle disconnection"""
        if session_id in self.active_connections:
            del self.active_connections[session_id]
            logger.info(f"WebSocket disconnected: {session_id[:8]}")

    def is_connected(self, session_id: str) -> bool:
        return session_id in self.active_connections

    async def send_to_session(
        self,
        session_id: str,
        message: Dict[str, Any]
    ) -> bool:
        """Send message to specific session"""
        if session_id not in self.active_connections:
            return False

        websocket = self.active_connections[session_id]

        try:
            await websocket.send_json(message)
            return True
        except Exception as e:
            logger.error(f"Send error: {e}")
            self.disconnect(session_id)
            return False

    async def _poll_events(self, session_id: str) -> None:
        """
        Poll for events from memory store
        Since no Redis pub/sub, we poll every 500ms
        """
        try:
            logger.info(f"Polling events for: {session_id[:8]}")

            while session_id in self.active_connections:
                # Get pending events
                events_key = f"events:{session_id}"
                events = memory_store.get(events_key)

                if events:
                    if isinstance(events, str):
                        try:
                            events = json.loads(events)
                        except:
                            events = []

                    # Clear events after reading
                    memory_store.delete(events_key)

                    # Send each event
                    for event in events:
                        await self.send_to_session(session_id, event)

                        event_type = event.get("event_type", "")
                        if event_type in ["research_completed", "research_error"]:
                            logger.info(f"Research ended: {session_id[:8]}")
                            await asyncio.sleep(2)
                            return

                await asyncio.sleep(0.5)

        except Exception as e:
            logger.error(f"Poll events error: {e}")

    def get_stats(self) -> Dict:
        return {
            "active_connections": len(self.active_connections),
            "connected_sessions": list(self.active_connections.keys())
        }


# Global WebSocket manager
websocket_manager = WebSocketManager()


# Custom event publisher that uses memory_store
def publish_event_direct(session_id: str, event_type: str, data: Dict):
    """Publish event directly to memory store"""
    from datetime import datetime

    event = {
        "session_id": session_id,
        "event_type": event_type,
        "data": data,
        "timestamp": datetime.utcnow().isoformat()
    }

    events_key = f"events:{session_id}"
    existing = memory_store.get(events_key)

    if existing:
        if isinstance(existing, str):
            try:
                events = json.loads(existing)
            except:
                events = []
        else:
            events = existing
    else:
        events = []

    events.append(event)
    memory_store.set(events_key, json.dumps(events, default=str), expire=3600)
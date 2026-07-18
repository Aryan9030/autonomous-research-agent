import { useEffect, useRef, useCallback, useState } from "react";
import { WebSocketService } from "../services/api";
import type {
  WebSocketEvent,
  AgentLog,
  ResearchProgress,
  AgentName,
} from "../types";


// ═══════════════════════════════════════════════════════
//   WEBSOCKET HOOK
// ═══════════════════════════════════════════════════════

interface UseWebSocketProps {
  sessionId: string | null;
  onEvent: (event: WebSocketEvent) => void;
  onConnected?: () => void;
  onDisconnected?: () => void;
}

interface UseWebSocketReturn {
  isConnected: boolean;
  connectionStatus: "idle" | "connecting" | "connected" | "disconnected";
  sendMessage: (message: string) => void;
  disconnect: () => void;
}

export const useWebSocket = ({
  sessionId,
  onEvent,
  onConnected,
  onDisconnected,
}: UseWebSocketProps): UseWebSocketReturn => {

  const wsServiceRef = useRef<WebSocketService | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<
    "idle" | "connecting" | "connected" | "disconnected"
  >("idle");

  const disconnect = useCallback(() => {
    if (wsServiceRef.current) {
      wsServiceRef.current.disconnect();
      wsServiceRef.current = null;
    }
    setIsConnected(false);
    setConnectionStatus("disconnected");
  }, []);

  const connect = useCallback(() => {
    if (!sessionId) return;

    setConnectionStatus("connecting");

    wsServiceRef.current = new WebSocketService(sessionId);

    wsServiceRef.current.connect(
      (event: WebSocketEvent) => {
        onEvent(event);

        if (
          event.event_type === "research_completed" ||
          event.event_type === "research_error"
        ) {
          setTimeout(() => {
            disconnect();
          }, 2000);
        }
      },
      (error) => {
        console.error("WebSocket error:", error);
        setIsConnected(false);
        setConnectionStatus("disconnected");
      },
      () => {
        setIsConnected(false);
        setConnectionStatus("disconnected");
        if (onDisconnected) onDisconnected();
      }
    );

    setIsConnected(true);
    setConnectionStatus("connected");
    if (onConnected) onConnected();

  }, [sessionId, onEvent, onConnected, onDisconnected, disconnect]);

  const sendMessage = useCallback((message: string) => {
    if (wsServiceRef.current) {
      wsServiceRef.current.send(message);
    }
  }, []);

  useEffect(() => {
    if (sessionId) {
      connect();
    }

    return () => {
      disconnect();
    };
  }, [sessionId]);

  return {
    isConnected,
    connectionStatus,
    sendMessage,
    disconnect,
  };
};


// ═══════════════════════════════════════════════════════
//   AGENT EVENTS HOOK
// ═══════════════════════════════════════════════════════

interface UseAgentEventsReturn {
  logs: AgentLog[];
  progress: ResearchProgress | null;
  currentAgent: AgentName | null;
  currentAction: string;
  papersFound: number;
  papersFiltered: number;
  isCompleted: boolean;
  hasError: boolean;
  errorMessage: string | null;
  handleEvent: (event: WebSocketEvent) => void;
  resetState: () => void;
}

export const useAgentEvents = (): UseAgentEventsReturn => {

  const [logs, setLogs] = useState<AgentLog[]>([]);
  const [progress, setProgress] = useState<ResearchProgress | null>(null);
  const [currentAgent, setCurrentAgent] = useState<AgentName | null>(null);
  const [currentAction, setCurrentAction] = useState<string>("");
  const [papersFound, setPapersFound] = useState<number>(0);
  const [papersFiltered, setPapersFiltered] = useState<number>(0);
  const [isCompleted, setIsCompleted] = useState<boolean>(false);
  const [hasError, setHasError] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const addLog = useCallback((
    agent: AgentName,
    action: string,
    result: string,
    status: "success" | "error" = "success"
  ) => {
    setLogs((prev) => [
      ...prev,
      {
        agent,
        action,
        result,
        status,
        timestamp: new Date().toISOString(),
      },
    ]);
  }, []);

  const handleEvent = useCallback((event: WebSocketEvent) => {

    const { event_type, data } = event;

    switch (event_type) {

      case "connected":
        console.log("✅ Research system connected");
        break;

      case "agent_started":
        setCurrentAgent(data.agent as AgentName);
        setCurrentAction(data.action);

        setLogs((prev) => [
          ...prev,
          {
            agent: data.agent as AgentName,
            action: data.action,
            result: "In progress...",
            status: "success",
            timestamp: event.timestamp || new Date().toISOString(),
          },
        ]);
        break;

      case "papers_found":
        setPapersFound(data.count || 0);
        addLog("ResearchAgent", "Papers Found", `${data.count} papers discovered`);
        break;

      case "papers_filtered":
        setPapersFiltered(data.selected_count || 0);
        addLog(
          "ResearchAgent",
          "Papers Filtered",
          `Selected ${data.selected_count} most relevant papers`
        );
        break;

      case "analyzing_paper":
        addLog(
          "AnalysisAgent",
          `Analyzing ${data.current}/${data.total}`,
          data.paper_title || "Paper analysis in progress"
        );
        break;

      case "themes_identified":
        addLog(
          "AnalysisAgent",
          "Themes Identified",
          `Found ${data.themes_count} themes, ${data.gaps_count} knowledge gaps`
        );
        break;

      case "report_drafted":
        addLog(
          "WritingAgent",
          "Report Drafted",
          `${data.word_count} words written`
        );
        break;

      case "fact_check_complete":
        addLog(
          "FactCheckAgent",
          "Fact Check Complete",
          `${data.verified}/${data.total_claims} claims verified`
        );
        break;

      case "progress_update":
        setProgress({
          stage: data.stage,
          percentage: data.percentage,
          message: data.message,
          timestamp: event.timestamp || new Date().toISOString(),
        });
        break;

      case "research_completed":
        setIsCompleted(true);
        setCurrentAgent(null);
        setCurrentAction("Research completed!");
        addLog(
          "Orchestrator",
          "Research Completed ✅",
          `${data.papers_analyzed} papers analyzed, report generated`
        );
        setProgress({
          stage: "completed",
          percentage: 100,
          message: "Research completed successfully!",
          timestamp: new Date().toISOString(),
        });
        break;

      case "research_error":
        setHasError(true);
        setErrorMessage(data.error || "Unknown error occurred");
        addLog(
          "Orchestrator",
          "Research Failed ❌",
          data.error || "Unknown error",
        );
        break;

      default:
        break;
    }
  }, [addLog]);

  const resetState = useCallback(() => {
    setLogs([]);
    setProgress(null);
    setCurrentAgent(null);
    setCurrentAction("");
    setPapersFound(0);
    setPapersFiltered(0);
    setIsCompleted(false);
    setHasError(false);
    setErrorMessage(null);
  }, []);

  return {
    logs,
    progress,
    currentAgent,
    currentAction,
    papersFound,
    papersFiltered,
    isCompleted,
    hasError,
    errorMessage,
    handleEvent,
    resetState,
  };
};
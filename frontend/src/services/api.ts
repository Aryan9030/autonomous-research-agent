import axios from "axios";
import type { AxiosInstance, AxiosError } from "axios";
import type {
  ResearchSession,
  ResearchReport,
  ResearchThemes,
  FactCheckResult,
  Paper,
  AgentLog,
  ChatResponse,
  GitHubRepo,
  HistorySession,
  HealthCheck,
} from "../types";

// ═══════════════════════════════════════════════════════
//   API CLIENT SETUP
// ═══════════════════════════════════════════════════════

const BASE_URL =
  import.meta.env.VITE_API_URL || "http://localhost:8000/api/v1";

const apiClient: AxiosInstance = axios.create({
  baseURL: BASE_URL,
  timeout: 30000,
  headers: {
    "Content-Type": "application/json",
  },
});

// Request Interceptor
apiClient.interceptors.request.use(
  (config) => {
    console.log(`API Request: ${config.method?.toUpperCase()} ${config.url}`);
    return config;
  },
  (error) => Promise.reject(error)
);

// Response Interceptor
apiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    const message =
      (error.response?.data as any)?.detail ||
      error.message ||
      "Unknown error";
    console.error(`API Error: ${message}`);
    return Promise.reject(new Error(message));
  }
);


// ═══════════════════════════════════════════════════════
//   RESEARCH API
// ═══════════════════════════════════════════════════════

export const ResearchAPI = {

  startResearch: async (
    query: string,
    depth: string = "comprehensive"
  ): Promise<ResearchSession> => {
    const response = await apiClient.post<ResearchSession>(
      "/research/start",
      { query, depth }
    );
    return response.data;
  },

  getStatus: async (sessionId: string) => {
    const response = await apiClient.get(
      `/research/${sessionId}/status`
    );
    return response.data;
  },

  getReport: async (
    sessionId: string
  ): Promise<ResearchReport> => {
    const response = await apiClient.get<ResearchReport>(
      `/research/${sessionId}/report`
    );
    return response.data;
  },

  getPapers: async (
    sessionId: string
  ): Promise<{ papers: Paper[]; papers_count: number }> => {
    const response = await apiClient.get(
      `/research/${sessionId}/papers`
    );
    return response.data;
  },

  getThemes: async (
    sessionId: string
  ): Promise<ResearchThemes> => {
    const response = await apiClient.get<ResearchThemes>(
      `/research/${sessionId}/themes`
    );
    return response.data;
  },

  getLogs: async (
    sessionId: string,
    start: number = 0,
    limit: number = 50
  ): Promise<{ logs: AgentLog[]; total_logs: number }> => {
    const response = await apiClient.get(
      `/research/${sessionId}/logs`,
      { params: { start, limit } }
    );
    return response.data;
  },

  getFactCheck: async (
    sessionId: string
  ): Promise<FactCheckResult> => {
    const response = await apiClient.get<FactCheckResult>(
      `/research/${sessionId}/fact-check`
    );
    return response.data;
  },

  getGithubRepos: async (
    sessionId: string
  ): Promise<{ repos: GitHubRepo[]; count: number }> => {
    const response = await apiClient.get(
      `/research/${sessionId}/github`
    );
    return response.data;
  },

  chat: async (
    sessionId: string,
    question: string
  ): Promise<ChatResponse> => {
    const response = await apiClient.post<ChatResponse>(
      `/research/${sessionId}/chat`,
      { question }
    );
    return response.data;
  },

  getHistory: async (
    limit: number = 20,
    offset: number = 0
  ): Promise<{ sessions: HistorySession[]; total: number }> => {
    const response = await apiClient.get(
      "/research/history/all",
      { params: { limit, offset } }
    );
    return response.data;
  },

  healthCheck: async (): Promise<HealthCheck> => {
    const response = await apiClient.get<HealthCheck>(
      "/health"
    );
    return response.data;
  },
};


// ═══════════════════════════════════════════════════════
//   WEBSOCKET SERVICE
// ═══════════════════════════════════════════════════════

const WS_BASE_URL =
  import.meta.env.VITE_WS_URL || "ws://localhost:8000";

export class WebSocketService {
  private ws: WebSocket | null = null;
  private sessionId: string;
  private pingInterval: ReturnType<typeof setInterval> | null = null;

  constructor(sessionId: string) {
    this.sessionId = sessionId;
  }

  connect(
    onMessage: (event: any) => void,
    onError?: (error: Event) => void,
    onClose?: () => void
  ): void {
    const url = `${WS_BASE_URL}/ws/${this.sessionId}`;

    console.log(`Connecting WebSocket: ${url}`);
    this.ws = new WebSocket(url);

    this.ws.onopen = () => {
      console.log(`✅ WebSocket connected: ${this.sessionId}`);
      this.startPing();
    };

    this.ws.onmessage = (event: MessageEvent) => {
      try {
        const data = JSON.parse(event.data);
        onMessage(data);
      } catch (e) {
        console.error("WebSocket parse error:", e);
      }
    };

    this.ws.onerror = (error: Event) => {
      console.error("WebSocket error:", error);
      if (onError) onError(error);
    };

    this.ws.onclose = () => {
      console.log(`WebSocket closed: ${this.sessionId}`);
      this.stopPing();
      if (onClose) onClose();
    };
  }

  send(message: string): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(message);
    }
  }

  private startPing(): void {
    this.pingInterval = setInterval(() => {
      this.send("ping");
    }, 30000);
  }

  private stopPing(): void {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
  }

  disconnect(): void {
    this.stopPing();
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }
}
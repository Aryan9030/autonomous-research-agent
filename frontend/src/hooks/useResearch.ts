import { useState, useCallback } from "react";
import { ResearchAPI } from "../services/api";
import type {
  ResearchStatus,
  ResearchReport,
  ResearchThemes,
  Paper,
  FactCheckResult,
  GitHubRepo,
  ChatMessage,
  ChatResponse,
} from "../types";
import { v4 as uuidv4 } from "uuid";


// ═══════════════════════════════════════════════════════
//   MAIN RESEARCH HOOK
// ═══════════════════════════════════════════════════════

interface UseResearchReturn {
  sessionId: string | null;
  query: string;
  status: ResearchStatus;
  isLoading: boolean;
  error: string | null;
  report: ResearchReport | null;
  themes: ResearchThemes | null;
  papers: Paper[];
  factCheck: FactCheckResult | null;
  githubRepos: GitHubRepo[];
  startResearch: (query: string) => Promise<string | null>;
  fetchReport: (sessionId: string) => Promise<void>;
  fetchThemes: (sessionId: string) => Promise<void>;
  fetchPapers: (sessionId: string) => Promise<void>;
  fetchFactCheck: (sessionId: string) => Promise<void>;
  fetchGithubRepos: (sessionId: string) => Promise<void>;
  resetResearch: () => void;
  setStatus: (status: ResearchStatus) => void;
}

export const useResearch = (): UseResearchReturn => {

  const [sessionId, setSessionId] = useState<string | null>(null);
  const [query, setQuery] = useState<string>("");
  const [status, setStatus] = useState<ResearchStatus>("idle");
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const [report, setReport] = useState<ResearchReport | null>(null);
  const [themes, setThemes] = useState<ResearchThemes | null>(null);
  const [papers, setPapers] = useState<Paper[]>([]);
  const [factCheck, setFactCheck] = useState<FactCheckResult | null>(null);
  const [githubRepos, setGithubRepos] = useState<GitHubRepo[]>([]);

  const startResearch = useCallback(
    async (researchQuery: string): Promise<string | null> => {

      if (!researchQuery.trim()) {
        setError("Please enter a research topic");
        return null;
      }

      setIsLoading(true);
      setError(null);
      setQuery(researchQuery);
      setStatus("started");

      setReport(null);
      setThemes(null);
      setPapers([]);
      setFactCheck(null);
      setGithubRepos([]);

      try {
        const session = await ResearchAPI.startResearch(
          researchQuery,
          "comprehensive"
        );

        setSessionId(session.session_id);
        setStatus("planning");

        console.log(`✅ Research started: ${session.session_id}`);
        return session.session_id;

      } catch (err: any) {
        const errorMsg = err.message || "Failed to start research";
        setError(errorMsg);
        setStatus("failed");
        console.error("Start research error:", err);
        return null;

      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  const fetchReport = useCallback(
    async (sid: string): Promise<void> => {
      try {
        const data = await ResearchAPI.getReport(sid);
        setReport(data);
      } catch (err: any) {
        console.error("Fetch report error:", err);
      }
    },
    []
  );

  const fetchThemes = useCallback(
    async (sid: string): Promise<void> => {
      try {
        const data = await ResearchAPI.getThemes(sid);
        setThemes(data);
      } catch (err: any) {
        console.error("Fetch themes error:", err);
      }
    },
    []
  );

  const fetchPapers = useCallback(
    async (sid: string): Promise<void> => {
      try {
        const data = await ResearchAPI.getPapers(sid);
        setPapers(data.papers || []);
      } catch (err: any) {
        console.error("Fetch papers error:", err);
      }
    },
    []
  );

  const fetchFactCheck = useCallback(
    async (sid: string): Promise<void> => {
      try {
        const data = await ResearchAPI.getFactCheck(sid);
        setFactCheck(data);
      } catch (err: any) {
        console.error("Fetch fact check error:", err);
      }
    },
    []
  );

  const fetchGithubRepos = useCallback(
    async (sid: string): Promise<void> => {
      try {
        const data = await ResearchAPI.getGithubRepos(sid);
        setGithubRepos(data.repos || []);
      } catch (err: any) {
        console.error("Fetch github error:", err);
      }
    },
    []
  );

  const resetResearch = useCallback(() => {
    setSessionId(null);
    setQuery("");
    setStatus("idle");
    setIsLoading(false);
    setError(null);
    setReport(null);
    setThemes(null);
    setPapers([]);
    setFactCheck(null);
    setGithubRepos([]);
  }, []);

  return {
    sessionId,
    query,
    status,
    isLoading,
    error,
    report,
    themes,
    papers,
    factCheck,
    githubRepos,
    startResearch,
    fetchReport,
    fetchThemes,
    fetchPapers,
    fetchFactCheck,
    fetchGithubRepos,
    resetResearch,
    setStatus,
  };
};


// ═══════════════════════════════════════════════════════
//   CHAT HOOK
// ═══════════════════════════════════════════════════════

interface UseChatReturn {
  messages: ChatMessage[];
  isLoading: boolean;
  sendMessage: (question: string) => Promise<void>;
  clearMessages: () => void;
}

export const useChat = (sessionId: string | null): UseChatReturn => {

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const sendMessage = useCallback(
    async (question: string): Promise<void> => {

      if (!sessionId || !question.trim()) return;

      const userMessage: ChatMessage = {
        id: uuidv4(),
        role: "user",
        content: question,
        timestamp: new Date().toISOString(),
      };

      setMessages((prev) => [...prev, userMessage]);
      setIsLoading(true);

      try {
        const response: ChatResponse = await ResearchAPI.chat(
          sessionId,
          question
        );

        const assistantMessage: ChatMessage = {
          id: uuidv4(),
          role: "assistant",
          content: response.answer,
          timestamp: new Date().toISOString(),
          sources: response.sources,
        };

        setMessages((prev) => [...prev, assistantMessage]);

      } catch (err: any) {
        const errorMessage: ChatMessage = {
          id: uuidv4(),
          role: "assistant",
          content: "Sorry, I could not process your question. Please try again.",
          timestamp: new Date().toISOString(),
        };

        setMessages((prev) => [...prev, errorMessage]);

      } finally {
        setIsLoading(false);
      }
    },
    [sessionId]
  );

  const clearMessages = useCallback(() => {
    setMessages([]);
  }, []);

  return {
    messages,
    isLoading,
    sendMessage,
    clearMessages,
  };
};
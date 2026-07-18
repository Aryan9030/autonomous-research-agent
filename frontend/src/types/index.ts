// ═══════════════════════════════════════════════════════
//   RESEARCH TYPES
// ═══════════════════════════════════════════════════════

export type ResearchStatus =
  | "idle"
  | "started"
  | "planning"
  | "searching"
  | "filtering"
  | "analyzing"
  | "synthesizing"
  | "writing"
  | "fact_checking"
  | "finalizing"
  | "completed"
  | "failed";

export type ResearchDepth = "quick" | "comprehensive" | "deep";

export type AgentName =
  | "Orchestrator"
  | "ResearchAgent"
  | "AnalysisAgent"
  | "WritingAgent"
  | "FactCheckAgent";

export type VerificationLevel =
  | "VERIFIED"
  | "PARTIALLY_VERIFIED"
  | "UNVERIFIED"
  | "INCORRECT";


// ═══════════════════════════════════════════════════════
//   SESSION TYPES
// ═══════════════════════════════════════════════════════

export interface ResearchSession {
  session_id: string;
  query: string;
  status: ResearchStatus;
  websocket_url: string;
  message: string;
}

export interface ResearchProgress {
  stage: string;
  percentage: number;
  message: string;
  timestamp: string;
}

export interface ResearchStats {
  papersFound: number;
  papersAnalyzed: number;
  themesFound: number;
  claimsVerified: number;
  wordCount: number;
}


// ═══════════════════════════════════════════════════════
//   AGENT TYPES
// ═══════════════════════════════════════════════════════

export interface AgentLog {
  agent: AgentName;
  action: string;
  result: string;
  status: "success" | "error" | "warning";
  timestamp: string;
}

export interface AgentActivity {
  agent: AgentName;
  action: string;
  icon: string;
  timestamp: string;
}


// ═══════════════════════════════════════════════════════
//   PAPER TYPES
// ═══════════════════════════════════════════════════════

export interface Paper {
  id: string;
  title: string;
  authors: string[];
  abstract: string;
  url: string;
  pdf_url?: string;
  year: number | null;
  citations: number;
  source: string;
  relevance_score: number;
  quality_score?: number;
  quality_grade?: string;
  analysis?: PaperAnalysis;
}

export interface PaperAnalysis {
  summary: string;
  key_contributions: string[];
  methodology: string;
  results: string;
  limitations: string[];
  relevance_score: number;
  key_terms: string[];
  paper_type: string;
  novelty: string;
}


// ═══════════════════════════════════════════════════════
//   REPORT TYPES
// ═══════════════════════════════════════════════════════

export interface ResearchReport {
  session_id: string;
  report: string;
  word_count: number;
  papers_analyzed: number;
  themes_count: number;
  generated_at: string | null;
}

export interface ResearchThemes {
  session_id: string;
  themes: string[];
  knowledge_gaps: string[];
  consensus_findings: string[];
  future_directions: string[];
  field_maturity: string;
}


// ═══════════════════════════════════════════════════════
//   FACT CHECK TYPES
// ═══════════════════════════════════════════════════════

export interface VerifiedClaim {
  claim: string;
  verified: boolean;
  verification_level: VerificationLevel;
  confidence: number;
  reason: string;
  supporting_evidence: string;
}

export interface FactCheckResult {
  session_id: string;
  total_claims: number;
  verified_count: number;
  unverified_count: number;
  avg_confidence: number;
  claims: VerifiedClaim[];
}


// ═══════════════════════════════════════════════════════
//   GITHUB TYPES
// ═══════════════════════════════════════════════════════

export interface GitHubRepo {
  name: string;
  description: string | null;
  stars: number;
  url: string;
  language: string | null;
  updated_at: string;
  topics: string[];
}


// ═══════════════════════════════════════════════════════
//   CHAT TYPES
// ═══════════════════════════════════════════════════════

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: string;
  sources?: ChatSource[];
}

export interface ChatSource {
  title: string;
  url: string;
  year: string;
  similarity: number;
}

export interface ChatResponse {
  session_id: string;
  question: string;
  answer: string;
  sources: ChatSource[];
  sources_count: number;
}


// ═══════════════════════════════════════════════════════
//   WEBSOCKET EVENT TYPES
// ═══════════════════════════════════════════════════════

export type WebSocketEventType =
  | "connected"
  | "research_started"
  | "plan_created"
  | "agent_started"
  | "searching_query"
  | "papers_found"
  | "papers_filtered"
  | "analyzing_paper"
  | "analysis_complete"
  | "themes_identified"
  | "outline_created"
  | "report_drafted"
  | "claims_extracted"
  | "verifying_claim"
  | "fact_check_complete"
  | "report_finalized"
  | "progress_update"
  | "research_completed"
  | "research_error"
  | "pong"
  | "stats";

export interface WebSocketEvent {
  session_id: string;
  event_type: WebSocketEventType;
  data: Record<string, any>;
  timestamp: string;
}


// ═══════════════════════════════════════════════════════
//   API RESPONSE TYPES
// ═══════════════════════════════════════════════════════

export interface HistorySession {
  id: string;
  query: string;
  status: string;
  papers_found: number;
  papers_analyzed: number;
  created_at: string;
  completed_at: string | null;
}

export interface HealthCheck {
  status: string;
  timestamp: string;
  services: {
    api: boolean;
    redis: boolean;
    vector_db: boolean;
    database: boolean;
  };
  version: string;
}


// ═══════════════════════════════════════════════════════
//   AGENT CONFIG TYPES
// ═══════════════════════════════════════════════════════

export interface AgentConfig {
  name: AgentName;
  icon: string;
  color: string;
  bgColor: string;
  description: string;
}

export const AGENT_CONFIGS: Record<AgentName, AgentConfig> = {
  Orchestrator: {
    name: "Orchestrator",
    icon: "🧠",
    color: "text-purple-400",
    bgColor: "bg-purple-900/30 border-purple-500/30",
    description: "Master controller - plans and coordinates"
  },
  ResearchAgent: {
    name: "ResearchAgent",
    icon: "🔍",
    color: "text-blue-400",
    bgColor: "bg-blue-900/30 border-blue-500/30",
    description: "Searches academic databases"
  },
  AnalysisAgent: {
    name: "AnalysisAgent",
    icon: "🧪",
    color: "text-green-400",
    bgColor: "bg-green-900/30 border-green-500/30",
    description: "Deep analyzes papers"
  },
  WritingAgent: {
    name: "WritingAgent",
    icon: "✍️",
    color: "text-yellow-400",
    bgColor: "bg-yellow-900/30 border-yellow-500/30",
    description: "Writes research reports"
  },
  FactCheckAgent: {
    name: "FactCheckAgent",
    icon: "✅",
    color: "text-red-400",
    bgColor: "bg-red-900/30 border-red-500/30",
    description: "Verifies all claims"
  }
};
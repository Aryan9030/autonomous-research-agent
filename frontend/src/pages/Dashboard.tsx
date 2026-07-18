import React, { useState, useEffect } from "react";
import {
  Brain,
  FileText,
  BookOpen,
  Lightbulb,
  MessageSquare,
  RefreshCw,
  Wifi,
  WifiOff,
} from "lucide-react";

// Components
import SearchBar from "../components/SearchBar";
import AgentLogComponent from "../components/AgentLog";
import StatsCards from "../components/StatsCards";
import ProgressBar from "../components/ProgressBar";
import PaperCard from "../components/PaperCard";
import ResearchReportComponent from "../components/ResearchReport";

// Hooks
import { useResearch, useChat } from "../hooks/useResearch";
import { useWebSocket, useAgentEvents } from "../hooks/useWebSocket";

// Types
import type {
  WebSocketEvent,
  ResearchStatus,
  AgentName,
  GitHubRepo,
  ResearchThemes,
} from "../types";


// ═══════════════════════════════════════════════════════
//   TAB TYPES
// ═══════════════════════════════════════════════════════

type TabId =
  | "logs"
  | "papers"
  | "themes"
  | "report"
  | "chat"
  | "github";

interface Tab {
  id: TabId;
  label: string;
  icon: React.ReactNode;
  badge?: number;
}


// ═══════════════════════════════════════════════════════
//   CHAT PANEL
// ═══════════════════════════════════════════════════════

const ChatPanel: React.FC<{
  sessionId: string | null;
  isEnabled: boolean;
}> = ({ sessionId, isEnabled }) => {
  const { messages, isLoading, sendMessage } = useChat(sessionId);
  const [input, setInput] = useState("");

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;
    const q = input.trim();
    setInput("");
    await sendMessage(q);
  };

  if (!isEnabled) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-gray-600 space-y-3">
        <MessageSquare className="w-12 h-12" />
        <p className="text-sm text-gray-500">
          Complete research to chat with papers
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[500px]">

      {/* Messages */}
      <div className="flex-1 overflow-y-auto space-y-4 p-4 custom-scrollbar">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-gray-600 space-y-2">
            <MessageSquare className="w-10 h-10" />
            <p className="text-sm">Ask anything about your research</p>
            <div className="flex flex-col gap-2 mt-4 w-full max-w-sm">
              {[
                "What are the main findings?",
                "What methods were used?",
                "What are the knowledge gaps?",
              ].map((example) => (
                <button
                  key={example}
                  onClick={() => sendMessage(example)}
                  className="text-xs text-left px-3 py-2 rounded-lg bg-gray-800 border border-gray-700 text-gray-400 hover:text-purple-400 hover:border-purple-500/50 transition-all"
                >
                  {example}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`
                max-w-[80%] rounded-xl px-4 py-3 text-sm
                ${msg.role === "user"
                  ? "bg-purple-600 text-white"
                  : "bg-gray-800 border border-gray-700 text-gray-300"
                }
              `}
            >
              <p className="leading-relaxed">{msg.content}</p>

              {msg.sources && msg.sources.length > 0 && (
                <div className="mt-2 pt-2 border-t border-gray-600 space-y-1">
                  <p className="text-xs text-gray-500">Sources:</p>
                  {msg.sources.slice(0, 3).map((source, i) => (
                    <a
                      key={i}
                      href={source.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block text-xs text-purple-400 hover:text-purple-300 truncate"
                    >
                      {source.title}
                    </a>
                  ))}
                </div>
              )}

              <p className="text-xs opacity-50 mt-1">
                {new Date(msg.timestamp).toLocaleTimeString()}
              </p>
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-gray-800 border border-gray-700 rounded-xl px-4 py-3">
              <div className="flex gap-1">
                {[0, 1, 2].map((i) => (
                  <div
                    key={i}
                    className="w-2 h-2 bg-purple-400 rounded-full animate-bounce"
                    style={{ animationDelay: `${i * 150}ms` }}
                  />
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Input */}
      <div className="border-t border-gray-700 p-4">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={(e) => e.key === "Enter" && handleSend()}
            placeholder="Ask about your research..."
            className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-sm text-white placeholder-gray-500 outline-none focus:border-purple-500 transition-colors"
          />
          <button
            onClick={handleSend}
            disabled={isLoading || !input.trim()}
            className="px-4 py-2.5 bg-purple-600 hover:bg-purple-500 disabled:bg-gray-700 disabled:text-gray-500 text-white rounded-lg text-sm font-medium transition-colors"
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
};


// ═══════════════════════════════════════════════════════
//   THEMES PANEL
// ═══════════════════════════════════════════════════════

const ThemesPanel: React.FC<{
  themes: ResearchThemes | null;
  isLoading: boolean;
}> = ({ themes, isLoading }) => {

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-40">
        <div className="w-8 h-8 border-4 border-purple-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!themes) {
    return (
      <div className="flex flex-col items-center justify-center h-40 text-gray-600 space-y-2">
        <Lightbulb className="w-10 h-10" />
        <p className="text-sm text-gray-500">
          Themes will appear after research
        </p>
      </div>
    );
  }

  const sections = [
    {
      title: "Major Themes",
      icon: "🔬",
      items: themes.themes || [],
      color: "text-blue-400",
      bgColor: "bg-blue-900/20 border-blue-500/20",
    },
    {
      title: "Consensus Findings",
      icon: "✅",
      items: themes.consensus_findings || [],
      color: "text-green-400",
      bgColor: "bg-green-900/20 border-green-500/20",
    },
    {
      title: "Knowledge Gaps",
      icon: "❓",
      items: themes.knowledge_gaps || [],
      color: "text-yellow-400",
      bgColor: "bg-yellow-900/20 border-yellow-500/20",
    },
    {
      title: "Future Directions",
      icon: "🚀",
      items: themes.future_directions || [],
      color: "text-purple-400",
      bgColor: "bg-purple-900/20 border-purple-500/20",
    },
  ];

  return (
    <div className="space-y-4">
      {themes.field_maturity && (
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500">Field Maturity:</span>
          <span className="text-xs px-2 py-1 rounded-full bg-purple-900/30 border border-purple-500/30 text-purple-400 capitalize font-medium">
            {themes.field_maturity}
          </span>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {sections.map((section) => (
          <div
            key={section.title}
            className={`rounded-xl border p-4 ${section.bgColor}`}
          >
            <h3 className={`text-sm font-semibold mb-3 flex items-center gap-2 ${section.color}`}>
              <span>{section.icon}</span>
              {section.title}
              <span className="ml-auto text-xs opacity-70">
                {section.items.length}
              </span>
            </h3>

            {section.items.length > 0 ? (
              <ul className="space-y-2">
                {section.items.map((item: string, i: number) => (
                  <li
                    key={i}
                    className="flex items-start gap-2 text-xs text-gray-400"
                  >
                    <span className={`${section.color} mt-0.5 flex-shrink-0`}>
                      •
                    </span>
                    {item}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-xs text-gray-600">
                No items found
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};


// ═══════════════════════════════════════════════════════
//   GITHUB PANEL
// ═══════════════════════════════════════════════════════

const GitHubPanel: React.FC<{
  repos: GitHubRepo[];
}> = ({ repos }) => {

  if (repos.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-40 text-gray-600 space-y-2">
        <span className="text-5xl">🐙</span>
        <p className="text-sm text-gray-500">
          No GitHub repos found
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {repos.map((repo, index) => (
        <a
          key={index}
          href={repo.url}
          target="_blank"
          rel="noopener noreferrer"
          className="block bg-gray-800/50 border border-gray-700/50 rounded-xl p-4 hover:border-gray-600 transition-colors group"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-lg">🐙</span>
                <h3 className="text-sm font-semibold text-white group-hover:text-purple-400 transition-colors truncate">
                  {repo.name}
                </h3>
              </div>
              {repo.description && (
                <p className="text-xs text-gray-400 mb-2 line-clamp-2">
                  {repo.description}
                </p>
              )}
              <div className="flex items-center gap-3 text-xs text-gray-500">
                {repo.language && (
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-yellow-400" />
                    {repo.language}
                  </span>
                )}
                <span>⭐ {repo.stars.toLocaleString()}</span>
              </div>
            </div>
          </div>
        </a>
      ))}
    </div>
  );
};


// ═══════════════════════════════════════════════════════
//   MAIN DASHBOARD
// ═══════════════════════════════════════════════════════

const Dashboard: React.FC = () => {

  const [activeTab, setActiveTab] = useState<TabId>("logs");
  const [startTime, setStartTime] = useState<Date | null>(null);

  // Research Hook
  const {
    sessionId,
    query,
    status,
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
  } = useResearch();

  // Agent Events Hook
  const {
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
    resetState: resetAgentState,
  } = useAgentEvents();

  // WebSocket Hook
  const { isConnected } = useWebSocket({
    sessionId,
    onEvent: (event: WebSocketEvent) => {
      handleEvent(event);

      if (event.event_type === "progress_update") {
        setStatus(event.data.stage as ResearchStatus);
      }
    },
  });

  // Fetch Data When Completed
  useEffect(() => {
    if (isCompleted && sessionId) {
      const fetchAllData = async () => {
        await Promise.all([
          fetchReport(sessionId),
          fetchThemes(sessionId),
          fetchPapers(sessionId),
          fetchFactCheck(sessionId),
          fetchGithubRepos(sessionId),
        ]);
        setActiveTab("report");
      };

      setTimeout(fetchAllData, 1500);
    }
  }, [isCompleted, sessionId]);

  // Handle Search
  const handleSearch = async (searchQuery: string) => {
    resetResearch();
    resetAgentState();
    setStartTime(new Date());
    setActiveTab("logs");
    await startResearch(searchQuery);
  };

  // Tabs
  const tabs: Tab[] = [
    {
      id: "logs",
      label: "Agent Logs",
      icon: <Brain className="w-4 h-4" />,
      badge: logs.length,
    },
    {
      id: "papers",
      label: "Papers",
      icon: <BookOpen className="w-4 h-4" />,
      badge: papers.length || papersFiltered,
    },
    {
      id: "themes",
      label: "Themes",
      icon: <Lightbulb className="w-4 h-4" />,
      badge: themes?.themes?.length,
    },
    {
      id: "report",
      label: "Report",
      icon: <FileText className="w-4 h-4" />,
    },
    {
      id: "chat",
      label: "Chat",
      icon: <MessageSquare className="w-4 h-4" />,
    },
    {
      id: "github",
      label: "GitHub",
      icon: <span className="text-base">🐙</span>,
      badge: githubRepos.length,
    },
  ];

  const isRunning = !["idle", "completed", "failed"].includes(status);

  return (
    <div className="min-h-screen bg-gray-950 text-white">

      {/* Top Bar */}
      <div className="border-b border-gray-800 bg-gray-900/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">

            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-purple-600 rounded-lg flex items-center justify-center">
                <Brain className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-sm font-bold text-white">
                  Autonomous Research Agent
                </h1>
                <p className="text-xs text-gray-500">
                  Multi-Agent AI System
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {sessionId && (
                <div className="flex items-center gap-1.5 text-xs">
                  {isConnected ? (
                    <>
                      <Wifi className="w-3.5 h-3.5 text-green-400" />
                      <span className="text-green-400">Live</span>
                    </>
                  ) : (
                    <>
                      <WifiOff className="w-3.5 h-3.5 text-gray-500" />
                      <span className="text-gray-500">Offline</span>
                    </>
                  )}
                </div>
              )}

              {status !== "idle" && (
                <button
                  onClick={() => {
                    resetResearch();
                    resetAgentState();
                    setStartTime(null);
                    setActiveTab("logs");
                  }}
                  className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-white transition-colors px-2 py-1 rounded-lg hover:bg-gray-800"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  New Research
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">

        {/* Search Bar */}
        <div className="max-w-3xl mx-auto">
          <SearchBar
            onSearch={handleSearch}
            status={status}
          />
        </div>

        {/* Error Banner */}
        {(error || hasError) && (
          <div className="bg-red-900/20 border border-red-500/30 rounded-xl p-4">
            <div className="flex items-center gap-2 text-red-400">
              <span>❌</span>
              <p className="text-sm font-medium">
                {error || errorMessage || "Research failed"}
              </p>
            </div>
          </div>
        )}

        {/* Stats + Progress */}
        {status !== "idle" && (
          <div className="space-y-4">
            <StatsCards
              status={status}
              papersFound={papersFound}
              papersFiltered={papersFiltered}
              themesCount={themes?.themes?.length || 0}
              claimsVerified={factCheck?.verified_count || 0}
              wordCount={report?.word_count || 0}
              currentAgent={currentAgent as AgentName}
              startTime={startTime}
            />

            <ProgressBar
              progress={progress}
              status={status}
            />
          </div>
        )}

        {/* Tabs + Content */}
        {status !== "idle" && (
          <div className="bg-gray-900/50 rounded-2xl border border-gray-800 overflow-hidden">

            <div className="flex overflow-x-auto border-b border-gray-800 bg-gray-900/30">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`
                    flex items-center gap-2 px-4 py-3 text-sm font-medium
                    border-b-2 transition-all whitespace-nowrap flex-shrink-0
                    ${activeTab === tab.id
                      ? "border-purple-500 text-purple-400 bg-purple-900/10"
                      : "border-transparent text-gray-500 hover:text-gray-300 hover:bg-gray-800/30"
                    }
                  `}
                >
                  {tab.icon}
                  {tab.label}
                  {tab.badge !== undefined && tab.badge > 0 && (
                    <span className={`
                      text-xs px-1.5 py-0.5 rounded-full font-bold
                      ${activeTab === tab.id
                        ? "bg-purple-600 text-white"
                        : "bg-gray-700 text-gray-400"
                      }
                    `}>
                      {tab.badge}
                    </span>
                  )}
                </button>
              ))}
            </div>

            <div className="p-6">

              {activeTab === "logs" && (
                <div className="h-[500px]">
                  <AgentLogComponent
                    logs={logs}
                    currentAgent={currentAgent as AgentName}
                    currentAction={currentAction}
                    isRunning={isRunning}
                  />
                </div>
              )}

              {activeTab === "papers" && (
                <div>
                  {papers.length === 0 && papersFiltered === 0 ? (
                    <div className="flex flex-col items-center justify-center h-40 text-gray-600 space-y-2">
                      <BookOpen className="w-10 h-10" />
                      <p className="text-sm text-gray-500">
                        Papers will appear after search
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-3 max-h-[600px] overflow-y-auto custom-scrollbar pr-1">
                      {papers.map((paper, index) => (
                        <PaperCard
                          key={paper.id || index}
                          paper={paper}
                          index={index}
                        />
                      ))}
                    </div>
                  )}
                </div>
              )}

              {activeTab === "themes" && (
                <ThemesPanel
                  themes={themes}
                  isLoading={isRunning && !themes}
                />
              )}

              {activeTab === "report" && (
                <ResearchReportComponent
                  report={report}
                  factCheck={factCheck}
                  query={query}
                  isLoading={isRunning && !report}
                />
              )}

              {activeTab === "chat" && (
                <ChatPanel
                  sessionId={sessionId}
                  isEnabled={isCompleted}
                />
              )}

              {activeTab === "github" && (
                <GitHubPanel repos={githubRepos} />
              )}
            </div>
          </div>
        )}

        {/* Welcome Screen */}
        {status === "idle" && (
          <div className="text-center py-16 space-y-6">
            <div className="w-20 h-20 bg-purple-900/30 border border-purple-500/30 rounded-2xl flex items-center justify-center mx-auto">
              <Brain className="w-10 h-10 text-purple-400" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white mb-2">
                Autonomous AI Research Agent
              </h2>
              <p className="text-gray-400 max-w-md mx-auto">
                Type any research topic above and watch 5 specialized AI agents
                collaborate to generate a comprehensive research report
              </p>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 max-w-2xl mx-auto mt-8">
              {[
                { icon: "🧠", title: "Orchestrator", desc: "Plans & coordinates" },
                { icon: "🔍", title: "Research Agent", desc: "Finds papers" },
                { icon: "🧪", title: "Analysis Agent", desc: "Deep analysis" },
                { icon: "✍️", title: "Writing Agent", desc: "Writes report" },
                { icon: "✅", title: "Fact Checker", desc: "Verifies claims" },
                { icon: "💬", title: "RAG Chat", desc: "Chat with papers" },
              ].map((feature) => (
                <div
                  key={feature.title}
                  className="bg-gray-800/50 border border-gray-700/50 rounded-xl p-4 text-left"
                >
                  <div className="text-2xl mb-2">{feature.icon}</div>
                  <h3 className="text-sm font-semibold text-white">
                    {feature.title}
                  </h3>
                  <p className="text-xs text-gray-500">{feature.desc}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
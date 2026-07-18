import React from "react";
import {
  FileText,
  BookOpen,
  Lightbulb,
  CheckCircle,
  Clock,
  Zap,
} from "lucide-react";
import type { ResearchStatus, AgentName } from "../types";
import { AGENT_CONFIGS } from "../types";

// ═══════════════════════════════════════════════════════
//   PROPS
// ═══════════════════════════════════════════════════════

interface StatsCardsProps {
  status: ResearchStatus;
  papersFound: number;
  papersFiltered: number;
  themesCount: number;
  claimsVerified: number;
  wordCount: number;
  currentAgent: AgentName | null;
  startTime: Date | null;
}

// ═══════════════════════════════════════════════════════
//   STAT CARD
// ═══════════════════════════════════════════════════════

interface StatCardProps {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  subLabel?: string;
  color: string;
  bgColor: string;
  isAnimating?: boolean;
}

const StatCard: React.FC<StatCardProps> = ({
  icon,
  label,
  value,
  subLabel,
  color,
  bgColor,
  isAnimating = false,
}) => (
  <div
    className={`
      relative overflow-hidden
      rounded-xl border p-4
      transition-all duration-300
      ${bgColor}
      ${isAnimating ? "animate-pulse-slow" : ""}
    `}
  >
    <div className="relative">
      <div className="flex items-center gap-2 mb-2">
        <div className={color}>{icon}</div>
        <span className="text-xs text-gray-400 font-medium">
          {label}
        </span>
      </div>

      <div className={`text-2xl font-bold ${color}`}>
        {value}
      </div>

      {subLabel && (
        <div className="text-xs text-gray-500 mt-1">
          {subLabel}
        </div>
      )}
    </div>
  </div>
);

// ═══════════════════════════════════════════════════════
//   STATUS BADGE
// ═══════════════════════════════════════════════════════

const StatusBadge: React.FC<{
  status: ResearchStatus;
  currentAgent: AgentName | null;
}> = ({ status, currentAgent }) => {

  const statusConfig: Record<string, {
    label: string;
    color: string;
    bg: string;
    dot: string;
  }> = {
    idle: {
      label: "Ready",
      color: "text-gray-400",
      bg: "bg-gray-800 border-gray-700",
      dot: "bg-gray-500",
    },
    started: {
      label: "Starting...",
      color: "text-blue-400",
      bg: "bg-blue-900/20 border-blue-700/50",
      dot: "bg-blue-400",
    },
    planning: {
      label: "Planning",
      color: "text-purple-400",
      bg: "bg-purple-900/20 border-purple-700/50",
      dot: "bg-purple-400",
    },
    searching: {
      label: "Searching Papers",
      color: "text-blue-400",
      bg: "bg-blue-900/20 border-blue-700/50",
      dot: "bg-blue-400",
    },
    filtering: {
      label: "Filtering",
      color: "text-cyan-400",
      bg: "bg-cyan-900/20 border-cyan-700/50",
      dot: "bg-cyan-400",
    },
    analyzing: {
      label: "Analyzing",
      color: "text-green-400",
      bg: "bg-green-900/20 border-green-700/50",
      dot: "bg-green-400",
    },
    synthesizing: {
      label: "Synthesizing",
      color: "text-teal-400",
      bg: "bg-teal-900/20 border-teal-700/50",
      dot: "bg-teal-400",
    },
    writing: {
      label: "Writing Report",
      color: "text-yellow-400",
      bg: "bg-yellow-900/20 border-yellow-700/50",
      dot: "bg-yellow-400",
    },
    fact_checking: {
      label: "Fact Checking",
      color: "text-orange-400",
      bg: "bg-orange-900/20 border-orange-700/50",
      dot: "bg-orange-400",
    },
    finalizing: {
      label: "Finalizing",
      color: "text-pink-400",
      bg: "bg-pink-900/20 border-pink-700/50",
      dot: "bg-pink-400",
    },
    completed: {
      label: "Completed ✅",
      color: "text-green-400",
      bg: "bg-green-900/20 border-green-700/50",
      dot: "bg-green-400",
    },
    failed: {
      label: "Failed ❌",
      color: "text-red-400",
      bg: "bg-red-900/20 border-red-700/50",
      dot: "bg-red-500",
    },
  };

  const config = statusConfig[status] || statusConfig.idle;
  const isRunning = !["idle", "completed", "failed"].includes(status);

  return (
    <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border text-sm ${config.bg}`}>
      <div
        className={`w-2 h-2 rounded-full ${config.dot} ${isRunning ? "animate-pulse" : ""}`}
      />
      <span className={`font-medium ${config.color}`}>
        {config.label}
      </span>
      {currentAgent && isRunning && (
        <>
          <span className="text-gray-600">•</span>
          <span className="text-xs text-gray-400">
            {AGENT_CONFIGS[currentAgent]?.icon} {currentAgent}
          </span>
        </>
      )}
    </div>
  );
};

// ═══════════════════════════════════════════════════════
//   ELAPSED TIME
// ═══════════════════════════════════════════════════════

const ElapsedTime: React.FC<{ startTime: Date | null }> = ({
  startTime,
}) => {
  const [elapsed, setElapsed] = React.useState<string>("0:00");

  React.useEffect(() => {
    if (!startTime) return;

    const interval = setInterval(() => {
      const diff = Math.floor(
        (Date.now() - startTime.getTime()) / 1000
      );
      const mins = Math.floor(diff / 60);
      const secs = diff % 60;
      setElapsed(`${mins}:${secs.toString().padStart(2, "0")}`);
    }, 1000);

    return () => clearInterval(interval);
  }, [startTime]);

  if (!startTime) return null;

  return (
    <div className="flex items-center gap-1.5 text-sm text-gray-400">
      <Clock className="w-4 h-4" />
      <span>{elapsed}</span>
    </div>
  );
};

// ═══════════════════════════════════════════════════════
//   MAIN COMPONENT
// ═══════════════════════════════════════════════════════

const StatsCards: React.FC<StatsCardsProps> = ({
  status,
  papersFound,
  papersFiltered,
  themesCount,
  claimsVerified,
  wordCount,
  currentAgent,
  startTime,
}) => {
  const isRunning = !["idle", "completed", "failed"].includes(status);

  const stats = [
    {
      icon: <BookOpen className="w-4 h-4" />,
      label: "Papers Found",
      value: papersFound,
      subLabel: papersFiltered > 0 ? `${papersFiltered} selected` : "Searching...",
      color: "text-blue-400",
      bgColor: "bg-gray-800/50 border-gray-700/50",
      isAnimating: status === "searching",
    },
    {
      icon: <Zap className="w-4 h-4" />,
      label: "Papers Analyzed",
      value: papersFiltered,
      subLabel: papersFiltered > 0 ? "Deep analysis done" : "Pending",
      color: "text-green-400",
      bgColor: "bg-gray-800/50 border-gray-700/50",
      isAnimating: status === "analyzing",
    },
    {
      icon: <Lightbulb className="w-4 h-4" />,
      label: "Themes Found",
      value: themesCount,
      subLabel: themesCount > 0 ? "Major themes" : "Pending",
      color: "text-yellow-400",
      bgColor: "bg-gray-800/50 border-gray-700/50",
      isAnimating: status === "synthesizing",
    },
    {
      icon: <CheckCircle className="w-4 h-4" />,
      label: "Claims Verified",
      value: claimsVerified,
      subLabel: claimsVerified > 0 ? "Fact-checked" : "Pending",
      color: "text-purple-400",
      bgColor: "bg-gray-800/50 border-gray-700/50",
      isAnimating: status === "fact_checking",
    },
    {
      icon: <FileText className="w-4 h-4" />,
      label: "Report Words",
      value: wordCount > 0 ? wordCount.toLocaleString() : "—",
      subLabel: wordCount > 0 ? "Words written" : "Pending",
      color: "text-pink-400",
      bgColor: "bg-gray-800/50 border-gray-700/50",
      isAnimating: status === "writing",
    },
  ];

  return (
    <div className="space-y-4">

      {/* Status Row */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <StatusBadge
          status={status}
          currentAgent={currentAgent}
        />
        {isRunning && <ElapsedTime startTime={startTime} />}
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {stats.map((stat, index) => (
          <StatCard key={index} {...stat} />
        ))}
      </div>
    </div>
  );
};

export default StatsCards;
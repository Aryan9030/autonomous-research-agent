import React from "react";
import type { ResearchProgress, ResearchStatus } from "../types";

// ═══════════════════════════════════════════════════════
//   PROPS
// ═══════════════════════════════════════════════════════

interface ProgressBarProps {
  progress: ResearchProgress | null;
  status: ResearchStatus;
}

// ═══════════════════════════════════════════════════════
//   STAGES
// ═══════════════════════════════════════════════════════

const STAGES = [
  { key: "planning", label: "Plan", icon: "🧠", percentage: 5 },
  { key: "searching", label: "Search", icon: "🔍", percentage: 20 },
  { key: "filtering", label: "Filter", icon: "🎯", percentage: 35 },
  { key: "analyzing", label: "Analyze", icon: "🧪", percentage: 55 },
  { key: "synthesizing", label: "Synthesize", icon: "🔬", percentage: 65 },
  { key: "writing", label: "Write", icon: "✍️", percentage: 82 },
  { key: "fact_checking", label: "Verify", icon: "✅", percentage: 90 },
  { key: "finalizing", label: "Finalize", icon: "✨", percentage: 95 },
  { key: "completed", label: "Done", icon: "🎉", percentage: 100 },
];

// ═══════════════════════════════════════════════════════
//   COMPONENT
// ═══════════════════════════════════════════════════════

const ProgressBar: React.FC<ProgressBarProps> = ({
  progress,
  status,
}) => {

  if (status === "idle") return null;

  const percentage = progress?.percentage || 0;
  const message = progress?.message || "Initializing...";
  const isCompleted = status === "completed";
  const isFailed = status === "failed";

  return (
    <div className="space-y-3">

      {/* Stage Steps */}
      <div className="flex items-center justify-between overflow-x-auto pb-1">
        {STAGES.map((stage) => {
          const isActive = stage.key === (progress?.stage || status);
          const isDone = percentage >= stage.percentage;

          return (
            <div
              key={stage.key}
              className="flex flex-col items-center gap-1 flex-shrink-0"
            >
              <div
                className={`
                  w-8 h-8 rounded-full flex items-center justify-center
                  text-sm transition-all duration-300 border-2
                  ${isActive
                    ? "border-purple-500 bg-purple-900/50 scale-110"
                    : isDone
                    ? "border-green-500 bg-green-900/30"
                    : "border-gray-700 bg-gray-800"
                  }
                `}
              >
                {stage.icon}
              </div>

              <span
                className={`
                  text-xs font-medium transition-colors
                  ${isActive
                    ? "text-purple-400"
                    : isDone
                    ? "text-green-400"
                    : "text-gray-600"
                  }
                `}
              >
                {stage.label}
              </span>
            </div>
          );
        })}
      </div>

      {/* Progress Bar */}
      <div className="space-y-2">
        <div className="w-full bg-gray-800 rounded-full h-3 overflow-hidden">
          <div
            className={`
              h-full rounded-full transition-all duration-700 ease-out
              ${isFailed
                ? "bg-red-500"
                : isCompleted
                ? "bg-green-500"
                : "bg-gradient-to-r from-purple-600 to-blue-500"
              }
            `}
            style={{ width: `${percentage}%` }}
          />
        </div>

        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-400 flex items-center gap-2">
            {!isCompleted && !isFailed && (
              <span className="inline-block w-2 h-2 bg-purple-400 rounded-full animate-pulse" />
            )}
            {message}
          </p>
          <span
            className={`
              text-sm font-bold
              ${isFailed
                ? "text-red-400"
                : isCompleted
                ? "text-green-400"
                : "text-purple-400"
              }
            `}
          >
            {percentage}%
          </span>
        </div>
      </div>

      {/* Completion Banner */}
      {isCompleted && (
        <div className="flex items-center gap-3 p-3 rounded-lg bg-green-900/20 border border-green-500/30 animate-fadeIn">
          <span className="text-2xl">🎉</span>
          <div>
            <p className="text-green-400 font-semibold text-sm">
              Research Complete!
            </p>
            <p className="text-gray-400 text-xs">
              View your report in the Report tab below
            </p>
          </div>
        </div>
      )}

      {/* Error Banner */}
      {isFailed && (
        <div className="flex items-center gap-3 p-3 rounded-lg bg-red-900/20 border border-red-500/30">
          <span className="text-2xl">❌</span>
          <div>
            <p className="text-red-400 font-semibold text-sm">
              Research Failed
            </p>
            <p className="text-gray-400 text-xs">
              Please try again with a different query
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProgressBar;
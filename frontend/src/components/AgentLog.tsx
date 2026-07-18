import React, { useEffect, useRef } from "react";
import type { AgentLog as AgentLogType, AgentName } from "../types";
import { AGENT_CONFIGS } from "../types";
import { formatDistanceToNow } from "date-fns";

// ═══════════════════════════════════════════════════════
//   PROPS
// ═══════════════════════════════════════════════════════

interface AgentLogProps {
  logs: AgentLogType[];
  currentAgent: AgentName | null;
  currentAction: string;
  isRunning: boolean;
}

// ═══════════════════════════════════════════════════════
//   LOG ITEM
// ═══════════════════════════════════════════════════════

const LogItem: React.FC<{ log: AgentLogType; index: number }> = ({
  log,
  index,
}) => {
  const config = AGENT_CONFIGS[log.agent] || {
    icon: "🤖",
    color: "text-gray-400",
    bgColor: "bg-gray-900/50 border-gray-700/50",
  };

  const timeAgo = (() => {
    try {
      return formatDistanceToNow(new Date(log.timestamp), {
        addSuffix: true,
      });
    } catch {
      return "just now";
    }
  })();

  return (
    <div
      className={`
        flex items-start gap-3 p-3 rounded-lg border
        animate-fadeIn transition-all duration-300
        ${config.bgColor}
      `}
      style={{ animationDelay: `${index * 50}ms` }}
    >
      <div className="flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-full bg-gray-800 text-lg">
        {config.icon}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2 mb-1">
          <span className={`text-xs font-bold ${config.color}`}>
            {log.agent}
          </span>
          <span className="text-xs text-gray-600 flex-shrink-0">
            {timeAgo}
          </span>
        </div>

        <p className="text-sm text-gray-200 font-medium truncate">
          {log.action}
        </p>

        {log.result && log.result !== "In progress..." && (
          <p className="text-xs text-gray-500 mt-0.5 truncate">
            {log.result}
          </p>
        )}
      </div>

      <div className="flex-shrink-0">
        {log.status === "error" ? (
          <span className="text-red-400 text-xs">❌</span>
        ) : log.result === "In progress..." ? (
          <div className="w-2 h-2 bg-purple-400 rounded-full animate-pulse" />
        ) : (
          <span className="text-green-400 text-xs">✅</span>
        )}
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════════════════
//   ACTIVE AGENT INDICATOR
// ═══════════════════════════════════════════════════════

const ActiveAgentIndicator: React.FC<{
  agent: AgentName;
  action: string;
}> = ({ agent, action }) => {
  const config = AGENT_CONFIGS[agent] || {
    icon: "🤖",
    color: "text-gray-400",
    bgColor: "bg-gray-900/50 border-gray-700/50",
  };

  return (
    <div className="flex items-center gap-3 p-3 rounded-lg border-2 border-purple-500/50 bg-purple-900/20 animate-pulse-slow">
      <div className="relative flex-shrink-0">
        <div className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-800 text-lg">
          {config.icon}
        </div>
        <div className="absolute -top-1 -right-1 w-3 h-3 bg-purple-500 rounded-full animate-ping" />
      </div>

      <div className="flex-1">
        <div className="flex items-center gap-2">
          <span className={`text-xs font-bold ${config.color}`}>
            {agent}
          </span>
          <span className="text-xs bg-purple-500/20 text-purple-400 px-2 py-0.5 rounded-full">
            Active
          </span>
        </div>
        <p className="text-sm text-white mt-0.5">{action}</p>
      </div>

      <div className="flex gap-1">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="w-1.5 h-1.5 bg-purple-400 rounded-full animate-bounce"
            style={{ animationDelay: `${i * 150}ms` }}
          />
        ))}
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════════════════
//   MAIN COMPONENT
// ═══════════════════════════════════════════════════════

const AgentLogComponent: React.FC<AgentLogProps> = ({
  logs,
  currentAgent,
  currentAction,
  isRunning,
}) => {
  const logsEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [logs]);

  return (
    <div className="flex flex-col h-full">

      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-gray-300 flex items-center gap-2">
          <span>🤖</span>
          Agent Activity
        </h3>
        <span className="text-xs text-gray-500 bg-gray-800 px-2 py-1 rounded-full">
          {logs.length} events
        </span>
      </div>

      {/* Active Agent */}
      {isRunning && currentAgent && (
        <div className="mb-3">
          <ActiveAgentIndicator
            agent={currentAgent}
            action={currentAction}
          />
        </div>
      )}

      {/* Logs List */}
      <div className="flex-1 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
        {logs.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 text-gray-600">
            <span className="text-4xl mb-3">🤖</span>
            <p className="text-sm">Agent logs will appear here</p>
            <p className="text-xs mt-1">
              Start research to see live activity
            </p>
          </div>
        ) : (
          logs.map((log, index) => (
            <LogItem key={index} log={log} index={index} />
          ))
        )}

        <div ref={logsEndRef} />
      </div>

      {/* Agent Legend */}
      <div className="mt-3 pt-3 border-t border-gray-800">
        <div className="flex flex-wrap gap-2">
          {Object.entries(AGENT_CONFIGS).map(([name, config]) => (
            <div
              key={name}
              className="flex items-center gap-1 text-xs text-gray-500"
            >
              <span>{config.icon}</span>
              <span className={config.color}>{name}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default AgentLogComponent;
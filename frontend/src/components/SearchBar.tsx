import React, { useState } from "react";
import type { KeyboardEvent } from "react";
import { Search, Loader, Sparkles, X } from "lucide-react";
import type { ResearchStatus } from "../types";

// ═══════════════════════════════════════════════════════
//   PROPS
// ═══════════════════════════════════════════════════════

interface SearchBarProps {
  onSearch: (query: string) => void;
  status: ResearchStatus;
}

// ═══════════════════════════════════════════════════════
//   EXAMPLE QUERIES
// ═══════════════════════════════════════════════════════

const EXAMPLE_QUERIES = [
  "Transformer attention mechanisms in NLP",
  "Reinforcement learning from human feedback",
  "Diffusion models for image generation",
  "Large language model fine-tuning techniques",
  "Graph neural networks for drug discovery",
  "Vision transformers vs CNN architectures",
];

// ═══════════════════════════════════════════════════════
//   COMPONENT
// ═══════════════════════════════════════════════════════

const SearchBar: React.FC<SearchBarProps> = ({
  onSearch,
  status,
}) => {
  const [query, setQuery] = useState<string>("");
  const [isFocused, setIsFocused] = useState<boolean>(false);

  const isRunning = status !== "idle" && status !== "completed" && status !== "failed";

  const handleSearch = () => {
    if (!query.trim() || isRunning) return;
    onSearch(query.trim());
  };

  const handleKeyPress = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") handleSearch();
  };

  const handleExampleClick = (example: string) => {
    setQuery(example);
  };

  const handleClear = () => {
    setQuery("");
  };

  return (
    <div className="w-full space-y-4">

      {/* Main Search Input */}
      <div className="relative">
        <div
          className={`
            flex items-center gap-3 
            bg-gray-800 border rounded-xl px-4 py-3
            transition-all duration-200
            ${isFocused
              ? "border-purple-500 shadow-lg shadow-purple-500/20"
              : "border-gray-700 hover:border-gray-600"
            }
            ${isRunning ? "opacity-75" : ""}
          `}
        >
          <Search className="w-5 h-5 text-gray-400 flex-shrink-0" />

          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyPress={handleKeyPress}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            placeholder="Enter research topic..."
            disabled={isRunning}
            className={`
              flex-1 bg-transparent text-white 
              placeholder-gray-500 outline-none
              text-sm sm:text-base
              ${isRunning ? "cursor-not-allowed" : ""}
            `}
          />

          {query && !isRunning && (
            <button
              onClick={handleClear}
              className="text-gray-500 hover:text-gray-300 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Search Button */}
      <button
        onClick={handleSearch}
        disabled={isRunning || !query.trim()}
        className={`
          w-full flex items-center justify-center gap-3
          py-3 px-6 rounded-xl font-semibold text-base
          transition-all duration-200
          ${isRunning || !query.trim()
            ? "bg-gray-700 text-gray-500 cursor-not-allowed"
            : "bg-purple-600 hover:bg-purple-500 text-white shadow-lg shadow-purple-500/30"
          }
        `}
      >
        {isRunning ? (
          <>
            <Loader className="w-5 h-5 animate-spin" />
            <span>AI Agents Working...</span>
          </>
        ) : (
          <>
            <Sparkles className="w-5 h-5" />
            <span>Start AI Research</span>
          </>
        )}
      </button>

      {/* Example Queries */}
      {status === "idle" && (
        <div className="space-y-2">
          <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">
            Try these examples:
          </p>
          <div className="flex flex-wrap gap-2">
            {EXAMPLE_QUERIES.map((example, index) => (
              <button
                key={index}
                onClick={() => handleExampleClick(example)}
                className="text-xs px-3 py-1.5 rounded-lg bg-gray-800 border border-gray-700 text-gray-400 hover:text-purple-400 hover:border-purple-500/50 transition-all"
              >
                {example}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default SearchBar;
import React, { useState } from "react";
import {
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Users,
  Calendar,
  Quote,
  Star,
} from "lucide-react";
import type { Paper } from "../types";

// ═══════════════════════════════════════════════════════
//   PROPS
// ═══════════════════════════════════════════════════════

interface PaperCardProps {
  paper: Paper;
  index: number;
}

// ═══════════════════════════════════════════════════════
//   GRADE BADGE
// ═══════════════════════════════════════════════════════

const GradeBadge: React.FC<{ grade: string }> = ({ grade }) => {
  const colors: Record<string, string> = {
    A: "bg-green-900/50 text-green-400 border-green-500/30",
    B: "bg-blue-900/50 text-blue-400 border-blue-500/30",
    C: "bg-yellow-900/50 text-yellow-400 border-yellow-500/30",
    D: "bg-red-900/50 text-red-400 border-red-500/30",
  };

  return (
    <span
      className={`text-xs px-2 py-0.5 rounded-full border font-bold ${colors[grade] || colors.C}`}
    >
      {grade}
    </span>
  );
};

// ═══════════════════════════════════════════════════════
//   SOURCE BADGE
// ═══════════════════════════════════════════════════════

const SourceBadge: React.FC<{ source: string }> = ({ source }) => {
  const config =
    source === "arxiv"
      ? { label: "ArXiv", color: "text-orange-400 bg-orange-900/20 border-orange-500/30" }
      : { label: "Semantic Scholar", color: "text-blue-400 bg-blue-900/20 border-blue-500/30" };

  return (
    <span className={`text-xs px-2 py-0.5 rounded-full border ${config.color}`}>
      {config.label}
    </span>
  );
};

// ═══════════════════════════════════════════════════════
//   MAIN COMPONENT
// ═══════════════════════════════════════════════════════

const PaperCard: React.FC<PaperCardProps> = ({ paper, index }) => {
  const [isExpanded, setIsExpanded] = useState<boolean>(false);

  const analysis = paper.analysis;
  const authorsList = paper.authors?.slice(0, 3) || [];
  const hasMoreAuthors = (paper.authors?.length || 0) > 3;

  return (
    <div
      className="bg-gray-800/50 border border-gray-700/50 rounded-xl transition-all duration-200 hover:border-gray-600/70 hover:bg-gray-800/70 animate-fadeIn"
      style={{ animationDelay: `${index * 50}ms` }}
    >
      <div className="p-4">

        {/* Top Row */}
        <div className="flex items-start justify-between gap-2 mb-3">
          <div className="flex items-center gap-2">
            <span className="text-gray-600 text-sm font-mono">
              #{index + 1}
            </span>
            {paper.quality_grade && (
              <GradeBadge grade={paper.quality_grade} />
            )}
            <SourceBadge source={paper.source} />
          </div>

          {analysis?.relevance_score && (
            <div className="flex items-center gap-1 text-yellow-400">
              <Star className="w-3.5 h-3.5 fill-current" />
              <span className="text-xs font-bold">
                {analysis.relevance_score}/10
              </span>
            </div>
          )}
        </div>

        {/* Title */}
        <h3 className="text-white font-semibold text-sm leading-snug mb-2">
          {paper.title}
        </h3>

        {/* Meta Info */}
        <div className="flex flex-wrap items-center gap-3 text-xs text-gray-400 mb-3">
          <div className="flex items-center gap-1">
            <Users className="w-3.5 h-3.5" />
            <span>
              {authorsList.join(", ")}
              {hasMoreAuthors && " et al."}
            </span>
          </div>

          {paper.year && (
            <div className="flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5" />
              <span>{paper.year}</span>
            </div>
          )}

          {paper.citations > 0 && (
            <div className="flex items-center gap-1">
              <Quote className="w-3.5 h-3.5" />
              <span>{paper.citations.toLocaleString()} citations</span>
            </div>
          )}
        </div>

        {/* AI Summary */}
        {analysis?.summary && (
          <p className="text-gray-400 text-xs leading-relaxed mb-3">
            {analysis.summary}
          </p>
        )}

        {/* Key Terms */}
        {analysis?.key_terms && analysis.key_terms.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-3">
            {analysis.key_terms.slice(0, 5).map((term, i) => (
              <span
                key={i}
                className="text-xs px-2 py-0.5 rounded-full bg-gray-700/70 text-gray-400"
              >
                {term}
              </span>
            ))}
          </div>
        )}

        {/* Action Row */}
        <div className="flex items-center justify-between">
          {paper.url && (
            <a
              href={paper.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-xs text-purple-400 hover:text-purple-300 transition-colors"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              View Paper
            </a>
          )}

          {analysis && (
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-300 transition-colors ml-auto"
            >
              {isExpanded ? (
                <>
                  <ChevronUp className="w-3.5 h-3.5" />
                  Less
                </>
              ) : (
                <>
                  <ChevronDown className="w-3.5 h-3.5" />
                  More
                </>
              )}
            </button>
          )}
        </div>
      </div>

      {/* Expanded Content */}
      {isExpanded && analysis && (
        <div className="px-4 pb-4 space-y-3 border-t border-gray-700/50 pt-3">
          {analysis.key_contributions?.length > 0 && (
            <div>
              <h4 className="text-xs font-semibold text-gray-300 mb-1.5">
                Key Contributions
              </h4>
              <ul className="space-y-1">
                {analysis.key_contributions.map((contrib, i) => (
                  <li
                    key={i}
                    className="text-xs text-gray-400 flex items-start gap-1.5"
                  >
                    <span className="text-purple-400 mt-0.5">•</span>
                    {contrib}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {analysis.methodology && (
            <div>
              <h4 className="text-xs font-semibold text-gray-300 mb-1">
                Methodology
              </h4>
              <p className="text-xs text-gray-400">
                {analysis.methodology}
              </p>
            </div>
          )}

          {analysis.results && (
            <div>
              <h4 className="text-xs font-semibold text-gray-300 mb-1">
                Results
              </h4>
              <p className="text-xs text-gray-400">
                {analysis.results}
              </p>
            </div>
          )}

          {analysis.limitations?.length > 0 && (
            <div>
              <h4 className="text-xs font-semibold text-gray-300 mb-1.5">
                Limitations
              </h4>
              <ul className="space-y-1">
                {analysis.limitations.map((limit, i) => (
                  <li
                    key={i}
                    className="text-xs text-gray-400 flex items-start gap-1.5"
                  >
                    <span className="text-red-400 mt-0.5">•</span>
                    {limit}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default PaperCard;
import React, { useState } from "react";
import {
  Download,
  Copy,
  Check,
  FileText,
  ChevronDown,
  ChevronUp,
  BookOpen,
} from "lucide-react";
import type { ResearchReport, FactCheckResult, VerifiedClaim } from "../types";
import { useReport } from "../hooks/useReport";

// ═══════════════════════════════════════════════════════
//   PROPS
// ═══════════════════════════════════════════════════════

interface ResearchReportProps {
  report: ResearchReport | null;
  factCheck: FactCheckResult | null;
  query: string;
  isLoading: boolean;
}

// ═══════════════════════════════════════════════════════
//   FACT CHECK SECTION
// ═══════════════════════════════════════════════════════

const FactCheckSection: React.FC<{
  factCheck: FactCheckResult;
}> = ({ factCheck }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const verificationColors: Record<string, string> = {
    VERIFIED: "text-green-400 bg-green-900/20 border-green-500/30",
    PARTIALLY_VERIFIED: "text-yellow-400 bg-yellow-900/20 border-yellow-500/30",
    UNVERIFIED: "text-orange-400 bg-orange-900/20 border-orange-500/30",
    INCORRECT: "text-red-400 bg-red-900/20 border-red-500/30",
  };

  return (
    <div className="bg-gray-800/50 rounded-xl border border-gray-700/50 overflow-hidden">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between p-4 hover:bg-gray-800/70 transition-colors"
      >
        <div className="flex items-center gap-3">
          <span className="text-lg">🔍</span>
          <div className="text-left">
            <h3 className="text-sm font-semibold text-white">
              Fact Check Results
            </h3>
            <p className="text-xs text-gray-400">
              {factCheck.verified_count}/{factCheck.total_claims} claims verified •{" "}
              {factCheck.avg_confidence.toFixed(0)}% avg confidence
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-2">
            <div className="w-24 bg-gray-700 rounded-full h-2">
              <div
                className="bg-green-500 h-2 rounded-full transition-all"
                style={{
                  width: `${(factCheck.verified_count / factCheck.total_claims) * 100}%`,
                }}
              />
            </div>
            <span className="text-xs text-green-400">
              {Math.round(
                (factCheck.verified_count / factCheck.total_claims) * 100
              )}%
            </span>
          </div>

          {isExpanded ? (
            <ChevronUp className="w-4 h-4 text-gray-400" />
          ) : (
            <ChevronDown className="w-4 h-4 text-gray-400" />
          )}
        </div>
      </button>

      {isExpanded && (
        <div className="px-4 pb-4 space-y-2 border-t border-gray-700/50 pt-3">
          {factCheck.claims.map((claim: VerifiedClaim, index: number) => (
            <div
              key={index}
              className={`p-3 rounded-lg border text-xs ${
                verificationColors[claim.verification_level] ||
                verificationColors.UNVERIFIED
              }`}
            >
              <div className="flex items-start gap-2 mb-1">
                <span>
                  {claim.verified ? "✅" : "❌"}
                </span>
                <p className="font-medium flex-1">{claim.claim}</p>
                <span className="flex-shrink-0 opacity-70">
                  {claim.confidence}%
                </span>
              </div>

              <p className="text-xs opacity-70 ml-6">
                {claim.reason}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// ═══════════════════════════════════════════════════════
//   MARKDOWN RENDERER
// ═══════════════════════════════════════════════════════

const MarkdownContent: React.FC<{ content: string }> = ({ content }) => {
  const renderMarkdown = (text: string): string => {
    return text
      .replace(/^### (.*$)/gm, '<h3 class="text-base font-bold text-white mt-6 mb-2">$1</h3>')
      .replace(/^## (.*$)/gm, '<h2 class="text-lg font-bold text-white mt-8 mb-3 pb-2 border-b border-gray-700">$1</h2>')
      .replace(/^# (.*$)/gm, '<h1 class="text-xl font-bold text-white mt-6 mb-4">$1</h1>')
      .replace(/\*\*(.*?)\*\*/g, '<strong class="text-white font-semibold">$1</strong>')
      .replace(/\*(.*?)\*/g, '<em class="text-gray-300 italic">$1</em>')
      .replace(/^- (.*$)/gm, '<li class="text-gray-400 text-sm ml-4 mb-1 list-disc">$1</li>')
      .replace(/^\d+\. (.*$)/gm, '<li class="text-gray-400 text-sm ml-4 mb-1 list-decimal">$1</li>')
      .replace(/^(?!<[h|l])(.*$)/gm, (match) => {
        if (match.trim() === "") return "<br/>";
        return `<p class="text-gray-400 text-sm leading-relaxed mb-3">${match}</p>`;
      });
  };

  return (
    <div
      className="max-w-none"
      dangerouslySetInnerHTML={{
        __html: renderMarkdown(content),
      }}
    />
  );
};

// ═══════════════════════════════════════════════════════
//   MAIN COMPONENT
// ═══════════════════════════════════════════════════════

const ResearchReportComponent: React.FC<ResearchReportProps> = ({
  report,
  factCheck,
  query,
  isLoading,
}) => {
  const { copyReport, downloadReport, isCopied } = useReport();
  const [viewMode, setViewMode] = useState<"rendered" | "raw">("rendered");

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-64 space-y-4">
        <div className="w-12 h-12 border-4 border-purple-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-gray-400 text-sm">Generating report...</p>
      </div>
    );
  }

  if (!report) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-gray-600 space-y-3">
        <FileText className="w-12 h-12" />
        <p className="text-sm font-medium text-gray-500">
          No Report Yet
        </p>
        <p className="text-xs text-center max-w-xs">
          Start a research session and the AI agents will generate
          a comprehensive report automatically
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">

      {/* Report Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-purple-400" />
            Research Report
          </h2>
          <p className="text-sm text-gray-400 mt-1">
            {report.word_count.toLocaleString()} words •{" "}
            {report.papers_analyzed} papers •{" "}
            {report.themes_count} themes
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex bg-gray-800 rounded-lg p-1 border border-gray-700">
            <button
              onClick={() => setViewMode("rendered")}
              className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${viewMode === "rendered" ? "bg-purple-600 text-white" : "text-gray-400 hover:text-gray-200"}`}
            >
              Preview
            </button>
            <button
              onClick={() => setViewMode("raw")}
              className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${viewMode === "raw" ? "bg-purple-600 text-white" : "text-gray-400 hover:text-gray-200"}`}
            >
              Markdown
            </button>
          </div>

          <button
            onClick={() => copyReport(report.report)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs bg-gray-800 border border-gray-700 text-gray-400 hover:text-white transition-all"
          >
            {isCopied ? (
              <>
                <Check className="w-3.5 h-3.5 text-green-400" />
                <span className="text-green-400">Copied!</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                Copy
              </>
            )}
          </button>

          <button
            onClick={() => downloadReport(report.report, query)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs bg-purple-600 hover:bg-purple-500 text-white transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            Download
          </button>
        </div>
      </div>

      {/* Fact Check */}
      {factCheck && <FactCheckSection factCheck={factCheck} />}

      {/* Report Content */}
      <div className="bg-gray-800/50 rounded-xl border border-gray-700/50 p-6 max-h-[600px] overflow-y-auto custom-scrollbar">
        {viewMode === "rendered" ? (
          <MarkdownContent content={report.report} />
        ) : (
          <pre className="text-xs text-gray-400 whitespace-pre-wrap font-mono leading-relaxed">
            {report.report}
          </pre>
        )}
      </div>

      {/* Footer */}
      {report.generated_at && (
        <p className="text-xs text-gray-600 text-center">
          Generated on{" "}
          {new Date(report.generated_at).toLocaleString()}
        </p>
      )}
    </div>
  );
};

export default ResearchReportComponent;
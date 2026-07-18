import { useState, useCallback } from "react";


// ═══════════════════════════════════════════════════════
//   REPORT HOOK
// ═══════════════════════════════════════════════════════

interface UseReportReturn {
  copyReport: (report: string) => void;
  downloadReport: (report: string, query: string) => void;
  isCopied: boolean;
}

export const useReport = (): UseReportReturn => {

  const [isCopied, setIsCopied] = useState<boolean>(false);

  const copyReport = useCallback((report: string) => {
    navigator.clipboard.writeText(report).then(() => {
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    });
  }, []);

  const downloadReport = useCallback(
    (report: string, query: string) => {
      const blob = new Blob([report], { type: "text/markdown" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `research-report-${query
        .slice(0, 30)
        .replace(/\s+/g, "-")
        .toLowerCase()}.md`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    },
    []
  );

  return {
    copyReport,
    downloadReport,
    isCopied,
  };
};
import { useState, useRef } from "react";
import ReactMarkdown from "react-markdown";
import { PDFViewer } from "./components/PDFViewer";
import { FileUploader } from "./components/FileUploader";
import { analyzeDocument } from "./services/api";
import type { AnalysisMode } from "./services/api";
import type { AnalysisResponse, Claim, BBox } from "./types";

// Status icon components
const StatusIcon = ({ status }: { status: Claim["status"] }) => {
  const icons = {
    VERIFIED: (
      <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
        <path
          fillRule="evenodd"
          d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
          clipRule="evenodd"
        />
      </svg>
    ),
    LIKELY: (
      <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
        <path
          fillRule="evenodd"
          d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
          clipRule="evenodd"
        />
      </svg>
    ),
    UNVERIFIED: (
      <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
        <path
          fillRule="evenodd"
          d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
          clipRule="evenodd"
        />
      </svg>
    ),
  };
  return icons[status];
};

// Mode Toggle Component
function ModeToggle({
  mode,
  onChange,
}: {
  mode: AnalysisMode;
  onChange: (mode: AnalysisMode) => void;
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-sm text-gray-500">Mode:</span>
      <div className="bg-gray-100 p-0.5 rounded-lg flex items-center">
        <button
          onClick={() => onChange("strict")}
          className={`py-1.5 px-3 rounded-md text-sm font-medium transition-all duration-200 ${
            mode === "strict"
              ? "bg-white shadow-sm text-blue-600"
              : "text-gray-500 hover:text-gray-700"
          }`}
        >
          ⚡ Strict
        </button>
        <button
          onClick={() => onChange("tutor")}
          className={`py-1.5 px-3 rounded-md text-sm font-medium transition-all duration-200 ${
            mode === "tutor"
              ? "bg-white shadow-sm text-purple-600"
              : "text-gray-500 hover:text-gray-700"
          }`}
        >
          🎓 Tutor
        </button>
      </div>
    </div>
  );
}

// Answer Card Component with Copy Button
function AnswerCard({
  answer,
  mode,
}: {
  answer: string;
  mode: AnalysisMode;
}) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(answer);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const modeConfig = {
    strict: {
      badge: "⚡ Strict Fact",
      badgeClass: "bg-blue-100 text-blue-700",
      borderClass: "border-blue-200",
    },
    tutor: {
      badge: "🎓 Tutor Explanation",
      badgeClass: "bg-purple-100 text-purple-700",
      borderClass: "border-purple-200",
    },
  };

  const config = modeConfig[mode];

  return (
    <div className={`bg-white rounded-2xl shadow-sm border ${config.borderClass} overflow-hidden`}>
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100 bg-gray-50/50">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-sm">
            <svg
              className="w-5 h-5 text-white"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
              />
            </svg>
          </div>
          <div>
            <h2 className="font-semibold text-gray-900">AI Response</h2>
            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${config.badgeClass}`}>
              {config.badge}
            </span>
          </div>
        </div>
        <button
          onClick={handleCopy}
          className="p-2 rounded-lg hover:bg-gray-100 transition-colors group"
          title="Copy to clipboard"
        >
          {copied ? (
            <svg className="w-5 h-5 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          ) : (
            <svg className="w-5 h-5 text-gray-400 group-hover:text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
          )}
        </button>
      </div>

      {/* Answer Content */}
      <div className="p-5">
        <div className="text-base text-gray-800 leading-7 break-words">
          <ReactMarkdown
            components={{
              strong: ({ children }) => (
                <strong className="font-bold text-blue-900">{children}</strong>
              ),
              em: ({ children }) => (
                <em className="italic text-gray-700">{children}</em>
              ),
              ul: ({ children }) => (
                <ul className="list-disc list-outside ml-5 space-y-1 my-3">{children}</ul>
              ),
              ol: ({ children }) => (
                <ol className="list-decimal list-outside ml-5 space-y-1 my-3">{children}</ol>
              ),
              li: ({ children }) => (
                <li className="text-gray-800 leading-7">{children}</li>
              ),
              p: ({ children }) => (
                <p className="mb-3 last:mb-0 leading-7">{children}</p>
              ),
              h1: ({ children }) => (
                <h1 className="text-xl font-bold text-gray-900 mb-3 mt-4 first:mt-0">{children}</h1>
              ),
              h2: ({ children }) => (
                <h2 className="text-lg font-bold text-gray-900 mb-2 mt-4 first:mt-0">{children}</h2>
              ),
              h3: ({ children }) => (
                <h3 className="text-base font-bold text-gray-900 mb-2 mt-3 first:mt-0">{children}</h3>
              ),
              code: ({ children }) => (
                <code className="bg-gray-100 px-1.5 py-0.5 rounded text-sm font-mono text-blue-800">{children}</code>
              ),
              pre: ({ children }) => (
                <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto my-3 text-sm">{children}</pre>
              ),
              blockquote: ({ children }) => (
                <blockquote className="border-l-4 border-blue-300 pl-4 my-3 italic text-gray-600">{children}</blockquote>
              ),
              a: ({ href, children }) => (
                <a href={href} className="text-blue-600 hover:text-blue-800 underline" target="_blank" rel="noopener noreferrer">{children}</a>
              ),
            }}
          >
            {answer}
          </ReactMarkdown>
        </div>
      </div>
    </div>
  );
}

// Compact Source Badge Component
function SourceBadge({
  claim,
  index,
  isSelected,
  onClick,
}: {
  claim: Claim;
  index: number;
  isSelected: boolean;
  onClick: () => void;
}) {
  const isExternal = claim.page_hint === 0;

  // External source styling
  if (isExternal) {
    return (
      <div
        className={`
          flex-shrink-0 flex items-center gap-2 px-3 py-2 rounded-xl border transition-all duration-200
          bg-indigo-50 border-indigo-200 cursor-default
          ${isSelected ? "ring-2 ring-indigo-500" : ""}
        `}
      >
        <span className="w-5 h-5 bg-indigo-600 text-white text-xs font-bold rounded-full flex items-center justify-center">
          {index + 1}
        </span>
        <div className="flex items-center gap-1 text-indigo-700">
          <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
            <path d="M10.394 2.08a1 1 0 00-.788 0l-7 3a1 1 0 000 1.84L5.25 8.051a.999.999 0 01.356-.257l4-1.714a1 1 0 11.788 1.838L7.667 9.088l1.94.831a1 1 0 00.787 0l7-3a1 1 0 000-1.838l-7-3zM3.31 9.397L5 10.12v4.102a8.969 8.969 0 00-1.05-.174 1 1 0 01-.89-.89 11.115 11.115 0 01.25-3.762zM9.3 16.573A9.026 9.026 0 007 14.935v-3.957l1.818.78a3 3 0 002.364 0l5.508-2.361a11.026 11.026 0 01.25 3.762 1 1 0 01-.89.89 8.968 8.968 0 00-5.35 2.524 1 1 0 01-1.4 0z" />
          </svg>
          <span className="text-xs font-semibold uppercase">Academic</span>
        </div>
        <span className="text-xs text-indigo-500">🌍 External</span>
      </div>
    );
  }

  // PDF source styling
  const statusConfig = {
    VERIFIED: {
      bg: "bg-emerald-50 hover:bg-emerald-100",
      border: "border-emerald-200",
      text: "text-emerald-700",
      selectedRing: "ring-2 ring-emerald-500",
    },
    LIKELY: {
      bg: "bg-amber-50 hover:bg-amber-100",
      border: "border-amber-200",
      text: "text-amber-700",
      selectedRing: "ring-2 ring-amber-500",
    },
    UNVERIFIED: {
      bg: "bg-rose-50",
      border: "border-rose-200",
      text: "text-rose-700",
      selectedRing: "ring-2 ring-rose-500",
    },
  };

  const config = statusConfig[claim.status];
  const isClickable = claim.status === "VERIFIED";

  return (
    <button
      onClick={isClickable ? onClick : undefined}
      disabled={!isClickable}
      className={`
        flex-shrink-0 flex items-center gap-2 px-3 py-2 rounded-xl border transition-all duration-200
        ${config.bg} ${config.border}
        ${isClickable ? "cursor-pointer" : "opacity-50 cursor-not-allowed"}
        ${isSelected ? config.selectedRing : ""}
      `}
    >
      <span className="w-5 h-5 bg-gray-800 text-white text-xs font-bold rounded-full flex items-center justify-center">
        {index + 1}
      </span>
      <div className={`flex items-center gap-1 ${config.text}`}>
        <StatusIcon status={claim.status} />
        <span className="text-xs font-semibold uppercase">{claim.status}</span>
      </div>
      <span className="text-xs text-gray-500">p.{claim.page_hint}</span>
    </button>
  );
}

// Collapsible Claims Section
function ClaimsSection({
  claims,
  selectedClaimIndex,
  onClaimClick,
}: {
  claims: Claim[];
  selectedClaimIndex: number | null;
  onClaimClick: (claim: Claim, index: number) => void;
}) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
      {/* Header - Always visible */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between px-5 py-4 hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center">
            <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <div className="text-left">
            <h3 className="font-semibold text-gray-900">Sources & Citations</h3>
            <p className="text-sm text-gray-500">{claims.length} claims found • Click verified to view in PDF</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="px-2.5 py-1 bg-gray-100 text-gray-600 text-xs font-medium rounded-full">
            {claims.filter(c => c.status === "VERIFIED").length} verified
          </span>
          <svg
            className={`w-5 h-5 text-gray-400 transition-transform duration-200 ${isExpanded ? "rotate-180" : ""}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </button>

      {/* Horizontal Scrollable Badges - Always visible */}
      <div className="px-5 pb-4 -mt-1">
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-thin">
          {claims.map((claim, index) => (
            <SourceBadge
              key={index}
              claim={claim}
              index={index}
              isSelected={selectedClaimIndex === index}
              onClick={() => onClaimClick(claim, index)}
            />
          ))}
        </div>
      </div>

      {/* Expanded Details */}
      {isExpanded && (
        <div className="border-t border-gray-100 px-5 py-4 space-y-3 max-h-[400px] overflow-y-auto">
          {claims.map((claim, index) => {
            const isExternal = claim.page_hint === 0;
            const isSelected = selectedClaimIndex === index;

            // External Academic Source Card
            if (isExternal) {
              return (
                <div
                  key={index}
                  className={`
                    p-4 rounded-xl border transition-all duration-200
                    bg-gradient-to-br from-indigo-50 to-purple-50 border-indigo-200
                    ${isSelected ? "ring-2 ring-indigo-500 shadow-md" : ""}
                  `}
                >
                  <div className="flex items-start gap-3">
                    <span className="flex-shrink-0 w-6 h-6 bg-indigo-600 text-white text-xs font-bold rounded-full flex items-center justify-center mt-0.5">
                      {index + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-1.5 text-indigo-700">
                          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M10.394 2.08a1 1 0 00-.788 0l-7 3a1 1 0 000 1.84L5.25 8.051a.999.999 0 01.356-.257l4-1.714a1 1 0 11.788 1.838L7.667 9.088l1.94.831a1 1 0 00.787 0l7-3a1 1 0 000-1.838l-7-3zM3.31 9.397L5 10.12v4.102a8.969 8.969 0 00-1.05-.174 1 1 0 01-.89-.89 11.115 11.115 0 01.25-3.762zM9.3 16.573A9.026 9.026 0 007 14.935v-3.957l1.818.78a3 3 0 002.364 0l5.508-2.361a11.026 11.026 0 01.25 3.762 1 1 0 01-.89.89 8.968 8.968 0 00-5.35 2.524 1 1 0 01-1.4 0z" />
                          </svg>
                          <span className="text-xs font-bold uppercase">Academic Concept</span>
                        </div>
                        <span className="text-xs text-indigo-500 flex items-center gap-1">
                          🌍 External Source
                        </span>
                      </div>
                      <p className="text-sm font-semibold text-indigo-900 leading-relaxed mb-2">
                        {claim.claim}
                      </p>
                      <p className="text-xs text-indigo-600/70 italic">
                        Derived from general academic consensus
                      </p>
                    </div>
                  </div>
                </div>
              );
            }

            // PDF Source Card (existing logic)
            const statusConfig = {
              VERIFIED: { bg: "bg-emerald-50", border: "border-emerald-200", text: "text-emerald-700" },
              LIKELY: { bg: "bg-amber-50", border: "border-amber-200", text: "text-amber-700" },
              UNVERIFIED: { bg: "bg-rose-50", border: "border-rose-200", text: "text-rose-700" },
            };
            const config = statusConfig[claim.status];
            const isClickable = claim.status === "VERIFIED";

            return (
              <div
                key={index}
                onClick={isClickable ? () => onClaimClick(claim, index) : undefined}
                className={`
                  p-4 rounded-xl border transition-all duration-200
                  ${config.bg} ${config.border}
                  ${isClickable ? "cursor-pointer hover:shadow-md" : "opacity-60"}
                  ${isSelected ? "ring-2 ring-blue-500 shadow-md" : ""}
                `}
              >
                <div className="flex items-start gap-3">
                  <span className="flex-shrink-0 w-6 h-6 bg-gray-800 text-white text-xs font-bold rounded-full flex items-center justify-center mt-0.5">
                    {index + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <div className={`flex items-center gap-1 ${config.text}`}>
                        <StatusIcon status={claim.status} />
                        <span className="text-xs font-bold uppercase">{claim.status}</span>
                      </div>
                      <span className="text-xs text-gray-500">• Page {claim.page_hint}</span>
                    </div>
                    <p className="text-sm text-gray-800 leading-relaxed">{claim.claim}</p>
                    {claim.quote_anchor && (
                      <div className="mt-2 pl-3 border-l-2 border-gray-300">
                        <p className="text-xs italic text-gray-600">"{claim.quote_anchor}"</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function App() {
  const [question, setQuestion] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<AnalysisResponse | null>(null);

  // Analysis mode state
  const [mode, setMode] = useState<AnalysisMode>("strict");

  // Document state
  const [activeDocId, setActiveDocId] = useState<number | null>(null);
  const [currentFileUrl, setCurrentFileUrl] = useState<string | null>(null);
  const [currentFileName, setCurrentFileName] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState(false);

  // PDF Viewer state
  const [pageNumber, setPageNumber] = useState(1);
  const [highlights, setHighlights] = useState<BBox[]>([]);
  const [highlightPage, setHighlightPage] = useState<number | undefined>();
  const [selectedClaimIndex, setSelectedClaimIndex] = useState<number | null>(null);

  const resultsContainerRef = useRef<HTMLDivElement>(null);

  const handleUploadSuccess = (docId: number, fileUrl: string, filename: string) => {
    setActiveDocId(docId);
    setCurrentFileUrl(fileUrl);
    setCurrentFileName(filename);
    setUploadSuccess(true);

    // Clear previous analysis when new file is uploaded
    setResult(null);
    setError(null);
    setHighlights([]);
    setHighlightPage(undefined);
    setSelectedClaimIndex(null);
    setPageNumber(1);

    // Hide success message after 3 seconds
    setTimeout(() => setUploadSuccess(false), 3000);
  };

  const handleUploadError = (errorMsg: string) => {
    setError(`Upload failed: ${errorMsg}`);
  };

  const handleAnalyze = async () => {
    if (!question.trim()) return;
    if (!activeDocId) {
      setError("Please upload a document first");
      return;
    }

    // Clear previous state
    setLoading(true);
    setError(null);
    setResult(null);
    setSelectedClaimIndex(null);
    setHighlights([]);
    setHighlightPage(undefined);

    try {
      const data = await analyzeDocument(activeDocId, question, mode);
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Analysis failed");
    } finally {
      setLoading(false);
    }
  };

  const handleClaimClick = (claim: Claim, index: number) => {
    setSelectedClaimIndex(index);
    setPageNumber(claim.page_hint);
    setHighlights(claim.bboxes);
    setHighlightPage(claim.page_hint);
  };

  const handlePageChange = (newPage: number) => {
    setPageNumber(newPage);
    // Clear highlights if navigating away from highlight page
    if (highlightPage && newPage !== highlightPage) {
      setHighlights([]);
      setHighlightPage(undefined);
      setSelectedClaimIndex(null);
    }
  };

  return (
    <div className="h-screen flex bg-slate-100">
      {/* Left Panel - Chat Interface (45%) */}
      <div className="w-[45%] min-w-[500px] flex flex-col bg-white border-r border-slate-200">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-gradient-to-r from-blue-600 to-indigo-600">
          <div>
            <h1 className="text-xl font-bold text-white">Document Analyzer</h1>
            <p className="text-blue-100 text-sm">AI-powered document verification</p>
          </div>
          <ModeToggle mode={mode} onChange={setMode} />
        </div>

        {/* Input Section - Compact */}
        <div className="px-6 py-4 border-b border-slate-200 bg-slate-50/50">
          <div className="flex gap-4">
            {/* File Uploader - Compact */}
            <div className="w-48 flex-shrink-0">
              <FileUploader
                onUploadSuccess={handleUploadSuccess}
                onUploadError={handleUploadError}
              />
            </div>

            {/* Question Input */}
            <div className="flex-1">
              <div className="flex gap-2">
                <textarea
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  placeholder={
                    activeDocId
                      ? "Ask a question about the document..."
                      : "Upload a document first..."
                  }
                  disabled={!activeDocId}
                  className="flex-1 p-3 border border-slate-300 rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white text-gray-800 placeholder-slate-400 disabled:bg-slate-100 disabled:cursor-not-allowed text-base"
                  rows={2}
                />
                <button
                  onClick={handleAnalyze}
                  disabled={loading || !question.trim() || !activeDocId}
                  className="px-5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold rounded-xl hover:from-blue-700 hover:to-indigo-700 disabled:from-slate-400 disabled:to-slate-400 disabled:cursor-not-allowed transition-all duration-200 shadow-md hover:shadow-lg disabled:shadow-none"
                >
                  {loading ? (
                    <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                    </svg>
                  )}
                </button>
              </div>
              {uploadSuccess && (
                <p className="text-xs text-emerald-600 mt-2 flex items-center gap-1">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  Document uploaded successfully!
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Results Area */}
        <div ref={resultsContainerRef} className="flex-1 overflow-y-auto p-6 space-y-5">
          {error && (
            <div className="p-4 bg-red-50 text-red-700 rounded-xl border border-red-200">
              <p className="font-semibold">Error</p>
              <p className="text-sm mt-1">{error}</p>
            </div>
          )}

          {result && (
            <>
              {/* Answer Card */}
              <AnswerCard answer={result.answer} mode={mode} />

              {/* Claims Section */}
              {result.claims.length > 0 && (
                <ClaimsSection
                  claims={result.claims}
                  selectedClaimIndex={selectedClaimIndex}
                  onClaimClick={handleClaimClick}
                />
              )}
            </>
          )}

          {!result && !error && !loading && (
            <div className="flex flex-col items-center justify-center h-full text-center py-16">
              <div className="w-20 h-20 bg-gradient-to-br from-slate-100 to-slate-200 rounded-2xl flex items-center justify-center mb-5 shadow-inner">
                <svg className="w-10 h-10 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-800 mb-1">
                {activeDocId ? "Ready to Analyze" : "Upload a Document"}
              </h3>
              <p className="text-gray-500 max-w-sm">
                {activeDocId
                  ? "Type your question and click the arrow to analyze your document with AI."
                  : "Start by uploading a PDF document, then ask questions about its content."}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Right Panel - PDF Viewer (55%) */}
      <div className="flex-1 flex flex-col bg-slate-100">
        {/* PDF Toolbar */}
        <div className="flex items-center justify-between px-6 py-3 bg-white border-b border-slate-200">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-red-100 rounded-lg flex items-center justify-center">
              <svg className="w-4 h-4 text-red-600" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clipRule="evenodd" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-800">
                {currentFileName || "No document loaded"}
              </p>
              {currentFileUrl && (
                <p className="text-xs text-gray-500">PDF Preview</p>
              )}
            </div>
          </div>

          {/* Page Navigation */}
          <div className="flex items-center gap-1 bg-slate-100 rounded-lg p-1">
            <button
              onClick={() => handlePageChange(Math.max(1, pageNumber - 1))}
              disabled={pageNumber <= 1 || !currentFileUrl}
              className="p-2 rounded-md hover:bg-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <svg className="w-4 h-4 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <span className="px-4 py-1.5 text-sm font-medium text-slate-700 min-w-[90px] text-center">
              Page {pageNumber}
            </span>
            <button
              onClick={() => handlePageChange(pageNumber + 1)}
              disabled={!currentFileUrl}
              className="p-2 rounded-md hover:bg-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <svg className="w-4 h-4 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        </div>

        {/* PDF Container */}
        <div className="flex-1 overflow-auto p-6">
          <div className="flex justify-center">
            <PDFViewer
              fileUrl={currentFileUrl}
              pageNumber={pageNumber}
              highlights={highlights}
              highlightPage={highlightPage}
              scale={1.2}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;

import { useState, useRef, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import { FileText, Presentation, Download, Menu, Bot, FileCheck, Brain, Baby } from "lucide-react";
import { FileUploader } from "./components/FileUploader";
import { Sidebar } from "./components/Sidebar";
import { QuizModal } from "./components/QuizModal";
import { analyzeDocument, fetchHistory, fetchDocuments, deleteDocument, getFullFileUrl, generateQuiz } from "./services/api";
import type { AnalysisMode } from "./services/api";
import type { ChatMessage, Claim, BBox, Document, QuizQuestion } from "./types";

// API Base URL - uses environment variable for production
const API_BASE_URL = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";

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
    <div className="bg-white/10 p-0.5 rounded-lg flex items-center">
      <button
        onClick={() => onChange("strict")}
        className={`py-1.5 px-3 rounded-md text-sm font-medium transition-all duration-200 ${
          mode === "strict"
            ? "bg-white text-blue-600 shadow-sm"
            : "text-white/80 hover:text-white"
        }`}
      >
        ⚡ Strict
      </button>
      <button
        onClick={() => onChange("tutor")}
        className={`py-1.5 px-3 rounded-md text-sm font-medium transition-all duration-200 ${
          mode === "tutor"
            ? "bg-white text-purple-600 shadow-sm"
            : "text-white/80 hover:text-white"
        }`}
      >
        🎓 Tutor
      </button>
    </div>
  );
}

// User Message Bubble
function UserBubble({ content }: { content: string }) {
  return (
    <div className="flex justify-end mb-4">
      <div className="max-w-[85%] md:max-w-[80%] bg-gradient-to-r from-blue-500 to-indigo-600 text-white px-3 md:px-4 py-2.5 md:py-3 rounded-2xl rounded-br-md shadow-sm">
        <p className="text-sm md:text-base leading-relaxed">{content}</p>
      </div>
    </div>
  );
}

// AI Message with Answer Card
function AIMessage({
  message,
  mode,
  selectedClaimIndex,
  onClaimClick,
}: {
  message: ChatMessage;
  mode: AnalysisMode;
  selectedClaimIndex: { messageId: number; claimIndex: number } | null;
  onClaimClick: (claim: Claim, claimIndex: number, messageId: number) => void;
}) {
  const [copied, setCopied] = useState(false);
  const [claimsExpanded, setClaimsExpanded] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(message.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const displayMode = message.mode || mode;
  const modeConfig = {
    strict: {
      badge: "⚡ Strict Fact",
      badgeClass: "bg-blue-100 text-blue-700",
      borderClass: "border-blue-100",
    },
    tutor: {
      badge: "🎓 Tutor Explanation",
      badgeClass: "bg-purple-100 text-purple-700",
      borderClass: "border-purple-100",
    },
  };

  const config = modeConfig[displayMode];

  return (
    <div className="flex justify-start mb-4">
      <div className="max-w-[95%] md:max-w-[90%] space-y-3">
        {/* Answer Card */}
        <div className={`bg-white rounded-xl md:rounded-2xl shadow-sm border ${config.borderClass} overflow-hidden`}>
          {/* Header */}
          <div className="flex items-center justify-between px-3 md:px-4 py-2 md:py-2.5 border-b border-gray-100 bg-gray-50/50">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center">
                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
              </div>
              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${config.badgeClass}`}>
                {config.badge}
              </span>
            </div>
            <button
              onClick={handleCopy}
              className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors group"
              title="Copy to clipboard"
            >
              {copied ? (
                <svg className="w-4 h-4 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              ) : (
                <svg className="w-4 h-4 text-gray-400 group-hover:text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
              )}
            </button>
          </div>

          {/* Answer Content */}
          <div className="p-3 md:p-4">
            <div className="text-sm md:text-base text-gray-800 leading-6 md:leading-7 break-words">
              <ReactMarkdown
                components={{
                  strong: ({ children }) => (
                    <strong className="font-bold text-blue-900">{children}</strong>
                  ),
                  em: ({ children }) => (
                    <em className="italic text-gray-700">{children}</em>
                  ),
                  ul: ({ children }) => (
                    <ul className="list-disc list-outside ml-5 space-y-1 my-2">{children}</ul>
                  ),
                  ol: ({ children }) => (
                    <ol className="list-decimal list-outside ml-5 space-y-1 my-2">{children}</ol>
                  ),
                  li: ({ children }) => (
                    <li className="text-gray-800 leading-6">{children}</li>
                  ),
                  p: ({ children }) => (
                    <p className="mb-2 last:mb-0 leading-6">{children}</p>
                  ),
                  h1: ({ children }) => (
                    <h1 className="text-lg font-bold text-gray-900 mb-2 mt-3 first:mt-0">{children}</h1>
                  ),
                  h2: ({ children }) => (
                    <h2 className="text-base font-bold text-gray-900 mb-2 mt-3 first:mt-0">{children}</h2>
                  ),
                  h3: ({ children }) => (
                    <h3 className="text-sm font-bold text-gray-900 mb-1 mt-2 first:mt-0">{children}</h3>
                  ),
                  code: ({ children }) => (
                    <code className="bg-gray-100 px-1.5 py-0.5 rounded text-xs font-mono text-blue-800">{children}</code>
                  ),
                  pre: ({ children }) => (
                    <pre className="bg-gray-900 text-gray-100 p-3 rounded-lg overflow-x-auto my-2 text-xs">{children}</pre>
                  ),
                  blockquote: ({ children }) => (
                    <blockquote className="border-l-3 border-blue-300 pl-3 my-2 italic text-gray-600 text-sm">{children}</blockquote>
                  ),
                  a: ({ href, children }) => (
                    <a href={href} className="text-blue-600 hover:text-blue-800 underline" target="_blank" rel="noopener noreferrer">{children}</a>
                  ),
                }}
              >
                {message.content}
              </ReactMarkdown>
            </div>
          </div>
        </div>

        {/* Claims Section (if any) */}
        {message.claims && message.claims.length > 0 && (
          <div className="bg-white rounded-lg md:rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <button
              onClick={() => setClaimsExpanded(!claimsExpanded)}
              className="w-full flex items-center justify-between px-3 md:px-4 py-2 md:py-2.5 hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center gap-2">
                <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <span className="text-sm font-medium text-gray-700">
                  {message.claims.length} source{message.claims.length !== 1 ? "s" : ""}
                </span>
                <span className="px-1.5 py-0.5 bg-emerald-100 text-emerald-700 text-xs font-medium rounded">
                  {message.claims.filter(c => c.status === "VERIFIED").length} verified
                </span>
              </div>
              <svg
                className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${claimsExpanded ? "rotate-180" : ""}`}
                fill="none" stroke="currentColor" viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {/* Horizontal Badges */}
            <div className="px-3 md:px-4 pb-2 md:pb-3 -mt-1">
              <div className="flex gap-1.5 overflow-x-auto pb-1">
                {message.claims.map((claim, claimIdx) => {
                  const isExternal = claim.page_hint === 0;
                  const isSelected = selectedClaimIndex?.messageId === message.id && selectedClaimIndex?.claimIndex === claimIdx;
                  const isClickable = claim.status === "VERIFIED" && !isExternal;

                  if (isExternal) {
                    return (
                      <div
                        key={claimIdx}
                        className={`flex-shrink-0 flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs bg-indigo-50 border border-indigo-200 text-indigo-700 ${isSelected ? "ring-2 ring-indigo-500" : ""}`}
                      >
                        <span className="font-bold">{claimIdx + 1}</span>
                        <span>🌍</span>
                      </div>
                    );
                  }

                  const statusColors = {
                    VERIFIED: "bg-emerald-50 border-emerald-200 text-emerald-700",
                    LIKELY: "bg-amber-50 border-amber-200 text-amber-700",
                    UNVERIFIED: "bg-rose-50 border-rose-200 text-rose-600",
                  };

                  return (
                    <button
                      key={claimIdx}
                      onClick={isClickable ? () => onClaimClick(claim, claimIdx, message.id) : undefined}
                      disabled={!isClickable}
                      className={`flex-shrink-0 flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs border transition-all ${statusColors[claim.status]} ${isClickable ? "cursor-pointer hover:shadow-sm" : "opacity-60 cursor-not-allowed"} ${isSelected ? "ring-2 ring-blue-500" : ""}`}
                    >
                      <span className="font-bold">{claimIdx + 1}</span>
                      <StatusIcon status={claim.status} />
                      <span>p.{claim.page_hint}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Expanded Claims */}
            {claimsExpanded && (
              <div className="border-t border-gray-100 px-4 py-3 space-y-2 max-h-[300px] overflow-y-auto">
                {message.claims.map((claim, claimIdx) => {
                  const isExternal = claim.page_hint === 0;
                  const isSelected = selectedClaimIndex?.messageId === message.id && selectedClaimIndex?.claimIndex === claimIdx;
                  const isClickable = claim.status === "VERIFIED" && !isExternal;

                  if (isExternal) {
                    return (
                      <div
                        key={claimIdx}
                        className={`p-3 rounded-lg bg-gradient-to-br from-indigo-50 to-purple-50 border border-indigo-200 ${isSelected ? "ring-2 ring-indigo-500" : ""}`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-bold text-indigo-700">#{claimIdx + 1} ACADEMIC</span>
                          <span className="text-xs text-indigo-500">🌍 External</span>
                        </div>
                        <p className="text-sm text-indigo-900">{claim.claim}</p>
                      </div>
                    );
                  }

                  const statusConfig = {
                    VERIFIED: { bg: "bg-emerald-50", border: "border-emerald-200", text: "text-emerald-700" },
                    LIKELY: { bg: "bg-amber-50", border: "border-amber-200", text: "text-amber-700" },
                    UNVERIFIED: { bg: "bg-rose-50", border: "border-rose-200", text: "text-rose-600" },
                  };
                  const cfg = statusConfig[claim.status];

                  return (
                    <div
                      key={claimIdx}
                      onClick={isClickable ? () => onClaimClick(claim, claimIdx, message.id) : undefined}
                      className={`p-3 rounded-lg border ${cfg.bg} ${cfg.border} ${isClickable ? "cursor-pointer hover:shadow-sm" : "opacity-60"} ${isSelected ? "ring-2 ring-blue-500" : ""}`}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`text-xs font-bold ${cfg.text}`}>#{claimIdx + 1} {claim.status}</span>
                        <span className="text-xs text-gray-500">• Page {claim.page_hint}</span>
                      </div>
                      <p className="text-sm text-gray-800">{claim.claim}</p>
                      {claim.quote_anchor && (
                        <p className="text-xs text-gray-500 italic mt-1">"{claim.quote_anchor}"</p>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// Loading indicator for AI response
function LoadingBubble() {
  return (
    <div className="flex justify-start mb-4">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="flex gap-1">
            <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
            <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
            <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
          </div>
          <span className="text-sm text-gray-500">Analyzing...</span>
        </div>
      </div>
    </div>
  );
}

function App() {
  const [question, setQuestion] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Chat messages state
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [nextMessageId, setNextMessageId] = useState(1);

  // Analysis mode state
  const [mode, setMode] = useState<AnalysisMode>("strict");

  // Documents state
  const [documents, setDocuments] = useState<Document[]>([]);

  // Multi-select state for Knowledge Library
  const [selectedDocIds, setSelectedDocIds] = useState<number[]>([]);

  // Document state
  const [activeDocId, setActiveDocId] = useState<number | null>(null);
  const [currentFileUrl, setCurrentFileUrl] = useState<string | null>(null);
  const [currentFileName, setCurrentFileName] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState(false);

  // PDF Viewer state
  const [pageNumber, setPageNumber] = useState(1);
  const [highlights, setHighlights] = useState<BBox[]>([]);
  const [highlightPage, setHighlightPage] = useState<number | undefined>();
  const [selectedClaimIndex, setSelectedClaimIndex] = useState<{ messageId: number; claimIndex: number } | null>(null);

  // Mobile responsive state
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [activeMobileTab, setActiveMobileTab] = useState<'chat' | 'document'>('chat');

  // Quiz state
  const [isQuizOpen, setIsQuizOpen] = useState(false);
  const [quizData, setQuizData] = useState<QuizQuestion[]>([]);
  const [isGeneratingQuiz, setIsGeneratingQuiz] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  // Fetch documents on mount
  useEffect(() => {
    fetchDocuments()
      .then((docs) => {
        setDocuments(docs);
      })
      .catch(() => {
        // Silently fail
      });
  }, []);

  // Fetch history when activeDocId changes
  useEffect(() => {
    if (activeDocId) {
      // Clear messages first to avoid flickering
      setMessages([]);
      
      fetchHistory(activeDocId)
        .then((history) => {
          setMessages(history);
          if (history.length > 0) {
            setNextMessageId(Math.max(...history.map(m => m.id)) + 1);
          } else {
            setNextMessageId(1);
          }
        })
        .catch(() => {
          // History fetch failed - start fresh
          setMessages([]);
          setNextMessageId(1);
        });
    } else {
      setMessages([]);
      setNextMessageId(1);
    }
  }, [activeDocId]);

  const handleUploadSuccess = (docId: number, fileUrl: string, filename: string) => {
    setActiveDocId(docId);
    setCurrentFileUrl(fileUrl);
    setCurrentFileName(filename);
    setUploadSuccess(true);

    // Clear previous state
    setMessages([]);
    setError(null);
    setHighlights([]);
    setHighlightPage(undefined);
    setSelectedClaimIndex(null);
    setPageNumber(1);
    setNextMessageId(1);

    // Refresh documents list
    fetchDocuments()
      .then((docs) => {
        setDocuments(docs);
      })
      .catch(() => {
        // Silently fail
      });

    setTimeout(() => setUploadSuccess(false), 3000);
  };

  const handleSelectDoc = (docId: number) => {
    const doc = documents.find((d) => d.id === docId);
    if (!doc) return;

    setActiveDocId(docId);
    setCurrentFileUrl(getFullFileUrl(doc.file_url));
    setCurrentFileName(doc.filename);
    setError(null);
    setHighlights([]);
    setHighlightPage(undefined);
    setSelectedClaimIndex(null);
    setPageNumber(1);
  };

  const handleNewChat = () => {
    setActiveDocId(null);
    setCurrentFileUrl(null);
    setCurrentFileName(null);
    setMessages([]);
    setError(null);
    setHighlights([]);
    setHighlightPage(undefined);
    setSelectedClaimIndex(null);
    setPageNumber(1);
    setNextMessageId(1);
    setSelectedDocIds([]); // Clear multi-select
    setQuestion("");
  };

  const handleQuiz = async () => {
    // Check if documents are selected
    const docIdsToUse = selectedDocIds.length > 0
      ? selectedDocIds
      : (activeDocId ? [activeDocId] : null);

    if (!docIdsToUse || docIdsToUse.length === 0) {
      alert("Please select a document first");
      return;
    }

    setIsGeneratingQuiz(true);
    try {
      const response = await generateQuiz(docIdsToUse);
      setQuizData(response.questions);
      setIsQuizOpen(true);
    } catch (err) {
      alert(`Failed to generate quiz: ${err instanceof Error ? err.message : "Unknown error"}`);
    } finally {
      setIsGeneratingQuiz(false);
    }
  };

  const toggleDocumentSelection = (id: number) => {
    setSelectedDocIds((prev) => {
      if (prev.includes(id)) {
        return prev.filter((docId) => docId !== id);
      } else {
        return [...prev, id];
      }
    });
  };

  const handleDeleteDocument = async (docId: number) => {
    try {
      await deleteDocument(docId);
      
      // Remove from documents list
      setDocuments((prev) => prev.filter((doc) => doc.id !== docId));
      
      // Remove from selected documents
      setSelectedDocIds((prev) => prev.filter((id) => id !== docId));
      
      // If the deleted document was active, clear the active state
      if (activeDocId === docId) {
        setActiveDocId(null);
        setCurrentFileUrl(null);
        setCurrentFileName(null);
        setMessages([]);
        setHighlights([]);
        setHighlightPage(undefined);
        setSelectedClaimIndex(null);
        setPageNumber(1);
        setNextMessageId(1);
      }
    } catch (err) {
      setError(`Failed to delete document: ${err instanceof Error ? err.message : "Unknown error"}`);
    }
  };

  const handleUploadError = (errorMsg: string) => {
    setError(`Upload failed: ${errorMsg}`);
  };

  const handleAnalyze = async () => {
    if (!question.trim()) return;

    // Determine which document(s) to use
    // Priority: selectedDocIds (if any) > activeDocId
    const docIdsToUse = selectedDocIds.length > 0 
      ? selectedDocIds 
      : (activeDocId ? [activeDocId] : null);
    
    if (!docIdsToUse || docIdsToUse.length === 0) {
      setError("Please select a document first");
      return;
    }

    const userQuestion = question.trim();
    setQuestion("");
    setError(null);
    setSelectedClaimIndex(null);
    setHighlights([]);
    setHighlightPage(undefined);

    // Optimistically add user message
    const userMessage: ChatMessage = {
      id: nextMessageId,
      sender: "user",
      content: userQuestion,
      claims: [],
    };
    setMessages((prev) => [...prev, userMessage]);
    setNextMessageId((prev) => prev + 1);
    setLoading(true);

    try {
      // Pass array to API function - it will handle single vs multiple correctly
      const data = await analyzeDocument(docIdsToUse, userQuestion, mode);

      // Add AI response
      const aiMessage: ChatMessage = {
        id: nextMessageId + 1,
        sender: "ai",
        content: data.answer,
        claims: data.claims,
        mode: mode,
      };
      setMessages((prev) => [...prev, aiMessage]);
      setNextMessageId((prev) => prev + 2);
    } catch (err) {
      // Add error as a message
      const errorMessage: ChatMessage = {
        id: nextMessageId + 1,
        sender: "ai",
        content: `❌ **Error:** ${err instanceof Error ? err.message : "Analysis failed. Please try again."}`,
        claims: [],
      };
      setMessages((prev) => [...prev, errorMessage]);
      setNextMessageId((prev) => prev + 2);
    } finally {
      setLoading(false);
    }
  };

  const handleClaimClick = (claim: Claim, claimIndex: number, messageId: number) => {
    if (claim.page_hint === 0) return; // External source
    setSelectedClaimIndex({ messageId, claimIndex });
    setPageNumber(claim.page_hint);
    setHighlights(claim.bboxes);
    setHighlightPage(claim.page_hint);
  };

  const handlePageChange = (newPage: number) => {
    setPageNumber(newPage);
    if (highlightPage && newPage !== highlightPage) {
      setHighlights([]);
      setHighlightPage(undefined);
      setSelectedClaimIndex(null);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleAnalyze();
    }
  };

  // Helper function to get full URL for PDF iframe and download links
  // Prevents malformed URLs and handles various path formats
  const getFullUrl = (path: string | null): string => {
    if (!path) return "";
    
    // If already a full URL, return as is
    if (path.startsWith("http://") || path.startsWith("https://")) {
      return path;
    }
    
    // If path starts with /, prepend API_BASE_URL
    if (path.startsWith("/")) {
      const url = `${API_BASE_URL}${path}`;
      // Remove double slashes (but preserve http:// or https://)
      return url.replace(/([^:]\/)\/+/g, "$1");
    }
    
    // If path doesn't start with /, add it and prepend API_BASE_URL
    const url = `${API_BASE_URL}/${path}`;
    // Remove double slashes (but preserve http:// or https://)
    return url.replace(/([^:]\/)\/+/g, "$1");
  };

  const getFileExtension = (filename: string | null, fileUrl: string | null): string => {
    const name = filename || fileUrl || "";
    if (!name) return "";
    const lowerName = name.toLowerCase();
    const lastDotIndex = lowerName.lastIndexOf(".");
    if (lastDotIndex === -1) return "";
    return lowerName.substring(lastDotIndex);
  };

  const getFileType = (): "pdf" | "docx" | "pptx" | "unknown" => {
    const ext = getFileExtension(currentFileName, currentFileUrl);
    if (ext === ".pdf") return "pdf";
    if (ext === ".docx") return "docx";
    if (ext === ".pptx") return "pptx";
    return "unknown";
  };

  const renderPreview = () => {
    if (!currentFileUrl) {
      return (
        <div className="flex flex-col items-center justify-center h-full text-center py-16 px-8">
          <div className="w-20 h-20 bg-slate-200 rounded-2xl flex items-center justify-center mb-6">
            <svg className="w-10 h-10 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-gray-800 mb-2">
            No Document Loaded
          </h3>
          <p className="text-sm text-gray-600 max-w-md">
            Select a document from the sidebar to view it here.
          </p>
        </div>
      );
    }

    const fileType = getFileType();

    // PDF Preview with iframe
    if (fileType === "pdf") {
      // Get full URL and append #view=FitH to force horizontal fit
      const fullUrl = getFullUrl(currentFileUrl);
      const pdfUrl = fullUrl.includes("#") 
        ? fullUrl.split("#")[0] + "#view=FitH"
        : fullUrl + "#view=FitH";

      return (
        <div className="h-full w-full md:h-full">
          <iframe
            src={pdfUrl}
            className="w-full h-full border-0"
            title="PDF Preview"
            style={{ 
              minHeight: "100%",
              height: "100%",
              display: "block"
            }}
          />
        </div>
      );
    }

    // DOCX/PPTX Placeholder
    if (fileType === "docx" || fileType === "pptx") {
      const Icon = fileType === "docx" ? FileText : Presentation;
      const fileTypeName = fileType === "docx" ? "Word" : "PowerPoint";

  return (
        <div className="flex flex-col items-center justify-center h-full text-center py-16 px-8 bg-gradient-to-br from-slate-900 to-slate-800">
          <div className="w-24 h-24 bg-slate-700/50 rounded-3xl flex items-center justify-center mb-8 shadow-2xl">
            <Icon className="w-12 h-12 text-slate-300" />
          </div>
          <h3 className="text-2xl font-bold text-white mb-3">
            Preview Not Available
          </h3>
          <p className="text-slate-300 text-base mb-2 max-w-md leading-relaxed">
            Preview is not available for this file format.
          </p>
          <p className="text-slate-400 text-sm mb-8 max-w-md">
            The AI has processed this {fileTypeName} file and can answer questions about it.
          </p>
          <a
            href={getFullUrl(currentFileUrl)}
            download
            className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-xl transition-colors shadow-lg hover:shadow-xl"
          >
            <Download className="w-5 h-5" />
            Download File
        </a>
      </div>
      );
    }

    // Unknown file type
    return (
      <div className="flex flex-col items-center justify-center h-full text-center py-16 px-8">
        <div className="w-20 h-20 bg-slate-200 rounded-2xl flex items-center justify-center mb-6">
          <svg className="w-10 h-10 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        </div>
        <h3 className="text-lg font-semibold text-gray-800 mb-2">
          Preview Not Available
        </h3>
        <p className="text-sm text-gray-600 max-w-md">
          Preview is not available for this file format. You can still chat with the AI about its content.
        </p>
      </div>
    );
  };

  const fileType = getFileType();
  const isPDF = fileType === "pdf";

  return (
    <div className="h-screen flex bg-slate-100 overflow-hidden">
      {/* Mobile Sidebar Overlay */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* 1. SIDEBAR - Documents List */}
      <div
        className={`
          fixed md:static inset-y-0 left-0 z-50
          transform transition-transform duration-300 ease-in-out
          ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
          md:translate-x-0
        `}
      >
        <Sidebar
          documents={documents}
          activeDocId={activeDocId}
          selectedDocIds={selectedDocIds}
          onSelectDoc={(id) => {
            handleSelectDoc(id);
            setIsSidebarOpen(false); // Close sidebar on mobile after selection
          }}
          onToggleSelection={toggleDocumentSelection}
          onDelete={handleDeleteDocument}
          onNewChat={handleNewChat}
          onQuiz={handleQuiz}
          isMobile={true}
          onClose={() => setIsSidebarOpen(false)}
        />
      </div>

      {/* 2. MAIN CONTENT AREA */}
      <div className="flex-1 flex flex-col h-full relative overflow-hidden">
        {/* Mobile Header (Hamburger + Logo) - Visible only on Mobile */}
        <div className="md:hidden flex items-center justify-between px-4 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 shadow-sm z-20">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            {/* Mobile Hamburger Menu */}
            <button
              onClick={() => setIsSidebarOpen(true)}
              className="p-2 -ml-2 rounded-lg hover:bg-white/10 transition-colors"
              aria-label="Open menu"
            >
              <Menu className="w-6 h-6 text-white" />
            </button>
            <div className="w-8 h-8 bg-white/20 rounded-xl flex items-center justify-center flex-shrink-0">
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-base font-bold text-white">Document Analyzer</h1>
              <div className="flex items-center gap-2 flex-wrap">
                <p className="text-blue-100 text-xs">AI-powered verification</p>
                {selectedDocIds.length > 1 && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-white/20 text-white text-xs font-medium rounded-full">
                    📚 {selectedDocIds.length} files
                  </span>
                )}
              </div>
            </div>
          </div>
          <ModeToggle mode={mode} onChange={setMode} />
        </div>

        {/* Mobile Tab Switcher - Visible only on Mobile, Fixed at bottom */}
        <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 z-30 flex">
          <button
            onClick={() => setActiveMobileTab('chat')}
            className={`flex-1 py-3 px-4 text-center font-medium transition-colors ${
              activeMobileTab === 'chat'
                ? 'bg-blue-50 text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-600 hover:bg-gray-50'
            }`}
          >
            💬 Chat
          </button>
          <button
            onClick={() => setActiveMobileTab('document')}
            className={`flex-1 py-3 px-4 text-center font-medium transition-colors ${
              activeMobileTab === 'document'
                ? 'bg-blue-50 text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-600 hover:bg-gray-50'
            }`}
          >
            📄 Document
          </button>
        </div>

        {/* 3. WORKSPACE (Chat + Document) */}
        <div className="flex-1 flex overflow-hidden">
          {/* A. LEFT PANEL (Chat / Upload) */}
          {/* On Mobile: Show if activeMobileTab === 'chat' */}
          {/* On Desktop: Always Show */}
          <div className={`
            flex-1 flex flex-col bg-slate-50 border-r border-slate-200
            ${activeMobileTab === 'chat' ? 'flex' : 'hidden'}
            md:flex
            min-w-0
            md:min-w-[480px]
          `}>
            {/* Check if document is selected (Chat Mode) or not (Upload Mode) */}
            {activeDocId || selectedDocIds.length > 0 ? (
              <>
                {/* CHAT MODE: Document is selected */}
                {/* Desktop Header */}
                <div className="hidden md:flex items-center justify-between px-5 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 shadow-sm">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="w-9 h-9 bg-white/20 rounded-xl flex items-center justify-center flex-shrink-0">
                      <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    </div>
                    <div className="flex-1 min-w-0">
                      <h1 className="text-lg font-bold text-white">Document Analyzer</h1>
                      <div className="flex items-center gap-2">
                        <p className="text-blue-100 text-xs">AI-powered verification</p>
                        {selectedDocIds.length > 1 && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-white/20 text-white text-xs font-medium rounded-full">
                            📚 Library Mode: {selectedDocIds.length} files selected
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <ModeToggle mode={mode} onChange={setMode} />
                </div>

                {/* Active File Header - Shows current document */}
                {currentFileName && (
                  <div className="px-4 md:px-5 py-2.5 bg-white border-b border-slate-200">
                    <div className="flex items-center gap-2 text-sm">
                      <span className="text-slate-500">📂 Chatting with:</span>
                      <span className="font-medium text-gray-800 truncate">{currentFileName}</span>
                    </div>
                  </div>
                )}

                {/* Message List */}
                <div ref={chatContainerRef} className="flex-1 overflow-y-auto px-3 md:px-4 py-4 pb-20 md:pb-4">
                  {/* Welcome Empty State - Show when document is selected but no messages */}
                  {(activeDocId !== null || selectedDocIds.length > 0) && messages.length === 0 && !loading && (
                    <div className="flex flex-col items-center justify-center h-full text-center py-8 md:py-12 px-4">
                      {/* Icon */}
                      <div className="w-20 h-20 md:w-24 md:h-24 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-full flex items-center justify-center mb-6 shadow-lg">
                        <Bot className="w-10 h-10 md:w-12 md:h-12 text-blue-600" />
                      </div>
                      
                      {/* Title */}
                      <h3 className="text-xl md:text-2xl font-bold text-gray-800 mb-2">
                        İmtahana hazırsan? 🚀
                      </h3>
                      
                      {/* Subtitle */}
                      <p className="text-sm md:text-base text-gray-500 max-w-md mb-8">
                        Sənədinizi yükləyin və mənə sual verin.
                      </p>
                      
                      {/* Suggestion Cards Grid */}
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4 w-full max-w-4xl">
                        {/* Summarize Card */}
                        <button
                          onClick={() => {
                            setQuestion("Bu sənədin qısa məzmununu (summary) mənə danış. Əsas məqamları vurğula.");
                            // Auto-focus the textarea after a short delay
                            setTimeout(() => {
                              const textarea = document.querySelector('textarea[placeholder*="Ask a question"]') as HTMLTextAreaElement;
                              textarea?.focus();
                            }, 100);
                          }}
                          className="group flex flex-col items-center gap-3 p-4 md:p-5 bg-white border-2 border-gray-200 rounded-xl hover:border-purple-500 hover:bg-purple-50 transition-all duration-200 hover:scale-105 hover:shadow-md cursor-pointer text-left w-full"
                        >
                          <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center group-hover:bg-purple-200 transition-colors">
                            <FileCheck className="w-6 h-6 text-purple-600" />
                          </div>
                          <div className="flex-1">
                            <p className="text-sm md:text-base font-semibold text-gray-800 mb-1">
                              📄 Qısa Məzmun
                            </p>
                            <p className="text-xs text-gray-500">
                              Sənədin əsas məqamları
                            </p>
                          </div>
                        </button>
                        
                        {/* Quiz Card */}
                        <button
                          onClick={() => {
                            setQuestion("Bu sənəd əsasında mənə sınaq testi (quiz) hazırla.");
                            setTimeout(() => {
                              const textarea = document.querySelector('textarea[placeholder*="Ask a question"]') as HTMLTextAreaElement;
                              textarea?.focus();
                            }, 100);
                          }}
                          className="group flex flex-col items-center gap-3 p-4 md:p-5 bg-white border-2 border-gray-200 rounded-xl hover:border-blue-500 hover:bg-blue-50 transition-all duration-200 hover:scale-105 hover:shadow-md cursor-pointer text-left w-full"
                        >
                          <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center group-hover:bg-blue-200 transition-colors">
                            <Brain className="w-6 h-6 text-blue-600" />
                          </div>
                          <div className="flex-1">
                            <p className="text-sm md:text-base font-semibold text-gray-800 mb-1">
                              🧠 Bilikləri Yoxla
                            </p>
                            <p className="text-xs text-gray-500">
                              Sınaq testi hazırla
                            </p>
                          </div>
                        </button>
                        
                        {/* Explain Like I'm 5 Card */}
                        <button
                          onClick={() => {
                            setQuestion("Bu mövzunu mənə 5 yaşlı uşağa izah edən kimi sadə dildə başa sal.");
                            setTimeout(() => {
                              const textarea = document.querySelector('textarea[placeholder*="Ask a question"]') as HTMLTextAreaElement;
                              textarea?.focus();
                            }, 100);
                          }}
                          className="group flex flex-col items-center gap-3 p-4 md:p-5 bg-white border-2 border-gray-200 rounded-xl hover:border-orange-500 hover:bg-orange-50 transition-all duration-200 hover:scale-105 hover:shadow-md cursor-pointer text-left w-full"
                        >
                          <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center group-hover:bg-orange-200 transition-colors">
                            <Baby className="w-6 h-6 text-orange-600" />
                          </div>
                          <div className="flex-1">
                            <p className="text-sm md:text-base font-semibold text-gray-800 mb-1">
                              👶 Sadə İzah
                            </p>
                            <p className="text-xs text-gray-500">
                              Sadə dildə izahat
                            </p>
                          </div>
                        </button>
                      </div>
                    </div>
                  )}
                  
                  {/* Fallback empty state for when no document is selected */}
                  {!activeDocId && selectedDocIds.length === 0 && messages.length === 0 && !loading && (
                    <div className="flex flex-col items-center justify-center h-full text-center py-12">
                      <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center mb-4 shadow-sm">
                        <svg className="w-8 h-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                        </svg>
                      </div>
                      <h3 className="text-base font-semibold text-gray-700 mb-1">
                        Upload a Document
                      </h3>
                      <p className="text-sm text-gray-500 max-w-xs">
                        Upload a PDF document to start analyzing its content with AI.
                      </p>
                    </div>
                  )}

                  {messages.map((message) =>
                    message.sender === "user" ? (
                      <UserBubble key={message.id} content={message.content} />
                    ) : (
                      <AIMessage
                        key={message.id}
                        message={message}
                        mode={mode}
                        selectedClaimIndex={selectedClaimIndex}
                        onClaimClick={handleClaimClick}
                      />
                    )
                  )}

                  {loading && <LoadingBubble />}

                  {error && (
                    <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-xl border border-red-200 text-sm">
                      {error}
                    </div>
                  )}

                  <div ref={messagesEndRef} />
                </div>

                {/* Input Area - Fixed at bottom (NO FileUploader in Chat Mode) */}
                <div className="border-t border-slate-200 bg-white px-3 md:px-4 py-3">
                  {/* Message Input Row */}
                  <div className="flex gap-2">
                    <textarea
                      value={question}
                      onChange={(e) => setQuestion(e.target.value)}
                      onKeyDown={handleKeyDown}
                      placeholder="Ask a question... (Enter to send)"
                      disabled={loading}
                      className="flex-1 p-2.5 md:p-3 border border-slate-300 rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white text-gray-800 placeholder-slate-400 disabled:bg-slate-100 disabled:cursor-not-allowed text-sm md:text-base"
                      rows={2}
                    />
                    <button
                      onClick={handleAnalyze}
                      disabled={loading || !question.trim()}
                      className="px-3 md:px-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold rounded-xl hover:from-blue-700 hover:to-indigo-700 disabled:from-slate-400 disabled:to-slate-400 disabled:cursor-not-allowed transition-all duration-200 shadow-sm hover:shadow-md disabled:shadow-none flex-shrink-0"
                    >
                      {loading ? (
                        <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                        </svg>
                      ) : (
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                        </svg>
                      )}
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <>
                {/* UPLOAD MODE: No document selected - Show Upload Zone */}
                <div className="flex-1 flex flex-col items-center justify-center px-4 md:px-8 py-12">
                  <div className="w-full max-w-md">
                    <div className="text-center mb-6">
                      <h2 className="text-2xl md:text-3xl font-bold text-gray-800 mb-2">
                        Upload a Document
                      </h2>
                      <p className="text-sm md:text-base text-gray-600">
                        Upload a PDF, DOCX, or PPTX file to start analyzing with AI
                      </p>
                    </div>
                    <FileUploader
                      onUploadSuccess={handleUploadSuccess}
                      onUploadError={handleUploadError}
                    />
                  </div>
                </div>
              </>
            )}
          </div>

          {/* B. RIGHT PANEL (Document Preview) */}
          {/* On Mobile: Show if activeMobileTab === 'document' */}
          {/* On Desktop: Always Show */}
          <div className={`
            w-full md:w-[40%] md:min-w-[400px] flex flex-col bg-slate-100
            ${activeMobileTab === 'document' ? 'flex' : 'hidden'}
            md:flex
          `}>
        {/* PDF Toolbar */}
        <div className="flex items-center justify-between px-4 md:px-6 py-3 bg-white border-b border-slate-200">
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
                <p className="text-xs text-gray-500">
                  {isPDF ? "PDF Preview" : "Document Preview"}
                </p>
              )}
            </div>
          </div>

          {/* Page Navigation - Only show for PDF */}
          {isPDF && (
            <div className="flex items-center gap-1 bg-slate-100 rounded-lg p-1">
              <button
                onClick={() => handlePageChange(Math.max(1, pageNumber - 1))}
                disabled={pageNumber <= 1 || !currentFileUrl}
                className="p-1.5 md:p-2 rounded-md hover:bg-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <svg className="w-4 h-4 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <span className="px-2 md:px-4 py-1.5 text-xs md:text-sm font-medium text-slate-700 min-w-[70px] md:min-w-[90px] text-center">
                Page {pageNumber}
              </span>
              <button
                onClick={() => handlePageChange(pageNumber + 1)}
                disabled={!currentFileUrl}
                className="p-1.5 md:p-2 rounded-md hover:bg-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <svg className="w-4 h-4 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>
          )}
        </div>

        {/* Document Preview Container */}
        <div className="flex-1 overflow-hidden pb-16 md:pb-0">
          {renderPreview()}
        </div>
          </div>
        </div>
      </div>

      {/* Quiz Modal */}
      <QuizModal
        isOpen={isQuizOpen}
        onClose={() => setIsQuizOpen(false)}
        quizData={quizData}
      />

      {/* Quiz Generation Loader */}
      {isGeneratingQuiz && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-sm w-full mx-4">
            <div className="text-center">
              <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="animate-spin w-8 h-8 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-800 mb-2">Generating Quiz...</h3>
              <p className="text-sm text-gray-600">Please wait while we create questions from your document</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;

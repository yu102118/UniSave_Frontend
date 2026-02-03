import { Trash2, FileText, Presentation, X, Brain } from "lucide-react";
import type { Document } from "../types";

interface SidebarProps {
  documents: Document[];
  activeDocId: number | null;
  selectedDocIds: number[];
  onSelectDoc: (id: number) => void;
  onToggleSelection: (id: number) => void;
  onDelete: (id: number) => void;
  onNewChat: () => void;
  onQuiz?: () => void;
  isMobile?: boolean;
  onClose?: () => void;
}

export function Sidebar({
  documents,
  activeDocId,
  selectedDocIds,
  onSelectDoc,
  onToggleSelection,
  onDelete,
  onNewChat,
  onQuiz,
  isMobile = false,
  onClose,
}: SidebarProps) {
  const formatDate = (dateString?: string) => {
    if (!dateString) return "";
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    } catch {
      return "";
    }
  };

  const getDisplayTitle = (doc: Document): string => {
    // Extract filename from path or use title if available
    const title = (doc as any).title || doc.filename || doc.file_url || "";
    if (title.includes("/")) {
      return title.split("/").pop() || "Untitled Document";
    }
    return title || "Untitled Document";
  };

  const getFileIcon = (doc: Document | null | undefined) => {
    // Safely extract filename with fallbacks
    const fileName = doc?.filename?.toString() || doc?.file_url?.toString() || "";

    if (!fileName) {
      // Default icon if no filename available
      return <FileText className="w-4 h-4 text-gray-400" />;
    }

    const lowerFileName = fileName.toLowerCase();
    const lastDotIndex = lowerFileName.lastIndexOf(".");

    // Check if there's a valid extension
    if (lastDotIndex === -1 || lastDotIndex === lowerFileName.length - 1) {
      // No extension found, return default icon
      return <FileText className="w-4 h-4 text-gray-400" />;
    }

    const extension = lowerFileName.substring(lastDotIndex);

    if (extension === ".pdf") {
      return (
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clipRule="evenodd" />
        </svg>
      );
    } else if (extension === ".docx") {
      return <FileText className="w-4 h-4 text-blue-400" />;
    } else if (extension === ".pptx") {
      return <Presentation className="w-4 h-4 text-orange-400" />;
    }

    // Default icon for unknown extensions
    return <FileText className="w-4 h-4 text-gray-400" />;
  };

  return (
    <div className="w-64 h-screen bg-gray-900 text-gray-300 flex flex-col border-r border-gray-800 shadow-xl">
      {/* Header */}
      <div className="p-4 border-b border-gray-800">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold text-white">Documents</h2>
          {/* Mobile Close Button */}
          {isMobile && onClose && (
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-gray-800 text-gray-400 hover:text-white transition-colors"
              aria-label="Close sidebar"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>
        <div className="space-y-2">
          <button
            onClick={onNewChat}
            className="w-full px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            New Upload
          </button>
          {onQuiz && (
            <button
              onClick={onQuiz}
              className="w-full px-3 py-2 bg-purple-600 hover:bg-purple-700 text-white text-sm font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              <Brain className="w-4 h-4" />
              🧠 Quiz
            </button>
          )}
        </div>
      </div>

      {/* Documents List */}
      <div className="flex-1 overflow-y-auto">
        {documents.length === 0 ? (
          <div className="p-4 text-center text-gray-500 text-sm">
            <p>No documents yet</p>
            <p className="text-xs mt-1">Upload your first document</p>
          </div>
        ) : (
          <div className="p-2 space-y-1">
            {documents
              .filter((doc) => doc != null) // Filter out null/undefined documents
              .map((doc) => {
                const isActive = activeDocId === doc.id;
                const isSelected = selectedDocIds.includes(doc.id);
                const displayTitle = getDisplayTitle(doc);

                return (
                  <div
                    key={doc.id}
                    className={`
                      group relative w-full text-left p-3 rounded-lg transition-all duration-200
                      ${isActive ? "bg-gray-700 text-white" : "hover:bg-gray-800 text-gray-300"}
                      ${isSelected ? "ring-2 ring-blue-500 ring-inset" : ""}
                    `}
                  >
                    <div className="flex items-start gap-2">
                      {/* Checkbox */}
                      <div className="flex-shrink-0 mt-0.5">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={(e) => {
                            e.stopPropagation();
                            onToggleSelection(doc.id);
                          }}
                          onClick={(e) => e.stopPropagation()}
                          className={`
                            w-4 h-4 rounded border-gray-500 bg-gray-800 text-blue-600
                            focus:ring-2 focus:ring-blue-500 focus:ring-offset-0
                            cursor-pointer transition-all
                            ${isSelected ? "opacity-100" : "opacity-0 group-hover:opacity-100"}
                          `}
                        />
                      </div>

                      {/* Document Icon */}
                      <div className="flex-shrink-0 mt-0.5">
                        {getFileIcon(doc)}
                      </div>

                      {/* Document Info */}
                      <button
                        onClick={() => onSelectDoc(doc.id)}
                        className="flex-1 min-w-0 text-left"
                      >
                        <div className="flex-1 min-w-0">
                          <p className={`text-sm font-medium truncate ${isActive ? "text-white" : "text-gray-200"}`}>
                            {displayTitle}
                          </p>
                          {doc.uploaded_at && (
                            <p className="text-xs text-gray-400 mt-0.5">
                              {formatDate(doc.uploaded_at)}
                            </p>
                          )}
                        </div>
                      </button>

                      {/* Active Indicator */}
                      {isActive && (
                        <div className="flex-shrink-0">
                          <div className="w-2 h-2 bg-blue-500 rounded-full" />
                        </div>
                      )}
                    </div>

                    {/* Delete Button - Visible on hover */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onDelete(doc.id);
                      }}
                      className={`
                        absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-md
                        opacity-0 group-hover:opacity-100 transition-opacity duration-200
                        hover:bg-red-600/20 text-gray-400 hover:text-red-400
                      `}
                      title="Delete document"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                );
              })}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-gray-800">
        <div className="flex items-center gap-2 text-xs text-gray-500">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <span>{documents.length} document{documents.length !== 1 ? "s" : ""}</span>
          {selectedDocIds.length > 0 && (
            <span className="ml-auto text-blue-400">
              {selectedDocIds.length} selected
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

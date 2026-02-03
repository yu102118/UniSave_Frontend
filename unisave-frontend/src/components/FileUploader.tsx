import { useState, useRef, useCallback } from "react";
import { Upload, FileText, X, CheckCircle, Loader2 } from "lucide-react";
import { uploadDocument, getFullFileUrl } from "../services/api";
import type { DocumentUploadResponse } from "../types";

interface FileUploaderProps {
  onUploadSuccess: (docId: number, fileUrl: string, filename: string) => void;
  onUploadError?: (error: string) => void;
}

const ALLOWED_TYPES = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document", // .docx
  "application/vnd.openxmlformats-officedocument.presentationml.presentation", // .pptx
];

const ALLOWED_EXTENSIONS = [".pdf", ".docx", ".pptx"];

export function FileUploader({ onUploadSuccess, onUploadError }: FileUploaderProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<{
    name: string;
    docId: number;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const getFileExtension = (filename: string): string => {
    return filename.toLowerCase().substring(filename.lastIndexOf("."));
  };

  const isValidFile = (file: File): boolean => {
    const extension = getFileExtension(file.name);
    return (
      ALLOWED_TYPES.includes(file.type) ||
      ALLOWED_EXTENSIONS.includes(extension)
    );
  };

  const handleFile = useCallback(
    async (file: File) => {
      // Validate file type
      if (!isValidFile(file)) {
        const errorMsg = "Please upload a PDF, DOCX, or PPTX file";
        setError(errorMsg);
        onUploadError?.(errorMsg);
        return;
      }

      // Validate file size (max 50MB)
      const maxSize = 50 * 1024 * 1024;
      if (file.size > maxSize) {
        const errorMsg = "File size must be less than 50MB";
        setError(errorMsg);
        onUploadError?.(errorMsg);
        return;
      }

      setIsUploading(true);
      setError(null);

      try {
        const response: DocumentUploadResponse = await uploadDocument(file);
        const fullUrl = getFullFileUrl(response.file_url);

        setUploadedFile({
          name: response.filename || file.name,
          docId: response.id,
        });

        onUploadSuccess(response.id, fullUrl, response.filename || file.name);
      } catch (err: any) {
        let errorMsg = "Upload failed";
        
        // Check if it's an axios error with response data
        if (err?.response?.data) {
          const errorData = err.response.data;
          
          // Check for file size/page limit errors
          // Backend might return: { "file": ["File too large..."] } or { "error": "..." }
          const errorString = JSON.stringify(errorData).toLowerCase();
          
          if (
            errorString.includes("too large") ||
            errorString.includes("too big") ||
            errorString.includes("page limit") ||
            errorString.includes("exceed") ||
            errorString.includes("maximum") ||
            errorString.includes("max 100") ||
            errorString.includes("100 pages")
          ) {
            errorMsg = "⚠️ Upload Rejected: The file is too big (Max 100 pages).";
          } else if (errorData.file && Array.isArray(errorData.file)) {
            // Handle field-specific errors like { "file": ["error message"] }
            errorMsg = errorData.file[0] || errorMsg;
          } else if (errorData.error) {
            // Handle generic error field
            errorMsg = errorData.error;
          } else if (errorData.message) {
            // Handle message field
            errorMsg = errorData.message;
          } else if (typeof errorData === 'string') {
            // Handle string error response
            errorMsg = errorData;
          }
        } else if (err instanceof Error) {
          // Fallback to error message
          errorMsg = err.message;
        }
        
        setError(errorMsg);
        onUploadError?.(errorMsg);
      } finally {
        setIsUploading(false);
      }
    },
    [onUploadSuccess, onUploadError]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);

      const file = e.dataTransfer.files[0];
      if (file) {
        handleFile(file);
      }
    },
    [handleFile]
  );

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
        handleFile(file);
      }
    },
    [handleFile]
  );

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  const handleClearFile = () => {
    setUploadedFile(null);
    setError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  // Show uploaded file state
  if (uploadedFile) {
    return (
      <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center">
              <CheckCircle className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-emerald-800 truncate max-w-[180px]">
                {uploadedFile.name}
              </p>
              <p className="text-xs text-emerald-600">Ready for analysis</p>
            </div>
          </div>
          <button
            onClick={handleClearFile}
            className="p-1.5 hover:bg-emerald-100 rounded-lg transition-colors"
          >
            <X className="w-4 h-4 text-emerald-600" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div
        onClick={handleClick}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`
          relative p-4 border-2 border-dashed rounded-xl cursor-pointer
          transition-all duration-200
          ${
            isDragging
              ? "border-blue-500 bg-blue-50"
              : "border-slate-300 hover:border-blue-400 hover:bg-slate-50"
          }
          ${isUploading ? "pointer-events-none opacity-70" : ""}
        `}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.docx,.pptx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.openxmlformats-officedocument.presentationml.presentation"
          onChange={handleFileSelect}
          className="hidden"
        />

        <div className="flex flex-col items-center gap-2 text-center">
          {isUploading ? (
            <>
              <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
              <p className="text-sm font-medium text-slate-600">Uploading...</p>
            </>
          ) : (
            <>
              <div
                className={`w-12 h-12 rounded-xl flex items-center justify-center transition-colors ${
                  isDragging ? "bg-blue-100" : "bg-slate-100"
                }`}
              >
                {isDragging ? (
                  <FileText className="w-6 h-6 text-blue-500" />
                ) : (
                  <Upload className="w-6 h-6 text-slate-400" />
                )}
              </div>
              <div>
                <p className="text-sm font-medium text-slate-700">
                  {isDragging ? "Drop your file here" : "Upload Document"}
                </p>
                <p className="text-xs text-slate-500 mt-0.5">
                  PDF, DOCX, or PPTX • Drag & drop or click
                </p>
              </div>
            </>
          )}
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 p-2 bg-red-50 border border-red-200 rounded-lg">
          <X className="w-4 h-4 text-red-500 flex-shrink-0" />
          <p className="text-xs text-red-600">{error}</p>
        </div>
      )}
    </div>
  );
}

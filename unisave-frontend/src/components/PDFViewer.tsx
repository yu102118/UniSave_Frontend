import { useState, useCallback, useRef, useEffect } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import type { BBox } from "../types";

import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";

// Configure PDF.js worker
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

interface PDFViewerProps {
  fileUrl: string | null;
  highlights: BBox[];
  pageNumber: number;
  highlightPage?: number; // The page these highlights belong to
  scale?: number;
  onPageChange?: (page: number) => void;
}

export function PDFViewer({
  fileUrl,
  highlights,
  pageNumber,
  highlightPage,
  scale = 1.0,
  onPageChange,
}: PDFViewerProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [numPages, setNumPages] = useState<number>(0);
  const [pageDimensions, setPageDimensions] = useState<{
    width: number;
    height: number;
  } | null>(null);
  const [highlightsVisible, setHighlightsVisible] = useState(false);
  
  const containerRef = useRef<HTMLDivElement>(null);
  const pageRef = useRef<HTMLDivElement>(null);

  // Reset highlights visibility when highlights change (for fade-in effect)
  useEffect(() => {
    setHighlightsVisible(false);
    const timer = setTimeout(() => setHighlightsVisible(true), 50);
    return () => clearTimeout(timer);
  }, [highlights, pageNumber]);

  // Scroll highlight into view when it appears
  useEffect(() => {
    if (highlightsVisible && highlights.length > 0 && pageRef.current) {
      pageRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [highlightsVisible, highlights]);

  const onDocumentLoadSuccess = useCallback(({ numPages }: { numPages: number }) => {
    setLoading(false);
    setError(null);
    setNumPages(numPages);
  }, []);

  const onDocumentLoadError = useCallback((err: Error) => {
    setLoading(false);
    setError(err.message || "Failed to load PDF");
  }, []);

  const onPageLoadSuccess = useCallback(
    (page: { originalWidth: number; originalHeight: number }) => {
      setPageDimensions({
        width: page.originalWidth,
        height: page.originalHeight,
      });
    },
    []
  );

  // Only show highlights if we're on the correct page
  const shouldShowHighlights =
    highlights.length > 0 &&
    highlightsVisible &&
    (highlightPage === undefined || highlightPage === pageNumber);

  if (!fileUrl) {
    return (
      <div className="flex items-center justify-center h-96 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
        <p className="text-gray-500">No document loaded</p>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="relative inline-block">
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100 z-10 rounded-lg">
          <div className="flex flex-col items-center gap-2">
            <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
            <span className="text-gray-500">Loading PDF...</span>
          </div>
        </div>
      )}

      {error && (
        <div className="p-6 bg-red-50 text-red-600 rounded-lg border border-red-200">
          <p className="font-medium">Failed to load document</p>
          <p className="text-sm mt-1">{error}</p>
        </div>
      )}

      <Document
        file={fileUrl}
        onLoadSuccess={onDocumentLoadSuccess}
        onLoadError={onDocumentLoadError}
        loading={null}
      >
        <div ref={pageRef} className="relative shadow-lg rounded-lg overflow-hidden">
          <Page
            pageNumber={pageNumber}
            scale={scale}
            onLoadSuccess={onPageLoadSuccess}
            loading={null}
          />

          {/* Highlight Layer - Only visible on matching page */}
          {pageDimensions && shouldShowHighlights && (
            <div
              className="absolute top-0 left-0 pointer-events-none transition-opacity duration-300"
              style={{
                width: pageDimensions.width * scale,
                height: pageDimensions.height * scale,
                opacity: highlightsVisible ? 1 : 0,
              }}
            >
              {highlights.map((bbox, index) => (
                <div
                  key={`${pageNumber}-${index}-${bbox.join("-")}`}
                  className="absolute bg-yellow-400/50 rounded-sm pointer-events-none ring-2 ring-yellow-500/30 transition-all duration-300"
                  style={{
                    left: bbox[0] * scale,
                    top: bbox[1] * scale,
                    width: (bbox[2] - bbox[0]) * scale,
                    height: (bbox[3] - bbox[1]) * scale,
                    animation: "highlight-pulse 2s ease-in-out infinite",
                  }}
                />
              ))}
            </div>
          )}
        </div>
      </Document>

      {/* Page indicator */}
      {numPages > 0 && (
        <div className="absolute bottom-4 right-4 bg-black/70 text-white px-3 py-1 rounded-full text-sm">
          {pageNumber} / {numPages}
        </div>
      )}

      {/* Inline styles for highlight animation */}
      <style>{`
        @keyframes highlight-pulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(250, 204, 21, 0.4); }
          50% { box-shadow: 0 0 0 4px rgba(250, 204, 21, 0.2); }
        }
      `}</style>
    </div>
  );
}

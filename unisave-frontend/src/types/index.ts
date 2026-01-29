export type ClaimStatus = "VERIFIED" | "LIKELY" | "UNVERIFIED";

/** Bounding box coordinates [x0, y0, x1, y1] in PDF points */
export type BBox = [number, number, number, number];

export interface Claim {
  claim: string;
  quote_anchor: string;
  page_hint: number;
  status: ClaimStatus;
  bboxes: BBox[];
}

export interface AnalysisResponse {
  answer: string;
  claims: Claim[];
}

/** Highlight with page context for PDFViewer */
export interface PageHighlight {
  page: number;
  bboxes: BBox[];
}

/** Response from document upload */
export interface DocumentUploadResponse {
  id: number;
  file_url: string;
  filename?: string;
}

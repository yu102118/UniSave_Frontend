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

/** Document from the documents list */
export interface Document {
  id: number;
  filename: string;
  file_url: string;
  uploaded_at?: string;
  created_at?: string;
}

/** Chat message in the conversation history */
export interface ChatMessage {
  id: number;
  sender: "user" | "ai";
  content: string;
  claims: Claim[];
  mode?: "strict" | "tutor";
  created_at?: string;
}

/** Quiz question option (legacy object format) */
export interface QuizOption {
  id: number;
  text: string;
  is_correct: boolean;
}

/** Quiz question */
export interface QuizQuestion {
  id: number;
  question: string;
  options: string[] | QuizOption[]; // Backend sends string[], but we support both formats
  correct_answer_index?: number; // Index of correct answer (0-based) when options is string[]
  explanation?: string;
}

/** Quiz response from API */
export interface QuizResponse {
  questions: QuizQuestion[];
}

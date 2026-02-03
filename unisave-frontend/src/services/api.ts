import axios from "axios";
import type { AnalysisResponse, DocumentUploadResponse, ChatMessage, Document, QuizResponse } from "../types";

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";

const api = axios.create({
  baseURL: `${API_BASE_URL}/api`,
});

export type AnalysisMode = "strict" | "tutor";

export async function analyzeDocument(
  docId: number | number[],
  question: string,
  mode: AnalysisMode = "strict"
): Promise<AnalysisResponse> {
  // Build payload with correct snake_case keys matching Django backend
  const isArray = Array.isArray(docId);
  
  const payload: {
    question: string;
    mode: AnalysisMode;
    document_id?: number;
    document_ids?: number[];
  } = {
    question,
    mode,
  };

  // Determine which key to use based on input
  if (isArray) {
    if (docId.length > 1) {
      // Multiple documents: use document_ids
      payload.document_ids = docId;
    } else if (docId.length === 1) {
      // Single document in array: use document_id
      payload.document_id = docId[0];
    }
  } else {
    // Single document ID: use document_id
    payload.document_id = docId;
  }

  const { data } = await api.post<AnalysisResponse>("/analyze/", payload);
  return data;
}

export async function uploadDocument(file: File): Promise<DocumentUploadResponse> {
  const formData = new FormData();
  formData.append("file", file);

  const { data } = await api.post<DocumentUploadResponse>("/documents/", formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });

  return data;
}

export async function fetchHistory(docId: number): Promise<ChatMessage[]> {
  const { data } = await api.get<ChatMessage[]>(`/documents/${docId}/history/`);
  return data;
}

export async function fetchDocuments(): Promise<Document[]> {
  const { data } = await api.get<Document[]>("/documents/");
  return data;
}

export async function deleteDocument(id: number): Promise<void> {
  await api.delete(`/documents/${id}/`);
}

/** Get full URL for a file path from the backend */
export function getFullFileUrl(fileUrl: string): string {
  if (fileUrl.startsWith("http")) {
    return fileUrl;
  }
  return `${API_BASE_URL}${fileUrl}`;
}

/** Generate quiz from selected documents */
export async function generateQuiz(docIds: number | number[]): Promise<QuizResponse> {
  // Build payload with correct snake_case keys matching Django backend
  const isArray = Array.isArray(docIds);
  
  const payload: {
    document_id?: number;
    document_ids?: number[];
  } = {};

  // Determine which key to use based on input
  if (isArray) {
    if (docIds.length > 1) {
      // Multiple documents: use document_ids
      payload.document_ids = docIds;
    } else if (docIds.length === 1) {
      // Single document in array: use document_id
      payload.document_id = docIds[0];
    }
  } else {
    // Single document ID: use document_id
    payload.document_id = docIds;
  }

  const { data } = await api.post<QuizResponse>("/quiz/generate/", payload);
  return data;
}

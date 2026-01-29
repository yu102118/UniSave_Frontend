import axios from "axios";
import type { AnalysisResponse, DocumentUploadResponse } from "../types";

const API_BASE_URL = "http://127.0.0.1:8000";

const api = axios.create({
  baseURL: `${API_BASE_URL}/api`,
});

export type AnalysisMode = "strict" | "tutor";

export async function analyzeDocument(
  docId: number,
  question: string,
  mode: AnalysisMode = "strict"
): Promise<AnalysisResponse> {
  const { data } = await api.post<AnalysisResponse>("/analyze/", {
    doc_id: docId,
    question,
    mode,
  });
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

/** Get full URL for a file path from the backend */
export function getFullFileUrl(fileUrl: string): string {
  if (fileUrl.startsWith("http")) {
    return fileUrl;
  }
  return `${API_BASE_URL}${fileUrl}`;
}

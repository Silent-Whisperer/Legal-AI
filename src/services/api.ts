import { LegalDocument, DocumentAnalysis, ComparisonResult, ChatMessage, PdfSummaryResult } from '../types.ts';

const BASE_URL = '/api';

export async function fetchDocuments(): Promise<Array<Partial<LegalDocument> & { totalClauses: number; criticalFlagCount: number }>> {
  const res = await fetch(`${BASE_URL}/documents`);
  if (!res.ok) throw new Error('Failed to fetch documents');
  return res.json();
}

export async function fetchDocument(id: string): Promise<LegalDocument> {
  const res = await fetch(`${BASE_URL}/documents/${id}`);
  if (!res.ok) throw new Error('Failed to fetch document');
  return res.json();
}

export async function uploadDocument(
  file?: File,
  text?: string,
  title?: string,
  apiKey?: string,
  targetLang?: string,
  openRouterKey?: string,
  signal?: AbortSignal
): Promise<LegalDocument> {
  if (file) {
    const formData = new FormData();
    formData.append('file', file);
    if (title) formData.append('title', title);
    if (apiKey) formData.append('apiKey', apiKey);
    if (targetLang) formData.append('targetLang', targetLang);
    if (openRouterKey) formData.append('openRouterKey', openRouterKey);

    const res = await fetch(`${BASE_URL}/documents/upload`, {
      method: 'POST',
      body: formData,
      signal
    });
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.error || `Upload failed with status ${res.status}`);
    }
    return res.json();
  } else if (text) {
    const res = await fetch(`${BASE_URL}/documents/upload`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, title, apiKey, targetLang, openRouterKey }),
      signal
    });
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.error || `Upload failed with status ${res.status}`);
    }
    return res.json();
  }
  throw new Error('No file or text provided');
}

export async function analyzeDocument(
  id: string, 
  apiKey?: string, 
  targetLang?: string,
  openRouterKey?: string
): Promise<DocumentAnalysis> {
  const res = await fetch(`${BASE_URL}/documents/${id}/analyze`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ apiKey, targetLang, openRouterKey }),
  });
  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.error || 'Failed to analyze document');
  }
  return res.json();
}

export async function generatePdfSummary(
  id: string,
  apiKey?: string,
  openRouterKey?: string,
  model: string = 'openai/gpt-4o-mini'
): Promise<PdfSummaryResult> {
  const res = await fetch(`${BASE_URL}/documents/${id}/summary`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ apiKey, openRouterKey, model }),
  });
  if (!res.ok) throw new Error('Failed to generate PDF summary');
  return res.json();
}

export async function sendChatMessage(
  id: string,
  message: string,
  apiKey?: string,
  targetLang?: string,
  openRouterKey?: string
): Promise<{ message: ChatMessage; history: ChatMessage[] }> {
  const res = await fetch(`${BASE_URL}/documents/${id}/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message, apiKey, targetLang, openRouterKey }),
  });
  if (!res.ok) throw new Error('Failed to send message');
  return res.json();
}

export async function compareDocuments(
  docAId?: string,
  docBId?: string,
  textA?: string,
  textB?: string,
  apiKey?: string,
  targetLang?: string,
  openRouterKey?: string
): Promise<ComparisonResult> {
  const res = await fetch(`${BASE_URL}/documents/compare`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ docAId, docBId, textA, textB, apiKey, targetLang, openRouterKey }),
  });
  if (!res.ok) throw new Error('Failed to compare documents');
  return res.json();
}

export async function deleteDocument(id: string): Promise<void> {
  const res = await fetch(`${BASE_URL}/documents/${id}`, {
    method: 'DELETE',
  });
  if (!res.ok) throw new Error('Failed to delete document');
}

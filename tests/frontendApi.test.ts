import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  getSessionId,
  fetchDocuments,
  fetchDocument,
  uploadDocument,
  analyzeDocument,
  generatePdfSummary,
  sendChatMessage,
  compareDocuments,
  deleteDocument
} from '../src/services/api.ts';

describe('Frontend API Client Unit & Integration Tests', () => {
  const originalFetch = global.fetch;
  const originalSessionStorage = global.sessionStorage;

  beforeEach(() => {
    // Mock sessionStorage
    const storage: Record<string, string> = {};
    (global as any).sessionStorage = {
      getItem: vi.fn((key: string) => storage[key] || null),
      setItem: vi.fn((key: string, val: string) => { storage[key] = val; }),
      removeItem: vi.fn((key: string) => { delete storage[key]; }),
      clear: vi.fn(() => { Object.keys(storage).forEach(k => delete storage[k]); })
    };
  });

  afterEach(() => {
    global.fetch = originalFetch;
    global.sessionStorage = originalSessionStorage;
    vi.restoreAllMocks();
  });

  it('getSessionId creates and persists a session id in sessionStorage', () => {
    const id1 = getSessionId();
    expect(id1).toMatch(/^sess_/);
    const id2 = getSessionId();
    expect(id2).toBe(id1);
  });

  it('fetchDocuments calls /api/documents and returns JSON array', async () => {
    const mockDocs = [{ id: 'doc-1', title: 'Test Lease', totalClauses: 5, criticalFlagCount: 0 }];
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockDocs
    } as Response);

    const docs = await fetchDocuments();
    expect(docs).toEqual(mockDocs);
    expect(global.fetch).toHaveBeenCalledWith('/api/documents', expect.any(Object));
  });

  it('fetchDocument calls /api/documents/:id and returns document', async () => {
    const mockDoc = { id: 'doc-123', title: 'NDA Agreement' };
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockDoc
    } as Response);

    const doc = await fetchDocument('doc-123');
    expect(doc).toEqual(mockDoc);
    expect(global.fetch).toHaveBeenCalledWith('/api/documents/doc-123', expect.any(Object));
  });

  it('uploadDocument posts text payload to /api/documents/upload', async () => {
    const mockUploaded = { id: 'doc-new', title: 'Pasted Agreement', isLegalDocument: true };
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockUploaded
    } as Response);

    const result = await uploadDocument(undefined, 'Contract text here...', 'Pasted Agreement');
    expect(result).toEqual(mockUploaded);
    expect(global.fetch).toHaveBeenCalledWith('/api/documents/upload', expect.objectContaining({
      method: 'POST'
    }));
  });

  it('analyzeDocument posts to /api/documents/:id/analyze', async () => {
    const mockAnalysis = { documentId: 'doc-1', overallRiskLevel: 'LOW' };
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockAnalysis
    } as Response);

    const res = await analyzeDocument('doc-1');
    expect(res).toEqual(mockAnalysis);
  });

  it('generatePdfSummary posts to /api/documents/:id/summary', async () => {
    const mockSummary = { bottomLine: 'Summary text', modelUsed: 'openai/gpt-4o-mini' };
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockSummary
    } as Response);

    const res = await generatePdfSummary('doc-1');
    expect(res).toEqual(mockSummary);
  });

  it('sendChatMessage posts to /api/documents/:id/chat', async () => {
    const mockChatResp = {
      message: { id: 'msg-1', role: 'assistant', content: 'Here is the answer.' },
      history: []
    };
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockChatResp
    } as Response);

    const res = await sendChatMessage('doc-1', 'What is the rent?');
    expect(res).toEqual(mockChatResp);
  });

  it('compareDocuments posts to /api/documents/compare', async () => {
    const mockDiff = { deltas: [], overallAssessment: 'Identical' };
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockDiff
    } as Response);

    const res = await compareDocuments('doc-1', 'doc-2');
    expect(res).toEqual(mockDiff);
  });

  it('deleteDocument sends DELETE request to /api/documents/:id', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true
    } as Response);

    await expect(deleteDocument('doc-1')).resolves.not.toThrow();
  });
});

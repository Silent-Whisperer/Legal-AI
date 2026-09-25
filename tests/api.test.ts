import { describe, it, expect, vi } from 'vitest';
import request from 'supertest';

// Mock openrouter to guarantee fast, hermetic offline tests
vi.mock('../server/src/openrouter.ts', () => ({
  OPENROUTER_FREE_MODELS: ['openai/gpt-4o-mini'],
  analyzeWithOpenRouter: vi.fn().mockResolvedValue(null),
  chatWithOpenRouter: vi.fn().mockResolvedValue('Based on [Section 1], the monthly rent is $2,200.'),
  generatePdfSummaryWithAI: vi.fn().mockResolvedValue({
    bottomLine: 'Standard residential lease agreement.',
    summary: 'Detailed summary of the lease.',
    keyPoints: ['Rent: $2,200/mo'],
    keyObligations: [{ party: 'Tenant', obligation: 'Pay rent on 1st' }],
    warningTraps: ['Late fees apply'],
    practicalNextSteps: ['Sign and pay deposit'],
    modelUsed: 'mock-model'
  }),
  transcribeImageWithOpenRouter: vi.fn().mockResolvedValue('Mock OCR extracted text')
}));

import app from '../server/src/index.ts';

describe('Backend REST API Security & Ingestion Endpoints', () => {
  it('GET /api/health returns healthy service status', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
    expect(res.body.service).toContain('ClarityLegal');
    expect(res.body).toHaveProperty('hasOpenRouterKey');
  });

  it('GET /api/documents returns array of uploaded documents', async () => {
    const res = await request(app).get('/api/documents');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it('POST /api/documents/upload validates and processes legal text into structured document', async () => {
    const leaseText = `
      RESIDENTIAL TENANCY AGREEMENT
      Landlord: John Doe. Tenant: Jane Smith.
      1. RENT: The tenant shall pay $2,200 per month on the 1st day.
      2. SECURITY DEPOSIT: A deposit of $4,400 shall be held in escrow.
      3. TERMINATION: Either party may terminate with 30 days written notice.
    `;
    const res = await request(app)
      .post('/api/documents/upload')
      .send({
        text: leaseText,
        title: 'API Test Residential Lease'
      });

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('id');
    expect(res.body.title).toBe('API Test Residential Lease');
    expect(res.body.isLegalDocument).toBe(true);
    expect(res.body.stoppedAfterClassification).toBe(false);
    expect(res.body.clauses.length).toBeGreaterThan(0);
    expect(res.body.analysis).toBeDefined();
    expect(res.body.analysis.documentType).toBe('RESIDENTIAL_LEASE');
  });

  it('POST /api/documents/upload halts pipeline on non-legal document (certificate)', async () => {
    const certText = `
      CERTIFICATE OF PARTICIPATION
      This certificate is awarded to Rahul Sharma for participating in Google Cloud Build 2026.
      Certificate ID: HACK-2026-XYZ
    `;
    const res = await request(app)
      .post('/api/documents/upload')
      .send({
        text: certText,
        title: 'Achievement Certificate'
      });

    expect(res.status).toBe(201);
    expect(res.body.isLegalDocument).toBe(false);
    expect(res.body.stoppedAfterClassification).toBe(true);
    expect(res.body.nonLegalCategory).toBe('CERTIFICATE_OR_AWARD');
    expect(res.body.clauses.length).toBe(0); // Zero clauses extracted
  });

  it('POST /api/documents/upload returns 400 when text is too short or empty', async () => {
    const res = await request(app)
      .post('/api/documents/upload')
      .send({
        text: 'Short'
      });

    expect(res.status).toBe(400);
    expect(res.body.error).toContain('too short');
  });

  it('POST /api/documents/upload rejects dangerous file extensions via Multer filter', async () => {
    const res = await request(app)
      .post('/api/documents/upload')
      .attach('file', Buffer.from('malicious payload'), 'exploit.exe');

    expect(res.status).toBe(400);
    expect(res.body.error).toContain('File type rejected for security');
  });

  it('POST /api/documents/compare validates input and diffs texts', async () => {
    const res = await request(app)
      .post('/api/documents/compare')
      .send({
        textA: 'Section 1. Rent: $1,000 per month.',
        textB: 'Section 1. Rent: $1,500 per month.'
      });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('deltas');
    expect(res.body.deltas.length).toBeGreaterThan(0);
  });

  it('POST /api/documents/:id/chat returns 404 for unknown document', async () => {
    const res = await request(app)
      .post('/api/documents/non-existent-doc-id/chat')
      .send({ message: 'What is the rent?' });

    expect(res.status).toBe(404);
    expect(res.body.error).toContain('Document not found');
  });

  it('GET /api/documents/:id/file streams file with full buffer and HTTP 206 Range support', async () => {
    // 1. Upload a text file first to populate fileStore
    const uploadRes = await request(app)
      .post('/api/documents/upload')
      .attach('file', Buffer.from('Contract terms: 1. Term of lease is 12 months. 2. Rent $1000.'), 'test_agreement.txt');

    expect(uploadRes.status).toBe(201);
    const docId = uploadRes.body.id;

    // 2. Full file request
    const fullRes = await request(app).get(`/api/documents/${docId}/file`);
    expect(fullRes.status).toBe(200);
    expect(fullRes.headers['accept-ranges']).toBe('bytes');
    expect(fullRes.text).toContain('Contract terms');

    // 3. HTTP 206 Partial Range request
    const rangeRes = await request(app)
      .get(`/api/documents/${docId}/file`)
      .set('Range', 'bytes=0-13');

    expect(rangeRes.status).toBe(206);
    expect(rangeRes.headers['content-range']).toMatch(/bytes 0-13\/\d+/);
    expect(rangeRes.text).toBe('Contract terms');
  });
});

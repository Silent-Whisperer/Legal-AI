import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { app } from '../server/src/index.ts';

describe('Security, CORS, and Payload Hardening', () => {
  it('enforces Helmet security headers on responses', async () => {
    const res = await request(app).get('/api/health');

    expect(res.status).toBe(200);
    // X-Content-Type-Options: nosniff
    expect(res.headers['x-content-type-options']).toBe('nosniff');
    // Content-Security-Policy header present
    expect(res.headers['content-security-policy']).toBeDefined();
    expect(res.headers['content-security-policy']).toContain("default-src 'self'");
    // X-Frame-Options or frame-ancestors to prevent clickjacking
    expect(
      res.headers['x-frame-options'] === 'SAMEORIGIN' || 
      res.headers['content-security-policy'].includes("frame-ancestors 'none'")
    ).toBe(true);
  });

  it('allows CORS requests from whitelisted localhost origins', async () => {
    const res = await request(app)
      .get('/api/health')
      .set('Origin', 'http://localhost:3000');

    expect(res.status).toBe(200);
    expect(res.headers['access-control-allow-origin']).toBe('http://localhost:3000');
  });

  it('blocks CORS requests from unauthorized external origins', async () => {
    const res = await request(app)
      .get('/api/health')
      .set('Origin', 'http://unauthorized-malicious-site.com');

    // CORS policy middleware blocks unauthorized origins
    expect(res.status).toBe(403);
    expect(res.body.error || res.text).toContain('Blocked by CORS policy');
  });

  it('rejects forbidden file types (.html, .htm) in upload filter', async () => {
    const res = await request(app)
      .post('/api/documents/upload')
      .attach('file', Buffer.from('<html><script>alert(1)</script></html>'), 'malicious_contract.html');

    expect(res.status).toBe(400);
    expect(res.body.error).toContain('File type rejected for security');
  });

  it('rejects zero-byte / empty file uploads with a clear validation error', async () => {
    const res = await request(app)
      .post('/api/documents/upload')
      .attach('file', Buffer.from(''), 'empty.txt');

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/File buffer is empty|corrupted|Could not extract legible text|too short/i);
  });

  it('rejects spoofed executable binary disguised as a PDF (magic number inspection)', async () => {
    // MZ header simulates a Windows PE / EXE binary renamed to .pdf
    const fakePdfBuffer = Buffer.from('MZ\x90\x00\x03\x00\x00\x00\x04\x00\x00\x00\xff\xff\x00\x00');
    const res = await request(app)
      .post('/api/documents/upload')
      .attach('file', fakePdfBuffer, 'trojan_contract.pdf');

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/File verification failed|Executable binary payloads are strictly prohibited|spoofed PDF/i);
  });

  it('rejects malformed client API keys with invalid signature format', async () => {
    const res = await request(app)
      .post('/api/documents/upload')
      .field('rawText', 'STANDARD LEASE AGREEMENT. Rent is $1,000 per month.')
      .field('apiKey', 'invalid_random_string_not_gemini_or_openrouter');

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/Invalid.*API key format/i);
  });
});

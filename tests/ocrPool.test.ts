import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('tesseract.js', () => ({
  default: {
    createWorker: vi.fn().mockResolvedValue({
      recognize: vi.fn().mockResolvedValue({ data: { text: 'Recognized legal text from scanned certificate' } }),
      terminate: vi.fn().mockResolvedValue(undefined)
    }),
    recognize: vi.fn().mockResolvedValue({ data: { text: 'Fallback recognized legal text' } })
  }
}));

import { performOcr, terminateOcrWorker } from '../server/src/services/ocrPool.ts';

describe('ocrPool Service Unit Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('performs OCR on image buffer successfully', async () => {
    const fakeImageBuffer = Buffer.from('fake-image-bytes');
    const result = await performOcr(fakeImageBuffer);
    expect(result).toBe('Recognized legal text from scanned certificate');
  });

  it('terminates OCR worker gracefully without throwing', async () => {
    await expect(terminateOcrWorker()).resolves.not.toThrow();
  });
});

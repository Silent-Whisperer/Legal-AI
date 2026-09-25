import { describe, it, expect } from 'vitest';
import { validateFileMagicNumber, validateApiKeyFormat } from '../server/src/services/fileValidator.ts';

describe('fileValidator Service Unit Tests', () => {
  describe('validateFileMagicNumber', () => {
    it('rejects empty or corrupted buffer', () => {
      const res = validateFileMagicNumber(Buffer.alloc(0), 'test.pdf');
      expect(res.isValid).toBe(false);
      expect(res.error).toContain('empty or corrupted');
    });

    it('detects Windows PE / MZ executable signature and rejects it', () => {
      const peBuffer = Buffer.from([0x4d, 0x5a, 0x90, 0x00]);
      const res = validateFileMagicNumber(peBuffer, 'contract.pdf');
      expect(res.isValid).toBe(false);
      expect(res.error).toContain('Executable binary signature (PE/MZ)');
    });

    it('detects Linux ELF binary signature and rejects it', () => {
      const elfBuffer = Buffer.from([0x7f, 0x45, 0x4c, 0x46]);
      const res = validateFileMagicNumber(elfBuffer, 'agreement.docx');
      expect(res.isValid).toBe(false);
      expect(res.error).toContain('Executable binary signature (ELF)');
    });

    it('detects Mach-O binary executable signature and rejects it', () => {
      const machoBuffer = Buffer.from([0xfe, 0xed, 0xfa, 0xce]);
      const res = validateFileMagicNumber(machoBuffer, 'lease.pdf');
      expect(res.isValid).toBe(false);
      expect(res.error).toContain('Mach-O binary executable signature');
    });

    it('validates authentic PDF magic number (%PDF)', () => {
      const pdfBuffer = Buffer.from('%PDF-1.7 and more content');
      const res = validateFileMagicNumber(pdfBuffer, 'residential_lease.pdf');
      expect(res.isValid).toBe(true);
      expect(res.detectedType).toBe('application/pdf');
    });

    it('rejects disguised non-PDF with .pdf extension', () => {
      const fakePdf = Buffer.from('NOT A PDF FILE');
      const res = validateFileMagicNumber(fakePdf, 'fake.pdf');
      expect(res.isValid).toBe(false);
      expect(res.error).toContain('%PDF magic number');
    });

    it('validates DOCX file with ZIP/PK signature', () => {
      const docxBuffer = Buffer.from([0x50, 0x4b, 0x03, 0x04, 0x14, 0x00]);
      const res = validateFileMagicNumber(docxBuffer, 'employment.docx');
      expect(res.isValid).toBe(true);
      expect(res.detectedType).toContain('wordprocessingml');
    });

    it('validates PNG image with PNG magic signature', () => {
      const pngBuffer = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a]);
      const res = validateFileMagicNumber(pngBuffer, 'scan.png');
      expect(res.isValid).toBe(true);
      expect(res.detectedType).toBe('image/png');
    });

    it('validates JPEG image with JPEG magic signature', () => {
      const jpegBuffer = Buffer.from([0xff, 0xd8, 0xff, 0xe0]);
      const res = validateFileMagicNumber(jpegBuffer, 'receipt.jpg');
      expect(res.isValid).toBe(true);
      expect(res.detectedType).toBe('image/jpeg');
    });

    it('validates text file without null bytes', () => {
      const txtBuffer = Buffer.from('This is a plain legal agreement text without binary zeroes.');
      const res = validateFileMagicNumber(txtBuffer, 'lease.txt');
      expect(res.isValid).toBe(true);
      expect(res.detectedType).toBe('text/plain');
    });

    it('rejects text file containing binary null bytes', () => {
      const corruptedTxt = Buffer.from([0x48, 0x65, 0x6c, 0x6c, 0x6f, 0x00, 0x77, 0x6f, 0x72, 0x6c, 0x64]);
      const res = validateFileMagicNumber(corruptedTxt, 'notes.txt');
      expect(res.isValid).toBe(false);
      expect(res.error).toContain('Binary null characters');
    });
  });

  describe('validateApiKeyFormat', () => {
    it('accepts undefined, null, or empty string as optional key', () => {
      expect(validateApiKeyFormat(undefined)).toBe(true);
      expect(validateApiKeyFormat('')).toBe(true);
      expect(validateApiKeyFormat('   ')).toBe(true);
    });

    it('validates correct OpenRouter API key format', () => {
      expect(validateApiKeyFormat('sk-or-v1-abcdef1234567890abcdef1234567890', 'openrouter')).toBe(true);
    });

    it('rejects invalid OpenRouter API key without proper prefix', () => {
      expect(validateApiKeyFormat('invalid-key-format', 'openrouter')).toBe(false);
    });

    it('validates correct Gemini API key format', () => {
      expect(validateApiKeyFormat('AIzaSy123456789012345678901234567890123', 'gemini')).toBe(true);
    });

    it('rejects invalid Gemini API key format', () => {
      expect(validateApiKeyFormat('AIzaShort', 'gemini')).toBe(false);
    });
  });
});

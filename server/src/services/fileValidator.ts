import path from 'path';

export interface FileValidationResult {
  isValid: boolean;
  detectedType?: string;
  error?: string;
}

/**
 * Validates file buffer signatures (Magic Numbers) to guarantee that uploaded
 * files match their declared extensions and prevents disguised binaries (e.g. EXE renamed to PDF).
 */
export function validateFileMagicNumber(buffer: Buffer, originalName: string): FileValidationResult {
  if (!buffer || buffer.length === 0) {
    return { isValid: false, error: 'File buffer is empty or corrupted.' };
  }

  const ext = path.extname(originalName).toLowerCase();

  // 1. Explicitly check for dangerous binary headers regardless of extension
  // Windows Portable Executable (MZ)
  if (buffer.length >= 2 && buffer[0] === 0x4d && buffer[1] === 0x5a) {
    return { isValid: false, error: 'Executable binary signature (PE/MZ) detected in upload.' };
  }
  // Linux ELF binary (\x7fELF)
  if (buffer.length >= 4 && buffer[0] === 0x7f && buffer[1] === 0x45 && buffer[2] === 0x4c && buffer[3] === 0x46) {
    return { isValid: false, error: 'Executable binary signature (ELF) detected in upload.' };
  }
  // Mach-O binary
  if (buffer.length >= 4 && (
    (buffer[0] === 0xfe && buffer[1] === 0xed && buffer[2] === 0xfa && buffer[3] === 0xce) ||
    (buffer[0] === 0xcf && buffer[1] === 0xfa && buffer[2] === 0xed && buffer[3] === 0xfe)
  )) {
    return { isValid: false, error: 'Mach-O binary executable signature detected in upload.' };
  }

  // 2. Format-specific magic number validation
  if (ext === '.pdf') {
    // Must start with %PDF- (0x25 0x50 0x44 0x46)
    if (buffer.length < 4 || buffer[0] !== 0x25 || buffer[1] !== 0x50 || buffer[2] !== 0x44 || buffer[3] !== 0x46) {
      return { isValid: false, error: 'Invalid PDF file: header does not match %PDF magic number signature.' };
    }
    return { isValid: true, detectedType: 'application/pdf' };
  }

  if (ext === '.docx') {
    // DOCX is a ZIP container: starts with PK\x03\x04 (0x50 0x4B 0x03 0x04)
    if (buffer.length < 4 || buffer[0] !== 0x50 || buffer[1] !== 0x4b || buffer[2] !== 0x03 || buffer[3] !== 0x04) {
      return { isValid: false, error: 'Invalid DOCX file: header does not match ZIP/DOCX magic signature.' };
    }
    return { isValid: true, detectedType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' };
  }

  if (ext === '.doc') {
    // Old Word Binary compound file (0xD0 0xCF 0x11 0xE0) or ZIP
    const isCompound = buffer.length >= 4 && buffer[0] === 0xd0 && buffer[1] === 0xcf && buffer[2] === 0x11 && buffer[3] === 0xe0;
    const isZip = buffer.length >= 4 && buffer[0] === 0x50 && buffer[1] === 0x4b;
    if (!isCompound && !isZip) {
      return { isValid: false, error: 'Invalid DOC file: header does not match OLE or DOC signature.' };
    }
    return { isValid: true, detectedType: 'application/msword' };
  }

  if (ext === '.png') {
    // PNG starts with 0x89 0x50 0x4E 0x47 (\x89PNG)
    if (buffer.length < 4 || buffer[0] !== 0x89 || buffer[1] !== 0x50 || buffer[2] !== 0x4e || buffer[3] !== 0x47) {
      return { isValid: false, error: 'Invalid PNG file: header does not match PNG signature.' };
    }
    return { isValid: true, detectedType: 'image/png' };
  }

  if (ext === '.jpg' || ext === '.jpeg') {
    // JPEG starts with 0xFF 0xD8 0xFF
    if (buffer.length < 3 || buffer[0] !== 0xff || buffer[1] !== 0xd8 || buffer[2] !== 0xff) {
      return { isValid: false, error: 'Invalid JPEG file: header does not match JPEG signature.' };
    }
    return { isValid: true, detectedType: 'image/jpeg' };
  }

  if (ext === '.webp') {
    // WebP has RIFF header and WEBP marker
    if (buffer.length < 12 || buffer.subarray(0, 4).toString() !== 'RIFF' || buffer.subarray(8, 12).toString() !== 'WEBP') {
      return { isValid: false, error: 'Invalid WebP file: header does not match RIFF/WEBP signature.' };
    }
    return { isValid: true, detectedType: 'image/webp' };
  }

  if (ext === '.txt' || ext === '.md' || ext === '.rtf') {
    // Text files must not contain binary null bytes in the first 512 bytes
    const checkSlice = buffer.subarray(0, Math.min(buffer.length, 512));
    if (checkSlice.includes(0x00)) {
      return { isValid: false, error: 'Binary null characters detected in text file payload.' };
    }
    return { isValid: true, detectedType: 'text/plain' };
  }

  // Any other allowed extension
  return { isValid: true };
}

/**
 * Validates API keys against strict expected syntax patterns to eliminate
 * header injection, credential manipulation, or SSRF risks.
 */
export function validateApiKeyFormat(apiKey?: string, provider: 'openrouter' | 'gemini' = 'gemini'): boolean {
  if (!apiKey || typeof apiKey !== 'string') return true; // Optional key
  const trimmed = apiKey.trim();
  if (trimmed.length === 0) return true;

  if (provider === 'openrouter') {
    // OpenRouter keys start with sk-or- and are alphanumeric/dashes/underscores
    return /^sk-or-[A-Za-z0-9_-]{10,128}$/.test(trimmed);
  }

  if (provider === 'gemini') {
    // Gemini keys start with AIzaSy and are alphanumeric/dashes/underscores
    return /^AIzaSy[A-Za-z0-9_-]{33}$/.test(trimmed);
  }

  return true;
}

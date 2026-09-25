import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import multer from 'multer';
import dotenv from 'dotenv';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import path from 'path';
import fs from 'fs';
import pdfParse from 'pdf-parse';
import mammoth from 'mammoth';
import { extractClausesFromText, analyzeLegalDocument, classifyDocumentNature } from './analyzer.ts';
import { generatePdfSummaryWithAI, transcribeImageWithOpenRouter } from './openrouter.ts';
import { extractPdfTextAndForms } from './pdfExtractor.ts';
import { handleDocumentChat } from './chatService.ts';
import { compareLegalDocuments } from './comparator.ts';
import { LegalDocument } from './types.ts';
import { config } from './config.ts';
import { documentStore, fileStore, summaryCache, computeDocumentContentHash } from './services/cache.ts';
import { performOcr } from './services/ocrPool.ts';
import { validateFileMagicNumber, validateApiKeyFormat } from './services/fileValidator.ts';
import { logger } from './utils/logger.ts';
import {
  isSupabaseConfigured,
  saveDocumentToSupabase,
  getDocumentFromSupabase,
  listDocumentsFromSupabase,
  deleteDocumentFromSupabase,
  getDocumentFileFromSupabase,
  saveChatMessageToSupabase,
  getChatMessagesFromSupabase
} from './services/supabaseClient.ts';

dotenv.config();

const app = express();
const PORT = config.port;

// 1. Security Headers via Helmet with explicit CSP
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "blob:", "https://*.supabase.co"],
      connectSrc: [
        "'self'", 
        "http://localhost:5000", 
        "http://127.0.0.1:5000", 
        "http://localhost:3000", 
        "http://127.0.0.1:3000", 
        "https://generativelanguage.googleapis.com", 
        "https://openrouter.ai",
        "https://*.supabase.co"
      ],
      fontSrc: ["'self'", "data:"],
      objectSrc: ["'none'"],
      frameAncestors: ["'none'"]
    }
  },
  crossOriginEmbedderPolicy: false
}));

// 2. Strict origin-validated CORS policy
const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',').map(o => o.trim())
  : ['http://localhost:3000', 'http://127.0.0.1:3000', 'http://localhost:5000', 'http://127.0.0.1:5000'];

if (process.env.RENDER_EXTERNAL_URL) {
  allowedOrigins.push(process.env.RENDER_EXTERNAL_URL);
}

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps, curl, or supertest) or matching allowed origins
    if (
      !origin || 
      allowedOrigins.includes('*') ||
      allowedOrigins.includes(origin) || 
      origin.endsWith('.onrender.com') ||
      origin.endsWith('.railway.app') ||
      origin.endsWith('.vercel.app') ||
      origin.endsWith('.fly.dev')
    ) {
      callback(null, true);
    } else {
      callback(new Error('Blocked by CORS policy'));
    }
  },
  methods: ['GET', 'POST', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'x-goog-api-key', 'x-session-id']
}));

// 3. Request body parsing with safe bounds
app.use(express.json({ limit: '15mb' }));
app.use(express.urlencoded({ extended: true, limit: '15mb' }));

// 4. Rate Limiting: General API Limiter (120 req/min)
const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 120,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please slow down and try again shortly.' }
});
app.use('/api', apiLimiter);

// 5. Rate Limiting: Heavy AI / OCR / Ingestion Endpoints (30 req/min)
const heavyComputeLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Rate limit exceeded for heavy document processing. Please wait a minute before submitting further requests.' }
});

// Helper to sanitize filenames against directory traversal and control characters
function sanitizeFilename(rawName: string): string {
  const base = path.basename(rawName);
  const clean = base.replace(/[^a-zA-Z0-9._\-\s]/g, '_').trim();
  return clean.substring(0, 150) || 'document.txt';
}

// 6. Hardened Multer Configuration with MIME & Extension Whitelisting
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: config.maxUploadSizeBytes },
  fileFilter: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const isMimeAllowed = config.allowedMimeTypes.has(file.mimetype) || file.mimetype === 'application/octet-stream';
    const isExtAllowed = config.allowedExtensions.has(ext);

    if (isExtAllowed || isMimeAllowed) {
      cb(null, true);
    } else {
      cb(new Error(`File type rejected for security: "${ext || file.mimetype}". Allowed formats: PDF, Word (.docx), Images (PNG/JPG), RTF, and Text.`));
    }
  }
});

// Health check
app.get('/api/health', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    service: 'ClarityLegal AI Backend',
    documentsCount: documentStore.size,
    hasGeminiKey: Boolean(process.env.GEMINI_API_KEY),
    hasOpenRouterKey: Boolean(process.env.OPENROUTER_API_KEY),
    hasSupabase: isSupabaseConfigured()
  });
});

// List all documents (with session-based privacy isolation)
app.get('/api/documents', async (req: Request, res: Response) => {
  try {
    const sessionId = (req.headers['x-session-id'] as string) || (req.query.sessionId as string) || '';
    let docsList: LegalDocument[] = [];
    if (isSupabaseConfigured()) {
      docsList = await listDocumentsFromSupabase(sessionId);
      // Keep in-memory cache synchronized with cloud database
      for (const d of docsList) {
        if (!documentStore.has(d.id)) {
          documentStore.set(d.id, d);
        }
      }
    }
    if (docsList.length === 0) {
      docsList = Array.from(documentStore.values()).filter(d => {
        // Only return documents belonging to this active session
        return Boolean(sessionId && d.sessionId === sessionId);
      });
    }

    const docs = docsList.map(d => ({
      id: d.id,
      title: d.title,
      filename: d.filename,
      fileType: d.fileType,
      uploadDate: d.uploadDate,
      totalPages: d.totalPages,
      totalClauses: d.clauses.length,
      overallRiskLevel: d.analysis?.overallRiskLevel || 'MODERATE',
      executiveSummary: d.analysis?.executiveSummary || '',
      criticalFlagCount: d.analysis?.quickStats?.criticalFlagCount || 0,
      hasOriginalFile: d.hasOriginalFile,
      fileUrl: d.fileUrl,
      isLegalDocument: d.isLegalDocument ?? (d.analysis?.classificationNature !== 'NON_CONTRACTUAL'),
      stoppedAfterClassification: d.stoppedAfterClassification ?? (d.analysis?.classificationNature === 'NON_CONTRACTUAL'),
      nonLegalCategory: d.nonLegalCategory || d.analysis?.nonLegalCategory,
      classificationNature: d.analysis?.classificationNature || 'CONTRACTUAL',
      documentType: d.analysis?.documentType || 'OTHER',
      subjectMatterSummary: d.analysis?.subjectMatterSummary || ''
    }));
    res.json(docs);
  } catch (err) {
    logger.error('API', 'Error fetching documents:', err);
    res.status(500).json({ error: 'Failed to retrieve documents.' });
  }
});

// Stream original uploaded document file (PDF / DOCX / TXT) with HTTP 206 Range support
app.get('/api/documents/:id/file', async (req: Request, res: Response) => {
  const docId = req.params.id as string;
  let fileData = fileStore.get(docId);

  // If not in local LRU memory buffer, fetch from Supabase Storage bucket
  if (!fileData && isSupabaseConfigured()) {
    const sbFile = await getDocumentFileFromSupabase(docId);
    if (sbFile) {
      fileData = sbFile;
      fileStore.set(docId, sbFile);
    }
  }

  if (!fileData) {
    res.status(404).json({ error: 'Original document binary not found.' });
    return;
  }

  const totalSize = fileData.buffer.length;
  const range = req.headers.range;

  res.setHeader('Accept-Ranges', 'bytes');
  res.setHeader('Content-Type', fileData.mimetype);
  res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(fileData.filename)}"`);

  if (range) {
    const parts = range.replace(/bytes=/, '').split('-');
    const start = parseInt(parts[0], 10);
    const end = parts[1] ? parseInt(parts[1], 10) : totalSize - 1;

    if (isNaN(start) || start >= totalSize || end >= totalSize || start > end) {
      res.status(416).setHeader('Content-Range', `bytes */${totalSize}`).end();
      return;
    }

    const chunk = fileData.buffer.subarray(start, end + 1);
    res.status(206);
    res.setHeader('Content-Range', `bytes ${start}-${end}/${totalSize}`);
    res.setHeader('Content-Length', chunk.length);
    res.end(chunk);
  } else {
    res.setHeader('Content-Length', totalSize);
    res.status(200).send(fileData.buffer);
  }
});

// Get single document
app.get('/api/documents/:id', async (req: Request, res: Response) => {
  const docId = req.params.id as string;
  let doc = documentStore.get(docId);

  // Fallback to Supabase database if not in memory
  if (!doc && isSupabaseConfigured()) {
    const sbDoc = await getDocumentFromSupabase(docId);
    if (sbDoc) {
      doc = sbDoc;
      documentStore.set(docId, doc);
    }
  }

  if (!doc) {
    res.status(404).json({ error: 'Document not found' });
    return;
  }
  res.json(doc);
});

// Delete document
app.delete('/api/documents/:id', async (req: Request, res: Response) => {
  const docId = req.params.id as string;
  fileStore.delete(docId);
  const memoryDeleted = documentStore.delete(docId);
  let sbDeleted = false;
  if (isSupabaseConfigured()) {
    sbDeleted = await deleteDocumentFromSupabase(docId);
  }

  if (!memoryDeleted && !sbDeleted) {
    res.status(404).json({ error: 'Document not found' });
    return;
  }
  res.json({ success: true, message: 'Document removed successfully' });
});

// Helper to extract embedded JPEG images from a PDF buffer (used for scanned / graphic PDFs like certificates)
function extractJpegsFromPdfBuffer(buffer: Buffer): Buffer[] {
  const jpegs: Buffer[] = [];
  let startIndex = -1;
  for (let i = 0; i < buffer.length - 2; i++) {
    // SOI: 0xFF 0xD8 0xFF
    if (buffer[i] === 0xFF && buffer[i+1] === 0xD8 && buffer[i+2] === 0xFF) {
      startIndex = i;
      i += 2;
      continue;
    }
    // EOI: 0xFF 0xD9
    if (startIndex !== -1 && buffer[i] === 0xFF && buffer[i+1] === 0xD9) {
      const jpegBuf = buffer.subarray(startIndex, i + 2);
      if (jpegBuf.length > 2048) { // Skip tiny icons / thumbnails
        jpegs.push(jpegBuf);
      }
      startIndex = -1;
      i += 1;
    }
  }
  return jpegs.sort((a, b) => b.length - a.length);
}

// Upload new legal document (PDF, Word DOCX/DOC, Images, Text, RTF, HTML, or pasted text)
app.post('/api/documents/upload', heavyComputeLimiter, upload.single('file'), async (req: Request, res: Response) => {
  try {
    let rawText = '';
    let filename = 'document.txt';
    let fileType = 'text/plain';
    let totalPages = 1;
    const sessionId = (req.headers['x-session-id'] as string) || req.body.sessionId || '';

    // Validate client-provided API key formats if present
    if (req.body.openRouterKey && !validateApiKeyFormat(req.body.openRouterKey, 'openrouter')) {
      res.status(400).json({ error: 'Invalid OpenRouter API key format.' });
      return;
    }
    if (req.body.apiKey && !validateApiKeyFormat(req.body.apiKey, 'gemini')) {
      res.status(400).json({ error: 'Invalid Google Gemini API key format.' });
      return;
    }

    const activeOrKey = req.body.openRouterKey || process.env.OPENROUTER_API_KEY;
    const activeGeminiKey = (req.body.apiKey && !req.body.apiKey.startsWith('sk-or-')) ? req.body.apiKey : process.env.GEMINI_API_KEY;

    if (req.file) {
      filename = sanitizeFilename(req.file.originalname);
      // Byte-level Magic Number inspection to reject disguised binaries/payloads
      const magicCheck = validateFileMagicNumber(req.file.buffer, filename);
      if (!magicCheck.isValid) {
        res.status(400).json({ error: `File verification failed: ${magicCheck.error}` });
        return;
      }
      const lowerName = filename.toLowerCase();
      fileType = magicCheck.detectedType || req.file.mimetype || 'application/octet-stream';

      // 1. PDF Documents (Digital + Scanned / Image Fallback)
      if (fileType.includes('pdf') || lowerName.endsWith('.pdf')) {
        fileType = 'application/pdf';
        try {
          // Extract digital text and interactive AcroForm / widget annotations
          const pdfResult = await extractPdfTextAndForms(req.file.buffer);
          rawText = pdfResult.rawText || '';
          totalPages = pdfResult.totalPages || 1;
        } catch (pdfExtractorErr: any) {
          logger.warn('Upload', 'Advanced PDF+Form extractor error, falling back to pdfParse:', pdfExtractorErr);
          try {
            const parsedPdf = await pdfParse(req.file.buffer);
            rawText = parsedPdf.text || '';
            totalPages = parsedPdf.numpages || 1;
          } catch (pdfErr: any) {
            logger.error('Upload', 'PDF parsing error:', pdfErr);
          }
        }

        // Multimodal / OCR Fallback for scanned / image-based / certificate PDFs
        if (!rawText || rawText.trim().length < 50) {
          logger.info('Upload', 'PDF contains little/no digital text (< 50 chars). Running image extraction & OCR fallback...');
          
          // (A) Check for embedded scanned JPEG images inside the PDF
          const embeddedJpegs = extractJpegsFromPdfBuffer(req.file.buffer);
          if (embeddedJpegs.length > 0) {
            const largestJpeg = embeddedJpegs[0];
            logger.info('Upload', `Extracted ${embeddedJpegs.length} embedded image(s) from PDF (largest: ${largestJpeg.length} bytes). Running OCR...`);

            // Try OpenRouter Vision first if key available
            if (activeOrKey) {
              try {
                const transcribed = await transcribeImageWithOpenRouter(largestJpeg.toString('base64'), 'image/jpeg', activeOrKey);
                if (transcribed && transcribed.trim().length >= 10) {
                  rawText = transcribed.trim();
                  logger.info('Upload', 'OpenRouter vision OCR succeeded on embedded PDF image.');
                }
              } catch (orVisionErr) {
                logger.warn('Upload', 'OpenRouter vision on embedded PDF image failed:', orVisionErr);
              }
            }

            // Fallback to local Tesseract OCR pool on embedded JPEG
            if (!rawText || rawText.trim().length < 15) {
              try {
                logger.info('Upload', 'Running local Tesseract OCR on embedded PDF image via worker pool...');
                const ocrText = await performOcr(largestJpeg);
                if (ocrText && ocrText.length >= 10) {
                  rawText = ocrText;
                  logger.info('Upload', 'Local Tesseract OCR succeeded on embedded PDF image.');
                }
              } catch (tessErr) {
                logger.error('Upload', 'Tesseract OCR on embedded PDF image error:', tessErr);
              }
            }
          }

          // (B) Multimodal Gemini Vision fallback on whole PDF
          if ((!rawText || rawText.trim().length < 15) && activeGeminiKey) {
            try {
              const base64Pdf = req.file.buffer.toString('base64');
              const visionResp = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent', {
                method: 'POST',
                headers: { 
                  'Content-Type': 'application/json',
                  'x-goog-api-key': activeGeminiKey
                },
                signal: AbortSignal.timeout(20000),
                body: JSON.stringify({
                  contents: [{
                    parts: [
                      { text: "Extract and transcribe all text from this scanned, graphic, or certificate PDF verbatim. Retain all names, titles, dates, IDs, and section structure." },
                      { inlineData: { mimeType: "application/pdf", data: base64Pdf } }
                    ]
                  }]
                })
              });
              if (visionResp.ok) {
                const vData = (await visionResp.json()) as any;
                const transcribed = vData.candidates?.[0]?.content?.parts?.[0]?.text;
                if (transcribed && transcribed.trim().length >= 10) {
                  rawText = transcribed.trim();
                  logger.info('Upload', 'Gemini PDF vision succeeded.');
                }
              }
            } catch (visionErr) {
              logger.warn('Upload', 'Multimodal Gemini PDF vision failed:', visionErr);
            }
          }
        }

      // 2. Word Documents (.docx and older .doc)
      } else if (lowerName.endsWith('.docx') || fileType.includes('wordprocessingml')) {
        try {
          const result = await mammoth.extractRawText({ buffer: req.file.buffer });
          rawText = result.value || '';
          totalPages = Math.max(1, Math.ceil(rawText.length / 3000));
          fileType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
        } catch (docxErr: any) {
          logger.error('Upload', 'DOCX parsing error:', docxErr);
          res.status(422).json({ error: `Could not read DOCX document: ${docxErr.message}` });
          return;
        }
      } else if (lowerName.endsWith('.doc') || fileType.includes('msword')) {
        fileType = 'application/msword';
        try {
          const result = await mammoth.extractRawText({ buffer: req.file.buffer });
          rawText = result.value || '';
        } catch {
          // Binary .doc fallback: extract printable character sequences
          const rawStr = req.file.buffer.toString('utf-8');
          const cleanMatches = rawStr.match(/[\x20-\x7E\t\n\r]{4,}/g);
          rawText = cleanMatches ? cleanMatches.join('\n') : '';
        }
        totalPages = Math.max(1, Math.ceil(rawText.length / 3000));

      // 3. Image Files (PNG, JPG, JPEG, WEBP, BMP, TIFF, GIF, SVG)
      } else if (fileType.startsWith('image/') || /\.(png|jpe?g|webp|bmp|tiff|tif|svg|gif)$/i.test(lowerName)) {
        fileType = fileType.startsWith('image/') ? fileType : `image/${lowerName.split('.').pop()}`;
        totalPages = 1;

        // (A) Try OpenRouter Vision with verified free model
        if (activeOrKey) {
          try {
            logger.info('Upload', 'Transcribing image via OpenRouter Vision...');
            const transcribed = await transcribeImageWithOpenRouter(req.file.buffer.toString('base64'), fileType, activeOrKey);
            if (transcribed && transcribed.trim().length >= 10) {
              rawText = transcribed.trim();
              logger.info('Upload', 'OpenRouter image vision succeeded.');
            }
          } catch (orImgErr) {
            logger.warn('Upload', 'OpenRouter image vision failed, trying secondary OCR:', orImgErr);
          }
        }

        // (B) Try Gemini Vision if Gemini key available
        if ((!rawText || rawText.trim().length < 15) && activeGeminiKey) {
          try {
            const base64Img = req.file.buffer.toString('base64');
            const visionResp = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent', {
              method: 'POST',
              headers: { 
                'Content-Type': 'application/json',
                'x-goog-api-key': activeGeminiKey
              },
              signal: AbortSignal.timeout(15000),
              body: JSON.stringify({
                contents: [{
                  parts: [
                    { text: "Extract and transcribe all text from this scanned or photographed legal document, certificate, or record verbatim. Retain all names, dates, amounts, and numbers." },
                    { inlineData: { mimeType: fileType, data: base64Img } }
                  ]
                }]
              })
            });
            if (visionResp.ok) {
              const vData = (await visionResp.json()) as any;
              const transcribed = vData.candidates?.[0]?.content?.parts?.[0]?.text;
              if (transcribed && transcribed.trim().length >= 10) {
                rawText = transcribed.trim();
                logger.info('Upload', 'Gemini image vision succeeded.');
              }
            }
          } catch (vErr) {
            logger.warn('Upload', 'Gemini vision OCR error, falling back to local Tesseract:', vErr);
          }
        }

        // (C) Offline Local OCR via Tesseract.js (Zero API key needed)
        if (!rawText || rawText.trim().length < 15) {
          try {
            logger.info('Upload', 'Running local Tesseract OCR on uploaded image via worker pool...');
            const ocrText = await performOcr(req.file.buffer);
            if (ocrText && ocrText.length >= 10) {
              rawText = ocrText;
              logger.info('Upload', 'Tesseract OCR succeeded via worker pool.');
            }
          } catch (tessErr) {
            logger.error('Upload', 'Tesseract OCR error:', tessErr);
          }
        }

      // 4. Rich Text Format (.rtf)
      } else if (lowerName.endsWith('.rtf') || fileType.includes('rtf')) {
        fileType = 'application/rtf';
        const rawRtf = req.file.buffer.toString('utf-8');
        rawText = rawRtf
          .replace(/\\([a-z]{1,32})(-?\d+)? ?/gi, ' ')
          .replace(/[{}\\]/g, ' ')
          .replace(/\s+/g, ' ')
          .trim();
        totalPages = Math.max(1, Math.ceil(rawText.length / 3000));

      // 5. Plain Text, Markdown (.md), CSV, TSV, JSON
      } else {
        rawText = req.file.buffer.toString('utf-8');
        totalPages = Math.max(1, Math.ceil(rawText.length / 3000));
        fileType = lowerName.endsWith('.md') ? 'text/markdown' : 'text/plain';
      }

      if (!rawText || rawText.trim().length < 10) {
        res.status(400).json({ 
          error: 'Could not extract legible text from this file. If this is a photo or scanned document, please ensure the image is clear and well-lit, or paste the text directly.' 
        });
        return;
      }
    } else if (req.body.text && typeof req.body.text === 'string' && req.body.text.trim().length > 0) {
      rawText = req.body.text.trim();
      if (rawText.length < 15) {
        res.status(400).json({ 
          error: 'The provided document text is too short (< 15 characters). Please provide the full contract or document content.' 
        });
        return;
      }
      filename = req.body.title || 'Pasted_Contract.txt';
      totalPages = Math.max(1, Math.ceil(rawText.length / 3000));
    } else {
      res.status(400).json({ error: 'No document file or text content provided. Please upload a PDF, Word document, image, or paste contract text.' });
      return;
    }

    const docId = `doc-${Date.now()}`;
    const docTitle = req.body.title || filename.replace(/\.[^/.]+$/, "").replace(/_/g, ' ');

    if (req.file) {
      fileStore.set(docId, {
        buffer: req.file.buffer,
        mimetype: fileType,
        filename
      });
    }

    // =========================================================================
    // STEP 1: RUN EARLY DOCUMENT CLASSIFICATION
    // =========================================================================
    const classification = classifyDocumentNature(rawText, docTitle);

    // IF NOT A LEGAL DOCUMENT: STOP IMMEDIATELY AFTER CLASSIFICATION!
    if (classification.nature === 'NON_CONTRACTUAL') {
      logger.info('Ingestion', `Non-legal document identified (${classification.nonLegalCategory || 'Non-Contractual Record'}). Halting contract analysis pipeline.`);

      const nonLegalDoc: LegalDocument = {
        id: docId,
        title: docTitle,
        filename,
        fileType,
        uploadDate: new Date().toISOString().split('T')[0],
        totalPages,
        rawText,
        clauses: [], // HALTED: Zero legal clauses extracted
        isLegalDocument: false,
        stoppedAfterClassification: true,
        nonLegalCategory: classification.nonLegalCategory,
        detectedMetadata: classification.detectedMetadata,
        analysis: {
          documentId: docId,
          documentTitle: docTitle,
          classificationNature: 'NON_CONTRACTUAL',
          classificationExplanation: classification.explanation,
          isLegalDocument: false,
          stoppedAfterClassification: true,
          nonLegalCategory: classification.nonLegalCategory,
          detectedMetadata: classification.detectedMetadata,
          documentType: 'NON_CONTRACTUAL_RECORD',
          jurisdiction: 'Not Applicable (Non-Legal Document)',
          overallRiskLevel: 'LOW',
          executiveSummary: classification.explanation,
          quickStats: {
            termOrDuration: 'N/A',
            financialCommitment: 'None',
            depositOrCompensation: 'None',
            criticalFlagCount: 0,
            cautionFlagCount: 0
          },
          responsibilities: {
            yourObligations: [],
            otherPartyObligations: []
          },
          financialsAndDeadlines: [],
          terminationAndExit: [],
          timelineSequence: [],
          criticalFlagsAndRisks: [],
          lawyerDossier: {
            executiveBrief: `Document classified as non-legal (${classification.nonLegalCategory || 'Non-Contractual Record'}). Legal contract analysis was stopped after classification.`,
            questionsForCounsel: [],
            missingProtections: [],
            evidenceChecklist: [],
            unansweredAmbiguities: []
          }
        },
        hasOriginalFile: Boolean(req.file),
        fileUrl: req.file ? `/api/documents/${docId}/file` : undefined,
        sessionId
      };

      documentStore.set(docId, nonLegalDoc);
      if (isSupabaseConfigured()) {
        saveDocumentToSupabase(nonLegalDoc, req.file?.buffer, fileType).catch(err => {
          logger.warn('Supabase', 'Non-legal doc save error:', err);
        });
      }

      res.status(201).json(nonLegalDoc);
      return;
    }

    // =========================================================================
    // STEP 2: LEGAL CONTRACT PIPELINE (Only executed for verified legal contracts)
    // =========================================================================
    // Extract clauses deterministically
    const clauses = extractClausesFromText(rawText);

    // Run deep analysis (OpenRouter / Gemini or offline legal heuristic engine)
    const targetLang = req.body.language || req.body.targetLang || 'en';
    const analysis = await analyzeLegalDocument(
      docId,
      docTitle,
      rawText,
      clauses,
      req.body.apiKey,
      targetLang,
      req.body.openRouterKey
    );

    const newDoc: LegalDocument = {
      id: docId,
      title: docTitle,
      filename,
      fileType,
      uploadDate: new Date().toISOString().split('T')[0],
      totalPages,
      rawText,
      clauses,
      analysis,
      chatHistory: [],
      hasOriginalFile: Boolean(req.file),
      fileUrl: req.file ? `/api/documents/${docId}/file` : undefined,
      isLegalDocument: true,
      stoppedAfterClassification: false,
      sessionId
    };

    documentStore.set(docId, newDoc);
    if (isSupabaseConfigured()) {
      saveDocumentToSupabase(newDoc, req.file?.buffer, fileType).catch(err => {
        logger.warn('Supabase', 'Document save error:', err);
      });
    }

    res.status(201).json(newDoc);
  } catch (err: any) {
    logger.error('Upload', 'Upload processing error:', err);
    res.status(500).json({ error: err.message || 'Failed to process document' });
  }
});

// Trigger Document Re-Analysis
app.post('/api/documents/:id/analyze', heavyComputeLimiter, async (req: Request, res: Response) => {
  const docId = req.params.id as string;
  const doc = documentStore.get(docId);
  if (!doc) {
    res.status(404).json({ error: 'Document not found' });
    return;
  }

  try {
    const targetLang = req.body.language || req.body.targetLang || 'en';
    const analysis = await analyzeLegalDocument(
      doc.id,
      doc.title,
      doc.rawText,
      doc.clauses,
      req.body.apiKey,
      targetLang,
      req.body.openRouterKey
    );
    doc.analysis = analysis;
    if (isSupabaseConfigured()) {
      saveDocumentToSupabase(doc).catch(err => {
        logger.warn('Supabase', 'Re-analysis persistence error:', err);
      });
    }
    res.json(analysis);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Analysis failed' });
  }
});

// Generate Structured PDF Summary using High-Capability AI (defaults to google/gemma-4-31b-it:free)
app.post('/api/documents/:id/summary', heavyComputeLimiter, async (req: Request, res: Response) => {
  const docId = req.params.id as string;
  const doc = documentStore.get(docId);
  if (!doc) {
    res.status(404).json({ error: 'Document not found' });
    return;
  }

  try {
    const preferredModel = (req.body.model && req.body.model !== 'google/gemma-4-31b-it:free')
      ? req.body.model 
      : (process.env.OPENROUTER_MODEL || 'openai/gpt-4o-mini');
    const activeKey = req.body.openRouterKey || req.body.apiKey;

    // Check summary cache
    const cacheKey = computeDocumentContentHash(doc.rawText, 'en', preferredModel);
    const cached = summaryCache.get(cacheKey);
    if (cached) {
      logger.info('Summary', `Instant cache hit for PDF Summary (${doc.title}).`);
      doc.pdfSummary = cached;
      res.json(cached);
      return;
    }

    logger.info('Summary', `Generating PDF Summary for "${doc.title}" with model ${preferredModel}...`);
    const summaryResult = await generatePdfSummaryWithAI(
      doc.title,
      doc.rawText,
      doc.clauses,
      activeKey,
      preferredModel
    );

    doc.pdfSummary = summaryResult;
    summaryCache.set(cacheKey, summaryResult);
    if (isSupabaseConfigured()) {
      saveDocumentToSupabase(doc).catch(err => {
        logger.warn('Supabase', 'PDF summary persistence error:', err);
      });
    }
    res.json(summaryResult);
  } catch (err: any) {
    logger.error('Summary', 'PDF summary generation error:', err);
    res.status(500).json({ error: err.message || 'Failed to generate PDF summary' });
  }
});

// Fetch stored chat messages for a document
app.get('/api/documents/:id/chat', async (req: Request, res: Response) => {
  const docId = req.params.id as string;
  const doc = documentStore.get(docId);
  if (!doc) {
    res.status(404).json({ error: 'Document not found' });
    return;
  }

  if (isSupabaseConfigured()) {
    const dbMessages = await getChatMessagesFromSupabase(docId);
    if (dbMessages && dbMessages.length > 0) {
      doc.chatHistory = dbMessages.map(m => ({
        id: m.id,
        role: m.role as 'user' | 'assistant',
        content: m.content,
        timestamp: new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        citations: m.citations
      }));
    }
  }

  res.json({ history: doc.chatHistory || [] });
});

// Grounded Contextual Chat Endpoint
app.post('/api/documents/:id/chat', heavyComputeLimiter, async (req: Request, res: Response) => {
  const docId = req.params.id as string;
  const doc = documentStore.get(docId);
  if (!doc) {
    res.status(404).json({ error: 'Document not found' });
    return;
  }

  const { message } = req.body;
  const activeKey = req.body.openRouterKey || req.body.apiKey;
  const targetLang = req.body.language || req.body.targetLang || 'en';
  if (!message) {
    res.status(400).json({ error: 'Message is required' });
    return;
  }

  try {
    // Record user message
    if (!doc.chatHistory) doc.chatHistory = [];
    const userMsg = {
      id: `msg-${Date.now()}-user`,
      role: 'user' as const,
      content: message,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
    doc.chatHistory.push(userMsg);

    // Save user message to Supabase
    if (isSupabaseConfigured()) {
      saveChatMessageToSupabase({
        id: userMsg.id,
        documentId: doc.id,
        role: 'user',
        content: userMsg.content
      }).catch(err => logger.warn('Supabase', 'User chat message save error:', err));
    }

    // Generate grounded response (uses cache, does not reprocess full doc)
    const assistantMsg = await handleDocumentChat(
      doc,
      message,
      doc.chatHistory,
      activeKey,
      targetLang
    );

    doc.chatHistory.push(assistantMsg);

    // Save assistant message to Supabase
    if (isSupabaseConfigured()) {
      saveChatMessageToSupabase({
        id: assistantMsg.id,
        documentId: doc.id,
        role: 'assistant',
        content: assistantMsg.content,
        citations: assistantMsg.citations
      }).catch(err => logger.warn('Supabase', 'Assistant chat message save error:', err));
    }

    res.json({ message: assistantMsg, history: doc.chatHistory });
  } catch (err: any) {
    logger.error('Chat', 'Chat error:', err);
    res.status(500).json({ error: err.message || 'Chat service encountered an error' });
  }
});

// Semantic Document Comparison Endpoint
app.post('/api/documents/compare', heavyComputeLimiter, async (req: Request, res: Response) => {
  const { docAId, docBId, textA, textB } = req.body;
  const activeKey = req.body.openRouterKey || req.body.apiKey;

  let docA = docAId ? documentStore.get(docAId) : null;
  let docB = docBId ? documentStore.get(docBId) : null;

  if (!docA && textA) {
    docA = {
      id: 'doc-temp-a',
      title: 'Draft A (Original)',
      filename: 'draft_a.txt',
      fileType: 'text/plain',
      uploadDate: '2026-09-19',
      totalPages: 1,
      rawText: textA,
      clauses: extractClausesFromText(textA)
    };
  }

  if (!docB && textB) {
    docB = {
      id: 'doc-temp-b',
      title: 'Draft B (Revised)',
      filename: 'draft_b.txt',
      fileType: 'text/plain',
      uploadDate: '2026-09-19',
      totalPages: 1,
      rawText: textB,
      clauses: extractClausesFromText(textB)
    };
  }

  if (!docA || !docB) {
    res.status(400).json({ error: 'Both Document A and Document B (or text snippets) are required for comparison.' });
    return;
  }

  try {
    const comparison = await compareLegalDocuments(docA, docB, activeKey);
    res.json(comparison);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to compare documents' });
  }
});

// Production Static Asset Serving for Fullstack Deployments (Render / Railway / Docker)
const distPath = path.resolve(process.cwd(), 'dist');
if (fs.existsSync(distPath)) {
  logger.info('Static', `Serving compiled frontend from ${distPath}`);
  app.use(express.static(distPath));
  app.get('*', (req: Request, res: Response, next: NextFunction) => {
    if (req.path.startsWith('/api')) {
      return next();
    }
    res.sendFile(path.join(distPath, 'index.html'));
  });
}

// Centralized Error Handling Middleware (Sanitizes errors, handles Multer validation errors)
app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      res.status(400).json({ error: 'Uploaded file exceeds the maximum allowed size limit of 15MB.' });
      return;
    }
    res.status(400).json({ error: `File upload error: ${err.message}` });
    return;
  }
  if (err && err.message && err.message.includes('File type rejected for security')) {
    res.status(400).json({ error: err.message });
    return;
  }
  if (err && err.message && err.message.includes('Blocked by CORS policy')) {
    res.status(403).json({ error: 'Blocked by CORS policy' });
    return;
  }
  logger.error('API', 'Unhandled API error:', err);
  res.status(500).json({ error: 'An unexpected internal server error occurred. Please try again.' });
});

if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, '0.0.0.0', () => {
    logger.info('Server', `ClarityLegal API server running on port ${PORT}`);
  });
}

export default app;
export { app };



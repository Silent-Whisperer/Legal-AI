import dotenv from 'dotenv';
dotenv.config();

export interface AppConfig {
  port: number;
  openRouterApiKey?: string;
  openRouterModel: string;
  geminiApiKey?: string;
  maxUploadSizeBytes: number;
  maxStoreEntries: number;
  maxFileStoreEntries: number;
  allowedMimeTypes: Set<string>;
  allowedExtensions: Set<string>;
}

export const config: AppConfig = {
  port: parseInt(process.env.PORT || '5000', 10),
  openRouterApiKey: process.env.OPENROUTER_API_KEY,
  openRouterModel: process.env.OPENROUTER_MODEL || 'google/gemma-4-31b-it:free',
  geminiApiKey: process.env.GEMINI_API_KEY,
  maxUploadSizeBytes: 15 * 1024 * 1024, // 15 MB safe ceiling
  maxStoreEntries: 25, // Bounded LRU store limit to prevent OOM
  maxFileStoreEntries: 15, // Stricter bound for memory-heavy binary buffers
  allowedMimeTypes: new Set([
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/msword',
    'image/png',
    'image/jpeg',
    'image/jpg',
    'image/webp',
    'image/bmp',
    'image/tiff',
    'image/tif',
    'image/gif',
    'text/plain',
    'text/markdown',
    'text/rtf',
    'application/rtf'
  ]),
  allowedExtensions: new Set([
    '.pdf',
    '.docx',
    '.doc',
    '.png',
    '.jpeg',
    '.jpg',
    '.webp',
    '.bmp',
    '.tiff',
    '.tif',
    '.gif',
    '.txt',
    '.md',
    '.rtf'
  ])
};

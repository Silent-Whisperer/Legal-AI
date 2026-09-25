import Tesseract from 'tesseract.js';
import path from 'path';
import fs from 'fs';
import { logger } from '../utils/logger.ts';

let workerPromise: Promise<Tesseract.Worker> | null = null;

async function getOcrWorker(): Promise<Tesseract.Worker> {
  if (!workerPromise) {
    workerPromise = (async () => {
      const rootTrainedData = path.resolve(process.cwd(), 'eng.traineddata');
      const langPath = fs.existsSync(rootTrainedData) ? process.cwd() : undefined;
      const worker = await Tesseract.createWorker('eng', 1, {
        langPath,
        logger: () => {} // Quiet logger for efficiency
      });
      return worker;
    })();
  }
  return workerPromise;
}

export async function performOcr(imageBuffer: Buffer): Promise<string> {
  try {
    const worker = await getOcrWorker();
    const result = await worker.recognize(imageBuffer);
    return result.data.text ? result.data.text.trim() : '';
  } catch (err) {
    logger.warn('OCRPool', 'Reusable worker error, fallback to Tesseract.recognize:', err);
    try {
      const fallbackResult = await Tesseract.recognize(imageBuffer, 'eng');
      return fallbackResult.data.text ? fallbackResult.data.text.trim() : '';
    } catch (fallbackErr) {
      logger.error('OCRPool', 'OCR execution failed:', fallbackErr);
      return '';
    }
  }
}

export async function terminateOcrWorker(): Promise<void> {
  if (workerPromise) {
    try {
      const worker = await workerPromise;
      await worker.terminate();
    } catch {
      // Ignored during shutdown
    } finally {
      workerPromise = null;
    }
  }
}

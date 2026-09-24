import crypto from 'crypto';
import { DocumentAnalysis, LegalDocument } from '../types.ts';
import { config } from '../config.ts';

export class BoundedStore<K, V> {
  private map: Map<K, V> = new Map();
  private maxEntries: number;

  constructor(maxEntries: number = config.maxStoreEntries) {
    this.maxEntries = maxEntries;
  }

  get(key: K): V | undefined {
    const val = this.map.get(key);
    if (val !== undefined) {
      // Refresh recency
      this.map.delete(key);
      this.map.set(key, val);
    }
    return val;
  }

  set(key: K, value: V): void {
    if (this.map.has(key)) {
      this.map.delete(key);
    } else if (this.map.size >= this.maxEntries) {
      // Evict oldest (first key in insertion order)
      const oldestKey = this.map.keys().next().value;
      if (oldestKey !== undefined) {
        this.map.delete(oldestKey);
      }
    }
    this.map.set(key, value);
  }

  has(key: K): boolean {
    return this.map.has(key);
  }

  delete(key: K): boolean {
    return this.map.delete(key);
  }

  get size(): number {
    return this.map.size;
  }

  values(): IterableIterator<V> {
    return this.map.values();
  }

  clear(): void {
    this.map.clear();
  }
}

// Bounded stores for active sessions
export const documentStore = new BoundedStore<string, LegalDocument>(config.maxStoreEntries);
export const fileStore = new BoundedStore<string, { buffer: Buffer; mimetype: string; filename: string }>(config.maxFileStoreEntries);

// SHA-256 Content-Hash Cache for LLM/Heuristic Analysis & Summaries
export const analysisCache = new BoundedStore<string, DocumentAnalysis>(100);
export const summaryCache = new BoundedStore<string, any>(100);

export function computeDocumentContentHash(text: string, lang: string = 'en', model?: string): string {
  const norm = text.replace(/\s+/g, ' ').trim().toLowerCase();
  return crypto.createHash('sha256').update(`${norm}::${lang}::${model || 'default'}`).digest('hex');
}

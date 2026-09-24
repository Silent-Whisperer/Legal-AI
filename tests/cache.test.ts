import { describe, it, expect } from 'vitest';
import { BoundedStore, computeDocumentContentHash } from '../server/src/services/cache.ts';

describe('Bounded Store & Content Hash Engine', () => {
  it('enforces maximum capacity and evicts the oldest entry', () => {
    const store = new BoundedStore<string, number>(3);

    store.set('k1', 100);
    store.set('k2', 200);
    store.set('k3', 300);

    expect(store.size).toBe(3);
    expect(store.has('k1')).toBe(true);

    // Adding 4th item must evict oldest ('k1')
    store.set('k4', 400);

    expect(store.size).toBe(3);
    expect(store.has('k1')).toBe(false);
    expect(store.has('k2')).toBe(true);
    expect(store.has('k3')).toBe(true);
    expect(store.has('k4')).toBe(true);
  });

  it('refreshes recency on get() so frequently accessed keys are not evicted', () => {
    const store = new BoundedStore<string, string>(3);

    store.set('a', 'alpha');
    store.set('b', 'beta');
    store.set('c', 'gamma');

    // Access 'a' to refresh its recency
    const valA = store.get('a');
    expect(valA).toBe('alpha');

    // Adding 'd' should now evict 'b' (the oldest unrefreshed entry)
    store.set('d', 'delta');

    expect(store.has('a')).toBe(true);
    expect(store.has('b')).toBe(false);
    expect(store.has('c')).toBe(true);
    expect(store.has('d')).toBe(true);
  });

  it('produces deterministic SHA-256 hashes ignoring extra whitespace', () => {
    const text1 = 'This  is   a   legal   contract   clause.';
    const text2 = 'This is a legal contract clause.';

    const hash1 = computeDocumentContentHash(text1, 'en', 'gpt-4o-mini');
    const hash2 = computeDocumentContentHash(text2, 'en', 'gpt-4o-mini');

    expect(hash1).toBe(hash2);
    expect(hash1).toMatch(/^[a-f0-9]{64}$/);
  });

  it('produces distinct hashes when language or model changes', () => {
    const text = 'Arbitration agreement';
    const hashEn = computeDocumentContentHash(text, 'en');
    const hashHi = computeDocumentContentHash(text, 'hi');

    expect(hashEn).not.toBe(hashHi);
  });
});

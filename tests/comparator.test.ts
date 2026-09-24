import { describe, it, expect } from 'vitest';
import { compareLegalDocuments } from '../server/src/comparator.ts';
import { LegalDocument } from '../server/src/types.ts';

describe('Semantic Document Comparator Engine', () => {
  it('correctly detects added and modified clauses between drafts', async () => {
    const docA: LegalDocument = {
      id: 'doc-a',
      title: 'Original Lease Draft',
      filename: 'lease_v1.txt',
      fileType: 'text/plain',
      uploadDate: '2026-09-01',
      totalPages: 1,
      rawText: 'Section 1. Rent: The rent shall be $2,000 per month.\nSection 2. Notice: 30 days notice required.',
      clauses: [
        {
          id: 'c-1',
          number: '1',
          title: 'Rent',
          pageNumber: 1,
          rawText: 'The rent shall be $2,000 per month.',
          explanation: 'Monthly rent'
        },
        {
          id: 'c-2',
          number: '2',
          title: 'Notice',
          pageNumber: 1,
          rawText: '30 days notice required before termination.',
          explanation: 'Notice requirement'
        }
      ]
    };

    const docB: LegalDocument = {
      id: 'doc-b',
      title: 'Revised Counter-Draft',
      filename: 'lease_v2.txt',
      fileType: 'text/plain',
      uploadDate: '2026-09-05',
      totalPages: 1,
      rawText: 'Section 1. Rent: The rent shall be $2,400 per month.\nSection 2. Notice: 30 days notice required.\nSection 3. Pets: No pets allowed under penalty of $500 fee.',
      clauses: [
        {
          id: 'c-1',
          number: '1',
          title: 'Rent',
          pageNumber: 1,
          rawText: 'The rent shall be $2,400 per month.',
          explanation: 'Monthly rent increase'
        },
        {
          id: 'c-2',
          number: '2',
          title: 'Notice',
          pageNumber: 1,
          rawText: '30 days notice required before termination.',
          explanation: 'Notice requirement'
        },
        {
          id: 'c-3',
          number: '3',
          title: 'Pets',
          pageNumber: 1,
          rawText: 'No pets allowed under penalty of $500 fee.',
          explanation: 'Pet restriction'
        }
      ]
    };

    const result = await compareLegalDocuments(docA, docB);

    expect(result).toBeDefined();
    expect(result.docA.title).toBe('Original Lease Draft');
    expect(result.docB.title).toBe('Revised Counter-Draft');
    expect(result.deltas.length).toBeGreaterThanOrEqual(2);

    const rentDelta = result.deltas.find(d => d.clauseRef.includes('1') || d.title.toLowerCase().includes('rent'));
    expect(rentDelta).toBeDefined();
    expect(rentDelta?.changeType).toBe('MODIFIED');

    const petDelta = result.deltas.find(d => d.clauseRef.includes('3') || d.title.toLowerCase().includes('pet'));
    expect(petDelta).toBeDefined();
    expect(petDelta?.changeType).toBe('ADDED');
  });
});

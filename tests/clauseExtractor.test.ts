import { describe, it, expect } from 'vitest';
import { extractClausesFromText } from '../server/src/services/clauseExtractor.ts';

describe('Clause Extraction & Normalization Engine', () => {
  it('extracts numbered clauses with titles and raw text', () => {
    const text = `
      1. PARTIES
      This agreement is entered into by Alpha and Beta.

      2. TERM OF LEASE
      The term shall commence on October 1, 2026 and continue for twelve (12) months.

      3. MONTHLY RENT
      The monthly rent shall be $3,000 payable on the first day of each calendar month.
    `;
    const clauses = extractClausesFromText(text);

    expect(clauses.length).toBe(3);
    expect(clauses[0].number).toBe('1');
    expect(clauses[0].title).toBe('PARTIES');
    expect(clauses[1].number).toBe('2');
    expect(clauses[1].title).toBe('TERM OF LEASE');
    expect(clauses[2].number).toBe('3');
    expect(clauses[2].title).toBe('MONTHLY RENT');
    expect(clauses[2].explanation).toContain('payment amount');
  });

  it('normalizes OCR section symbols like § to SECTION', () => {
    const ocrText = `
      § 14 INDEMNIFICATION
      Tenant shall hold landlord harmless from any liabilities.

      § 18 ACCESS TO PREMISES
      Landlord may enter premises upon 24 hours notice.
    `;
    const clauses = extractClausesFromText(ocrText);

    expect(clauses.length).toBe(2);
    expect(clauses[0].title).toBe('INDEMNIFICATION');
    expect(clauses[0].rawText).toContain('Tenant shall hold landlord harmless');
    expect(clauses[1].title).toBe('ACCESS TO PREMISES');
  });

  it('tracks page number markers accurately across clauses', () => {
    const pagedText = `
      [Page 1]
      SECTION 1. DEFINITIONS
      Here are the definitions.

      [Page 2]
      SECTION 2. RESTRICTIONS
      Here are the restrictions.
    `;
    const clauses = extractClausesFromText(pagedText);

    expect(clauses.length).toBe(2);
    expect(clauses[0].pageNumber).toBe(1);
    expect(clauses[1].pageNumber).toBe(2);
  });

  it('filters out signature blocks from being treated as clauses', () => {
    const textWithSignatures = `
      SECTION 1. SCOPE
      The scope of services is web development.

      IN WITNESS WHEREOF
      By: ____________________
      Date: 2026-09-24
      Signature: ______________
    `;
    const clauses = extractClausesFromText(textWithSignatures);

    expect(clauses.length).toBe(1);
    expect(clauses[0].title).toBe('SCOPE');
    expect(clauses[0].rawText).toContain('web development');
  });

  it('falls back to paragraph extraction when no section headers exist', () => {
    const plainText = `
      This is the first long paragraph detailing the background of the dispute between the parties involved.

      This is the second long paragraph outlining the settlement payments and conditions for releasing claims.
    `;
    const clauses = extractClausesFromText(plainText);

    expect(clauses.length).toBe(2);
    expect(clauses[0].number).toBe('1');
    expect(clauses[1].number).toBe('2');
  });
});

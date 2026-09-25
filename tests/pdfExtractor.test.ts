import { describe, it, expect } from 'vitest';
import { cleanFormUnderlines } from '../server/src/pdfExtractor.ts';

describe('pdfExtractor Unit Tests', () => {
  describe('cleanFormUnderlines', () => {
    it('cleans currency followed by form blank underlines', () => {
      const input = 'Monthly Rent: $______ 2200.00 payable on 1st.';
      const cleaned = cleanFormUnderlines(input);
      expect(cleaned).toBe('Monthly Rent: $ 2200.00 payable on 1st.');
    });

    it('cleans INR/Rupee currency with underlines', () => {
      const input = 'Security Deposit: ₹ ______ 50,000.00 due at signing.';
      const cleaned = cleanFormUnderlines(input);
      expect(cleaned).toBe('Security Deposit: ₹ 50,000.00 due at signing.');
    });

    it('cleans numbers followed by underline blanks', () => {
      const input = 'Term of Lease: 12.00 ___ months';
      const cleaned = cleanFormUnderlines(input);
      expect(cleaned).toBe('Term of Lease: 12.00 months');
    });

    it('cleans form field label underlines with party names', () => {
      const input = 'Landlord Name: _____ (the Kevin Malone';
      const cleaned = cleanFormUnderlines(input);
      expect(cleaned).toContain('Landlord Name: Kevin Malone');
    });

    it('replaces standalone long underline blanks with space', () => {
      const input = 'Signature: ______________ Date: __________';
      const cleaned = cleanFormUnderlines(input);
      expect(cleaned).not.toContain('__________');
      expect(cleaned).toContain('Signature:');
    });

    it('preserves clean text without underlines unchanged', () => {
      const input = 'This agreement is executed between Alice and Bob.';
      expect(cleanFormUnderlines(input)).toBe(input);
    });
  });
});

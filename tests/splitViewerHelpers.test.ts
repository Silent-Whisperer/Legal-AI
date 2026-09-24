import { describe, it, expect } from 'vitest';
import { 
  matchFlagToClause, 
  getGroundedExplanation, 
  escapeRegExp 
} from '../src/components/splitViewerHelpers.tsx';
import { Clause, RiskFlag } from '../src/types.ts';

describe('Split Viewer Helpers & Grounding Logic', () => {
  const clause1: Clause = {
    id: 'cl-1',
    number: '14',
    title: 'Indemnification & Hold Harmless',
    rawText: 'Tenant shall indemnify Landlord against all claims.',
    explanation: 'You are liable to defend the landlord from third party lawsuits.'
  };

  const flag1: RiskFlag = {
    id: 'rf-1',
    clauseId: 'cl-1',
    clauseRef: 'Section 14',
    severity: 'CRITICAL',
    title: 'Broad Indemnification',
    plainEnglishExplanation: 'This clause requires you to pay for the other party legal expenses even if you were not solely at fault.',
    suggestedRedline: 'Limit indemnity to direct damages caused by gross negligence.'
  };

  it('correctly matches risk flags to clauses by clauseId and clauseRef', () => {
    expect(matchFlagToClause(flag1, clause1)).toBe(true);

    const nonMatchingClause: Clause = {
      id: 'cl-99',
      number: '99',
      title: 'Severability',
      rawText: 'If any provision is held invalid, the remainder continues.'
    };
    expect(matchFlagToClause(flag1, nonMatchingClause)).toBe(false);
  });

  it('safely escapes regex special characters without throwing syntax errors', () => {
    const raw = 'Section [14.1](a) *special*';
    const escaped = escapeRegExp(raw);
    expect(escaped).toBe('Section \\[14\\.1\\]\\(a\\) \\*special\\*');
    expect(() => new RegExp(escaped)).not.toThrow();
  });

  it('resolves grounded explanations for plain, tldr, bullets, and legal modes', () => {
    // 1. Plain English
    const plain = getGroundedExplanation(clause1, flag1, 'plain');
    expect(plain).toBe(flag1.plainEnglishExplanation);

    // 2. TL;DR
    const tldr = getGroundedExplanation(clause1, flag1, 'tldr');
    expect(tldr).toContain('TL;DR:');

    // 3. Bullets
    const bullets = getGroundedExplanation(clause1, flag1, 'bullets');
    expect(bullets).toContain('• Summary:');
    expect(bullets).toContain('• Note:');

    // 4. Legal (Verbatim clause text)
    const legal = getGroundedExplanation(clause1, flag1, 'legal');
    expect(legal).toBe(clause1.rawText);

    // 5. Fallback for ungrounded / missing clause
    const fallback = getGroundedExplanation(undefined, undefined, 'plain');
    expect(fallback).toContain('could not be confidently determined');
  });
});

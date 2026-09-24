import React from 'react';
import { Clause, RiskFlag } from '../types.ts';

export type ReadingMode = 'plain' | 'legal' | 'tldr' | 'bullets';

export const escapeRegExp = (str: string): string => 
  str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export const matchFlagToClause = (flag: RiskFlag, clause?: Clause): boolean => {
  if (!flag || !clause) return false;
  if (flag.clauseId && flag.clauseId === clause.id) return true;
  if (!flag.clauseRef || !clause.number) return false;
  try {
    const escapedNum = escapeRegExp(String(clause.number).trim());
    const exactRegex = new RegExp(`\\b(?:Section|Clause)?\\s*${escapedNum}(?:[\\s,.]|$)`, 'i');
    return exactRegex.test(String(flag.clauseRef));
  } catch {
    return false;
  }
};

export const renderHighlightedText = (text: string, query: string): React.ReactNode => {
  if (!query.trim()) return text;
  try {
    const regex = new RegExp(`(${escapeRegExp(query)})`, 'gi');
    const parts = text.split(regex);
    return parts.map((part, i) =>
      part.toLowerCase() === query.toLowerCase() ? (
        <mark key={i} className="bg-amber-300 text-neutral-900 px-0.5 rounded font-medium">
          {part}
        </mark>
      ) : (
        part
      )
    );
  } catch {
    return text;
  }
};

export const getGroundedExplanation = (
  clause?: Clause, 
  flag?: RiskFlag, 
  readingMode: ReadingMode = 'plain'
): string => {
  if (!clause) {
    return 'This could not be confidently determined from this clause.';
  }

  if (readingMode === 'legal') {
    return clause.rawText;
  }

  // 1. If flagged with an exact match, use the specific plain English explanation
  if (flag?.plainEnglishExplanation) {
    if (readingMode === 'tldr') {
      return `TL;DR: ${flag.plainEnglishExplanation.split('.')[0]}.`;
    }
    if (readingMode === 'bullets') {
      return `• Summary: ${flag.plainEnglishExplanation}\n• Context: ${flag.statutoryContext || 'Standard contractual term'}\n• Note: ${flag.suggestedRedline || 'None'}`;
    }
    return flag.plainEnglishExplanation;
  }

  // 2. If the clause has an explicit grounded explanation attached, use it
  if (clause.explanation) {
    if (readingMode === 'tldr') {
      return `TL;DR: ${clause.explanation.split('.')[0]}.`;
    }
    if (readingMode === 'bullets') {
      return `• Summary: ${clause.explanation}\n• Topic: Section ${clause.number} (${clause.title})`;
    }
    return clause.explanation;
  }

  // 3. Fallback
  return 'This could not be confidently determined from this clause.';
};

import { Clause } from '../types.ts';

export function generateGroundedClauseSummary(title: string, rawText: string): string {
  const cleanText = rawText.replace(/\s+/g, ' ').trim();
  const lower = cleanText.toLowerCase();

  if (lower.includes('premises') || lower.includes('occupancy')) {
    return `The document identifies the leased property and restricts occupancy to authorized residents named in the agreement.`;
  }
  if (lower.includes('term') || lower.includes('commencement')) {
    return `The document outlines the start date, duration of the term, and conditions for automatic renewal or termination notice.`;
  }
  if (/\b(?:rent|payment|compensation|salary)\b/.test(lower)) {
    return `The document specifies the scheduled payment amount, due date, grace period, and any applicable administrative charges.`;
  }
  if (lower.includes('deposit')) {
    return `The document establishes the security deposit amount and the timeframe and conditions for itemized deductions and return after vacating.`;
  }
  if (lower.includes('utilities') || lower.includes('charges')) {
    return `The document allocates responsibility between the parties for utility accounts, services, and associated monthly costs.`;
  }
  if (lower.includes('alterations') || lower.includes('fixtures')) {
    return `The document restricts structural alterations, painting, or heavy mountings without prior written authorization.`;
  }
  if (lower.includes('indemnif') || lower.includes('hold harmless')) {
    return `This clause appears to require one party to hold the other harmless for damages or liabilities. You may want to ask a legal professional about standard exceptions.`;
  }
  if (lower.includes('enter') || lower.includes('inspection')) {
    return `The document states the conditions and notice required before the property owner or manager may enter the premises for routine visits.`;
  }
  if (lower.includes('sublet') || lower.includes('airbnb') || lower.includes('assign')) {
    return `The document restricts transferring occupancy or listing the premises on short-term rental platforms without express written consent.`;
  }
  if (lower.includes('confidential')) {
    return `The document defines protected information and specifies ongoing duties to prevent disclosure to third parties.`;
  }
  if (lower.includes('compete') || lower.includes('non-compete')) {
    return `The document contains post-relationship restrictions on competing business activities. You may want to review state-specific enforceability with counsel.`;
  }

  // General faithful summary from first 2 sentences
  const sentences = cleanText.split(/(?<=[.?!])\s+/);
  if (sentences.length > 0 && sentences[0].length > 15) {
    return `The document states: ${sentences.slice(0, 2).join(' ')}`;
  }
  return `This section details terms regarding ${title.toLowerCase()}.`;
}

// Intelligent Legal Pattern Matchers
export function extractClausesFromText(rawText: string): Clause[] {
  const lines = rawText.split('\n');
  const clauses: Clause[] = [];
  let currentClause: Partial<Clause> | null = null;
  let pageNumber = 1;

  // Recognized Roman numerals 1-20
  const romanNumeralRegex = /^(?:X{0,3})(?:IX|IV|V?I{0,3})$/i;

  // Patterns to skip signature tables, approval blocks, and multi-column metadata
  const skipHeaderPatterns = [
    /\bAPPROVED AS TO (?:INSURANCE|FORM)\b/i,
    /\bDISTRIBUTION:\s/i,
    /\bIN WITNESS WHEREOF\b/i,
    /^\s*(?:By|Date|Signature|Title|Witness):\s*_{2,}/i,
    /\b1\.\s+CONSULTANT\s+2\.\s+/i, // multi-column signature block
  ];

  for (let i = 0; i < lines.length; i++) {
    let line = lines[i].trim();
    if (!line) continue;

    // Track page numbers if marked in OCR / document text / pdfExtractor
    const pageMarkerMatch = line.match(/^\[?Page\s+(\d+)\]?/i) || line.match(/Page\s+(\d+)\s+o\s*f\s+\d+/i);
    if (pageMarkerMatch) {
      pageNumber = parseInt(pageMarkerMatch[1], 10);
      continue;
    }

    // Skip executed contract form data summary block from being treated as a clause
    if (line.includes('--- EXECUTED CONTRACT FORM DATA ---')) {
      if (currentClause && currentClause.rawText) {
        const title = currentClause.title || `Clause ${clauses.length + 1}`;
        const raw = currentClause.rawText.trim();
        clauses.push({
          id: `c-${clauses.length + 1}`,
          number: currentClause.number || `${clauses.length + 1}`,
          title,
          pageNumber: currentClause.pageNumber || pageNumber,
          rawText: raw,
          explanation: generateGroundedClauseSummary(title, raw)
        });
        currentClause = null;
      }
      break;
    }

    // Normalize common OCR symbol misreads:
    // E.g., "§" or "§ " or "5 " followed by section numbers
    let normalized = line.replace(/^[§\u00A7]\s*/, 'SECTION ');
    normalized = normalized.replace(/^5\s+(\d+)[\.\s:]/, 'SECTION $1 '); // OCR turning § into 5

    // Check if line should be skipped from starting a new clause
    const isSignatureOrMeta = skipHeaderPatterns.some(pat => pat.test(normalized));
    if (isSignatureOrMeta) {
      if (currentClause) {
        currentClause.rawText = (currentClause.rawText || '') + line + ' ';
      }
      continue;
    }

    // Match section headers:
    // 1. Explicit: "SECTION 1. TITLE" / "SECTION 1: TITLE" / "SECTION I. TITLE" / "ATTACHMENT A"
    const explicitSectionMatch = normalized.match(/^(?:SECTION|ARTICLE|CLAUSE|PARAGRAPH|ATTACHMENT|EXHIBIT)\s+([A-Z0-9IVXLCDM]+)[\.\s:—\-]+([A-Za-z0-9\s,–—'’\-\/]{2,80}?)(?:\s*[\.\:—\-]\s+(.*)|$)/i);
    
    // 2. Numbered inline or standalone: "1. THE PARTIES . Body text..." or "4. RENT . The rent..." or "7. SECURITY DEPOSIT ."
    const numberedInlineMatch = !explicitSectionMatch 
      ? normalized.match(/^(\d{1,3})[\.\s:—\-]+([A-Z][A-Za-z0-9\s,–—'’\-\/&]{2,60}?)(?:\s*[\.\:—\-]\s+(.*)|$)/)
      : null;

    let matchNumber: string | null = null;
    let matchTitle: string | null = null;
    let remainingBody: string | null = null;

    if (explicitSectionMatch) {
      const candidateNum = explicitSectionMatch[1].trim();
      const candidateTitle = explicitSectionMatch[2].trim();
      const rest = explicitSectionMatch[3] ? explicitSectionMatch[3].trim() : null;
      // Ensure candidate number is valid (digits, Roman numeral, or single uppercase letter)
      if (/^\d+$/.test(candidateNum) || romanNumeralRegex.test(candidateNum) || /^[A-Z]$/i.test(candidateNum)) {
        if (!/\b[2-9]\.\s+[A-Z]/.test(candidateTitle)) {
          matchNumber = candidateNum;
          matchTitle = candidateTitle;
          remainingBody = rest;
        }
      }
    } else if (numberedInlineMatch) {
      const candidateNum = numberedInlineMatch[1].trim();
      let candidateTitle = numberedInlineMatch[2].trim();
      const rest = numberedInlineMatch[3] ? numberedInlineMatch[3].trim() : null;

      if (!/\b[2-9]\.\s+[A-Z]/.test(candidateTitle)) {
        // Clean up spaces like "DE P O SI T" -> "DEPOSIT" if words are split by single spaces
        if (/^[A-Z\s]{3,}$/.test(candidateTitle)) {
          candidateTitle = candidateTitle.replace(/([A-Z])\s+(?=[A-Z]\b)/g, '$1');
        }
        matchNumber = candidateNum;
        matchTitle = candidateTitle;
        remainingBody = rest;
      }
    }

    if (matchNumber && matchTitle) {
      // Clean up title: remove trailing punctuation or leading colons
      let cleanTitle = matchTitle.replace(/^[:.—\-–\s]+/, '').replace(/[:.—\-–\s]+$/, '').trim();
      if (!cleanTitle || cleanTitle.length < 2) {
        cleanTitle = `Section ${matchNumber}`;
      }

      if (currentClause && currentClause.rawText) {
        const title = currentClause.title || `Clause ${clauses.length + 1}`;
        const raw = currentClause.rawText.trim();
        clauses.push({
          id: `c-${clauses.length + 1}`,
          number: currentClause.number || `${clauses.length + 1}`,
          title,
          pageNumber: currentClause.pageNumber || 1,
          rawText: raw,
          explanation: generateGroundedClauseSummary(title, raw)
        });
      }

      currentClause = {
        number: matchNumber,
        title: cleanTitle,
        pageNumber,
        rawText: remainingBody ? remainingBody + '\n' : '',
      };
    } else if (currentClause) {
      currentClause.rawText = (currentClause.rawText || '') + line + ' ';
    } else {
      // Preamble or title before first section
      currentClause = {
        number: 'Preamble',
        title: line.length > 50 ? line.substring(0, 50) : line,
        pageNumber,
        rawText: line + '\n'
      };
    }
  }

  if (currentClause && currentClause.rawText) {
    const title = currentClause.title || `Clause ${clauses.length + 1}`;
    const raw = currentClause.rawText.trim();
    clauses.push({
      id: `c-${clauses.length + 1}`,
      number: currentClause.number || `${clauses.length + 1}`,
      title,
      pageNumber: currentClause.pageNumber || pageNumber,
      rawText: raw,
      explanation: generateGroundedClauseSummary(title, raw)
    });
  }

  // Fallback if no clear numbered sections found (or only a single preamble with multiple paragraphs): split by paragraphs
  if (clauses.length === 0 || (clauses.length === 1 && clauses[0].number === 'Preamble')) {
    const paragraphs = rawText.split(/\n\s*\n/).map(p => p.trim()).filter(p => p.length > 30);
    if (paragraphs.length > 1) {
      clauses.length = 0; // Clear the single preamble clause
      paragraphs.forEach((p, idx) => {
        const firstLine = p.split('\n')[0].substring(0, 50).replace(/[:.—\-–\s]+$/, '');
        clauses.push({
          id: `c-${idx + 1}`,
          number: `${idx + 1}`,
          title: firstLine || `Clause ${idx + 1}`,
          pageNumber: Math.floor(idx / 3) + 1,
          rawText: p,
          explanation: generateGroundedClauseSummary(firstLine, p)
        });
      });
    }
  }

  return clauses;
}

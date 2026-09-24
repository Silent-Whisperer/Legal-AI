import { Clause, DocumentAnalysis } from './types.ts';
import { analyzeWithOpenRouter } from './openrouter.ts';
import { extractClausesFromText, generateGroundedClauseSummary } from './services/clauseExtractor.ts';
import { classifyDocumentNature, DocumentClassificationResult } from './services/classifier.ts';
import { computeIndianLegalChecks } from './services/indianLaw.ts';
import { analysisCache, computeDocumentContentHash } from './services/cache.ts';
import { buildHeuristicAnalysis } from './services/heuristicAnalyzer.ts';

export { extractClausesFromText, generateGroundedClauseSummary };
export { classifyDocumentNature };
export type { DocumentClassificationResult };
export { computeIndianLegalChecks };
export { buildHeuristicAnalysis };

function fillAnalysisDefaults(
  analysis: DocumentAnalysis,
  docId: string,
  docTitle: string,
  rawText: string,
  clauses: Clause[]
): DocumentAnalysis {
  analysis.documentId = docId;
  analysis.documentTitle = docTitle;

  const isContractual = analysis.classificationNature === 'CONTRACTUAL';
  const heuristic = isContractual ? buildHeuristicAnalysis(docId, docTitle, rawText, clauses) : null;

  if (!analysis.criticalFlagsAndRisks || analysis.criticalFlagsAndRisks.length === 0) {
    analysis.criticalFlagsAndRisks = heuristic?.criticalFlagsAndRisks || [];
  }
  if (!analysis.timelineSequence || analysis.timelineSequence.length === 0) {
    analysis.timelineSequence = heuristic?.timelineSequence || [];
  }
  if (!analysis.lawyerDossier) {
    analysis.lawyerDossier = heuristic?.lawyerDossier || {
      executiveBrief: analysis.executiveSummary || '',
      questionsForCounsel: [],
      missingProtections: [],
      evidenceChecklist: [],
      unansweredAmbiguities: []
    };
  }
  if (!analysis.responsibilities) {
    analysis.responsibilities = heuristic?.responsibilities || { yourObligations: [], otherPartyObligations: [] };
  }
  if (!analysis.financialsAndDeadlines) {
    analysis.financialsAndDeadlines = heuristic?.financialsAndDeadlines || [];
  }
  if (!analysis.terminationAndExit) {
    analysis.terminationAndExit = heuristic?.terminationAndExit || [];
  }
  if (!analysis.parties) {
    analysis.parties = heuristic?.parties || [];
  }
  if (!analysis.quickStats) {
    analysis.quickStats = heuristic?.quickStats || {
      termOrDuration: 'N/A',
      financialCommitment: 'N/A',
      depositOrCompensation: 'N/A',
      criticalFlagCount: analysis.criticalFlagsAndRisks.length,
      cautionFlagCount: 0
    };
  }
  if (!analysis.indianLegalChecks) {
    analysis.indianLegalChecks = computeIndianLegalChecks(rawText, docTitle, analysis.classificationNature);
  }
  if (!analysis.subjectMatterSummary && heuristic?.subjectMatterSummary) {
    analysis.subjectMatterSummary = heuristic.subjectMatterSummary;
  }
  if (!analysis.coreSubjectMatter && heuristic?.coreSubjectMatter) {
    analysis.coreSubjectMatter = heuristic.coreSubjectMatter;
  }
  if ((!analysis.documentType || analysis.documentType === 'OTHER') && heuristic?.documentType) {
    analysis.documentType = heuristic.documentType;
  }

  return analysis;
}

export async function analyzeLegalDocument(
  docId: string,
  docTitle: string,
  rawText: string,
  clauses: Clause[],
  apiKey?: string,
  targetLang: string = 'en',
  openRouterKey?: string
): Promise<DocumentAnalysis> {
  // 1. Try OpenRouter First if key available (User's preferred free-tier LLM engine, e.g. google/gemma-4-31b-it:free)
  const activeOrKey = openRouterKey || 
    (apiKey && apiKey.startsWith('sk-or-') ? apiKey : undefined) ||
    process.env.OPENROUTER_API_KEY ||
    (apiKey && !apiKey.startsWith('AIza') ? apiKey : undefined);

  // Check content-hash cache for instant retrieval
  const cacheKey = computeDocumentContentHash(rawText, targetLang, activeOrKey ? 'ai' : 'offline');
  const cached = analysisCache.get(cacheKey);
  if (cached) {
    console.log(`[Analyzer] Instant cache hit for document analysis (${docTitle}).`);
    return { ...cached, documentId: docId, documentTitle: docTitle };
  }

  if (activeOrKey) {
    try {
      console.log(`[Analyzer] Running deep document analysis via OpenRouter (${process.env.OPENROUTER_MODEL || 'openai/gpt-4o-mini'})...`);
      const aiPromise = analyzeWithOpenRouter(rawText, docTitle, clauses, activeOrKey, targetLang);
      const timeoutPromise = new Promise<null>((resolve) => setTimeout(() => resolve(null), 30000)); // 30s budget for fast LLM inference
      const orAnalysis = await Promise.race([aiPromise, timeoutPromise]);

      if (orAnalysis) {
        console.log('[Analyzer] OpenRouter analysis succeeded.');
        const result = fillAnalysisDefaults(orAnalysis, docId, docTitle, rawText, clauses);
        analysisCache.set(cacheKey, result);
        return result;
      }
    } catch (orErr) {
      console.warn('OpenRouter analysis failed, falling back to secondary providers:', orErr);
    }
  }

  // 2. Gemini fallback with realistic timeout
  const geminiKey = (apiKey && !apiKey.startsWith('sk-or-')) ? apiKey : process.env.GEMINI_API_KEY;
  if (geminiKey) {
    try {
      console.log('[Analyzer] Running deep document analysis via Gemini 1.5 Flash...');
      const geminiPromise = callGeminiAnalysis(rawText, geminiKey);
      const timeoutPromise = new Promise<null>((resolve) => setTimeout(() => resolve(null), 45000)); // 45s timeout
      const geminiAnalysis = await Promise.race([geminiPromise, timeoutPromise]);

      if (geminiAnalysis) {
        console.log('[Analyzer] Gemini analysis succeeded.');
        const result = fillAnalysisDefaults(geminiAnalysis, docId, docTitle, rawText, clauses);
        analysisCache.set(cacheKey, result);
        return result;
      }
    } catch (err) {
      console.warn('Gemini API call failed, falling back to heuristic legal intelligence engine:', err);
    }
  }

  console.log('[Analyzer] Using offline grounded heuristic intelligence engine.');
  const offlineResult = buildHeuristicAnalysis(docId, docTitle, rawText, clauses);
  analysisCache.set(cacheKey, offlineResult);
  return offlineResult;
}

async function callGeminiAnalysis(rawText: string, apiKey: string): Promise<DocumentAnalysis | null> {
  const prompt = `You are ClarityLegal, a legal information accessibility tool for ordinary people.
Analyze the following document objectively.

CLASSIFICATION RULES:
1. Determine classificationNature:
   - "CONTRACTUAL" if the document is an agreement, contract, lease, employment contract, NDA, or service contract with binding covenants.
   - "NON_CONTRACTUAL" if the document is a certificate, diploma, resume, transcript, invoice, receipt, or non-contractual text.
   - "UNCERTAIN" if the document is an ambiguous memorandum, loose notes, or fragment where legal enforceability cannot be determined. Never force an uncertain document into a contract classification.

2. If classificationNature is "NON_CONTRACTUAL":
   - documentType must be "NON_CONTRACTUAL_RECORD".
   - jurisdiction must be "Not Applicable (Non-Contractual Document)".
   - executiveSummary must state: "No contractual obligations were identified in this document."
   - quickStats must be: { "termOrDuration": "N/A", "financialCommitment": "None", "depositOrCompensation": "None", "criticalFlagCount": 0, "cautionFlagCount": 0 }.
   - responsibilities, financialsAndDeadlines, terminationAndExit, timelineSequence, and criticalFlagsAndRisks MUST be empty arrays [].
   - lawyerDossier must contain empty questions and empty protections.

3. If classificationNature is "UNCERTAIN":
   - documentType must be "UNCERTAIN".
   - jurisdiction must be "Undetermined / Inconclusive".
   - executiveSummary must state: "Document classification is uncertain. The system could not confidently verify whether this document constitutes an enforceable legal contract. No contractual obligations have been assumed."
   - quickStats must be: { "termOrDuration": "Uncertain", "financialCommitment": "Uncertain", "depositOrCompensation": "None identified", "criticalFlagCount": 0, "cautionFlagCount": 0 }.
   - responsibilities, timelineSequence, and criticalFlagsAndRisks MUST be empty arrays [].

Produce a strict JSON response conforming to this exact structure:
{
  "classificationNature": "CONTRACTUAL" | "NON_CONTRACTUAL" | "UNCERTAIN",
  "classificationExplanation": string,
  "documentType": "RESIDENTIAL_LEASE" | "EMPLOYMENT_AGREEMENT" | "NON_DISCLOSURE_AGREEMENT" | "SERVICE_AGREEMENT" | "FINANCIAL_LOAN" | "NON_CONTRACTUAL_RECORD" | "UNCERTAIN" | "OTHER",
  "jurisdiction": string,
  "overallRiskLevel": "HIGH" | "MODERATE" | "LOW",
  "executiveSummary": string,
  "quickStats": {
    "termOrDuration": string,
    "financialCommitment": string,
    "depositOrCompensation": string,
    "criticalFlagCount": number,
    "cautionFlagCount": number
  },
  "responsibilities": {
    "yourObligations": [
      { "id": string, "clauseId": string, "title": string, "description": string, "deadlineOrCondition": string, "clauseRef": string, "sourceQuote": string, "priority": "HIGH"|"STANDARD" }
    ],
    "otherPartyObligations": [
      { "id": string, "clauseId": string, "title": string, "description": string, "deadlineOrCondition": string, "clauseRef": string, "sourceQuote": string, "priority": "HIGH"|"STANDARD" }
    ]
  },
  "financialsAndDeadlines": [
    { "id": string, "clauseId": string, "label": string, "amount": string, "timing": string, "clauseRef": string, "consequenceOrLateFee": string }
  ],
  "terminationAndExit": [
    { "id": string, "clauseId": string, "condition": string, "noticePeriod": string, "penaltyOrConsequence": string, "clauseRef": string }
  ],
  "timelineSequence": [
    { "stepNumber": number, "clauseId": string, "phase": string, "title": string, "timeframe": string, "description": string, "requiredAction": string, "clauseRef": string, "status": "COMPLETED"|"UPCOMING"|"CONDITIONAL" }
  ],
  "criticalFlagsAndRisks": [
    {
      "id": string, "clauseId": string, "clauseRef": string, "category": string, "severity": "HIGH_RISK"|"CAUTION"|"SAFE",
      "title": string, "plainEnglishExplanation": string, "statutoryContext": string,
      "realWorldScenario": string, "suggestedRedline": string, "sourceQuote": string,
      "enforceabilityStatus": "REVIEW_RECOMMENDED"|"STATUTORY_CONFLICT"|"STANDARD_TERM"
    }
  ],
  "lawyerDossier": {
    "executiveBrief": string,
    "questionsForCounsel": [
      { "id": string, "clauseId": string, "question": string, "rationale": string, "statutoryCitation": string, "clauseRef": string, "riskSeverity": "HIGH_RISK"|"CAUTION" }
    ],
    "missingProtections": [
      { "id": string, "title": string, "category": string, "whyItMatters": string, "recommendedClauseToAdd": string, "statuteRef": string }
    ],
    "evidenceChecklist": [
      { "id": string, "label": string, "description": string, "collected": false, "priority": "HIGH"|"MEDIUM" }
    ],
    "unansweredAmbiguities": [string]
  }
}

Return ONLY raw JSON, with no markdown code fences.

DOCUMENT TEXT:
${rawText.substring(0, 150000)}
`;

  const response = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-goog-api-key': apiKey
    },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.1,
        responseMimeType: "application/json"
      }
    })
  });

  if (!response.ok) {
    throw new Error(`Gemini API error: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) return null;

  return JSON.parse(text);
}

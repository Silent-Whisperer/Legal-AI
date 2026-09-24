import { describe, it, expect, vi, beforeEach } from 'vitest';
import { 
  handleDocumentChat, 
  generateGroundedReply, 
  extractCitations, 
  callGeminiChat 
} from '../server/src/chatService.ts';
import { LegalDocument, ChatMessage } from '../server/src/types.ts';

describe('Document Chat Service & Context Isolation', () => {
  const docA: LegalDocument = {
    id: 'doc-alpha',
    title: 'Alpha Commercial Lease Agreement',
    filename: 'alpha_lease.pdf',
    fileType: 'application/pdf',
    uploadDate: '2026-09-24',
    totalPages: 5,
    rawText: 'Section 1: Premises. Section 2: Rent payment of $5,000 monthly due on the 1st.',
    isLegalDocument: true,
    clauses: [
      {
        id: 'c-a1',
        number: '1',
        title: 'Demised Premises',
        rawText: 'Landlord leases to Tenant Suite 400 at Alpha Tower.',
        pageNumber: 1
      },
      {
        id: 'c-a2',
        number: '2',
        title: 'Rent and Payment Terms',
        rawText: 'Tenant shall pay $5,000 per month on or before the first calendar day of each month.',
        pageNumber: 2
      }
    ],
    analysis: {
      documentId: 'doc-alpha',
      documentTitle: 'Alpha Commercial Lease Agreement',
      classificationNature: 'CONTRACTUAL',
      documentType: 'COMMERCIAL_LEASE',
      jurisdiction: 'State of New York',
      overallRiskLevel: 'LOW',
      executiveSummary: 'Standard commercial lease with $5,000 monthly rent.',
      quickStats: {
        termOrDuration: '12 months',
        financialCommitment: '$60,000',
        depositOrCompensation: '$10,000',
        criticalFlagCount: 0,
        cautionFlagCount: 0
      },
      responsibilities: { yourObligations: [], otherPartyObligations: [] },
      financialsAndDeadlines: [],
      terminationAndExit: [],
      timelineSequence: [],
      criticalFlagsAndRisks: [],
      lawyerDossier: {
        executiveBrief: 'Lease overview',
        questionsForCounsel: [],
        missingProtections: [],
        evidenceChecklist: [],
        unansweredAmbiguities: []
      }
    }
  };

  const docB: LegalDocument = {
    id: 'doc-beta',
    title: 'Beta Software Consulting Agreement',
    filename: 'beta_consulting.pdf',
    fileType: 'application/pdf',
    uploadDate: '2026-09-24',
    totalPages: 3,
    rawText: 'Section 10: Intellectual Property. Section 11: Non-solicitation of clients.',
    isLegalDocument: true,
    clauses: [
      {
        id: 'c-b1',
        number: '10',
        title: 'Intellectual Property Ownership',
        rawText: 'All client deliverables shall be considered work made for hire.',
        pageNumber: 2
      }
    ],
    analysis: {
      documentId: 'doc-beta',
      documentTitle: 'Beta Software Consulting Agreement',
      classificationNature: 'CONTRACTUAL',
      documentType: 'SERVICES_AGREEMENT',
      jurisdiction: 'State of California',
      overallRiskLevel: 'MEDIUM',
      executiveSummary: 'Consulting agreement with IP assignment.',
      quickStats: {
        termOrDuration: '6 months',
        financialCommitment: '$30,000',
        depositOrCompensation: 'None',
        criticalFlagCount: 1,
        cautionFlagCount: 0
      },
      responsibilities: { yourObligations: [], otherPartyObligations: [] },
      financialsAndDeadlines: [],
      terminationAndExit: [],
      timelineSequence: [],
      criticalFlagsAndRisks: [],
      lawyerDossier: {
        executiveBrief: 'Consulting overview',
        questionsForCounsel: [],
        missingProtections: [],
        evidenceChecklist: [],
        unansweredAmbiguities: []
      }
    }
  };

  it('strictly isolates document context and never leaks foreign document clauses', async () => {
    // Querying Doc A about rent
    const replyA = generateGroundedReply(docA, 'what is the monthly rent?');
    expect(replyA.content).toContain('Section 2');
    expect(replyA.content).toContain('Rent and Payment Terms');
    expect(replyA.citations.length).toBeGreaterThan(0);
    expect(replyA.citations[0].clauseRef).toBe('Section 2');

    // Querying Doc B about rent (which does not exist in Doc B)
    const replyB = generateGroundedReply(docB, 'what is the monthly rent?');
    expect(replyB.content).not.toContain('Alpha Tower');
    expect(replyB.content).not.toContain('Suite 400');
    expect(replyB.citations.length).toBe(0);
  });

  it('extracts verifiable clause citations matched to source document page numbers', () => {
    const aiAnswer = 'Under Section 1 (Demised Premises), the tenant is allocated Suite 400.';
    const citations = extractCitations(docA, aiAnswer);

    expect(citations.length).toBe(1);
    expect(citations[0].clauseRef).toBe('Section 1');
    expect(citations[0].clauseTitle).toBe('Demised Premises');
    expect(citations[0].pageNumber).toBe(1);
  });

  it('handles conversational follow-up questions with historical context', async () => {
    const history: ChatMessage[] = [
      { id: '1', role: 'user', content: 'Who are the parties?', timestamp: '10:00' },
      { id: '2', role: 'assistant', content: 'The landlord is Alpha Tower and the tenant is you.', timestamp: '10:01' }
    ];

    const reply = await handleDocumentChat(docA, 'And what is my rent obligation?', history);
    expect(reply).toBeDefined();
    expect(reply.role).toBe('assistant');
    expect(reply.content.length).toBeGreaterThan(10);
  });

  it('gracefully falls back to grounded intelligence when Gemini API fails', async () => {
    // Mock fetch to simulate Gemini 500 error
    const originalFetch = global.fetch;
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      json: async () => ({ error: 'Internal server error from Gemini' })
    } as any);

    try {
      const reply = await handleDocumentChat(docA, 'payment schedule', [], 'AIzaSyDummyKey');
      expect(reply).toBeDefined();
      expect(reply.role).toBe('assistant');
      expect(reply.content).toContain('Rent and Payment Terms');
    } finally {
      global.fetch = originalFetch;
    }
  });

  it('disclaims contractual obligations when document is classified as NON_CONTRACTUAL', () => {
    const nonContractualDoc: LegalDocument = {
      ...docA,
      analysis: {
        ...docA.analysis!,
        classificationNature: 'NON_CONTRACTUAL',
        documentType: 'NON_CONTRACTUAL_RECORD'
      }
    };

    const reply = generateGroundedReply(nonContractualDoc, 'What are my liabilities?');
    expect(reply.content).toContain('non-contractual record');
    expect(reply.content).toContain('No contractual obligations were identified');
    expect(reply.citations.length).toBe(0);
  });
});

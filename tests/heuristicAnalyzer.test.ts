import { describe, it, expect } from 'vitest';
import { buildHeuristicAnalysis } from '../server/src/services/heuristicAnalyzer.ts';
import { extractClausesFromText } from '../server/src/services/clauseExtractor.ts';

describe('Heuristic Legal Intelligence Analyzer', () => {
  it('correctly handles non-contractual records without generating obligations or false risks', () => {
    const text = 'UNIVERSITY OF DELAWARE. This is to certify that John Doe has completed Bachelor of Science in Computer Science. Awarded on May 20, 2023.';
    const clauses = extractClausesFromText(text);
    const result = buildHeuristicAnalysis('doc-cert', 'Diploma Certificate', text, clauses);

    expect(result.classificationNature).toBe('NON_CONTRACTUAL');
    expect(result.isLegalDocument).toBe(false);
    expect(result.stoppedAfterClassification).toBe(true);
    expect(result.quickStats.financialCommitment).toBe('None');
    expect(result.responsibilities.yourObligations).toHaveLength(0);
    expect(result.responsibilities.otherPartyObligations).toHaveLength(0);
    expect(result.criticalFlagsAndRisks).toHaveLength(0);
  });

  it('correctly handles uncertain memoranda conservatively', () => {
    const text = 'Meeting Notes: Discussion regarding potential partnership ideas for Q3 marketing brainstorm.';
    const clauses = extractClausesFromText(text);
    const result = buildHeuristicAnalysis('doc-notes', 'Meeting Notes', text, clauses);

    expect(result.classificationNature).toBe('UNCERTAIN');
    expect(result.documentType).toBe('UNCERTAIN');
    expect(result.responsibilities.yourObligations).toHaveLength(0);
    expect(result.criticalFlagsAndRisks).toHaveLength(0);
    expect(result.lawyerDossier.questionsForCounsel.length).toBeGreaterThan(0);
  });

  it('accurately parses a residential lease agreement and extracts grounded metadata and risk flags', () => {
    const text = `
      RESIDENTIAL LEASE AGREEMENT
      This agreement is entered into between Jane Smith (Landlord) and Robert Brown (Tenant).
      1. Premises: Located at Flat 402, Green Valley Apartments, Bangalore, Karnataka.
      2. Term: The lease shall be for a duration of 11 months commencing from October 1, 2024.
      3. Rent & Deposit: Monthly rent shall be INR 25,000 payable by the 5th of each month. Tenant shall deposit INR 50,000 as refundable security deposit.
      4. Indemnification: Tenant shall indemnify and hold harmless the Landlord from all liabilities, claims, and damages arising out of negligence or property use.
      5. Inspection: Landlord may enter the premises for routine inspection upon giving 4 hours prior notice.
    `;
    const clauses = extractClausesFromText(text);
    const result = buildHeuristicAnalysis('doc-lease', 'Bangalore Residential Lease', text, clauses);

    expect(result.classificationNature).toBe('CONTRACTUAL');
    expect(result.documentType).toBe('RESIDENTIAL_LEASE');
    expect(result.parties.length).toBeGreaterThanOrEqual(2);
    expect(result.financialsAndDeadlines.some(f => f.amount.includes('25,000') || f.amount.includes('50,000'))).toBe(true);
    // Should detect broad indemnification and 4 hours short entry notice
    expect(result.criticalFlagsAndRisks.some(f => f.id === 'rf-indemnity')).toBe(true);
    expect(result.criticalFlagsAndRisks.some(f => f.id === 'rf-entry')).toBe(true);
    expect(result.lawyerDossier.questionsForCounsel.length).toBeGreaterThan(0);
  });

  it('accurately extracts court judgments and judicial proceedings', () => {
    const text = `
      IN THE HIGH COURT AT CALCUTTA
      ORIGINAL SIDE
      COMMERCIAL DIVISION
      AP (COM) No. 425 of 2024
      BEFORE HON'BLE JUSTICE SUBRATA TALUKDAR
      
      ABC Infrastructure Pvt. Ltd. ... Petitioner
      VERSUS
      National Highway Authority of India ... Respondent
      
      1. The petitioner prays for the appointment of a sole arbitrator under Section 11(6) of the Arbitration & Conciliation Act, 1996.
    `;
    const clauses = extractClausesFromText(text);
    const result = buildHeuristicAnalysis('doc-judgment', 'Calcutta HC Arbitration Order', text, clauses);

    expect(result.documentType).toBe('COURT_JUDGMENT_OR_ORDER');
    expect(result.executiveSummary).toContain('High Court');
    expect(result.parties.some(p => /petitioner|appellant/i.test(p.role))).toBe(true);
    expect(result.parties.some(p => /respondent/i.test(p.role))).toBe(true);
  });
});

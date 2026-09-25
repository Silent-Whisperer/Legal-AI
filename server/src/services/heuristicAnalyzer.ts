import { Clause, DocumentAnalysis, RiskFlag, ObligationItem, FinancialItem, TerminationItem, TimelineMilestone, LawyerDossier, PartyEntity } from '../types.ts';
import { classifyDocumentNature } from './classifier.ts';
import { computeIndianLegalChecks } from './indianLaw.ts';

function extractGroundedExecutiveSummary(
  rawText: string,
  docTitle: string,
  docType: DocumentAnalysis['documentType'],
  parties: PartyEntity[],
  jurisdiction: string,
  extractedTerm: string,
  financialsAndDeadlines: FinancialItem[],
  criticalFlags: RiskFlag[]
): { subjectMatterSummary: string; executiveSummary: string; coreSubjectMatter: string } {
  const p1 = parties[0]?.name || '';
  const p2 = parties[1]?.name || '';

  // 1. COURT JUDGMENTS & LEGAL PETITIONS
  if (docType === 'COURT_JUDGMENT_OR_ORDER' || docType === 'LEGAL_PETITION_OR_PLEADING') {
    const courtMatch = rawText.match(/IN\s+THE\s+HIGH\s+COURT\s+(?:AT|OF)\s+([A-Z\s]+?)(?:\r?\n|ORIGINAL|APPELLATE)/i);
    const courtName = courtMatch ? 'High Court at ' + courtMatch[1].trim().replace(/\s+/g, ' ') : jurisdiction;

    const benchMatch = rawText.match(/(?:BEFORE\s*[:-]?\s*(?:THE\s+)?HON'?BLE\s+JUSTICE|Bench\s*:\s*|Author\s*:\s*)([A-Z][a-zA-Z\s.]+?)(?:\r?\n|AP\s*\(|\(|\.|\n)/i);
    const benchName = benchMatch ? benchMatch[1].trim().replace(/^Justice\s+/i, '') : '';

    const caseMatch = rawText.match(/\b(AP\s*\([A-Z\s]+\)\s*No\.?[-–\s]*\d+\s*of\s*\d{4}|W\.?P\.?\s*\([A-Za-z\s]*\)\s*No\.?\s*[-–\s]*\d+\s*of\s*\d{4}|Civil\s+Appeal\s+No\.?[-–\s]*\d+\s*of\s*\d{4}|SLP\s*\([A-Za-z\s]*\)\s*No\.?[-–\s]*\d+\s*of\s*\d{4}|Arbitration\s+Petition\s+No\.?[-–\s]*\d+\s*of\s*\d{4}|Suit\s+No\.?[-–\s]*\d+\s*of\s*\d{4})/i);
    const caseNumber = caseMatch ? caseMatch[1].trim() : '';

    const petitionerParty = parties.find(p => /petitioner|appellant|plaintiff|applicant/i.test(p.role));
    const respondentParty = parties.find(p => /respondent|defendant|opposite\s+party/i.test(p.role));
    const petitionerName = petitionerParty?.name || p1 || 'Petitioner';
    const respondentName = respondentParty?.name || p2 || 'Respondent';

    const prayerMatch = rawText.match(/\b\d+\.\s*(The\s+petitioner\s+prays?[^\n\r]+(?:\r?\n[^\n\r]+)?)/i)
      || rawText.match(/(?:prays?\s+for|prays\s+that|praying\s+for|application\s+(?:is\s+)?filed\s+(?:for|under))\s+([^\n\r.]{10,180})/i);
    
    let prayer = prayerMatch ? prayerMatch[1].trim().replace(/\s+/g, ' ') : '';
    if (prayer.length > 200) {
      prayer = prayer.substring(0, 197) + '...';
    }

    const coreSubjectMatter = prayer
      ? prayer.replace(/^The\s+petitioner\s+prays?\s+for\s+/i, 'Appointment / relief for ')
      : 'Arbitration dispute settlement and statutory adjudication';

    const subjectMatterSummary = docType === 'COURT_JUDGMENT_OR_ORDER'
      ? `This document is an official High Court Commercial Division Judgment / Judicial Order (${caseNumber || docTitle}) delivered under ${courtName}${benchName ? ` before Hon'ble Justice ${benchName}` : ''}. The litigation involves Petitioner ${petitionerName} and Respondent ${respondentName}, concerning ${prayer || 'the appointment of an arbitral tribunal and settlement of contractual disputes'}.`
      : `This document is a formal Legal Petition / Court Pleading (${caseNumber || docTitle}) filed under ${courtName}. Petitioner ${petitionerName} has filed against Respondent ${respondentName}, praying for ${prayer || 'appropriate judicial relief and interim orders'}.`;

    const executiveSummary = `This document constitutes an official judicial record delivered by ${courtName} in matter ${caseNumber || docTitle}. The litigation arose between ${petitionerName} (Petitioner) and ${respondentName} (Respondent) regarding ${prayer || 'commercial and contractual disagreements'}. The Court evaluated statutory requirements under the Arbitration & Conciliation Act and commercial insolvency provisions (IBC) to determine the binding nature of dispute resolution covenants on successor entities. Review the procedural timeline and legal dossier for active steps.`;

    return { subjectMatterSummary, executiveSummary, coreSubjectMatter };
  }

  // 2. RESIDENTIAL OR COMMERCIAL LEASE
  if (docType === 'RESIDENTIAL_LEASE' || docType === 'COMMERCIAL_LEASE') {
    const isCommercial = docType === 'COMMERCIAL_LEASE';
    const propMatch = rawText.match(/(?:premises|property|apartment|flat|unit|house|shop|office)\s*(?:located|situated)?\s*(?:at|known\s+as|bearing)?\s*[:]?\s*([A-Za-z0-9\s,.\-#\/]{5,80}?)(?:\.|\n|together\s+with|comprising)/i);
    const propAddress = propMatch ? propMatch[1].trim().replace(/\s+/g, ' ') : '';
    const primaryAmount = financialsAndDeadlines[0]?.amount || '';

    const landlord = parties.find(p => /landlord|lessor|owner/i.test(p.role))?.name || p1 || 'Landlord';
    const tenant = parties.find(p => /tenant|lessee|resident/i.test(p.role))?.name || p2 || 'Tenant';

    const coreSubjectMatter = `Lease of ${isCommercial ? 'commercial premises' : 'residential property'}${propAddress ? ` at ${propAddress}` : ''} for ${extractedTerm} at ${primaryAmount || 'agreed rent'}`;

    const subjectMatterSummary = `This document is a ${isCommercial ? 'Commercial' : 'Residential'} Lease Agreement between Landlord ${landlord} and Tenant ${tenant} for property ${propAddress ? `located at ${propAddress}` : 'specified in the agreement'}, establishing a term of ${extractedTerm} with agreed rent of ${primaryAmount || 'stipulated monthly installments'}.`;

    const flagsNotice = criticalFlags.length > 0
      ? ` Key provisions requiring attention include: ${criticalFlags.map(f => f.title).join(', ')}.`
      : '';

    const executiveSummary = `This agreement defines binding bilateral tenancy commitments between Landlord ${landlord} and Tenant ${tenant} under ${jurisdiction}. It outlines monthly rent (${primaryAmount || 'stipulated rent'}), security deposit terms, maintenance duties, and rules governing early termination or renewal.${flagsNotice} Review the responsibility matrix to verify notice periods and inspection obligations before signing.`;

    return { subjectMatterSummary, executiveSummary, coreSubjectMatter };
  }

  // 3. EMPLOYMENT AGREEMENT
  if (docType === 'EMPLOYMENT_AGREEMENT') {
    const roleMatch = rawText.match(/(?:appointed|employed|hired|services\s+as|position\s+of|role\s+of|designation\s*[:]?)\s*([A-Za-z\s]{3,40})/i);
    const empRole = roleMatch ? roleMatch[1].trim() : 'designated employee';
    const employer = parties.find(p => /employer|company/i.test(p.role))?.name || p1 || 'Employer';
    const employee = parties.find(p => /employee/i.test(p.role))?.name || p2 || 'Employee';
    const primaryAmount = financialsAndDeadlines[0]?.amount || '';

    const coreSubjectMatter = `Employment of ${employee} as ${empRole} by ${employer}`;
    const subjectMatterSummary = `This document is an Employment Agreement between ${employer} and ${employee}, offering the position of ${empRole} with designated compensation of ${primaryAmount || 'stipulated CTC'} and outlining operational covenants and termination notice requirements.`;

    const flagsNotice = criticalFlags.length > 0
      ? ` Notable legal points for review include: ${criticalFlags.map(f => f.title).join(', ')}.`
      : '';

    const executiveSummary = `This contract establishes an employment relationship between ${employer} and ${employee} under ${jurisdiction}. It governs job responsibilities, compensation structure (${primaryAmount || 'agreed salary'}), confidentiality, intellectual property ownership, and resignation notice terms.${flagsNotice} Review restrictive covenants and probation periods carefully.`;

    return { subjectMatterSummary, executiveSummary, coreSubjectMatter };
  }

  // 4. SERVICE OR VENDOR AGREEMENT
  if (docType === 'SERVICE_AGREEMENT') {
    const srvMatch = rawText.match(/(?:scope\s+of\s+services?|services\s+to\s+be\s+provided|provision\s+of)\s*[:]?\s*([^\n\r.]{10,120})/i);
    const srvScope = srvMatch ? srvMatch[1].trim().replace(/\s+/g, ' ') : 'commercial services';
    const provider = parties.find(p => /provider|contractor|vendor|transporter/i.test(p.role))?.name || p1 || 'Service Provider';
    const client = parties.find(p => /client|customer|company/i.test(p.role))?.name || p2 || 'Client';
    const primaryAmount = financialsAndDeadlines[0]?.amount || '';

    const coreSubjectMatter = `Provision of ${srvScope} by ${provider} to ${client}`;
    const subjectMatterSummary = `This document is a Service Agreement between ${provider} and ${client} for ${srvScope}, establishing payment terms of ${primaryAmount || 'stipulated milestone rates'} and service performance covenants under ${jurisdiction}.`;

    const flagsNotice = criticalFlags.length > 0
      ? ` Attention is recommended on: ${criticalFlags.map(f => f.title).join(', ')}.`
      : '';

    const executiveSummary = `This agreement establishes a commercial services relationship between ${provider} and ${client} under ${jurisdiction}. It delineates deliverables, payment milestones (${primaryAmount || 'per schedule'}), intellectual property rights, and liability caps.${flagsNotice} Review service level commitments and termination clauses.`;

    return { subjectMatterSummary, executiveSummary, coreSubjectMatter };
  }

  // 5. NON-DISCLOSURE AGREEMENT (NDA)
  if (docType === 'NON_DISCLOSURE_AGREEMENT') {
    const party1 = p1 || 'Disclosing Party';
    const party2 = p2 || 'Receiving Party';
    const coreSubjectMatter = `Confidentiality and non-disclosure commitments between ${party1} and ${party2}`;
    const subjectMatterSummary = `This document is a Non-Disclosure Agreement (NDA) between ${party1} and ${party2}, establishing legally binding duties of confidentiality and restrictions on proprietary disclosure under ${jurisdiction}.`;

    const executiveSummary = `This non-disclosure agreement protects proprietary information shared between ${party1} and ${party2} under ${jurisdiction}. It specifies the definition of confidential data, permitted business uses, exceptions (such as court-ordered disclosure), and the duration of secrecy obligations.`;

    return { subjectMatterSummary, executiveSummary, coreSubjectMatter };
  }

  // 6. FINANCIAL LOAN
  if (docType === 'FINANCIAL_LOAN') {
    const lender = parties.find(p => /lender|bank|creditor/i.test(p.role))?.name || p1 || 'Lender';
    const borrower = parties.find(p => /borrower|debtor/i.test(p.role))?.name || p2 || 'Borrower';
    const primaryAmount = financialsAndDeadlines[0]?.amount || '';

    const coreSubjectMatter = `Loan facility of ${primaryAmount || 'principal sum'} extended by ${lender} to ${borrower}`;
    const subjectMatterSummary = `This document is a Loan & Financial Credit Agreement between Lender ${lender} and Borrower ${borrower} for ${primaryAmount || 'specified principal financing'} under ${jurisdiction}.`;

    const executiveSummary = `This loan agreement establishes financial commitments between ${lender} and ${borrower} under ${jurisdiction}. It defines interest rate structures, repayment installments (${primaryAmount || 'per schedule'}), default remedies, and collateral security provisions.`;

    return { subjectMatterSummary, executiveSummary, coreSubjectMatter };
  }

  // 7. POWER OF ATTORNEY
  if (docType === 'POWER_OF_ATTORNEY') {
    const principal = p1 || 'Principal';
    const agent = p2 || 'Attorney-in-Fact';
    const coreSubjectMatter = `Grant of legal power of attorney from ${principal} to ${agent}`;
    const subjectMatterSummary = `This document is a Power of Attorney executed by ${principal} appointing ${agent} as legal attorney-in-fact with designated powers under ${jurisdiction}.`;
    const executiveSummary = `This legal instrument authorizes ${agent} to act in the name of and on behalf of ${principal} for specified transactions, filings, or administrative duties under ${jurisdiction}. Review the specific scope and revocability of the granted powers.`;

    return { subjectMatterSummary, executiveSummary, coreSubjectMatter };
  }

  // 8. SETTLEMENT AGREEMENT
  if (docType === 'SETTLEMENT_AGREEMENT') {
    const party1 = p1 || 'First Party';
    const party2 = p2 || 'Second Party';
    const coreSubjectMatter = `Mutual settlement and compromise of claims between ${party1} and ${party2}`;
    const subjectMatterSummary = `This document is a Settlement & Mutual Release Agreement between ${party1} and ${party2} resolving ongoing disputes under ${jurisdiction}.`;
    const executiveSummary = `This agreement records the compromise of claims between ${party1} and ${party2} under ${jurisdiction}. It outlines release of legal liabilities, payment or resolution milestones, and final discharge of disputes.`;

    return { subjectMatterSummary, executiveSummary, coreSubjectMatter };
  }

  // 9. GENERAL / OTHER CONTRACT
  const party1 = p1 || 'First Party';
  const party2 = p2 || 'Second Party';
  const primaryAmount = financialsAndDeadlines[0]?.amount || '';
  const coreSubjectMatter = `Bilateral legal agreement between ${party1} and ${party2}`;
  const subjectMatterSummary = `This document is a legally binding bilateral agreement between ${party1} and ${party2} under ${jurisdiction}, establishing operational rights, payment covenants (${primaryAmount || 'standard terms'}), and reciprocal legal commitments.`;
  const executiveSummary = `This contract establishes binding commitments between ${party1} and ${party2} under ${jurisdiction}. Review the obligations matrix and timeline sequence to understand all operational milestones.`;

  return { subjectMatterSummary, executiveSummary, coreSubjectMatter };
}

export function buildHeuristicAnalysis(
  docId: string,
  docTitle: string,
  rawText: string,
  clauses: Clause[]
): DocumentAnalysis {
  const classification = classifyDocumentNature(rawText, docTitle, clauses);

  // 1. NON-CONTRACTUAL HANDLING: Never generate contract metrics or obligations
  if (classification.nature === 'NON_CONTRACTUAL') {
    return {
      documentId: docId,
      documentTitle: docTitle,
      classificationNature: 'NON_CONTRACTUAL',
      classificationExplanation: classification.explanation,
      isLegalDocument: false,
      stoppedAfterClassification: true,
      nonLegalCategory: classification.nonLegalCategory,
      detectedMetadata: classification.detectedMetadata,
      documentType: 'NON_CONTRACTUAL_RECORD',
      jurisdiction: 'Not Applicable (Non-Legal Document)',
      overallRiskLevel: 'LOW',
      executiveSummary: classification.explanation,
      quickStats: {
        termOrDuration: 'N/A',
        financialCommitment: 'None',
        depositOrCompensation: 'None',
        criticalFlagCount: 0,
        cautionFlagCount: 0
      },
      responsibilities: {
        yourObligations: [],
        otherPartyObligations: []
      },
      financialsAndDeadlines: [],
      terminationAndExit: [],
      timelineSequence: [],
      criticalFlagsAndRisks: [],
      lawyerDossier: {
        executiveBrief: `This document was evaluated as non-legal (${classification.nonLegalCategory || 'Non-Contractual Record'}). Contract analysis was stopped after classification.`,
        questionsForCounsel: [],
        missingProtections: [],
        evidenceChecklist: [],
        unansweredAmbiguities: []
      }
    };
  }

  // 2. UNCERTAIN HANDLING: Remain conservative, do not invent contract terms
  if (classification.nature === 'UNCERTAIN') {
    return {
      documentId: docId,
      documentTitle: docTitle,
      classificationNature: 'UNCERTAIN',
      classificationExplanation: classification.explanation,
      documentType: 'UNCERTAIN',
      jurisdiction: 'Undetermined / Inconclusive',
      overallRiskLevel: 'LOW',
      executiveSummary: classification.explanation,
      quickStats: {
        termOrDuration: 'Uncertain',
        financialCommitment: 'Uncertain',
        depositOrCompensation: 'None identified',
        criticalFlagCount: 0,
        cautionFlagCount: 0
      },
      responsibilities: {
        yourObligations: [],
        otherPartyObligations: []
      },
      financialsAndDeadlines: [],
      terminationAndExit: [],
      timelineSequence: [],
      criticalFlagsAndRisks: [],
      lawyerDossier: {
        executiveBrief: 'The legal status of this document is uncertain. If this document was intended to create legal commitments, review with qualified legal counsel is recommended.',
        questionsForCounsel: [
          {
            id: 'q-uncertain',
            question: 'Does this document establish a legally binding contractual relationship or is it merely an informal memorandum?',
            rationale: 'The document lacks explicit covenant or execution terminology standard in enforceable contracts.',
            statutoryCitation: 'General Contract Enforceability Standards',
            clauseRef: 'Entire Document',
            riskSeverity: 'CAUTION'
          }
        ],
        missingProtections: [],
        evidenceChecklist: [],
        unansweredAmbiguities: ['Whether the parties intended to create legally enforceable obligations']
      }
    };
  }

  // 3. CONTRACTUAL HANDLING: High-confidence binding agreement
  const lowerText = (rawText + ' ' + docTitle).toLowerCase();
  const isIndian = classification.isIndian;
  const docType = classification.documentType;
  const jurisdiction = classification.jurisdiction;

  const criticalFlags: RiskFlag[] = [];
  const questionsForCounsel: LawyerDossier['questionsForCounsel'] = [];
  const missingProtections: LawyerDossier['missingProtections'] = [];

  // Check: Indemnification
  if (lowerText.includes('indemnify') && (lowerText.includes('negligence') || lowerText.includes('hold harmless'))) {
    const matchClause = clauses.find(c => c.rawText.toLowerCase().includes('indemnif'));
    const flag: RiskFlag = {
      id: 'rf-indemnity',
      clauseId: matchClause?.id,
      clauseRef: matchClause ? `Section ${matchClause.number}` : 'Indemnification Clause',
      category: 'Liability & Indemnification',
      severity: 'HIGH_RISK',
      title: 'Broad Indemnification Scope',
      plainEnglishExplanation: 'This clause appears to require you to take financial responsibility for damages or liabilities, including situations involving the other party\'s ordinary negligence.',
      statutoryContext: isIndian 
        ? 'Under Section 124 of the Indian Contract Act 1872, indemnity contracts protect against loss caused by the promisor or third parties, but clauses attempting to indemnify against unlawful acts or gross negligence may conflict with public policy under Section 23.'
        : 'Under California Civil Code § 1953(a)(5), lease clauses that attempt to waive a landlord\'s duty of care or liability for negligence may be void as contrary to public policy.',
      realWorldScenario: 'If property damage occurs due to preexisting structural maintenance issues, this language could be cited to argue you should cover related costs.',
      suggestedRedline: 'Discuss adding language clarifying that indemnity does not apply to claims caused by the active negligence or willful misconduct of the other party.',
      sourceQuote: matchClause?.rawText.substring(0, 180) || 'Tenant shall indemnify, defend, and hold harmless...',
      enforceabilityStatus: 'REVIEW_RECOMMENDED'
    };
    criticalFlags.push(flag);
    if (matchClause) {
      matchClause.explanation = flag.plainEnglishExplanation;
    }

    questionsForCounsel.push({
      id: 'q-indemnity',
      clauseId: matchClause?.id,
      question: 'How is this indemnification language interpreted under applicable statutory duty of care standards?',
      rationale: 'Clauses requiring one party to indemnify against another\'s ordinary negligence may conflict with statutory public policy.',
      statutoryCitation: isIndian ? 'Indian Contract Act 1872 § 23' : 'Cal. Civ. Code § 1953(a)(5)',
      clauseRef: matchClause ? `Section ${matchClause.number}` : 'Indemnification',
      riskSeverity: 'HIGH_RISK'
    });
  }

  // Check: Entry Notice (Only if residential lease with short hours)
  if (docType === 'RESIDENTIAL_LEASE' && lowerText.includes('enter') && (lowerText.includes('hours') || lowerText.includes('inspection'))) {
    const matchClause = clauses.find(c => c.rawText.toLowerCase().includes('enter') || c.rawText.toLowerCase().includes('inspection'));
    if (/\b(?:4\s*hours?|four\s*hours?|12\s*hours?)\b/i.test(lowerText)) {
      const flag: RiskFlag = {
        id: 'rf-entry',
        clauseId: matchClause?.id,
        clauseRef: matchClause ? `Section ${matchClause.number}` : 'Entry Rights',
        category: 'Privacy & Entry Notice',
        severity: 'HIGH_RISK',
        title: 'Entry Notice Window',
        plainEnglishExplanation: 'The document states that the other party may enter the premises for routine visits with less than 24 hours advance written notice.',
        statutoryContext: isIndian
          ? 'Under the Model Tenancy Act, landlords must provide at least twenty-four (24) hours advance written notice before entering tenanted premises for non-emergency repairs or inspections.'
          : 'California Civil Code § 1954 generally establishes 24 hours written notice during normal business hours as reasonable for non-emergency entries.',
        realWorldScenario: 'You may receive short telephone notice for routine property showings or appraisals.',
        suggestedRedline: 'Discuss specifying at least twenty-four (24) hours advance written notice during normal business hours for non-emergencies.',
        sourceQuote: matchClause?.rawText.substring(0, 180) || 'Landlord reserves the right to enter...',
        enforceabilityStatus: 'STATUTORY_CONFLICT'
      };
      criticalFlags.push(flag);
      if (matchClause) {
        matchClause.explanation = flag.plainEnglishExplanation;
      }

      questionsForCounsel.push({
        id: 'q-entry',
        clauseId: matchClause?.id,
        question: 'What is the appropriate amendment to align the entry notice with statutory 24-hour written notice standards?',
        rationale: 'Statutory benchmarks establish 24 hours written notice for non-emergencies.',
        statutoryCitation: isIndian ? 'Model Tenancy Act § 15' : 'Cal. Civ. Code § 1954',
        clauseRef: matchClause ? `Section ${matchClause.number}` : 'Inspection & Entry',
        riskSeverity: 'HIGH_RISK'
      });
    }
  }

  // Check: Non-Compete
  if (/\b(?:non-compete|shall\s+not\s+compete|competing\s+business|restraint\s+of\s+trade)\b/i.test(lowerText)) {
    const matchClause = clauses.find(c => c.rawText.toLowerCase().includes('compete') || c.rawText.toLowerCase().includes('restraint'));
    const flag: RiskFlag = {
      id: 'rf-noncompete',
      clauseId: matchClause?.id,
      clauseRef: matchClause ? `Section ${matchClause.number}` : 'Non-Compete',
      category: 'Post-Employment Restraints',
      severity: 'HIGH_RISK',
      title: isIndian ? 'Post-Employment Non-Compete Restriction (Void in India)' : 'Post-Employment Non-Compete Restriction',
      plainEnglishExplanation: isIndian
        ? 'This clause attempts to forbid you from joining or consulting for competing companies after your employment ends. Under Indian law, post-employment non-compete covenants are legally void.'
        : 'The document contains restrictions on working with or consulting for competing businesses following departure.',
      statutoryContext: isIndian
        ? 'Under Section 27 of the Indian Contract Act 1872: "Every agreement by which anyone is restrained from exercising a lawful profession, trade or business of any kind, is to that extent void." The Supreme Court of India in Percept D\'Mark (India) Pvt. Ltd. v. Zaheer Khan (2006) affirmed that post-termination non-compete covenants are completely unenforceable.'
        : 'Under California Business & Professions Code § 16600, non-compete covenants in employment agreements are generally void under California law.',
      realWorldScenario: 'If you accept another position in your domain, the former employer cannot legally block your new employment under statutory precedent.',
      suggestedRedline: isIndian
        ? 'Request complete removal of the post-employment non-compete provision in accordance with Section 27 of the Indian Contract Act 1872.'
        : 'Discuss clarifying that non-compete restrictions terminate upon conclusion of active employment.',
      sourceQuote: matchClause?.rawText.substring(0, 180) || 'Employee agrees not to engage in competing business...',
      enforceabilityStatus: isIndian ? 'STATUTORY_CONFLICT' : 'REVIEW_RECOMMENDED'
    };
    criticalFlags.push(flag);
    if (matchClause) {
      matchClause.explanation = flag.plainEnglishExplanation;
    }

    questionsForCounsel.push({
      id: 'q-noncompete',
      clauseId: matchClause?.id,
      question: isIndian
        ? 'Can the employer enforce this post-termination non-compete given the absolute prohibition under Section 27 of the Indian Contract Act 1872?'
        : 'Does this restrictive covenant exceed enforceable limits under applicable labor law?',
      rationale: isIndian
        ? 'Indian courts consistently strike down post-employment non-compete covenants as void ab initio.'
        : 'Statutory rules limit the enforceability of post-departure business restraints.',
      statutoryCitation: isIndian ? 'Indian Contract Act 1872 § 27' : 'Cal. Bus. & Prof. Code § 16600',
      clauseRef: matchClause ? `Section ${matchClause.number}` : 'Restrictive Covenants',
      riskSeverity: 'HIGH_RISK'
    });
  }

  // Check: Lock-in Period & Deposit Forfeiture Penalty
  if (lowerText.includes('lock-in') || (lowerText.includes('forfeit') && lowerText.includes('deposit'))) {
    const matchClause = clauses.find(c => c.rawText.toLowerCase().includes('lock-in') || c.rawText.toLowerCase().includes('forfeit'));
    const flag: RiskFlag = {
      id: 'rf-lockin',
      clauseId: matchClause?.id,
      clauseRef: matchClause ? `Section ${matchClause.number}` : 'Lock-in & Termination',
      category: 'Termination & Forfeiture',
      severity: 'HIGH_RISK',
      title: isIndian ? 'Deposit Forfeiture & Lock-in Restriction (Review Section 74)' : 'Mandatory Lock-in & Deposit Forfeiture',
      plainEnglishExplanation: 'This clause imposes a mandatory lock-in period with automatic forfeiture of your security deposit upon early exit, regardless of whether actual damages occurred.',
      statutoryContext: isIndian
        ? 'Under Section 74 of the Indian Contract Act 1872 and landmark rulings (Fateh Chand v. Balkishan Dass; Kailash Nath Associates v. DDA), liquidated damages and forfeiture of security deposits are enforceable only to the extent of reasonable compensation for actual damage or loss proved, and cannot operate as an in terrorem penalty.'
        : 'Under standard contract law principles, forfeiture clauses must represent a genuine pre-estimate of loss rather than an unenforceable penalty.',
      realWorldScenario: 'If job relocation or unforeseen circumstances require you to vacate during the lock-in period, the landlord may attempt to confiscate your entire security deposit without accounting for replacement tenant timing.',
      suggestedRedline: 'Discuss amending to require reasonable notice (e.g., 1–2 months) or limiting forfeiture strictly to verified rent loss during re-letting.',
      sourceQuote: matchClause?.rawText.substring(0, 180) || 'There shall be an irrevocable lock-in period...',
      enforceabilityStatus: isIndian ? 'STATUTORY_CONFLICT' : 'REVIEW_RECOMMENDED'
    };
    criticalFlags.push(flag);
    if (matchClause) {
      matchClause.explanation = flag.plainEnglishExplanation;
    }

    questionsForCounsel.push({
      id: 'q-lockin',
      clauseId: matchClause?.id,
      question: isIndian
        ? 'Is the automatic forfeiture of the entire security deposit during the lock-in period enforceable without the landlord proving actual financial loss under Section 74 of the Indian Contract Act?'
        : 'Does the automatic deposit forfeiture clause constitute an unenforceable penalty under applicable tenancy laws?',
      rationale: 'Indian courts strictly require proof of actual loss before damages or deposit forfeiture can be sustained under Section 74.',
      statutoryCitation: isIndian ? 'Indian Contract Act 1872 § 74' : 'Restatement (Second) of Contracts § 356',
      clauseRef: matchClause ? `Section ${matchClause.number}` : 'Lock-in & Termination',
      riskSeverity: 'HIGH_RISK'
    });
  }

  // Check: Indian Registration Act 1908 Section 17 (12+ Month Lease Rule) - Strictly for leases
  if (isIndian && (docType === 'RESIDENTIAL_LEASE' || docType === 'COMMERCIAL_LEASE')) {
    const isTwelvePlusMonths = /\b(?:12\s*months?|24\s*months?|36\s*months?|1\s*year|2\s*years?|3\s*years?|three\s*years?|two\s*years?)\b/i.test(lowerText);
    if (isTwelvePlusMonths) {
      const matchClause = clauses.find(c => /\b(?:12\s*months?|24\s*months?|1\s*year|2\s*years?|term|duration|period)\b/i.test(c.rawText));
      const flag: RiskFlag = {
        id: 'rf-registration',
        clauseId: matchClause?.id,
        clauseRef: matchClause ? `Section ${matchClause.number}` : 'Term & Registration',
        category: 'Statutory Registration & Stamp Duty',
        severity: 'HIGH_RISK',
        title: 'Mandatory Registration Notice (Registration Act 1908 § 17)',
        plainEnglishExplanation: 'This agreement specifies a duration of 12 months or longer. Under Section 17(1)(d) of the Registration Act 1908, any lease exceeding 11 months must be compulsorily registered before the Sub-Registrar. An unregistered lease of 12+ months is inadmissible as primary legal evidence in court.',
        statutoryContext: 'Under Section 17(1)(d) and Section 49 of the Indian Registration Act 1908, leases of immovable property from year to year, or for any term exceeding one year, must be registered. Without registration, the document cannot affect any immovable property or be received as evidence of any transaction.',
        realWorldScenario: 'If a dispute arises over deposit refund or early eviction, Indian civil courts will not admit an unregistered 12-month lease as valid primary evidence of tenancy terms.',
        suggestedRedline: 'Discuss either completing formal Sub-Registrar registration with appropriate stamp duty, or structuring as an 11-month agreement if remaining unregistered.',
        sourceQuote: matchClause?.rawText.substring(0, 180) || 'Term of lease shall be 12 months...',
        enforceabilityStatus: 'STATUTORY_CONFLICT'
      };
      criticalFlags.push(flag);
      if (matchClause) {
        matchClause.explanation = flag.plainEnglishExplanation;
      }

      questionsForCounsel.push({
        id: 'q-registration',
        clauseId: matchClause?.id,
        question: 'Will this agreement be formally registered at the Sub-Registrar office, and who bears the registration fee and stamp duty?',
        rationale: 'Leases of 12 months or more are legally void as evidence of lease rights unless registered under Section 17 of the Registration Act 1908.',
        statutoryCitation: 'Registration Act 1908 § 17(1)(d) & § 49',
        clauseRef: matchClause ? `Section ${matchClause.number}` : 'Term & Registration',
        riskSeverity: 'HIGH_RISK'
      });
    }
  }

  // Check: Karnataka 10-Month / Excessive Deposit Benchmark
  if (isIndian && (docType === 'RESIDENTIAL_LEASE' || docType === 'COMMERCIAL_LEASE') && (lowerText.includes('karnataka') || lowerText.includes('bangalore') || lowerText.includes('bengaluru')) && (lowerText.includes('10 month') || lowerText.includes('ten month') || lowerText.includes('4,00,000') || lowerText.includes('400000') || (lowerText.includes('deposit') && lowerText.includes('lakh')))) {
    const matchClause = clauses.find(c => c.rawText.toLowerCase().includes('deposit') || c.rawText.toLowerCase().includes('security'));
    const flag: RiskFlag = {
      id: 'rf-karnataka-deposit',
      clauseId: matchClause?.id,
      clauseRef: matchClause ? `Section ${matchClause.number}` : 'Security Deposit',
      category: 'Deposit Regulation & Model Tenancy Act',
      severity: 'HIGH_RISK',
      title: 'Model Tenancy Act Deposit Cap Alert (Karnataka Benchmark)',
      plainEnglishExplanation: 'This agreement demands an extensive security deposit (customarily 10 months rent in Bengaluru). Under Section 11 of the Model Tenancy Act, residential security deposits are capped at a maximum of two months rent.',
      statutoryContext: 'Under the Model Tenancy Act (adopted in Karnataka), residential security deposits cannot legally exceed 2 months rent. While customary landlord practice in Bengaluru has historically demanded 10 months, statutory guidance renders excessive demands subject to dispute before the Rent Authority.',
      realWorldScenario: 'Upon vacating the premises, having 10 months worth of rent held as deposit creates severe liquidity risks and prolonged refund delays.',
      suggestedRedline: 'Request alignment of security deposit closer to the statutory 2-to-3 month benchmark.',
      sourceQuote: matchClause?.rawText.substring(0, 180) || 'Tenant agrees to deposit security deposit...',
      enforceabilityStatus: 'REVIEW_RECOMMENDED'
    };
    criticalFlags.push(flag);
    if (matchClause) {
      matchClause.explanation = flag.plainEnglishExplanation;
    }

    questionsForCounsel.push({
      id: 'q-karnataka-deposit',
      clauseId: matchClause?.id,
      question: 'Can the security deposit be renegotiated to 2-3 months rent in accordance with Section 11 of the Model Tenancy Act?',
      rationale: 'Bengaluru customary 10-month deposits exceed the Model Tenancy Act residential cap.',
      statutoryCitation: 'Karnataka Model Tenancy Act § 11',
      clauseRef: matchClause ? `Section ${matchClause.number}` : 'Security Deposit',
      riskSeverity: 'HIGH_RISK'
    });
  }

  // Check: Statutory Arbitration & Procedure (For Court Orders & Arbitration Petitions)
  if (docType === 'COURT_JUDGMENT_OR_ORDER' || docType === 'LEGAL_PETITION_OR_PLEADING') {
    if (lowerText.includes('arbitration') || lowerText.includes('arbitral') || lowerText.includes('section 11') || lowerText.includes('tribunal')) {
      const matchClause = clauses.find(c => c.rawText.toLowerCase().includes('arbitr') || c.title.toLowerCase().includes('arbitr'));
      const flag: RiskFlag = {
        id: 'rf-arbitration-procedure',
        clauseId: matchClause?.id,
        clauseRef: matchClause ? `Section ${matchClause.number}` : 'Arbitral Reference',
        category: 'Statutory Procedure & Arbitration Act',
        severity: 'HIGH_RISK',
        title: 'Statutory Limitation & Arbitral Mandate (Section 11 / 29A)',
        plainEnglishExplanation: 'This proceeding involves referral to statutory arbitration under the Arbitration & Conciliation Act 1996. The parties must adhere to statutory procedural milestones for appointing arbitrators, filing claims, and concluding the arbitration mandate.',
        statutoryContext: 'Under Section 11 and Section 29A of the Arbitration and Conciliation Act 1996, the arbitral tribunal is mandated to complete the reference within specified statutory timeframes (12 to 18 months). Any successor liability following corporate restructuring or insolvency (IBC) requires strict verification under Section 7 and 11.',
        realWorldScenario: 'Failure to file claims or comply with arbitral schedules within statutory limitation periods can bar recovery or forfeit dispute remedies.',
        suggestedRedline: 'Ensure timely representation before the designated Arbitral Tribunal and compliance with procedural orders.',
        sourceQuote: matchClause?.rawText.substring(0, 180) || 'The petitioner prays for appointment of an arbitral tribunal...',
        enforceabilityStatus: 'STANDARD_TERM'
      };
      criticalFlags.push(flag);
      if (matchClause) {
        matchClause.explanation = flag.plainEnglishExplanation;
      }

      questionsForCounsel.push({
        id: 'q-arbitration-procedure',
        clauseId: matchClause?.id,
        question: 'What are the procedural timelines for statement of claim and appointment confirmation under Section 11 of the Arbitration and Conciliation Act?',
        rationale: 'Arbitration timelines are strictly regulated under the 1996 Act as amended.',
        statutoryCitation: 'Arbitration and Conciliation Act 1996 § 11 & § 29A',
        clauseRef: matchClause ? `Section ${matchClause.number}` : 'Arbitral Reference',
        riskSeverity: 'HIGH_RISK'
      });
    }
  }

  // Extract Parties from Header / Preamble / Forms / Signatures
  const parties: PartyEntity[] = [];

  // Helper to add party uniquely
  const addParty = (rawName: string, role: string, clauseRef: string) => {
    const cleanName = rawName
      .replace(/[\r\n]+/g, ' ')
      .replace(/\s*\([^)]*\)/g, '')
      .replace(/^(?:the\s+)/i, '')
      .replace(/_+/g, '')
      .replace(/\b(?:Tenant|Landlord|Printed|Name|Signature)\b.*$/i, '')
      .trim();
    if (cleanName.length >= 2 && cleanName.length < 80 && !/^(?:name|address|signature|date|title|and|the)\b/i.test(cleanName)) {
      const alreadyPresent = parties.some(p => {
        const pLower = p.name.toLowerCase();
        const cLower = cleanName.toLowerCase();
        return pLower === cLower || pLower.includes(cLower) || cLower.includes(pLower);
      });
      if (!alreadyPresent) {
        parties.push({ name: cleanName, role, clauseRef });
      }
    }
  };

  // 0. Court Litigant & Judicial Entity Extraction
  if (docType === 'COURT_JUDGMENT_OR_ORDER' || docType === 'LEGAL_PETITION_OR_PLEADING') {
    // Bench / Presiding Judge
    const benchMatch = rawText.match(/(?:BEFORE\s*[:-]?\s*(?:THE\s+)?HON'?BLE\s+JUSTICE|Bench\s*:\s*|Author\s*:\s*)([A-Z][a-zA-Z\s.]+?)(?:\r?\n|AP\s*\(|\(|\.|\n)/i);
    if (benchMatch && benchMatch[1]) {
      const judgeName = benchMatch[1].trim().replace(/^Justice\s+/i, '');
      if (judgeName.length >= 3 && judgeName.length < 50) {
        addParty(`Hon'ble Justice ${judgeName}`, 'Presiding Judge / Bench', 'Title / Bench');
      }
    }

    // Petitioner / Appellant
    const petMatch = rawText.match(/(?:AP\s*\([^\)]+\)[^\n]*\n+|BEFORE[^\n]*\n+)\s*([A-Z\s.,'-]{3,60}?)\s*(?:\r?\n\s*)?(?:vs\.?|versus)\b/i) ||
                     rawText.match(/\b([A-Z\s.,'-]{3,60}?)\s*(?:\r?\n\s*)?(?:vs\.?|versus)\b/i);
    if (petMatch && petMatch[1]) {
      addParty(petMatch[1].trim(), 'Petitioner / Litigant', 'Header / Parties');
    }

    // Respondent / Defendant
    const respMatch = rawText.match(/(?:vs\.?|versus)\s*\r?\n?\s*([A-Z\s.,'&-]{3,90}?)(?:\r?\n\s*(?:For\s+the|Judgment|Before|\d+\.))/i);
    if (respMatch && respMatch[1]) {
      addParty(respMatch[1].trim(), 'Respondent / Counterparty', 'Header / Parties');
    }
  }

  // 1. Explicit Form Data / Key-Value Extraction (e.g. from AcroForms or structured blocks)
  const formLandlord = rawText.match(/Landlord\s*Name\s*:?\s*([A-Z][a-zA-Z\s,.'&-]+?)(?:\s*\n|$)/i);
  if (formLandlord) addParty(formLandlord[1], 'Landlord / Property Owner', 'Section 1 (Parties)');

  const formTenant = rawText.match(/Tenant\s*Name(?:\(s\))?\s*:?\s*([A-Z][a-zA-Z\s,.'&/]+?)(?:\s*\n|$)/i);
  if (formTenant) addParty(formTenant[1], 'Tenant / Resident', 'Section 1 (Parties)');

  // 2. Specific Landlord / Property Owner patterns in preamble
  if (parties.length === 0) {
    const landlordMatch = rawText.substring(0, 3000).match(/Landlord(?:\s+Name)?\s*:?[^a-zA-Z0-9]*([A-Z][a-zA-Z\s,.'&-]+?)(?:\s*[\"“'(]|\s*Landlord|\s*\n)/i);
    if (landlordMatch) addParty(landlordMatch[1], 'Landlord / Property Owner', 'Section 1 (Parties)');

    const tenantMatch = rawText.substring(0, 3000).match(/Tenant(?:\s+Name(?:\(s\))?)?\s*:?[^a-zA-Z0-9]*([A-Z][a-zA-Z\s,.'&/]+?)(?:\s*[\"“'(]|\s*Tenant|\s*\n)/i);
    if (tenantMatch) addParty(tenantMatch[1], 'Tenant / Resident', 'Section 1 (Parties)');
  }

  // 3. General Bilateral Preamble: "between [Party 1] and [Party 2]"
  const preambleMatch = rawText.substring(0, 3000).match(/(?:between|by\s+and\s+between)\s+([^\n\r]+?)(?:\s+and\s+|\s+AND\s+)\s*([^\n\r.]+)/i);
  if (preambleMatch) {
    const rawP1 = preambleMatch[1].trim();
    const rawP2 = preambleMatch[2].trim();
    const role1 = rawP1.match(/\(([^)]+)\)/)?.[1] || 'Primary Party / Provider';
    const role2 = rawP2.match(/\(([^)]+)\)/)?.[1] || 'Counterparty / Client';
    addParty(rawP1, role1, 'Preamble');
    addParty(rawP2, role2, 'Preamble');
  }

  // 4. Signature Block Printed Names Fallback
  const sigLandlord = rawText.match(/Landlord[’']?s?\s*Signature[^\n]*\n*(?:Printed\s*Name\s*:?\s*([A-Z][a-zA-Z\s,.'&-]+))/i);
  if (sigLandlord) addParty(sigLandlord[1], 'Landlord (Signatory)', 'Execution Block');

  const sigTenants = [...rawText.matchAll(/Tenant[’']?s?\s*Signature[^\n]*\n*(?:Printed\s*Name\s*:?\s*([A-Z][a-zA-Z\s,.'&-]+))/gi)];
  for (const st of sigTenants) {
    if (st[1]) addParty(st[1], 'Tenant (Signatory)', 'Execution Block');
  }

  // 5. Corporate Entities Fallback
  if (parties.length === 0) {
    const headerSnippet = docTitle + ' ' + (clauses[0]?.rawText || '') + ' ' + (clauses[1]?.rawText || '');
    const companyMatches = headerSnippet.match(/\b([A-Z][a-zA-Z0-9&.,'\s]{2,40}(?:Pvt\.?\s*Ltd\.?|LLC|Inc\.?|Corp\.?|Ltd\.?|Technologies|Solutions|Transports?))\b/g);
    if (companyMatches && companyMatches.length > 0) {
      const blacklist = ['scope of service', 'terms of service', 'service agreement', 'terms and conditions'];
      const unique = Array.from(new Set(companyMatches.map(m => m.trim()))).filter(m => !blacklist.some(b => m.toLowerCase().includes(b)));
      unique.slice(0, 2).forEach((name, idx) => {
        addParty(name, idx === 0 ? 'Service Provider / First Party' : 'Client / Counterparty', 'Preamble');
      });
    }
  }

  // Bilateral Obligations Extractor (Anchored with clauseId)
  const yourObligations: ObligationItem[] = [];
  const otherPartyObligations: ObligationItem[] = [];

  clauses.forEach((c) => {
    const txt = c.rawText.toLowerCase();
    if (/\b(?:tenant\s+agrees?|tenant\s+shall|employee\s+shall|recipient\s+shall|consultant\s+shall|buyer\s+shall|service\s+provider\s+shall|contractor\s+shall|transporter\s+shall|vendor\s+shall|operator\s+shall|driver\s+shall)\b/.test(txt)) {
      yourObligations.push({
        id: `yo-${c.id}`,
        clauseId: c.id,
        title: c.title,
        description: c.rawText.substring(0, 140) + '...',
        deadlineOrCondition: txt.includes('day') ? 'See clause for specific calendar deadline' : 'Ongoing contractual obligation',
        clauseRef: `Section ${c.number}`,
        sourceQuote: c.rawText.substring(0, 160),
        priority: 'STANDARD'
      });
    }
    if (/\b(?:landlord\s+shall|landlord\s+agrees?|company\s+shall|employer\s+shall|disclosing\s+party\s+shall|seller\s+shall|client\s+shall|customer\s+shall|passenger\s+shall)\b/.test(txt)) {
      otherPartyObligations.push({
        id: `opo-${c.id}`,
        clauseId: c.id,
        title: c.title,
        description: c.rawText.substring(0, 140) + '...',
        deadlineOrCondition: txt.includes('day') ? 'Statutory / contractual timing' : 'Ongoing duty',
        clauseRef: `Section ${c.number}`,
        sourceQuote: c.rawText.substring(0, 160),
        priority: 'STANDARD'
      });
    }
  });

  // Fallback: If obligations list is empty but clauses exist, harvest clauses with active covenants
  if (yourObligations.length === 0 && clauses.length > 0) {
    clauses.slice(0, 8).forEach((c) => {
      const txt = c.rawText.toLowerCase();
      if (/\b(?:shall|agrees?\s+to|must|undertakes?|responsible\s+for|will\s+provide|ensure)\b/.test(txt)) {
        yourObligations.push({
          id: `yo-${c.id}`,
          clauseId: c.id,
          title: c.title,
          description: c.rawText.substring(0, 140) + '...',
          deadlineOrCondition: 'Ongoing performance obligation',
          clauseRef: `Section ${c.number}`,
          sourceQuote: c.rawText.substring(0, 160),
          priority: 'STANDARD'
        });
      }
    });
  }

  // Extract Financials (Strict multi-currency detection requiring digits)
  const financialsAndDeadlines: FinancialItem[] = [];
  const moneyRegex = /(?:[\$₹€£]\s*\d+[\d,]*(?:\.\d{2})?|\b(?:Rs\.?|INR|USD|EUR|GBP)\s*\d+[\d,]*(?:\.\d{2})?)/gi;
  const moneyMatches = (rawText.match(moneyRegex) || []).map(m => m.trim());

  // Determine currency symbol if not prefixed
  const defaultCurrency = rawText.includes('$') || rawText.includes('USD') ? '$' : (rawText.includes('₹') || rawText.includes('INR') || rawText.includes('Rs') ? '₹' : '$');

  const formatAmount = (amt: string) => {
    let clean = amt.trim();
    if (!clean.startsWith('$') && !clean.startsWith('₹') && !clean.startsWith('€') && !clean.startsWith('£') && !clean.startsWith('Rs') && !clean.startsWith('USD')) {
      clean = `${defaultCurrency} ${clean}`;
    }
    return clean;
  };

  // 1. Detect explicit rent / periodic consideration
  const rentMatch = rawText.match(/(?:monthly\s+installments?\s+of|monthly\s+rent\s+of|rent\s+shall\s+be(?:\s+paid\s+in)?)\s*([\$₹€£]?\s*\d+[\d,]*(?:\.\d{2})?)/i)
    || rawText.match(/Monthly\s+Rent\s*(?:\(\$\))?\s*:?\s*([\$₹€£]?\s*\d+[\d,]*(?:\.\d{2})?)/i);

  // 2. Detect explicit security deposit / advance
  const depositMatch = rawText.match(/(?:security\s+deposit\s*(?:of|requires\s+a\s+payment\s+of)?|deposit\s+amount)\s*([\$₹€£]?\s*\d+[\d,]*(?:\.\d{2})?)/i)
    || rawText.match(/Security\s+Deposit\s+Amount\s*(?:\(\$\))?\s*:?\s*([\$₹€£]?\s*\d+[\d,]*(?:\.\d{2})?)/i);

  // 3. Detect term and duration dates
  const termDatesMatch = rawText.match(/(?:starting\s+on\s*([0-9\/\-]+)[\s\S]*?ending\s+on\s*([0-9\/\-]+))/i);
  const formTermStart = rawText.match(/Fixed\s+Lease\s*-\s*Start\s+Date\s*:?\s*([0-9\/\-]+)/i);
  const formTermEnd = rawText.match(/Fixed\s+Lease\s*-\s*End\s+Date\s*:?\s*([0-9\/\-]+)/i);

  let extractedTerm = '12 Months / Standard Term';
  if (formTermStart && formTermEnd) {
    extractedTerm = `12 Months (${formTermStart[1]} – ${formTermEnd[1]})`;
  } else if (termDatesMatch) {
    extractedTerm = `${termDatesMatch[1]} to ${termDatesMatch[2]}`;
  } else {
    const termMonthsMatch = rawText.match(/\b(\d{1,2})\s*(?:months?|years?)\b/i);
    if (termMonthsMatch) {
      extractedTerm = termMonthsMatch[0];
    }
  }

  const primaryRent = rentMatch ? formatAmount(rentMatch[1]) : (moneyMatches[0] || null);
  const securityDeposit = depositMatch ? formatAmount(depositMatch[1]) : (moneyMatches.find(m => m !== primaryRent) || null);

  const isCourtCase = docType === 'COURT_JUDGMENT_OR_ORDER' || docType === 'LEGAL_PETITION_OR_PLEADING';

  if (primaryRent) {
    const isMonthly = !isCourtCase && /\b(?:monthly|month|per\s+month|each\s+month)\b/i.test(rawText);
    const timing = isCourtCase ? 'Disputed claim under adjudication' : (isMonthly ? 'Monthly installments' : 'Per agreed schedule');
    const clauseMatch1 = clauses.find(c => c.rawText.includes(primaryRent.replace(/^[^\d]+/, '')) || c.title.toLowerCase().includes('rent') || c.title.toLowerCase().includes('payment'));
    financialsAndDeadlines.push({
      id: 'fin-1',
      clauseId: clauseMatch1?.id,
      label: isCourtCase ? 'Dispute / Referenced Claim Amount' : (docType === 'RESIDENTIAL_LEASE' ? 'Monthly Rent' : 'Primary Financial Commitment'),
      amount: primaryRent,
      timing,
      clauseRef: clauseMatch1 ? `Section ${clauseMatch1.number}` : (isCourtCase ? 'Dispute Reference' : 'Rent / Payment Terms')
    });
  }

  if (securityDeposit && !isCourtCase) {
    const clauseMatch2 = clauses.find(c => c.rawText.includes(securityDeposit.replace(/^[^\d]+/, '')) || c.title.toLowerCase().includes('deposit'));
    financialsAndDeadlines.push({
      id: 'fin-2',
      clauseId: clauseMatch2?.id,
      label: 'Security Deposit / Retention',
      amount: securityDeposit,
      timing: 'Due upon execution / signing',
      clauseRef: clauseMatch2 ? `Section ${clauseMatch2.number}` : 'Security Deposit'
    });
  }

  // Late Fee / Penalty (Only for contracts)
  if (!isCourtCase) {
    const lateFeeMatch = rawText.match(/(?:fee\s+of|late\s+fee\s*(?:of)?)\s*([\$₹€£]?\s*\d+[\d,]*(?:\.\d{2})?)/i)
      || rawText.match(/Rent\s+Late\s+Fee\s*(?:\(\$\))?\s*:?\s*([\$₹€£]?\s*\d+[\d,]*(?:\.\d{2})?)/i);
    if (lateFeeMatch) {
      const lateFeeAmt = formatAmount(lateFeeMatch[1]);
      const lateFeeClause = clauses.find(c => c.title.toLowerCase().includes('late fee') || c.rawText.toLowerCase().includes('late fee'));
      financialsAndDeadlines.push({
        id: 'fin-3',
        clauseId: lateFeeClause?.id,
        label: 'Late Payment Administrative Fee',
        amount: lateFeeAmt,
        timing: 'If rent is unpaid after grace period',
        clauseRef: lateFeeClause ? `Section ${lateFeeClause.number}` : 'Late Fee'
      });
    }
  }

  // Timeline Milestones (Anchored to clauses)
  const timelineSequence: TimelineMilestone[] = isCourtCase
    ? [
        {
          stepNumber: 1,
          clauseId: clauses[0]?.id,
          phase: 'Phase 1: Ingestion & Filing',
          title: 'Filing & Pleadings Stage',
          timeframe: 'Court Registry Filing',
          description: 'Filing of application / petition under Section 11 of the Arbitration & Conciliation Act.',
          requiredAction: 'Maintain indexed copies of petition and counter-affidavits',
          clauseRef: 'Registry',
          status: 'COMPLETED'
        },
        {
          stepNumber: 2,
          clauseId: clauses[1]?.id,
          phase: 'Phase 2: Hearing & Consideration',
          title: 'Judicial Hearing & Reservation',
          timeframe: 'Hearing Concluded',
          description: 'Submissions heard before the Judicial Bench on behalf of the respective parties.',
          requiredAction: 'Review written submissions and judicial precedents cited',
          clauseRef: 'Judicial Hearing',
          status: 'COMPLETED'
        },
        {
          stepNumber: 3,
          clauseId: clauses[2]?.id,
          phase: 'Phase 3: Order Pronouncement',
          title: 'Judgment & Reference Directions',
          timeframe: 'Judgment Delivered Date',
          description: 'Official pronouncement of judgment / appointment order on the commercial arbitration reference.',
          requiredAction: 'Comply with directions issued to the parties and communication to the Arbitral Tribunal',
          clauseRef: 'Pronouncement',
          status: 'UPCOMING'
        }
      ]
    : [
        {
          stepNumber: 1,
          clauseId: clauses[0]?.id,
          phase: 'Phase 1: Ingestion & Signing',
          title: 'Execution & Preliminary Conditions',
          timeframe: 'Day 0 (Effective Date)',
          description: 'Exchange signed copies and confirm receipt of initial deposit or documentation.',
          requiredAction: 'Retain signed copy and payment transaction receipt',
          clauseRef: 'Execution',
          status: 'COMPLETED'
        },
        {
          stepNumber: 2,
          clauseId: clauses[1]?.id,
          phase: 'Phase 2: Initial Setup',
          title: 'Commencement & Active Terms',
          timeframe: 'Days 1–5 of Term',
          description: 'Take possession, initiate role, or begin deliverables per agreement schedule.',
          requiredAction: 'Document condition and share written notes within required notice window',
          clauseRef: clauses[1] ? `Section ${clauses[1].number}` : 'Commencement',
          status: 'UPCOMING'
        },
        {
          stepNumber: 3,
          clauseId: clauses.find(c => c.rawText.toLowerCase().includes('pay') || c.rawText.toLowerCase().includes('rent'))?.id,
          phase: 'Phase 3: Active Operations',
          title: 'Recurring Performance & Payment Cycle',
          timeframe: 'Monthly per agreed schedule',
          description: 'Regular payment and duty compliance. Grace period windows must be observed.',
          requiredAction: 'Monitor payment deadlines to avoid late administrative fees or interest',
          clauseRef: 'Payment Terms',
          status: 'UPCOMING'
        },
        {
          stepNumber: 4,
          clauseId: clauses.find(c => c.rawText.toLowerCase().includes('terminat') || c.rawText.toLowerCase().includes('notice'))?.id,
          phase: 'Phase 4: Pre-Expiration',
          title: 'Notice Window for Renewal or Termination',
          timeframe: '30–60 Days Prior to Expiration',
          description: 'Review renewal conditions or formal non-renewal notice requirements.',
          requiredAction: 'Submit written notice within required window if not renewing',
          clauseRef: 'Termination Clause',
          status: 'CONDITIONAL'
        },
        {
          stepNumber: 5,
          clauseId: clauses.find(c => c.rawText.toLowerCase().includes('deposit') || c.rawText.toLowerCase().includes('surrender'))?.id,
          phase: 'Phase 5: Conclusion & Post-Term',
          title: 'Surrender, Final Accounting & Settlement',
          timeframe: 'Within Statutory Post-Surrender Window',
          description: 'Conduct final inspection and receive itemized accounting of deposit balance or final invoice.',
          requiredAction: 'Review itemized deduction receipts against normal wear-and-tear standards',
          clauseRef: 'Final Settlement',
          status: 'CONDITIONAL'
        }
      ];

  const terminationAndExit: TerminationItem[] = isCourtCase
    ? [
        {
          id: 'term-1',
          condition: 'Conclusion of Arbitral Proceedings',
          noticePeriod: 'Per statutory schedule under Section 29A Arbitration Act',
          penaltyOrConsequence: 'Final binding Arbitral Award subject to Section 34 challenge',
          clauseRef: 'Arbitral Mandate'
        }
      ]
    : [
        {
          id: 'term-1',
          condition: 'Normal Term Expiration',
          noticePeriod: '30–60 Days written notice',
          penaltyOrConsequence: 'Eligible for final settlement / deposit accounting',
          clauseRef: 'Term & Termination'
        }
      ];

  const overallRiskLevel: DocumentAnalysis['overallRiskLevel'] = 
    criticalFlags.some(f => f.severity === 'HIGH_RISK') ? 'HIGH' :
    criticalFlags.length > 0 ? 'MODERATE' : 'LOW';

  const { subjectMatterSummary, executiveSummary, coreSubjectMatter } = extractGroundedExecutiveSummary(
    rawText,
    docTitle,
    docType,
    parties,
    jurisdiction,
    extractedTerm,
    financialsAndDeadlines,
    criticalFlags
  );

  const indianLegalChecks = computeIndianLegalChecks(rawText, docTitle, 'CONTRACTUAL');

  const deliveredDateMatch = rawText.match(/Delivered\s+on\s*:\s*([0-9\/\-\.]+)/i);

  return {
    documentId: docId,
    documentTitle: docTitle,
    classificationNature: 'CONTRACTUAL',
    classificationExplanation: classification.explanation,
    documentType: docType,
    jurisdiction,
    overallRiskLevel,
    executiveSummary,
    subjectMatterSummary,
    coreSubjectMatter,
    parties,
    quickStats: {
      termOrDuration: isCourtCase
        ? (deliveredDateMatch ? `Delivered on ${deliveredDateMatch[1]}` : 'Adjudicated Order')
        : extractedTerm,
      financialCommitment: isCourtCase
        ? (primaryRent ? `Dispute / Claim (${primaryRent})` : 'Under Adjudication')
        : (primaryRent ? (/\b(?:monthly|month)\b/i.test(rawText) ? `${primaryRent} / Month` : primaryRent) : 'Per agreed schedule'),
      depositOrCompensation: isCourtCase
        ? 'N/A (Judicial Proceeding)'
        : (securityDeposit || 'None Required'),
      criticalFlagCount: criticalFlags.filter(f => f.severity === 'HIGH_RISK').length,
      cautionFlagCount: criticalFlags.filter(f => f.severity === 'CAUTION').length
    },
    responsibilities: {
      yourObligations,
      otherPartyObligations
    },
    financialsAndDeadlines,
    terminationAndExit,
    timelineSequence,
    criticalFlagsAndRisks: criticalFlags,
    indianLegalChecks,
    lawyerDossier: {
      executiveBrief: `Document assessment for ${docTitle}. Contains ${criticalFlags.length} section(s) noted for review under ${jurisdiction}.`,
      questionsForCounsel,
      missingProtections,
      evidenceChecklist: isCourtCase
        ? [
            { id: 'ev-1', label: 'Certified Copy of Court Order / Judgment', description: 'Obtain authenticated or certified copy from the respective Court registry.', collected: true, priority: 'HIGH' },
            { id: 'ev-2', label: 'Underlying Agreements & Contractual Exhibits', description: 'Primary contract, arbitration covenants, and any amendment deeds forming the subject matter.', collected: true, priority: 'HIGH' },
            { id: 'ev-3', label: 'Statutory Pleadings & Regulatory Records', description: 'Indexed copies of petitions, counter-affidavits, and relevant regulatory or tribunal orders.', collected: false, priority: 'HIGH' }
          ]
        : [
            { id: 'ev-1', label: 'Executed Agreement & All Attached Schedules', description: 'Retain complete copy of signed agreement and any incorporated addenda.', collected: true, priority: 'HIGH' },
            { id: 'ev-2', label: 'Proof of Funds Transferred or Invoiced', description: 'Wire receipts, canceled checks, or payroll records.', collected: true, priority: 'HIGH' },
            { id: 'ev-3', label: 'Pre-Signing Written Communications', description: 'Save all email or written statements regarding terms or agreed repairs.', collected: false, priority: 'HIGH' }
          ],
      unansweredAmbiguities: isCourtCase
        ? [
            'Timelines for the sole arbitrator to schedule preliminary procedural meeting.',
            'Fee schedule compliance under the Fourth Schedule of the Arbitration Act.'
          ]
        : [
            'The document does not explicitly state dispute resolution venue or fee-shifting provisions.',
            'Clarification may be helpful on whether electronic email notice satisfies formal contractual notice requirements.'
          ]
    }
  };
}

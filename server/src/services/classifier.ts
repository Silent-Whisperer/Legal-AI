import { Clause, DocumentAnalysis, DocumentClassificationNature, NonLegalDocumentCategory } from '../types.ts';

export interface DocumentClassificationResult {
  nature: DocumentClassificationNature;
  explanation: string;
  documentType: DocumentAnalysis['documentType'];
  isLegalDocument: boolean;
  nonLegalCategory?: NonLegalDocumentCategory;
  isIndian: boolean;
  jurisdiction: string;
  detectedMetadata?: Record<string, string>;
}

export function classifyDocumentNature(rawText: string, docTitle: string, clauses: Clause[] = []): DocumentClassificationResult {
  // Bound input length before regex processing to guarantee O(1) memory and prevent regex backtracking on huge files
  const sampleLength = 50000;
  const sampleText = rawText.length > sampleLength 
    ? rawText.slice(0, 35000) + '\n' + rawText.slice(-15000)
    : rawText;
  const combined = (sampleText + ' ' + docTitle).toLowerCase();

  const isIndian = /\b(?:india|indian|bengaluru|bangalore|mumbai|delhi|pune|karnataka|maharashtra|tamil\s+nadu|chennai|hyderabad|telangana|gurgaon|noida|kolkata|west\s+bengal|rupee|rupees|rs\.?|inr|₹|lakh|lakhs|crore|crores|indian\s+contract\s+act|model\s+tenancy\s+act)\b/i.test(combined);

  // 1. Explicit Contractual Checks (Covenants, reciprocal commitments, execution formulas)
  const hasContractualHeaders = /\b(?:(?:residential\s+|commercial\s+)?(?:lease|rental|tenancy|employment|service|consulting|non-disclosure|loan|license|vendor|transportation|shuttle|supply|maintenance)\s+agreement|(?:agreement|contract)\s+of\s+(?:lease|rental|tenancy|employment|service|transportation)|this\s+(?:agreement|contract|deed|indenture)|(?:between|by\s+and\s+between)\b[^\n]{1,200}\b(?:and)\b|(?:lessor|landlord)\b[^\n]{1,200}\b(?:lessee|tenant)\b|(?:employer|company)\b[^\n]{1,200}\b(?:employee)\b|(?:service\s+provider|contractor|transporter|vendor)\b[^\n]{1,200}\b(?:client|customer|company)\b|parties\s+agree\s+as\s+follows|witnesseth|mutually\s+covenant|in\s+witness\s+whereof)\b/i.test(combined);
  const hasCovenants = /\b(?:shall\s+(?:be|pay|provide|not|maintain|deposit|perform|deliver|refund|vacate|comply|bear|indemnify|forfeit|serve|receive|ensure|operate|transport)|hereby\s+agrees?|indemnify\s+and\s+hold\s+harmless|governing\s+law|entire\s+agreement|severability|lock-in\s+period|security\s+deposit|monthly\s+rent|notice\s+period|gross\s+ctc|non-compete|confidential\s+information|scope\s+of\s+services?|service\s+charges?|fare|route|shuttle)\b/i.test(combined);
  const hasContractualThemes = /\b(?:agreement|contract|lease|rental|tenancy|tenant|landlord|lessor|lessee|employment|employee|employer|service\s+provider|client|vendor|transportation|shuttle)\b/i.test(combined);
  const hasMultipleClauses = clauses.length >= 3;

  // 2. Comprehensive Non-Legal Category Pattern Matchers
  // (A) Certificate or Award
  const isCertificatePattern = /\b(?:certificate\s+of\s+(?:achievement|excellence|completion|merit|appreciation|participation|recognition|attendance|honor|training)|diploma\s+(?:in|of)|degree\s+of|academic\s+transcript|marksheet|grade\s+card|promptwars|build\s+with\s+ai|hack2skill|leaderboard\s+for\s+challenge|is\s+proudly\s+presented\s+to|this\s+certificate\s+is\s+awarded\s+to|awarded\s+to\s+[a-z\s]+for|this\s+is\s+to\s+certify\s+that|in\s+recognition\s+of\s+(?:outstanding|successful|meritorious|participation)|certificate\s+id)\b/i.test(combined) ||
    /\b(?:certificate|diploma|transcript|marksheet)\b/i.test(docTitle);

  // (B) Resume or CV
  const isResumePattern = /\b(?:curriculum\s+vitae|\bresume\b)\b/i.test(docTitle) ||
    (/\b(?:curriculum\s+vitae|\bresume\b)\b/i.test(combined) && /\b(?:work\s+experience|professional\s+summary|technical\s+skills|career\s+objective|personal\s+projects|education\s+qualifications)\b/i.test(combined));

  // (C) Invoice or Receipt
  const isInvoicePattern = /\b(?:tax\s+invoice|bill\s+of\s+supply|retail\s+invoice|cash\s+memo|payment\s+receipt)\b/i.test(docTitle) ||
    (/\b(?:tax\s+invoice|bill\s+of\s+supply|gstin|invoice\s+no|cash\s+receipt|subtotal|total\s+amount\s+due)\b/i.test(combined) && combined.length < 3500 && !hasContractualHeaders);

  // (D) Personal Identification Document
  const isIdentityPattern = /\b(?:passport|driving\s+licen[cs]e|driver'?s\s+licen[cs]e|voter\s+id|election\s+commission|aadhaar|uidai|social\s+security\s+card|pan\s+card|permanent\s+account\s+number)\b/i.test(combined) && !hasContractualHeaders;

  // (E) Informal Correspondence / Notes
  const isMemoPattern = /\b(?:memorandum|meeting\s+minutes|discussion\s+points|rough\s+notes|preliminary\s+thoughts|memo\s+to:|agenda\s+for\s+meeting|internal\s+notes)\b/i.test(combined) && !hasContractualHeaders;

  // (F) Research / Academic Publication
  const isPublicationPattern = /\b(?:abstract\s*[:\n]|keywords\s*[:\n]|introduction\s*[:\n]|methodology\s*[:\n]|literature\s+review|bibliography|whitepaper|research\s+paper)\b/i.test(combined) && !hasContractualHeaders && !hasCovenants;

  // Metadata Extraction Helper for Certificates / Documents
  const detectedMetadata: Record<string, string> = {};
  if (isCertificatePattern) {
    const recipientMatch = rawText.match(/(?:is\s+proudly\s+presented\s+to|awarded\s+to|this\s+is\s+to\s+certify\s+that|presented\s+to)\s*[:\r\n\s]*([A-Z][a-zA-Z\s]{2,35})/);
    if (recipientMatch && recipientMatch[1]) {
      detectedMetadata['Recipient'] = recipientMatch[1].trim().replace(/\n.*$/, '');
    }
    const idMatch = rawText.match(/Certificate\s+ID\s*:\s*([A-Za-z0-9\-]+)/i);
    if (idMatch && idMatch[1]) {
      detectedMetadata['Certificate ID'] = idMatch[1].trim();
    }
    const dateMatch = rawText.match(/\b(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4})\b/);
    if (dateMatch && dateMatch[1]) {
      detectedMetadata['Date'] = dateMatch[1].trim();
    }
    const issuerMatch = rawText.match(/(Google\s+for\s+Developers|PromptWars|Hack2skill|Coursera|edX|Udemy|University|College|Institute)/i);
    if (issuerMatch && issuerMatch[1]) {
      detectedMetadata['Issuing Organization'] = issuerMatch[1].trim();
    }
  }

  // Check if non-legal document
  const isGenuineNonLegal = (isCertificatePattern || isResumePattern || isInvoicePattern || isIdentityPattern || isMemoPattern || isPublicationPattern) && !hasContractualHeaders;

  // RULE 0: High-confidence Court Judgment, Judicial Order, or Litigation Record
  const isCourtJudgmentPattern = /\b(?:in\s+the\s+high\s+court\s+(?:of|at)|in\s+the\s+supreme\s+court|commercial\s+division|original\s+civil\s+jurisdiction|original\s+side|appellate\s+side|civil\s+appellate\s+jurisdiction|before\s*[:-]?\s*(?:the\s+)?hon'?ble\s+justice|judgment\s+(?:reserved|delivered)|arbitral\s+tribunal|arbitration\s+and\s+conciliation\s+act|ap\s*\(\s*com\s*\)|w\.?p\.?\s*\([a-z\s]*\)|o\.?m\.?p\.?|suit\s+no\.?|c\.?s\.?\s*no\.?|petitioner\b[\s\S]{1,120}\brespondent|appellant\b[\s\S]{1,120}\brespondent|plaintiff\b[\s\S]{1,120}\bdefendant)\b/i.test(combined);

  if (isCourtJudgmentPattern && !isGenuineNonLegal) {
    let docType: DocumentAnalysis['documentType'] = 'COURT_JUDGMENT_OR_ORDER';

    // Distinguish unadjudicated petition or pleading vs pronounced judgment/order
    const isPleadingOnly = /\b(?:writ\s+petition|plaint|petition\s+under\s+section|application\s+under\s+section|affidavit\s+in\s+support)\b/i.test(combined) &&
      !/\b(?:judgment\s+delivered|judgment\s+reserved|author\s*:|bench\s*:|order\s+dated|it\s+is\s+ordered|held\s+that|petition\s+is\s+disposed)\b/i.test(combined);
    if (isPleadingOnly) {
      docType = 'LEGAL_PETITION_OR_PLEADING';
    }

    // Determine court forum & jurisdiction
    let jurisdiction = 'Indian Judicial System (High Court / Civil Court Jurisdiction)';
    if (/\b(?:calcutta|kolkata)\b/i.test(combined)) {
      jurisdiction = 'High Court at Calcutta (Commercial Division)';
    } else if (/\b(?:delhi\s+high\s+court|high\s+court\s+of\s+delhi)\b/i.test(combined)) {
      jurisdiction = 'High Court of Delhi';
    } else if (/\b(?:bombay\s+high\s+court|high\s+court\s+of\s+judicature\s+at\s+bombay)\b/i.test(combined)) {
      jurisdiction = 'High Court of Judicature at Bombay';
    } else if (/\b(?:madras\s+high\s+court|high\s+court\s+of\s+madras)\b/i.test(combined)) {
      jurisdiction = 'High Court of Judicature at Madras';
    } else if (/\b(?:karnataka\s+high\s+court|high\s+court\s+of\s+karnataka)\b/i.test(combined)) {
      jurisdiction = 'High Court of Karnataka';
    } else if (/\b(?:supreme\s+court\s+of\s+india)\b/i.test(combined)) {
      jurisdiction = 'Supreme Court of India';
    } else if (/\b(?:nclt|national\s+company\s+law\s+tribunal)\b/i.test(combined)) {
      jurisdiction = 'National Company Law Tribunal (NCLT)';
    }

    return {
      nature: 'CONTRACTUAL',
      explanation: docType === 'COURT_JUDGMENT_OR_ORDER'
        ? `This document is an official Judicial Order / Court Judgment delivered under ${jurisdiction}.`
        : `This document is a formal Legal Petition / Court Pleading filed under ${jurisdiction}.`,
      documentType: docType,
      isLegalDocument: true,
      isIndian: true,
      jurisdiction
    };
  }

  // RULE 1: High-confidence Contractual Agreement
  // If it has contractual headers, covenants, or 3+ numbered sections and is not a genuine non-legal record
  if ((hasContractualHeaders || hasCovenants || hasMultipleClauses) && hasContractualThemes && !isGenuineNonLegal) {
    let docType: DocumentAnalysis['documentType'] = 'SERVICE_AGREEMENT';
    let jurisdiction = isIndian ? 'India (Indian Contract Act 1872)' : 'General Commercial Law';

    if (/\b(?:commercial\s+lease|commercial\s+premises|office\s+space|retail\s+shop|warehouse|industrial\s+premises|tower\s+site)\b/i.test(combined)) {
      docType = 'COMMERCIAL_LEASE';
      jurisdiction = isIndian ? 'India (Commercial Courts Act & Transfer of Property Act 1882)' : 'Commercial Property Law';
    } else if (/\b(?:lease|rental|tenancy|tenant|landlord|premises|lessor|lessee)\b/i.test(combined)) {
      docType = 'RESIDENTIAL_LEASE';
      const isTexas = /\b(?:texas|austin|houston|dallas|fort\s+worth|san\s+antonio|tx\s*\d{5})\b/i.test(combined);
      const isCalifornia = /\b(?:california|san\s+francisco|los\s+angeles|san\s+diego|ca\s*\d{5})\b/i.test(combined);
      const isNewYork = /\b(?:new\s+york|nyc|manhattan|brooklyn|queens|ny\s*\d{5})\b/i.test(combined);

      jurisdiction = isIndian 
        ? (/\b(?:karnataka|bengaluru|bangalore)\b/i.test(combined) 
            ? 'Karnataka Model Tenancy Act & Indian Contract Act 1872'
            : /\b(?:maharashtra|mumbai|pune)\b/i.test(combined)
              ? 'Maharashtra Rent Control Act & Indian Contract Act 1872'
              : /\b(?:delhi|ncr|noida|gurgaon)\b/i.test(combined)
                ? 'Delhi Rent Control Act & Indian Contract Act 1872'
                : 'State Model Tenancy Act & Indian Contract Act 1872')
        : isTexas
          ? 'Texas Property Code (Title 8. Landlord and Tenant)'
          : isCalifornia
            ? 'California Civil Code & SF Rent Board'
            : isNewYork
              ? 'New York Real Property Law (RPL Article 7)'
              : 'State Residential Tenancy Code';
    } else if (/\b(?:power\s+of\s+attorney|general\s+power\s+of\s+attorney|special\s+power\s+of\s+attorney|attorney-in-fact)\b/i.test(combined)) {
      docType = 'POWER_OF_ATTORNEY';
      jurisdiction = isIndian ? 'India (Powers of Attorney Act 1882 & Registration Act 1908)' : 'Power of Attorney Law';
    } else if (/\b(?:settlement\s+agreement|compromise\s+deed|mutual\s+release)\b/i.test(combined)) {
      docType = 'SETTLEMENT_AGREEMENT';
      jurisdiction = isIndian ? 'India (Indian Contract Act 1872 & CPC Section 89)' : 'Civil Settlement Law';
    } else if (/\b(?:shuttle|transportation|bus\s+service|cab\s+service|fleet|service\s+agreement|services\s+agreement|master\s+services?|msa|vendor\s+agreement|contractor\s+agreement|consulting\s+agreement|sow)\b/i.test(combined)) {
      docType = 'SERVICE_AGREEMENT';
      jurisdiction = isIndian ? 'India (Indian Contract Act 1872 & Commercial Courts Act)' : 'Commercial Contract Law';
    } else if (/\b(?:employment\s+agreement|employment\s+contract|offer\s+of\s+employment|employee\s+agreement|gross\s+ctc|probationary\s+period|at-will\s+employment)\b/i.test(combined)) {
      docType = 'EMPLOYMENT_AGREEMENT';
      jurisdiction = isIndian
        ? 'India (Indian Contract Act 1872 & State Shops & Commercial Establishments Act)'
        : /\bcalifornia\b/i.test(combined) ? 'California Labor Code & Bus. & Prof. Code' : 'State Labor Law';
    } else if (/\b(?:confidential|non-disclosure|nda)\b/i.test(combined)) {
      docType = 'NON_DISCLOSURE_AGREEMENT';
      jurisdiction = isIndian ? 'India (Indian Contract Act 1872 & IT Act 2000)' : 'Uniform Trade Secrets Act (UTSA)';
    } else if (/\b(?:loan|borrower|lender|promissory|interest\s+rate)\b/i.test(combined)) {
      docType = 'FINANCIAL_LOAN';
      jurisdiction = isIndian ? 'India (RBI Guidelines & Negotiable Instruments Act)' : 'Uniform Commercial Code (UCC)';
    } else if (/\b(?:service|vendor|supplier|contractor|consulting|deliverable|client)\b/i.test(combined)) {
      docType = 'SERVICE_AGREEMENT';
      jurisdiction = isIndian ? 'India (Indian Contract Act 1872 & Commercial Courts Act)' : 'Commercial Contract Law';
    }

    return {
      nature: 'CONTRACTUAL',
      explanation: `This document is a binding ${docType.replace(/_/g, ' ')} containing enforceable covenants, reciprocal obligations, and legal commitments.`,
      documentType: docType,
      isLegalDocument: true,
      isIndian,
      jurisdiction
    };
  }

  // RULE 2: Non-Contractual Record (Specific Non-Legal Categories)
  if (isGenuineNonLegal) {
    let category: NonLegalDocumentCategory = 'OTHER_NON_LEGAL';
    let explanation = 'This document appears to be an informational or educational record rather than a binding legal contract. No contractual obligations were identified in this document.';

    if (isCertificatePattern) {
      category = 'CERTIFICATE_OR_AWARD';
      const recipient = detectedMetadata['Recipient'] ? ` for ${detectedMetadata['Recipient']}` : '';
      const org = detectedMetadata['Issuing Organization'] ? ` from ${detectedMetadata['Issuing Organization']}` : '';
      explanation = `This document was identified as a Certificate of Achievement or Educational Award${recipient}${org}. It is an honorary or completion credential and does not constitute a legally binding contract. Contract analysis has been stopped after classification.`;
    } else if (isResumePattern) {
      category = 'RESUME_OR_CV';
      explanation = 'This document was identified as a Curriculum Vitae or Resume detailing professional background and skills. It does not establish binding contractual covenants. Contract analysis has been stopped after classification.';
    } else if (isInvoicePattern) {
      category = 'INVOICE_OR_RECEIPT';
      explanation = 'This document was identified as a Commercial Invoice or Billing Receipt. It records a commercial transaction rather than ongoing reciprocal contractual terms. Contract analysis has been stopped after classification.';
    } else if (isIdentityPattern) {
      category = 'IDENTITY_DOCUMENT';
      explanation = 'This document was identified as a Personal Identification Document. It serves credential verification rather than legal contract commitments. Contract analysis has been stopped after classification.';
    } else if (isPublicationPattern) {
      category = 'PUBLICATION_OR_ARTICLE';
      explanation = 'This document was identified as an Academic Publication, Article, or Paper. It is an informational publication rather than a legal contract. Contract analysis has been stopped after classification.';
    } else if (isMemoPattern) {
      category = 'CORRESPONDENCE_OR_MEMO';
      explanation = 'This document was identified as an Informal Memorandum, Meeting Minutes, or Discussion Notes. It lacks formal legal covenants. Contract analysis has been stopped after classification.';
    }

    return {
      nature: 'NON_CONTRACTUAL',
      explanation,
      documentType: 'NON_CONTRACTUAL_RECORD',
      isLegalDocument: false,
      nonLegalCategory: category,
      detectedMetadata,
      isIndian,
      jurisdiction: 'Not Applicable (Non-Legal Document)'
    };
  }

  // RULE 3: Ambiguous or Uncertain
  return {
    nature: 'UNCERTAIN',
    explanation: 'Document classification is uncertain. The system could not confidently verify whether this document constitutes an enforceable legal contract. No contractual obligations have been assumed.',
    documentType: 'UNCERTAIN',
    isLegalDocument: false,
    isIndian,
    jurisdiction: 'Undetermined / Inconclusive'
  };
}

export type RiskSeverity = 'HIGH_RISK' | 'CAUTION' | 'SAFE';

export interface Clause {
  id: string;
  number: string;
  title: string;
  pageNumber: number;
  rawText: string;
  sectionPath?: string;
  explanation?: string; // Deterministic grounded plain-English summary of THIS exact clause
}

export interface ObligationItem {
  id: string;
  clauseId?: string;
  title: string;
  description: string;
  deadlineOrCondition: string;
  clauseRef: string;
  sourceQuote: string;
  priority?: 'HIGH' | 'STANDARD';
}

export interface FinancialItem {
  id: string;
  clauseId?: string;
  label: string;
  amount: string;
  timing: string;
  clauseRef: string;
  consequenceOrLateFee?: string;
}

export interface TerminationItem {
  id: string;
  clauseId?: string;
  condition: string;
  noticePeriod: string;
  penaltyOrConsequence: string;
  clauseRef: string;
}

export interface TimelineMilestone {
  stepNumber: number;
  clauseId?: string;
  phase: string;
  title: string;
  timeframe: string;
  description: string;
  requiredAction: string;
  clauseRef: string;
  status?: 'COMPLETED' | 'UPCOMING' | 'CONDITIONAL';
}

export interface RiskFlag {
  id: string;
  clauseId?: string;
  clauseRef: string;
  category: string;
  severity: RiskSeverity;
  title: string;
  plainEnglishExplanation: string;
  statutoryContext?: string;
  realWorldScenario?: string;
  suggestedRedline?: string;
  sourceQuote: string;
  enforceabilityStatus?: 'LIKELY_VOID' | 'STATUTORY_CONFLICT' | 'STANDARD_TERM' | 'REVIEW_RECOMMENDED';
}

export interface MissingProtection {
  id: string;
  title: string;
  category: string;
  whyItMatters: string;
  recommendedClauseToAdd: string;
  statuteRef?: string;
}

export interface LawyerQuestion {
  id: string;
  clauseId?: string;
  question: string;
  rationale: string;
  statutoryCitation: string;
  clauseRef: string;
  riskSeverity: RiskSeverity;
}

export interface EvidenceItem {
  id: string;
  label: string;
  description: string;
  collected: boolean;
  priority: 'HIGH' | 'MEDIUM';
}

export interface LawyerDossier {
  executiveBrief: string;
  questionsForCounsel: LawyerQuestion[];
  missingProtections: MissingProtection[];
  evidenceChecklist: EvidenceItem[];
  unansweredAmbiguities: string[];
}

export type DocumentClassificationNature = 'CONTRACTUAL' | 'NON_CONTRACTUAL' | 'UNCERTAIN';

export type NonLegalDocumentCategory = 
  | 'CERTIFICATE_OR_AWARD'
  | 'RESUME_OR_CV'
  | 'INVOICE_OR_RECEIPT'
  | 'IDENTITY_DOCUMENT'
  | 'CORRESPONDENCE_OR_MEMO'
  | 'PUBLICATION_OR_ARTICLE'
  | 'MARKETING_OR_FLYER'
  | 'OTHER_NON_LEGAL';

export interface IndianLegalChecks {
  isIndianJurisdiction?: boolean;
  registrationRequired?: boolean;
  registrationNotice?: string;
  registrationActSection17?: {
    isMandatoryRegistration: boolean;
    statutoryBasis: string;
    summary: string;
    consequencesIfNotRegistered: string;
  };
  stateTenancyAct?: string;
  stateTenancyFramework?: {
    jurisdiction: string;
    applicableAct: string;
    depositRule: string;
    complianceNote: string;
  };
  stateTenancySpecifics?: string[];
  stampDutyNotice?: string;
  nonCompeteNotice?: string;
  depositForfeitureNotice?: string;
}

export type HighlightCategory = 'party' | 'risk' | 'financial' | 'obligation' | 'term' | 'agreement' | 'clause';

export interface HighlightTarget {
  text?: string;
  category: HighlightCategory;
  clauseId?: string;
  clauseRef?: string;
  label?: string;
}

export interface PartyEntity {
  name: string;
  role: string;
  clauseRef?: string;
}

export interface DocumentAnalysis {
  documentId: string;
  documentTitle: string;
  classificationNature: DocumentClassificationNature;
  classificationExplanation?: string;
  isLegalDocument?: boolean;
  stoppedAfterClassification?: boolean;
  nonLegalCategory?: NonLegalDocumentCategory;
  classificationConfidence?: number;
  detectedMetadata?: Record<string, string>;
  documentType: 'COURT_JUDGMENT_OR_ORDER' | 'LEGAL_PETITION_OR_PLEADING' | 'RESIDENTIAL_LEASE' | 'COMMERCIAL_LEASE' | 'EMPLOYMENT_AGREEMENT' | 'NON_DISCLOSURE_AGREEMENT' | 'SERVICE_AGREEMENT' | 'FINANCIAL_LOAN' | 'SETTLEMENT_AGREEMENT' | 'POWER_OF_ATTORNEY' | 'NON_CONTRACTUAL_RECORD' | 'UNCERTAIN' | 'OTHER';
  jurisdiction: string;
  overallRiskLevel: 'HIGH' | 'MODERATE' | 'LOW';
  executiveSummary: string;
  subjectMatterSummary?: string;
  coreSubjectMatter?: string;
  parties?: PartyEntity[];
  quickStats: {
    termOrDuration: string;
    financialCommitment: string;
    depositOrCompensation: string;
    criticalFlagCount: number;
    cautionFlagCount: number;
  };
  responsibilities: {
    yourObligations: ObligationItem[];
    otherPartyObligations: ObligationItem[];
  };
  financialsAndDeadlines: FinancialItem[];
  terminationAndExit: TerminationItem[];
  timelineSequence: TimelineMilestone[];
  criticalFlagsAndRisks: RiskFlag[];
  lawyerDossier: LawyerDossier;
  clauseExplanations?: Record<string, string>; // Deterministic mapping: clauseId -> plain English explanation
  indianLegalChecks?: IndianLegalChecks;
}

export interface CitationItem {
  clauseRef: string;
  clauseTitle: string;
  pageNumber?: number;
  excerpt: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  citations?: CitationItem[];
}

export interface ClauseDelta {
  id: string;
  clauseRef: string;
  title: string;
  changeType: 'ADDED' | 'REMOVED' | 'MODIFIED';
  originalSnippet?: string;
  revisedSnippet?: string;
  factualChangeSummary: string; // Factual description e.g. "Notice period changed from 30 days to 90 days"
  plainEnglishImpact: string;
  substantiveScore: 'MAJOR' | 'MODERATE' | 'MINOR';
  favors?: 'YOU' | 'OTHER_PARTY' | 'NEUTRAL';
}

export interface ComparisonResult {
  docA: { title: string; version: string };
  docB: { title: string; version: string };
  executiveDeltaSummary: string;
  netAdvantageShift?: string;
  deltas: ClauseDelta[];
}

export interface PdfSummaryResult {
  bottomLine: string;
  summary: string;
  keyPoints: string[];
  keyObligations: { party: string; obligation: string }[];
  warningTraps: string[];
  practicalNextSteps: string[];
  modelUsed: string;
  generatedAt?: string;
}

export interface LegalDocument {
  id: string;
  title: string;
  filename: string;
  fileType: string;
  uploadDate: string;
  totalPages: number;
  rawText: string;
  clauses: Clause[];
  analysis?: DocumentAnalysis;
  pdfSummary?: PdfSummaryResult;
  chatHistory?: ChatMessage[];
  hasOriginalFile?: boolean;
  fileUrl?: string;
  isLegalDocument?: boolean;
  stoppedAfterClassification?: boolean;
  nonLegalCategory?: NonLegalDocumentCategory;
  detectedMetadata?: Record<string, string>;
  sessionId?: string;
}


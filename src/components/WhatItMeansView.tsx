import React from 'react';
import { LegalDocument, HighlightTarget, Clause } from '../types.ts';
import { SupportedLanguage, getVernacularText } from '../utils/vernacular.ts';
import { 
  ArrowRight, 
  BookOpen, 
  CheckSquare, 
  Gavel,
  Eye,
  FileText,
  Sparkles
} from 'lucide-react';

interface WhatItMeansViewProps {
  document: LegalDocument;
  selectedLanguage?: SupportedLanguage;
  onNavigateTab: (tab: string) => void;
  onSelectClause: (clauseRef: string, clauseId?: string, target?: HighlightTarget) => void;
  onOpenSummary?: () => void;
}

// Helper to provide human-readable badge for document categories
const getDocTypeBadge = (docType?: string, isNonContractual?: boolean, isUncertain?: boolean) => {
  if (isNonContractual) {
    return {
      icon: '📄',
      text: 'Non-Contractual Record',
      color: 'bg-slate-100 text-slate-800 border-slate-300 dark:bg-slate-800 dark:text-slate-200 dark:border-slate-700'
    };
  }
  if (isUncertain) {
    return {
      icon: '⚖️',
      text: 'Classification Uncertain',
      color: 'bg-amber-100 text-amber-900 border-amber-300 dark:bg-amber-900/40 dark:text-amber-200 dark:border-amber-800'
    };
  }
  switch (docType) {
    case 'COURT_JUDGMENT_OR_ORDER':
      return {
        icon: '🏛️',
        text: 'Court Judgment & Judicial Order',
        color: 'bg-purple-100 text-purple-900 border-purple-300 dark:bg-purple-950/50 dark:text-purple-200 dark:border-purple-800'
      };
    case 'LEGAL_PETITION_OR_PLEADING':
      return {
        icon: '⚖️',
        text: 'Legal Petition / Court Pleading',
        color: 'bg-indigo-100 text-indigo-900 border-indigo-300 dark:bg-indigo-950/50 dark:text-indigo-200 dark:border-indigo-800'
      };
    case 'RESIDENTIAL_LEASE':
      return {
        icon: '🏡',
        text: 'Residential Lease Agreement',
        color: 'bg-emerald-100 text-emerald-900 border-emerald-300 dark:bg-emerald-950/50 dark:text-emerald-200 dark:border-emerald-800'
      };
    case 'COMMERCIAL_LEASE':
      return {
        icon: '🏢',
        text: 'Commercial Lease Agreement',
        color: 'bg-blue-100 text-blue-900 border-blue-300 dark:bg-blue-950/50 dark:text-blue-200 dark:border-blue-800'
      };
    case 'EMPLOYMENT_AGREEMENT':
      return {
        icon: '💼',
        text: 'Employment Agreement',
        color: 'bg-teal-100 text-teal-900 border-teal-300 dark:bg-teal-950/50 dark:text-teal-200 dark:border-teal-800'
      };
    case 'NON_DISCLOSURE_AGREEMENT':
      return {
        icon: '🔒',
        text: 'Non-Disclosure Agreement (NDA)',
        color: 'bg-amber-100 text-amber-900 border-amber-300 dark:bg-amber-950/50 dark:text-amber-200 dark:border-amber-800'
      };
    case 'SERVICE_AGREEMENT':
      return {
        icon: '🤝',
        text: 'Service / Contractor Agreement',
        color: 'bg-cyan-100 text-cyan-900 border-cyan-300 dark:bg-cyan-950/50 dark:text-cyan-200 dark:border-cyan-800'
      };
    case 'FINANCIAL_LOAN':
      return {
        icon: '💰',
        text: 'Loan & Financial Agreement',
        color: 'bg-yellow-100 text-yellow-900 border-yellow-300 dark:bg-yellow-950/50 dark:text-yellow-200 dark:border-yellow-800'
      };
    case 'POWER_OF_ATTORNEY':
      return {
        icon: '📜',
        text: 'Power of Attorney',
        color: 'bg-violet-100 text-violet-900 border-violet-300 dark:bg-violet-950/50 dark:text-violet-200 dark:border-violet-800'
      };
    case 'SETTLEMENT_AGREEMENT':
      return {
        icon: '📝',
        text: 'Settlement & Release Agreement',
        color: 'bg-green-100 text-green-900 border-green-300 dark:bg-green-950/50 dark:text-green-200 dark:border-green-800'
      };
    default:
      return {
        icon: '✅',
        text: 'Binding Legal Contract',
        color: 'bg-emerald-100 text-emerald-900 border-emerald-300 dark:bg-emerald-950/50 dark:text-emerald-200 dark:border-emerald-800'
      };
  }
};

export const WhatItMeansView: React.FC<WhatItMeansViewProps> = ({
  document,
  selectedLanguage = 'en',
  onNavigateTab,
  onSelectClause,
  onOpenSummary,
}) => {
  const analysis = document.analysis;
  if (!analysis) return null;

  const reviewItems = analysis.criticalFlagsAndRisks || [];
  const isNonContractual = analysis.classificationNature === 'NON_CONTRACTUAL';
  const isUncertain = analysis.classificationNature === 'UNCERTAIN';
  const parties = analysis.parties || [];
  const obligations = analysis.responsibilities?.yourObligations || [];
  const docBadge = getDocTypeBadge(analysis.documentType, isNonContractual, isUncertain);

  // Helper to accurately locate the matching clause for a given snippet or keyword
  const findMatchingClause = (searchKeywords: string[], queryText?: string): Clause | undefined => {
    if (!document.clauses || document.clauses.length === 0) return undefined;
    
    // 1. If queryText contains digits / numbers (like "2200.00" or "$2200"), check for that exact number in clause text
    if (queryText && queryText.length >= 2) {
      const numMatch = queryText.match(/[\d,]+(?:\.\d{2})?/);
      if (numMatch && numMatch[0].length >= 3) {
        const foundByNum = document.clauses.find(c => String(c.rawText || '').includes(numMatch[0]));
        if (foundByNum) return foundByNum;
      }
      const lowerQuery = queryText.toLowerCase().trim();
      const exactMatch = document.clauses.find(c => String(c.rawText || '').toLowerCase().includes(lowerQuery));
      if (exactMatch) return exactMatch;
    }

    // 2. Check TITLES first for keywords! (e.g. "rent" matches "RENT", "deposit" matches "SECURITY DEPOSIT")
    for (const kw of searchKeywords) {
      const titleMatch = document.clauses.find(c => 
        String(c.title || '').toLowerCase().includes(kw)
      );
      if (titleMatch) return titleMatch;
    }

    // 3. Fallback: Check rawText for keywords
    for (const kw of searchKeywords) {
      const textMatch = document.clauses.find(c => 
        String(c.rawText || '').toLowerCase().includes(kw)
      );
      if (textMatch) return textMatch;
    }

    return document.clauses[0];
  };

  // Grounded verification checks: strictly check presence in document
  const hasParties = parties.length > 0;
  const hasObligations = !isNonContractual && obligations.length > 0;
  
  const hasMoney = !isNonContractual && Boolean(
    analysis.quickStats?.financialCommitment && 
    !['none', 'n/a', 'not specified', 'zero', 'unspecified'].includes(analysis.quickStats.financialCommitment.trim().toLowerCase())
  );

  const hasDeposit = !isNonContractual && Boolean(
    analysis.quickStats?.depositOrCompensation && 
    !['none', 'n/a', 'not specified', 'zero', 'unspecified'].includes(analysis.quickStats.depositOrCompensation.trim().toLowerCase())
  );

  const hasTerm = !isNonContractual && Boolean(
    analysis.quickStats?.termOrDuration && 
    !['not specified', 'n/a', 'none', 'unspecified'].includes(analysis.quickStats.termOrDuration.trim().toLowerCase())
  );

  const hasRisks = !isNonContractual && reviewItems.length > 0;

  return (
    <div className="space-y-6 animate-fadeIn">
      
      {/* 1. DOCUMENT IDENTITY & BASIC SUMMARY CARD */}
      <section className="bg-surface-card rounded-xl border border-surface-border p-6 sm:p-7 shadow-card relative overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-blue-600 via-indigo-600 to-emerald-500" />

        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-1 rounded text-xs font-bold uppercase tracking-wider bg-surface border border-surface-border text-on-surface">
                {getVernacularText('executiveSummary', selectedLanguage)}
              </span>
              <span className="text-xs text-surface-muted">•</span>
              <span className="text-xs text-surface-muted font-medium">
                {getVernacularText('jurisdiction', selectedLanguage)}: <strong className="text-on-surface">{analysis.jurisdiction}</strong>
              </span>
            </div>

            <div>
              <span className={`px-3 py-1 rounded-full text-xs font-bold border flex items-center gap-1.5 shadow-xs ${docBadge.color}`}>
                <span>{docBadge.icon}</span>
                <span>{docBadge.text}</span>
              </span>
            </div>
          </div>

          <div>
            <h1 className="font-serif text-2xl sm:text-3xl text-on-surface font-bold leading-tight">
              {isNonContractual 
                ? getVernacularText('whatIsThisDoc', selectedLanguage) 
                : getVernacularText('whatMeansForYou', selectedLanguage)}
            </h1>

            {/* DEDICATED GROUNDED DOCUMENT ESSENCE CARD: "What is this Document About? (Within the lines)" */}
            <div className="mt-4 p-4 sm:p-5 rounded-xl bg-gradient-to-br from-blue-50/70 via-indigo-50/30 to-slate-50/60 dark:from-blue-950/20 dark:via-indigo-950/10 dark:to-slate-900/30 border border-blue-200/80 dark:border-blue-800/50 shadow-xs space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="p-1 px-2 rounded-md bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-300 text-xs font-bold flex items-center gap-1.5">
                    <span>📌</span>
                    <span>What is this Document About?</span>
                  </span>
                  <span className="text-[11px] text-surface-muted font-medium">Within the lines</span>
                </div>
                
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border flex items-center gap-1 ${docBadge.color}`}>
                  <span>{docBadge.icon}</span>
                  <span>{docBadge.text}</span>
                </span>
              </div>

              <p className="text-base text-on-surface font-medium leading-relaxed font-sans">
                {analysis.subjectMatterSummary || analysis.coreSubjectMatter || analysis.executiveSummary}
              </p>

              {/* Identified Parties / Litigants Chips */}
              {parties.length > 0 && (
                <div className="pt-2.5 border-t border-blue-200/60 dark:border-blue-900/40 flex flex-wrap items-center gap-2">
                  <span className="text-[11px] font-bold text-surface-muted uppercase tracking-wider">Identified Parties:</span>
                  {parties.map((p, idx) => (
                    <span 
                      key={idx}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-surface border border-surface-border text-xs font-medium text-on-surface shadow-2xs"
                    >
                      <span className="text-blue-600 dark:text-blue-400 font-semibold">{p.role}:</span>
                      <span className="font-bold">{p.name}</span>
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Comprehensive Grounded Executive Breakdown */}
            <div className="mt-4 space-y-1.5">
              <h3 className="text-xs font-bold uppercase tracking-wider text-surface-muted flex items-center gap-1.5">
                <span>⚖️</span>
                <span>Executive Breakdown & Practical Implications</span>
              </h3>
              <p className="text-sm sm:text-base text-secondary leading-relaxed font-sans">
                {analysis.executiveSummary}
              </p>
            </div>

            {onOpenSummary && (
              <div className="mt-4 pt-3.5 border-t border-surface-border flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-primary flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-primary" />
                    <span>AI Deep PDF Summary:</span>
                  </span>
                  <span className="text-xs text-secondary hidden sm:inline">
                    {document.pdfSummary ? `Synthesized via ${document.pdfSummary.modelUsed}` : 'Comprehensive breakdown with AI or Gemini'}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={onOpenSummary}
                  className="px-3.5 py-1.5 bg-primary text-white rounded-lg text-xs font-semibold hover:bg-primary-container transition-all flex items-center gap-1.5 shadow-sm"
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>{document.pdfSummary ? 'View Deep PDF Summary' : '⚡ Generate Full PDF Summary'}</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* 2. CORE CONTRACT PROVISIONS & VERIFIED TERMS BREAKDOWN */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-serif text-lg sm:text-xl font-bold text-on-surface">
              Essential Provisions & Key Parameters
            </h2>
            <p className="text-xs text-secondary">
              Verified legal parameters grounded in the contract text. Select "View in PDF" on any parameter to jump directly to its exact clause and highlight location.
            </p>
          </div>
          <span className="px-2.5 py-1 rounded text-[11px] font-mono font-semibold bg-surface border border-surface-border text-surface-muted hidden sm:inline">
            Verified Source Grounding
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          
          {/* 1. PARTIES & SIGNATORIES */}
          <div className={`p-5 rounded-xl border transition-all ${
            hasParties 
              ? 'bg-surface-card border-blue-200 dark:border-blue-900/50 shadow-card' 
              : 'bg-surface/50 border-surface-border'
          }`}>
            <div className="flex items-start justify-between gap-2 pb-3 border-b border-surface-border/60">
              <div className="flex items-center gap-2">
                <span className="text-xl">👥</span>
                <div>
                  <h3 className="font-bold text-sm text-on-surface">Parties & Signatories</h3>
                  <p className="text-[11px] text-surface-muted">Identified individuals, firms, or entities bound</p>
                </div>
              </div>
              {hasParties ? (
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800 border border-blue-300">
                  {getVernacularText('presentInDoc', selectedLanguage)} ({parties.length})
                </span>
              ) : (
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-surface border border-surface-border text-surface-muted">
                  Not Formally Named
                </span>
              )}
            </div>

            <div className="pt-3">
              {hasParties ? (
                <div className="space-y-2">
                  {parties.map((party, pIdx) => {
                    const partyClause = party.clauseRef 
                      ? document.clauses.find(c => c.number === party.clauseRef || c.id === party.clauseRef) 
                      : findMatchingClause([party.name.toLowerCase().substring(0, 10)]);

                    return (
                      <div key={pIdx} className="flex items-center justify-between gap-2 p-2 rounded-lg bg-surface border border-surface-border text-xs">
                        <div className="min-w-0">
                          <span className="font-bold text-on-surface truncate block">{party.name}</span>
                          <span className="text-[11px] text-blue-700 font-semibold">{party.role}</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            onNavigateTab('explainer');
                            onSelectClause(partyClause ? `Section ${partyClause.number}` : (party.clauseRef || '1'), partyClause?.id, {
                              text: party.name,
                              category: 'party',
                              label: `${party.name} (${party.role})`
                            });
                          }}
                          className="px-2.5 py-1 rounded bg-blue-50 hover:bg-blue-600 text-blue-700 hover:text-white border border-blue-200 text-[10px] font-bold shrink-0 transition-colors flex items-center gap-1 shadow-xs"
                          title="Highlight party in PDF canvas"
                        >
                          <Eye className="w-3 h-3" /> View in PDF
                        </button>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-xs text-surface-muted leading-relaxed">
                  No contracting parties or corporate signatories were explicitly extracted in the processed sections. Please inspect the preamble and signature block pages.
                </p>
              )}
            </div>
          </div>

          {/* 2. MONEY & PAYMENTS */}
          <div className={`p-5 rounded-xl border transition-all ${
            hasMoney 
              ? 'bg-surface-card border-emerald-200 dark:border-emerald-900/50 shadow-card' 
              : 'bg-surface/50 border-surface-border'
          }`}>
            <div className="flex items-start justify-between gap-2 pb-3 border-b border-surface-border/60">
              <div className="flex items-center gap-2">
                <span className="text-xl">💰</span>
                <div>
                  <h3 className="font-bold text-sm text-on-surface">Financials & Payments</h3>
                  <p className="text-[11px] text-surface-muted">Rent, recurring fees, or compensation figures</p>
                </div>
              </div>
              {hasMoney ? (
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                  {getVernacularText('presentInDoc', selectedLanguage)}
                </span>
              ) : (
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-surface border border-surface-border text-surface-muted">
                  None Specified
                </span>
              )}
            </div>

            <div className="pt-3">
              {hasMoney && analysis.quickStats ? (
                <div className="flex items-center justify-between gap-3 p-3 rounded-lg bg-surface border border-emerald-200 dark:border-emerald-900/40 text-xs">
                  <div>
                    <span className="text-[11px] text-surface-muted block">Specified Consideration / Fee:</span>
                    <span className="text-sm font-bold text-emerald-800 dark:text-emerald-300">
                      {analysis.quickStats.financialCommitment}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      const financialClause = findMatchingClause(['rent', 'payment', 'fee', 'compensation', 'financial', 'amount'], analysis.quickStats?.financialCommitment);
                      const targetRentStr = analysis.quickStats?.financialCommitment?.match(/[\$₹€£]\s*[\d,]+(?:\.\d{2})?/)?.[0] || 'Rent';
                      onNavigateTab('explainer');
                      onSelectClause(financialClause ? `Section ${financialClause.number}` : 'Financial', financialClause?.id, {
                        text: targetRentStr,
                        category: 'financial',
                        label: `Rent: ${analysis.quickStats?.financialCommitment || 'Financial Commitment'}`
                      });
                    }}
                    className="px-2.5 py-1.5 rounded bg-emerald-50 hover:bg-emerald-600 text-emerald-700 hover:text-white border border-emerald-200 text-[10px] font-bold shrink-0 transition-colors flex items-center gap-1 shadow-xs"
                    title="Highlight payment amount in PDF"
                  >
                    <Eye className="w-3 h-3" /> View in PDF
                  </button>
                </div>
              ) : (
                <p className="text-xs text-surface-muted leading-relaxed">
                  No fixed monthly fee, compensation sum, or rental payment schedule was identified in the analyzed sections. Payment terms may be detailed in an attached schedule or work order.
                </p>
              )}
            </div>
          </div>

          {/* 3. SECURITY DEPOSIT / ESCROW */}
          <div className={`p-5 rounded-xl border transition-all ${
            hasDeposit 
              ? 'bg-surface-card border-emerald-200 dark:border-emerald-900/50 shadow-card' 
              : 'bg-surface/50 border-surface-border'
          }`}>
            <div className="flex items-start justify-between gap-2 pb-3 border-b border-surface-border/60">
              <div className="flex items-center gap-2">
                <span className="text-xl">🔒</span>
                <div>
                  <h3 className="font-bold text-sm text-on-surface">Security Deposit & Collateral</h3>
                  <p className="text-[11px] text-surface-muted">Advance deposit, retention, or escrow terms</p>
                </div>
              </div>
              {hasDeposit ? (
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                  {getVernacularText('presentInDoc', selectedLanguage)}
                </span>
              ) : (
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-surface border border-surface-border text-surface-muted">
                  None Required
                </span>
              )}
            </div>

            <div className="pt-3">
              {hasDeposit && analysis.quickStats ? (
                <div className="flex items-center justify-between gap-3 p-3 rounded-lg bg-surface border border-emerald-200 dark:border-emerald-900/40 text-xs">
                  <div>
                    <span className="text-[11px] text-surface-muted block">Required Deposit / Retention:</span>
                    <span className="text-sm font-bold text-emerald-800 dark:text-emerald-300">
                      {analysis.quickStats.depositOrCompensation}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      const depositClause = findMatchingClause(['security deposit', 'deposit', 'escrow', 'collateral'], analysis.quickStats?.depositOrCompensation);
                      const targetDepStr = analysis.quickStats?.depositOrCompensation?.match(/[\$₹€£]\s*[\d,]+(?:\.\d{2})?/)?.[0] || 'Deposit';
                      onNavigateTab('explainer');
                      onSelectClause(depositClause ? `Section ${depositClause.number}` : 'Deposit', depositClause?.id, {
                        text: targetDepStr,
                        category: 'financial',
                        label: `Deposit: ${analysis.quickStats?.depositOrCompensation || 'Security Deposit'}`
                      });
                    }}
                    className="px-2.5 py-1.5 rounded bg-emerald-50 hover:bg-emerald-600 text-emerald-700 hover:text-white border border-emerald-200 text-[10px] font-bold shrink-0 transition-colors flex items-center gap-1 shadow-xs"
                    title="Highlight deposit in PDF"
                  >
                    <Eye className="w-3 h-3" /> View in PDF
                  </button>
                </div>
              ) : (
                <p className="text-xs text-surface-muted leading-relaxed">
                  No advance security deposit, escrow fund, or performance bond is mandated under the terms of this agreement.
                </p>
              )}
            </div>
          </div>

          {/* 4. TERM & DURATION */}
          <div className={`p-5 rounded-xl border transition-all ${
            hasTerm 
              ? 'bg-surface-card border-amber-200 dark:border-amber-900/50 shadow-card' 
              : 'bg-surface/50 border-surface-border'
          }`}>
            <div className="flex items-start justify-between gap-2 pb-3 border-b border-surface-border/60">
              <div className="flex items-center gap-2">
                <span className="text-xl">⏳</span>
                <div>
                  <h3 className="font-bold text-sm text-on-surface">Term & Duration</h3>
                  <p className="text-[11px] text-surface-muted">Effective tenure, lock-in period, or expiration</p>
                </div>
              </div>
              {hasTerm ? (
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
                  {getVernacularText('presentInDoc', selectedLanguage)}
                </span>
              ) : (
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-surface border border-surface-border text-surface-muted">
                  Unspecified / Open
                </span>
              )}
            </div>

            <div className="pt-3">
              {hasTerm && analysis.quickStats ? (
                <div className="flex items-center justify-between gap-3 p-3 rounded-lg bg-surface border border-amber-200 dark:border-amber-900/40 text-xs">
                  <div>
                    <span className="text-[11px] text-surface-muted block">Validity & Duration:</span>
                    <span className="text-sm font-bold text-amber-800 dark:text-amber-300">
                      {analysis.quickStats.termOrDuration}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      const termClause = findMatchingClause(['lease term', 'lease type', 'term', 'duration', 'commencement', 'validity', 'effective date'], analysis.quickStats?.termOrDuration);
                      const targetTermStr = analysis.quickStats?.termOrDuration?.match(/\d{2}\/\d{2}\/\d{4}/)?.[0] || 'Lease Term';
                      onNavigateTab('explainer');
                      onSelectClause(termClause ? `Section ${termClause.number}` : 'Term', termClause?.id, {
                        text: targetTermStr,
                        category: 'term',
                        label: `Term: ${analysis.quickStats?.termOrDuration || 'Duration'}`
                      });
                    }}
                    className="px-2.5 py-1.5 rounded bg-amber-50 hover:bg-amber-600 text-amber-700 hover:text-white border border-amber-200 text-[10px] font-bold shrink-0 transition-colors flex items-center gap-1 shadow-xs"
                    title="Highlight term in PDF"
                  >
                    <Eye className="w-3 h-3" /> View in PDF
                  </button>
                </div>
              ) : (
                <p className="text-xs text-surface-muted leading-relaxed">
                  No fixed calendar expiration date or lock-in tenure was identified in the main body. Standard statutory or advance written notice provisions govern continuation.
                </p>
              )}
            </div>
          </div>

          {/* 5. RESTRICTIONS & KEY OBLIGATIONS */}
          <div className={`p-5 rounded-xl border transition-all ${
            hasObligations 
              ? 'bg-surface-card border-purple-200 dark:border-purple-900/50 shadow-card' 
              : 'bg-surface/50 border-surface-border'
          }`}>
            <div className="flex items-start justify-between gap-2 pb-3 border-b border-surface-border/60">
              <div className="flex items-center gap-2">
                <span className="text-xl">📋</span>
                <div>
                  <h3 className="font-bold text-sm text-on-surface">Key Rules & Obligations</h3>
                  <p className="text-[11px] text-surface-muted">Operational duties & performance requirements</p>
                </div>
              </div>
              {hasObligations ? (
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 text-purple-800 border border-purple-300">
                  {getVernacularText('presentInDoc', selectedLanguage)} ({obligations.length})
                </span>
              ) : (
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-surface border border-surface-border text-surface-muted">
                  Standard Terms
                </span>
              )}
            </div>

            <div className="pt-3">
              {hasObligations ? (
                <div className="space-y-2">
                  {obligations.slice(0, 3).map((ob) => {
                    const obClause = document.clauses.find(c => c.id === ob.clauseId || c.number === ob.clauseRef) ||
                      findMatchingClause([ob.title.toLowerCase().substring(0, 10)], ob.sourceQuote);

                    return (
                      <div key={ob.id} className="p-2 rounded-lg bg-surface border border-surface-border text-xs flex items-center justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <span className="font-bold text-purple-900 dark:text-purple-300 block truncate">
                            {ob.title}
                          </span>
                          <p className="text-[11px] text-surface-muted truncate mt-0.5">
                            {ob.description}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            onNavigateTab('explainer');
                            onSelectClause(obClause ? `Section ${obClause.number}` : ob.clauseRef, obClause?.id || ob.clauseId, {
                              text: ob.sourceQuote || ob.title,
                              category: 'obligation',
                              label: ob.title
                            });
                          }}
                          className="px-2.5 py-1 rounded bg-purple-50 hover:bg-purple-600 text-purple-700 hover:text-white border border-purple-200 text-[10px] font-bold shrink-0 transition-colors flex items-center gap-1 shadow-xs"
                          title="Highlight obligation in PDF"
                        >
                          <Eye className="w-3 h-3" /> View in PDF
                        </button>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-xs text-surface-muted leading-relaxed">
                  Standard mutual provisions apply. No burdensome affirmative covenants, non-compete restrictions, or severe operational mandates were detected.
                </p>
              )}
            </div>
          </div>

          {/* 6. RISKS, PENALTIES & WARNINGS */}
          <div className={`p-5 rounded-xl border transition-all ${
            hasRisks 
              ? 'bg-surface-card border-rose-200 dark:border-rose-900/50 shadow-card' 
              : 'bg-surface/50 border-surface-border'
          }`}>
            <div className="flex items-start justify-between gap-2 pb-3 border-b border-surface-border/60">
              <div className="flex items-center gap-2">
                <span className="text-xl">⚠️</span>
                <div>
                  <h3 className="font-bold text-sm text-on-surface">Penalties & Risks</h3>
                  <p className="text-[11px] text-surface-muted">Indemnity scope, damages, or termination penalties</p>
                </div>
              </div>
              {hasRisks ? (
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-300">
                  {reviewItems.length} {getVernacularText('clausesNoted', selectedLanguage)}
                </span>
              ) : (
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-800 border border-emerald-300">
                  Standard (Clean)
                </span>
              )}
            </div>

            <div className="pt-3">
              {hasRisks ? (
                <div className="space-y-2">
                  {reviewItems.slice(0, 3).map((risk) => {
                    const riskClause = document.clauses.find(c => c.id === risk.clauseId || c.number === risk.clauseRef) ||
                      findMatchingClause([risk.title.toLowerCase().substring(0, 10)], risk.sourceQuote);

                    return (
                      <div key={risk.id} className="p-2.5 rounded-lg bg-surface border border-surface-border text-xs flex items-center justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <span className="font-bold text-rose-700 block truncate">
                            [{risk.clauseRef}] {risk.title}
                          </span>
                          <p className="text-[11px] text-surface-muted truncate mt-0.5">
                            {risk.plainEnglishExplanation}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            onNavigateTab('explainer');
                            onSelectClause(riskClause ? `Section ${riskClause.number}` : risk.clauseRef, riskClause?.id || risk.clauseId, {
                              text: risk.sourceQuote || risk.title,
                              category: 'risk',
                              label: risk.title
                            });
                          }}
                          className="px-2.5 py-1 rounded bg-rose-50 hover:bg-rose-600 text-rose-700 hover:text-white border border-rose-200 text-[10px] font-bold shrink-0 transition-colors flex items-center gap-1 shadow-xs"
                          title="Highlight risk in PDF"
                        >
                          <Eye className="w-3 h-3" /> View in PDF
                        </button>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-xs text-surface-muted leading-relaxed">
                  No hidden penalty clauses, unilateral forfeiture provisions, or excessive indemnity risks were detected in this agreement.
                </p>
              )}
            </div>
          </div>

        </div>
      </section>

      {/* 3. QUICK NAVIGATION PATHWAYS */}
      <section className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
        <button
          type="button"
          onClick={() => onNavigateTab('explainer')}
          className="p-4 rounded-xl bg-surface-card border border-surface-border hover:border-primary cursor-pointer transition-all text-left flex items-center justify-between group shadow-card"
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center font-bold">
              <BookOpen className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-on-surface group-hover:text-primary">Live PDF & Clause Reader</h4>
              <p className="text-[11px] text-surface-muted">Inspect side-by-side with live canvas</p>
            </div>
          </div>
          <ArrowRight className="w-4 h-4 text-surface-muted group-hover:text-primary group-hover:translate-x-0.5 transition-transform" />
        </button>

        <button
          type="button"
          onClick={() => onNavigateTab('responsibilities')}
          className="p-4 rounded-xl bg-surface-card border border-surface-border hover:border-primary cursor-pointer transition-all text-left flex items-center justify-between group shadow-card"
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-purple-500/10 text-purple-600 flex items-center justify-center font-bold">
              <CheckSquare className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-on-surface group-hover:text-primary">Obligations Matrix</h4>
              <p className="text-[11px] text-surface-muted">Side-by-side duties of each party</p>
            </div>
          </div>
          <ArrowRight className="w-4 h-4 text-surface-muted group-hover:text-primary group-hover:translate-x-0.5 transition-transform" />
        </button>

        <button
          type="button"
          onClick={() => onNavigateTab('lawyer')}
          className="p-4 rounded-xl bg-surface-card border border-surface-border hover:border-primary cursor-pointer transition-all text-left flex items-center justify-between group shadow-card"
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-amber-500/10 text-amber-600 flex items-center justify-center font-bold">
              <Gavel className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-on-surface group-hover:text-primary">Lawyer Preparation Dossier</h4>
              <p className="text-[11px] text-surface-muted">Questions and checklist for counsel</p>
            </div>
          </div>
          <ArrowRight className="w-4 h-4 text-surface-muted group-hover:text-primary group-hover:translate-x-0.5 transition-transform" />
        </button>
      </section>

    </div>
  );
};

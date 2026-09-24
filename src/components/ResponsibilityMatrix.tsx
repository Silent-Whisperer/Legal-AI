import React, { useState } from 'react';
import { DocumentAnalysis } from '../types.ts';
import { 
  CheckSquare, 
  Gavel, 
  Clock, 
  ChevronDown, 
  ChevronUp, 
  Search, 
  ArrowRight
} from 'lucide-react';

interface ResponsibilityMatrixProps {
  analysis: DocumentAnalysis;
  onSelectClause: (clauseRef: string, clauseId?: string) => void;
}

export const ResponsibilityMatrix: React.FC<ResponsibilityMatrixProps> = ({
  analysis,
  onSelectClause,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedQuotes, setExpandedQuotes] = useState<Record<string, boolean>>({});

  const toggleQuote = (id: string) => {
    setExpandedQuotes(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const yourObligations = analysis?.responsibilities?.yourObligations || [];
  const otherPartyObligations = analysis?.responsibilities?.otherPartyObligations || [];

  const q = searchTerm.toLowerCase();
  const yourList = yourObligations.filter(item => 
    String(item.title || '').toLowerCase().includes(q) ||
    String(item.description || '').toLowerCase().includes(q) ||
    String(item.clauseRef || '').toLowerCase().includes(q)
  );

  const otherList = otherPartyObligations.filter(item => 
    String(item.title || '').toLowerCase().includes(q) ||
    String(item.description || '').toLowerCase().includes(q) ||
    String(item.clauseRef || '').toLowerCase().includes(q)
  );

  const isNonContractual = analysis?.classificationNature === 'NON_CONTRACTUAL';
  const isCourtCase = analysis?.documentType === 'COURT_JUDGMENT_OR_ORDER' || analysis?.documentType === 'LEGAL_PETITION_OR_PLEADING';

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header Info */}
      <div className="bg-surface-card rounded-xl border border-surface-border p-6 shadow-card flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="font-serif text-2xl font-bold text-on-surface">
            Two-Column Responsibility Matrix
          </h2>
          <p className="text-sm text-surface-muted mt-1">
            Clearly separates what is required of you versus mandatory obligations placed on the other party.
          </p>
        </div>

        {/* Filter Input */}
        <div className="relative w-full sm:w-72">
          <input
            type="text"
            placeholder="Search duties or clauses..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full h-9 pl-9 pr-3 text-xs bg-surface border border-surface-border rounded-lg focus:outline-none focus:border-primary"
          />
          <Search className="w-4 h-4 text-surface-muted absolute left-2.5 top-2.5" />
        </div>
      </div>

      {/* Empty State when no obligations exist (e.g. Non-contractual records) */}
      {yourList.length === 0 && otherList.length === 0 ? (
        <div className="bg-surface-card rounded-2xl border border-surface-border p-12 text-center space-y-3 shadow-card">
          <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center mx-auto text-xl font-bold">
            📋
          </div>
          <h3 className="font-serif font-bold text-lg text-on-surface">
            No Contractual Obligations Identified
          </h3>
          <p className="text-xs text-secondary max-w-md mx-auto leading-relaxed">
            No contractual obligations were identified in this document. {isNonContractual ? 'This document was classified as an informational or non-contractual record (e.g. certificate, resume, or invoice).' : 'No reciprocal covenants or performance duties were found.'}
          </p>
        </div>
      ) : (
        /* Grid */
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          {/* LEFT COLUMN: YOUR OBLIGATIONS */}
          <div className="space-y-4">
            <div className="flex items-center justify-between pb-2 border-b-2 border-primary">
              <span className="font-serif text-lg font-bold text-primary flex items-center gap-2">
                <CheckSquare className="w-5 h-5" />
                {isCourtCase ? 'Petitioner / Litigant Duties & Milestones' : 'Your Core Obligations & Deadlines'}
              </span>
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-navy-100 text-primary font-bold">
                {yourList.length} Duties
              </span>
            </div>

            <div className="space-y-3">
              {yourList.map((item) => (
                <div 
                  key={item.id}
                  className="bg-surface-card rounded-xl border border-surface-border p-4 shadow-card hover:border-primary/50 transition-colors space-y-2.5"
                >
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-semibold text-sm text-on-surface">
                      {item.title}
                    </h3>
                    <button
                      onClick={() => onSelectClause(item.clauseRef, item.clauseId)}
                      title="Click to view & highlight clause in reader"
                      className="px-2 py-0.5 rounded bg-navy-50 hover:bg-navy-100 text-primary text-[11px] font-semibold transition-colors shrink-0 flex items-center gap-1"
                    >
                      <span>{item.clauseRef}</span>
                      <ArrowRight className="w-3 h-3" />
                    </button>
                  </div>

                  <p className="text-xs text-secondary leading-relaxed">
                    {item.description}
                  </p>

                  <div className="flex items-center gap-1.5 text-xs text-primary font-medium bg-navy-50/50 p-2 rounded-lg">
                    <Clock className="w-3.5 h-3.5 shrink-0" />
                    <span><strong>Condition/Deadline:</strong> {item.deadlineOrCondition}</span>
                  </div>

                  {/* Actions & Source Quote Accordion */}
                  <div className="pt-1 flex items-center justify-between">
                    <button
                      onClick={() => toggleQuote(item.id)}
                      className="flex items-center gap-1 text-[11px] text-surface-muted hover:text-on-surface"
                    >
                      <span>{expandedQuotes[item.id] ? 'Hide Original Snippet' : 'View Original Snippet'}</span>
                      {expandedQuotes[item.id] ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                    </button>

                    <button
                      onClick={() => onSelectClause(item.clauseRef, item.clauseId)}
                      className="text-[11px] font-semibold text-primary hover:underline flex items-center gap-1"
                    >
                      <span>👁️ Highlight in Document</span>
                    </button>
                  </div>

                  {expandedQuotes[item.id] && (
                    <div className="p-3 bg-surface rounded-lg border border-surface-border text-xs font-mono text-secondary leading-relaxed animate-fadeIn">
                      "{item.sourceQuote}"
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* RIGHT COLUMN: OTHER PARTY'S OBLIGATIONS */}
          <div className="space-y-4">
            <div className="flex items-center justify-between pb-2 border-b-2 border-secondary">
              <span className="font-serif text-lg font-bold text-on-surface flex items-center gap-2">
                <Gavel className="w-5 h-5 text-secondary" />
                {isCourtCase ? 'Respondent / Counterparty Obligations' : "Other Party's Legal Obligations"}
              </span>
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-surface border border-surface-border text-secondary font-bold">
                {otherList.length} Duties
              </span>
            </div>

            <div className="space-y-3">
              {otherList.map((item) => (
                <div 
                  key={item.id}
                  className="bg-surface-card rounded-xl border border-surface-border p-4 shadow-card hover:border-secondary/50 transition-colors space-y-2.5"
                >
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-semibold text-sm text-on-surface">
                      {item.title}
                    </h3>
                    <button
                      onClick={() => onSelectClause(item.clauseRef, item.clauseId)}
                      title="Click to view & highlight clause in reader"
                      className="px-2 py-0.5 rounded bg-surface hover:bg-surface-hover text-on-surface text-[11px] font-semibold border border-surface-border transition-colors shrink-0 flex items-center gap-1"
                    >
                      <span>{item.clauseRef}</span>
                      <ArrowRight className="w-3 h-3" />
                    </button>
                  </div>

                  <p className="text-xs text-secondary leading-relaxed">
                    {item.description}
                  </p>

                  <div className="flex items-center gap-1.5 text-xs text-secondary font-medium bg-surface p-2 rounded-lg border border-surface-border/60">
                    <Clock className="w-3.5 h-3.5 shrink-0" />
                    <span><strong>Condition/Duty:</strong> {item.deadlineOrCondition}</span>
                  </div>

                  {/* Actions & Source Quote Accordion */}
                  <div className="pt-1 flex items-center justify-between">
                    <button
                      onClick={() => toggleQuote(item.id)}
                      className="flex items-center gap-1 text-[11px] text-surface-muted hover:text-on-surface"
                    >
                      <span>{expandedQuotes[item.id] ? 'Hide Original Snippet' : 'View Original Snippet'}</span>
                      {expandedQuotes[item.id] ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                    </button>

                    <button
                      onClick={() => onSelectClause(item.clauseRef, item.clauseId)}
                      className="text-[11px] font-semibold text-primary hover:underline flex items-center gap-1"
                    >
                      <span>👁️ Highlight in Document</span>
                    </button>
                  </div>

                  {expandedQuotes[item.id] && (
                    <div className="p-3 bg-surface rounded-lg border border-surface-border text-xs font-mono text-secondary leading-relaxed animate-fadeIn">
                      "{item.sourceQuote}"
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

        </div>
      )}
    </div>
  );
};

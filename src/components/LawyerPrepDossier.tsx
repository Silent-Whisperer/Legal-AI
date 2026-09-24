import React, { useState } from 'react';
import { LegalDocument, EvidenceItem } from '../types.ts';
import { 
  Gavel, 
  Copy, 
  Check, 
  Printer, 
  HelpCircle, 
  AlertCircle, 
  CheckSquare, 
  Square,
  Info
} from 'lucide-react';

interface LawyerPrepDossierProps {
  document: LegalDocument;
  onPrint: () => void;
}

export const LawyerPrepDossier: React.FC<LawyerPrepDossierProps> = ({
  document,
  onPrint,
}) => {
  const dossier = document.analysis?.lawyerDossier;
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [evidenceList, setEvidenceList] = useState<EvidenceItem[]>(
    dossier?.evidenceChecklist || []
  );

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const toggleEvidence = (id: string) => {
    setEvidenceList(prev => prev.map(item => 
      item.id === id ? { ...item, collected: !item.collected } : item
    ));
  };

  if (!dossier) {
    return (
      <div className="bg-surface-card rounded-2xl border border-surface-border p-12 text-center space-y-3 shadow-card animate-fadeIn">
        <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center mx-auto text-xl font-bold">
          ⚖️
        </div>
        <h3 className="font-serif font-bold text-lg text-on-surface">
          No Lawyer Prep Dossier Available
        </h3>
        <p className="text-xs text-secondary max-w-md mx-auto leading-relaxed">
          A lawyer consultation packet is generated automatically for legal contracts. Upload or re-analyze a legal agreement to produce attorney questions and missing protections.
        </p>
      </div>
    );
  }

  const questionsForCounsel = dossier.questionsForCounsel || [];
  const missingProtections = dossier.missingProtections || [];

  return (
    <div className="space-y-8 animate-fadeIn printable-dossier">
      
      {/* 1. Header Banner */}
      <div className="bg-surface-card rounded-lg border border-surface-border p-6 sm:p-8 shadow-card flex flex-wrap items-center justify-between gap-4">
        <div className="space-y-1 max-w-2xl">
          <div className="flex items-center gap-2 text-primary font-semibold text-xs uppercase tracking-wider">
            <Gavel className="w-4 h-4" />
            <span>Consultation Preparation</span>
          </div>
          <h1 className="font-serif text-2xl sm:text-3xl font-bold text-on-surface">
            Lawyer Consultation Preparation Dossier
          </h1>
          <p className="text-sm text-surface-muted leading-relaxed">
            Organized questions, missing contract clauses, and factual records to prepare before speaking with a legal professional.
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={onPrint}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-white hover:bg-primary-container rounded font-semibold text-xs transition-all shadow-card"
          >
            <Printer className="w-4 h-4" />
            <span>Export Consultation Packet</span>
          </button>
        </div>
      </div>

      {/* 2. Document Summary for Attorney */}
      <section className="bg-surface-card rounded-lg border border-surface-border p-6 shadow-card space-y-3">
        <span className="text-xs font-bold uppercase tracking-wider text-primary">
          1. Document Overview for Legal Intake
        </span>
        <div className="p-4 rounded bg-surface border border-surface-border text-sm text-secondary font-serif leading-relaxed">
          {dossier.executiveBrief}
        </div>
        <p className="text-xs text-surface-muted">
          * This summary compiles the primary terms and sections noted for review to assist in an organized discussion.
        </p>
      </section>

      {/* 3. Questions to Ask a Legal Professional */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-serif text-xl font-bold text-on-surface flex items-center gap-2">
              <HelpCircle className="w-5 h-5 text-primary" />
              Questions You May Want to Ask a Legal Professional ({questionsForCounsel.length})
            </h2>
            <p className="text-xs text-surface-muted">
              Specific inquiries grounded in statutory standards to discuss with counsel
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4">
          {questionsForCounsel.map((q) => (
            <div 
              key={q.id}
              className="bg-surface-card rounded-lg border border-surface-border p-5 shadow-card space-y-3 hover:border-primary/40 transition-colors"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="space-y-1 max-w-2xl">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-surface border border-surface-border text-on-surface">
                      Important to Review
                    </span>
                    <span className="text-xs font-semibold text-primary">
                      [{q.clauseRef}]
                    </span>
                    <span className="text-xs text-surface-muted">
                      • {q.statutoryCitation}
                    </span>
                  </div>

                  <h3 className="font-serif text-base sm:text-lg font-bold text-on-surface">
                    "{q.question}"
                  </h3>
                </div>

                <button
                  onClick={() => handleCopy(q.id, `Question: ${q.question}\nStatutory Reference: ${q.statutoryCitation}\nDocument Clause: ${q.clauseRef}\nContext: ${q.rationale}`)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-surface hover:bg-surface-hover border border-surface-border text-xs font-semibold text-primary transition-colors shrink-0"
                >
                  {copiedId === q.id ? <Check className="w-3.5 h-3.5 text-primary" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedId === q.id ? 'Copied' : 'Copy Question'}</span>
                </button>
              </div>

              {/* Rationale box */}
              <div className="p-3 rounded bg-surface border border-surface-border text-xs text-secondary leading-relaxed">
                <strong className="text-on-surface font-semibold">Context: </strong>
                {q.rationale}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 4. Missing Information & Potential Ambiguities */}
      {missingProtections.length > 0 && (
        <section className="space-y-4">
          <div>
            <h2 className="font-serif text-xl font-bold text-on-surface flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-secondary" />
              Clauses Not Addressed in this Draft ({missingProtections.length})
            </h2>
            <p className="text-xs text-surface-muted">
              Provisions common in standard agreements that are not expressly stated in this text
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {missingProtections.map((mp) => (
              <div 
                key={mp.id}
                className="bg-surface-card rounded-lg border border-surface-border p-5 shadow-card space-y-2.5"
              >
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-surface-muted">
                    {mp.category}
                  </span>
                  {mp.statuteRef && (
                    <span className="text-[10px] font-mono text-surface-muted">
                      {mp.statuteRef}
                    </span>
                  )}
                </div>

                <h3 className="font-serif text-base font-bold text-on-surface">
                  {mp.title}
                </h3>

                <p className="text-xs text-secondary leading-relaxed">
                  {mp.whyItMatters}
                </p>

                <div className="pt-2 border-t border-surface-border text-xs">
                  <strong className="text-primary font-semibold block mb-1">Standard Example:</strong>
                  <p className="font-mono text-[11px] text-surface-muted italic">
                    {mp.recommendedClauseToAdd}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* 5. Evidence & Records to Gather */}
      <section className="bg-surface-card rounded-lg border border-surface-border p-6 shadow-card space-y-4">
        <div>
          <h2 className="font-serif text-xl font-bold text-on-surface flex items-center gap-2">
            <CheckSquare className="w-5 h-5 text-primary" />
            Documents & Evidence to Gather for Your Meeting
          </h2>
          <p className="text-xs text-surface-muted mt-0.5">
            Check off records as you collect them to ensure an organized consultation
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {evidenceList.map((item) => (
            <div 
              key={item.id}
              onClick={() => toggleEvidence(item.id)}
              className={`p-3.5 rounded-lg border transition-all cursor-pointer flex items-start gap-3 ${
                item.collected 
                  ? 'bg-surface border-surface-border text-surface-muted' 
                  : 'bg-surface-card border-surface-border hover:border-primary/40'
              }`}
            >
              <div className="pt-0.5 shrink-0">
                {item.collected ? (
                  <CheckSquare className="w-4 h-4 text-primary" />
                ) : (
                  <Square className="w-4 h-4 text-surface-muted" />
                )}
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h4 className={`text-xs font-semibold ${item.collected ? 'line-through text-surface-muted' : 'text-on-surface'}`}>
                    {item.label}
                  </h4>
                </div>
                <p className="text-[11px] text-surface-muted leading-relaxed">
                  {item.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 6. Legal Information Notice */}
      <div className="p-4 rounded-lg bg-surface border border-surface-border text-xs text-surface-muted leading-relaxed flex items-start gap-3">
        <Info className="w-4 h-4 text-primary shrink-0 mt-0.5" />
        <p>
          <strong>Legal Information Notice:</strong> ClarityLegal is an educational legal-information accessibility tool that organizes document text and statutory references for ordinary users. It does not provide legal advice, does not draw definitive judicial conclusions, and does not create an attorney-client relationship. Consult a qualified attorney licensed in your jurisdiction for binding legal counsel.
        </p>
      </div>

    </div>
  );
};

import React, { useState } from 'react';
import { 
  X, 
  Sparkles, 
  Copy, 
  Check, 
  Download, 
  AlertTriangle, 
  CheckCircle2, 
  ShieldCheck, 
  RefreshCw,
  Cpu,
  FileText,
  Clock,
  ArrowRight
} from 'lucide-react';
import { LegalDocument, PdfSummaryResult } from '../types.ts';
import { generatePdfSummary } from '../services/api.ts';

interface PdfSummaryModalProps {
  isOpen: boolean;
  onClose: () => void;
  document: LegalDocument;
  apiKey?: string;
  openRouterKey?: string;
  onUpdateDocument?: (updatedDoc: LegalDocument) => void;
}

export const AVAILABLE_MODELS = [
  { id: 'openai/gpt-4o-mini', label: 'GPT-4o Mini (High Speed & Precision)', badge: 'Recommended' },
  { id: 'openrouter/free', label: 'OpenRouter Free Auto-Router', badge: 'Free' },
  { id: 'nex-agi/nex-n2.5-mini:free', label: 'Nex AGI Mini • Free', badge: 'Fast' },
  { id: 'qwen/qwen3.8-27b:free', label: 'Qwen 3.8 27B • Free', badge: 'Free' },
];

export const PdfSummaryModal: React.FC<PdfSummaryModalProps> = ({
  isOpen,
  onClose,
  document,
  apiKey,
  openRouterKey,
  onUpdateDocument,
}) => {
  const [selectedModel, setSelectedModel] = useState<string>('openai/gpt-4o-mini');
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [summaryData, setSummaryData] = useState<PdfSummaryResult | undefined>(document.pdfSummary);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleGenerateSummary = async (modelToUse = selectedModel) => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const res = await generatePdfSummary(document.id, apiKey, openRouterKey, modelToUse);
      setSummaryData(res);
      if (onUpdateDocument) {
        onUpdateDocument({
          ...document,
          pdfSummary: res
        });
      }
    } catch (err: any) {
      console.error('Failed to generate summary:', err);
      setErrorMsg(err.message || 'Could not generate AI summary. Verify your API key or model selection.');
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    if (!summaryData) return;
    const textToCopy = `=== PDF EXECUTIVE SUMMARY: ${document.title} ===
Model Used: ${summaryData.modelUsed}
Generated At: ${summaryData.generatedAt || new Date().toLocaleString()}

--- BOTTOM LINE ---
${summaryData.bottomLine}

--- EXECUTIVE SUMMARY ---
${summaryData.summary}

--- KEY POINTS ---
${summaryData.keyPoints.map(p => `• ${p}`).join('\n')}

--- CORE OBLIGATIONS ---
${summaryData.keyObligations.map(o => `• [${o.party}]: ${o.obligation}`).join('\n')}

--- WARNING TRAPS & UNFAIR CLAUSES ---
${summaryData.warningTraps.map(w => `⚠️ ${w}`).join('\n')}

--- PRACTICAL NEXT STEPS ---
${summaryData.practicalNextSteps.map(s => `✓ ${s}`).join('\n')}
`;
    navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadMarkdown = () => {
    if (!summaryData) return;
    const mdContent = `# Legal Document Executive Summary: ${document.title}

> **Bottom Line:** ${summaryData.bottomLine}

* **Model Used:** \`${summaryData.modelUsed}\`
* **Analysis Time:** ${summaryData.generatedAt || new Date().toLocaleString()}
* **Source Document:** ${document.filename} (${document.totalPages} Pages, ${document.clauses.length} Clauses)

---

## 1. Executive Summary
${summaryData.summary}

## 2. Key Provisions & Terms
${summaryData.keyPoints.map(p => `- ${p}`).join('\n')}

## 3. Allocation of Responsibilities
| Party | Obligation |
| :--- | :--- |
${summaryData.keyObligations.map(o => `| **${o.party}** | ${o.obligation} |`).join('\n')}

## 4. Critical Warning Traps to Review
${summaryData.warningTraps.map(w => `- ⚠️ **Warning:** ${w}`).join('\n')}

## 5. Practical Next Steps Before Signing
${summaryData.practicalNextSteps.map(s => `- [ ] ${s}`).join('\n')}

---
*Report synthesized by ClarityLegal AI using ${summaryData.modelUsed}*
`;

    const blob = new Blob([mdContent], { type: 'text/markdown;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = window.document.createElement('a');
    link.href = url;
    link.download = `${document.title.replace(/\s+/g, '_')}_Summary.md`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const modalRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => {
        const first = modalRef.current?.querySelector<HTMLElement>(
          'button:not([disabled]), select:not([disabled])'
        );
        first?.focus();
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  return (
    <div 
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5 animate-fadeIn"
      role="dialog"
      aria-modal="true"
      aria-labelledby="summary-modal-title"
      onKeyDown={(e) => {
        if (e.key === 'Escape') {
          onClose();
        }
        if (e.key === 'Tab' && modalRef.current) {
          const focusables = modalRef.current.querySelectorAll<HTMLElement>(
            'button:not([disabled]), [href], input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'
          );
          if (focusables.length === 0) return;
          const first = focusables[0];
          const last = focusables[focusables.length - 1];
          if (e.shiftKey && window.document.activeElement === first) {
            e.preventDefault();
            last.focus();
          } else if (!e.shiftKey && window.document.activeElement === last) {
            e.preventDefault();
            first.focus();
          }
        }
      }}
    >
      <div ref={modalRef} className="bg-surface-card rounded-2xl border border-surface-border shadow-elevation w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
        
        {/* Header */}
        <div className="p-4 sm:p-5 bg-surface border-b border-surface-border flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-600 to-blue-700 text-white flex items-center justify-center shadow-sm" aria-hidden="true">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 id="summary-modal-title" className="font-serif font-bold text-lg text-on-surface">
                  PDF Executive Summary
                </h3>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-primary/10 text-primary border border-primary/20">
                  AI Synthesis
                </span>
              </div>
              <p className="text-xs text-surface-muted truncate max-w-md">
                📄 {document.title} • {document.totalPages} Pages • {document.clauses.length} Clauses
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Model Selector Pill */}
            <div className="flex items-center gap-1.5 bg-surface-card border border-surface-border rounded-lg px-2.5 py-1 text-xs">
              <Cpu className="w-3.5 h-3.5 text-primary" aria-hidden="true" />
              <select
                value={selectedModel}
                onChange={(e) => setSelectedModel(e.target.value)}
                disabled={loading}
                aria-label="Select AI model for summary"
                className="bg-transparent text-xs font-medium text-on-surface focus:outline-none cursor-pointer"
              >
                {AVAILABLE_MODELS.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.label}
                  </option>
                ))}
              </select>
            </div>

            <button
              onClick={() => handleGenerateSummary()}
              disabled={loading}
              className="px-3 py-1.5 bg-primary text-white rounded-lg text-xs font-semibold hover:bg-primary-container disabled:opacity-50 transition-all flex items-center gap-1.5 shadow-sm focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
              title="Regenerate summary with selected AI model"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} aria-hidden="true" />
              <span>{loading ? 'Analyzing...' : 'Regenerate'}</span>
            </button>

            <button 
              onClick={onClose}
              aria-label="Close summary modal"
              className="p-1.5 text-surface-muted hover:text-on-surface hover:bg-surface rounded-lg transition-colors ml-1 focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Body Content */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-7 space-y-6">
          
          {errorMsg && (
            <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{errorMsg}</span>
              </div>
              <button
                onClick={() => handleGenerateSummary()}
                className="px-2.5 py-1 bg-rose-600 text-white rounded font-medium text-[11px] hover:bg-rose-700"
              >
                Retry
              </button>
            </div>
          )}

          {loading ? (
            <div className="py-16 text-center space-y-4">
              <div className="w-12 h-12 rounded-full border-3 border-primary/20 border-t-primary animate-spin mx-auto" />
              <div>
                <h4 className="font-serif font-bold text-base text-on-surface">
                  Synthesizing Comprehensive PDF Summary
                </h4>
                <p className="text-xs text-surface-muted mt-1 max-w-sm mx-auto">
                  Running deep multi-clause analysis with <strong className="text-primary">{selectedModel}</strong>. This evaluates all {document.totalPages} pages...
                </p>
              </div>
            </div>
          ) : !summaryData ? (
            <div className="py-12 text-center space-y-4 max-w-md mx-auto">
              <div className="w-14 h-14 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-primary mx-auto">
                <FileText className="w-7 h-7" />
              </div>
              <div>
                <h4 className="font-serif font-bold text-lg text-on-surface">
                  No Summary Generated Yet
                </h4>
                <p className="text-xs text-secondary mt-1.5 leading-relaxed">
                  Generate a crystal-clear, structured executive summary powered by Google Gemma 4 or Gemini 1.5. This breaks down key terms, traps, and duties for non-lawyers.
                </p>
              </div>
              <button
                onClick={() => handleGenerateSummary()}
                className="px-5 py-2.5 bg-primary text-white rounded-xl text-xs font-bold hover:bg-primary-container transition-all shadow-md inline-flex items-center gap-2"
              >
                <Sparkles className="w-4 h-4" />
                <span>Generate Executive Summary with {selectedModel.split('/')[1] || selectedModel}</span>
              </button>
            </div>
          ) : (
            <>
              {/* 1. MODEL & BOTTOM LINE CARD */}
              <div className="p-5 rounded-2xl bg-gradient-to-br from-blue-50 via-indigo-50/40 to-emerald-50/30 border border-blue-200/80 shadow-sm relative overflow-hidden">
                <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded text-[11px] font-bold bg-blue-600 text-white tracking-wide uppercase">
                      The Bottom Line
                    </span>
                    <span className="text-xs text-surface-muted font-mono">
                      Model: <strong>{summaryData.modelUsed}</strong>
                    </span>
                  </div>
                  {summaryData.generatedAt && (
                    <span className="text-[11px] text-surface-muted flex items-center gap-1 font-mono">
                      <Clock className="w-3 h-3" /> {summaryData.generatedAt}
                    </span>
                  )}
                </div>
                <p className="font-serif text-base sm:text-lg text-navy-950 font-semibold leading-relaxed">
                  "{summaryData.bottomLine}"
                </p>
              </div>

              {/* 2. EXECUTIVE OVERVIEW */}
              <div className="space-y-2">
                <h4 className="font-serif text-sm font-bold text-on-surface uppercase tracking-wider flex items-center gap-1.5 text-primary">
                  <FileText className="w-4 h-4" />
                  <span>Executive Overview</span>
                </h4>
                <div className="p-5 rounded-xl bg-surface border border-surface-border text-xs sm:text-sm text-secondary leading-relaxed font-sans whitespace-pre-line shadow-xs">
                  {summaryData.summary}
                </div>
              </div>

              {/* 3. KEY POINTS GRID */}
              {summaryData.keyPoints.length > 0 && (
                <div className="space-y-2">
                  <h4 className="font-serif text-sm font-bold text-on-surface uppercase tracking-wider flex items-center gap-1.5 text-emerald-800 dark:text-emerald-400">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>Essential Contract Parameters</span>
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {summaryData.keyPoints.map((pt, idx) => (
                      <div key={idx} className="p-3.5 rounded-xl bg-surface-card border border-surface-border flex items-start gap-2.5 text-xs text-on-surface leading-normal shadow-xs">
                        <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                          {idx + 1}
                        </span>
                        <span>{pt}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 4. RESPONSIBILITIES MATRIX */}
              {summaryData.keyObligations.length > 0 && (
                <div className="space-y-2">
                  <h4 className="font-serif text-sm font-bold text-on-surface uppercase tracking-wider flex items-center gap-1.5 text-primary">
                    <ShieldCheck className="w-4 h-4 text-primary" />
                    <span>Core Responsibilities by Party</span>
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {summaryData.keyObligations.map((ob, idx) => (
                      <div key={idx} className="p-4 rounded-xl bg-surface-card border border-surface-border shadow-xs space-y-1">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-navy-100 text-primary uppercase tracking-wider inline-block">
                          {ob.party}
                        </span>
                        <p className="text-xs text-secondary leading-relaxed">
                          {ob.obligation}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 5. WARNING TRAPS & UNUSUAL PROVISIONS */}
              {summaryData.warningTraps.length > 0 && (
                <div className="space-y-2">
                  <h4 className="font-serif text-sm font-bold text-amber-900 dark:text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                    <AlertTriangle className="w-4 h-4 text-amber-600" />
                    <span>Red Flags & Hidden Traps to Watch</span>
                  </h4>
                  <div className="space-y-2">
                    {summaryData.warningTraps.map((trap, idx) => (
                      <div key={idx} className="p-3.5 rounded-xl bg-amber-50/80 border border-amber-200 text-xs text-amber-950 flex items-start gap-2.5 shadow-xs">
                        <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                        <span className="leading-relaxed font-medium">{trap}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 6. PRACTICAL NEXT STEPS */}
              {summaryData.practicalNextSteps.length > 0 && (
                <div className="space-y-2">
                  <h4 className="font-serif text-sm font-bold text-on-surface uppercase tracking-wider flex items-center gap-1.5 text-indigo-800 dark:text-indigo-400">
                    <ArrowRight className="w-4 h-4 text-indigo-600" />
                    <span>What You Should Do Before Signing</span>
                  </h4>
                  <div className="p-4 rounded-xl bg-indigo-50/60 border border-indigo-100 space-y-2">
                    {summaryData.practicalNextSteps.map((step, idx) => (
                      <div key={idx} className="flex items-start gap-2.5 text-xs text-indigo-950">
                        <span className="w-4 h-4 rounded bg-indigo-200/80 text-indigo-900 font-bold text-[10px] flex items-center justify-center shrink-0 mt-0.5">
                          ✓
                        </span>
                        <span>{step}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}

        </div>

        {/* Footer Toolbar */}
        <div className="p-4 bg-surface border-t border-surface-border flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2">
            <button
              onClick={handleCopy}
              disabled={!summaryData || loading}
              className="px-3.5 py-1.5 text-xs font-semibold text-secondary hover:text-on-surface bg-surface-card border border-surface-border rounded-lg hover:bg-surface-hover disabled:opacity-40 transition-colors flex items-center gap-1.5 shadow-xs"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copied!' : 'Copy Summary'}</span>
            </button>

            <button
              onClick={handleDownloadMarkdown}
              disabled={!summaryData || loading}
              className="px-3.5 py-1.5 text-xs font-semibold text-secondary hover:text-on-surface bg-surface-card border border-surface-border rounded-lg hover:bg-surface-hover disabled:opacity-40 transition-colors flex items-center gap-1.5 shadow-xs"
            >
              <Download className="w-3.5 h-3.5 text-primary" />
              <span>Download (.md)</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-1.5 bg-primary text-white text-xs font-semibold rounded-lg hover:bg-primary-container transition-colors shadow-xs"
            >
              Done
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};

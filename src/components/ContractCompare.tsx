import React, { useState } from 'react';
import { ComparisonResult, LegalDocument } from '../types.ts';
import { compareDocuments } from '../services/api.ts';
import { 
  FileDiff, 
  PlusCircle, 
  MinusCircle,
  Sparkles,
  AlertCircle,
  RefreshCw,
  Scale
} from 'lucide-react';

interface ContractCompareProps {
  comparison: ComparisonResult | null;
  documents: Array<Partial<LegalDocument>>;
  apiKey?: string;
  openRouterKey?: string;
  onComparisonComplete: (res: ComparisonResult) => void;
}

export const ContractCompare: React.FC<ContractCompareProps> = ({
  comparison,
  documents,
  apiKey,
  openRouterKey,
  onComparisonComplete,
}) => {
  const [filterType, setFilterType] = useState<'ALL' | 'MODIFIED' | 'ADDED' | 'REMOVED'>('ALL');
  const [showInputForm, setShowInputForm] = useState(!comparison);
  
  // Selection mode: 'docs' or 'paste'
  const [compareMode, setCompareMode] = useState<'docs' | 'paste'>(documents.length >= 2 ? 'docs' : 'paste');
  const [selectedDocA, setSelectedDocA] = useState<string>(documents[0]?.id || '');
  const [selectedDocB, setSelectedDocB] = useState<string>(documents[1]?.id || '');
  const [textA, setTextA] = useState('');
  const [textB, setTextB] = useState('');
  const [isComparing, setIsComparing] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleRunComparison = async () => {
    setErrorMsg('');
    if (compareMode === 'docs') {
      if (!selectedDocA || !selectedDocB) {
        setErrorMsg('Please select two documents to compare.');
        return;
      }
      if (selectedDocA === selectedDocB) {
        setErrorMsg('Please select two different documents to compare.');
        return;
      }
    } else {
      if (!textA.trim() || !textB.trim()) {
        setErrorMsg('Please enter text for both Draft A (Original) and Draft B (Revised).');
        return;
      }
    }

    setIsComparing(true);
    try {
      const res = await compareDocuments(
        compareMode === 'docs' ? selectedDocA : undefined,
        compareMode === 'docs' ? selectedDocB : undefined,
        compareMode === 'paste' ? textA : undefined,
        compareMode === 'paste' ? textB : undefined,
        apiKey,
        undefined,
        openRouterKey
      );
      onComparisonComplete(res);
      setShowInputForm(false);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to compare documents');
    } finally {
      setIsComparing(false);
    }
  };

  const filteredDeltas = comparison ? comparison.deltas.filter(d => {
    if (filterType === 'ALL') return true;
    return d.changeType === filterType;
  }) : [];

  return (
    <div className="space-y-6 animate-fadeIn">
      
      {/* Compare Form (when active or no comparison exists) */}
      {(showInputForm || !comparison) && (
        <div className="bg-surface-card rounded-2xl border border-surface-border p-6 sm:p-8 shadow-card space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-surface-border pb-4">
            <div>
              <div className="inline-flex items-center gap-2 text-xs font-semibold text-primary uppercase tracking-wider mb-1">
                <Scale className="w-4 h-4" />
                <span>Semantic Contract Comparison</span>
              </div>
              <h2 className="font-serif text-2xl font-bold text-on-surface">
                Compare Two Contract Versions
              </h2>
              <p className="text-xs text-secondary">
                Detect substantive changes in plain English without squinting at character diffs
              </p>
            </div>

            {comparison && (
              <button
                onClick={() => setShowInputForm(false)}
                className="px-3 py-1.5 text-xs text-surface-muted hover:text-on-surface font-medium border border-surface-border rounded-lg bg-surface"
              >
                Close Form
              </button>
            )}
          </div>

          {errorMsg && (
            <div className="p-3 rounded-lg bg-risk-high-bg border border-risk-high-border text-xs text-risk-high-text flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Mode selector */}
          <div className="flex items-center gap-2 text-xs font-semibold">
            {documents.length >= 2 && (
              <button
                onClick={() => setCompareMode('docs')}
                className={`px-4 py-2 rounded-lg transition-colors ${
                  compareMode === 'docs' ? 'bg-primary text-white' : 'bg-surface text-surface-muted hover:text-on-surface border border-surface-border'
                }`}
              >
                📂 Choose From Uploaded Documents
              </button>
            )}
            <button
              onClick={() => setCompareMode('paste')}
              className={`px-4 py-2 rounded-lg transition-colors ${
                compareMode === 'paste' ? 'bg-primary text-white' : 'bg-surface text-surface-muted hover:text-on-surface border border-surface-border'
              }`}
            >
              ✍️ Paste Draft A & Draft B Text
            </button>
          </div>

          {/* Mode 1: Pick from documents */}
          {compareMode === 'docs' && documents.length >= 2 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="block text-xs font-semibold text-on-surface">
                  Draft A (Original / Baseline)
                </label>
                <select
                  value={selectedDocA}
                  onChange={(e) => setSelectedDocA(e.target.value)}
                  className="w-full h-10 px-3 text-xs bg-surface border border-surface-border rounded-lg text-on-surface focus:outline-none focus:border-primary"
                >
                  <option value="">Select Document A...</option>
                  {documents.map((d) => (
                    <option key={d.id} value={d.id}>📄 {d.title}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <label className="block text-xs font-semibold text-on-surface">
                  Draft B (Revised / Counter-offer)
                </label>
                <select
                  value={selectedDocB}
                  onChange={(e) => setSelectedDocB(e.target.value)}
                  className="w-full h-10 px-3 text-xs bg-surface border border-surface-border rounded-lg text-on-surface focus:outline-none focus:border-primary"
                >
                  <option value="">Select Document B...</option>
                  {documents.map((d) => (
                    <option key={d.id} value={d.id}>📄 {d.title}</option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {/* Mode 2: Paste raw text */}
          {compareMode === 'paste' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="block text-xs font-semibold text-on-surface flex items-center justify-between">
                  <span>Draft A (Original / Landlord / Employer Draft)</span>
                </label>
                <textarea
                  rows={8}
                  placeholder="Paste original contract clause or text here..."
                  value={textA}
                  onChange={(e) => setTextA(e.target.value)}
                  className="w-full p-3 text-xs font-mono bg-surface border border-surface-border rounded-lg focus:outline-none focus:border-primary resize-none"
                />
              </div>

              <div className="space-y-2">
                <label className="block text-xs font-semibold text-on-surface flex items-center justify-between">
                  <span>Draft B (Revised / Marked-up Draft)</span>
                </label>
                <textarea
                  rows={8}
                  placeholder="Paste revised contract clause or text here..."
                  value={textB}
                  onChange={(e) => setTextB(e.target.value)}
                  className="w-full p-3 text-xs font-mono bg-surface border border-surface-border rounded-lg focus:outline-none focus:border-primary resize-none"
                />
              </div>
            </div>
          )}

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              onClick={handleRunComparison}
              disabled={isComparing}
              className="flex items-center gap-2 px-6 py-2.5 bg-primary text-white rounded-lg text-xs font-semibold hover:bg-primary-container disabled:opacity-40 transition-colors shadow-card"
            >
              {isComparing && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
              <span>{isComparing ? 'Comparing Drafts...' : 'Run Plain-English Diff 🔄'}</span>
            </button>
          </div>
        </div>
      )}

      {/* Comparison Results */}
      {comparison && (
        <>
          {/* Top Overview Banner */}
          <div className="bg-surface-card rounded-2xl border border-surface-border p-6 sm:p-8 shadow-card space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="p-1.5 rounded-lg bg-navy-50 border border-surface-border text-primary">
                  <FileDiff className="w-5 h-5" />
                </span>
                <div>
                  <span className="text-xs font-semibold uppercase tracking-wider text-surface-muted block">
                    Semantic Comparison Result
                  </span>
                  <span className="text-xs font-bold text-on-surface">
                    {comparison.deltas.length} substantive difference{comparison.deltas.length === 1 ? '' : 's'} found
                  </span>
                </div>
              </div>

              <button
                onClick={() => setShowInputForm(!showInputForm)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-surface border border-surface-border hover:bg-surface-hover text-on-surface transition-colors shadow-sm"
              >
                <RefreshCw className="w-3 h-3 text-primary" />
                <span>{showInputForm ? 'Hide Comparison Form' : 'Compare Different Drafts'}</span>
              </button>
            </div>

            {/* Version Headers */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
              <div className="p-3.5 rounded-xl bg-surface border border-surface-border space-y-1">
                <span className="text-[11px] font-semibold uppercase text-surface-muted">Document A (Baseline)</span>
                <h4 className="font-semibold text-sm text-on-surface">{comparison.docA.title}</h4>
                <span className="text-xs text-surface-muted">{comparison.docA.version}</span>
              </div>

              <div className="p-3.5 rounded-xl bg-surface border border-surface-border space-y-1">
                <span className="text-[11px] font-semibold uppercase text-primary">Document B (Revised)</span>
                <h4 className="font-semibold text-sm text-on-surface">{comparison.docB.title}</h4>
                <span className="text-xs text-secondary font-medium">{comparison.docB.version}</span>
              </div>
            </div>

            {/* Plain English Summary of Changes */}
            <div className="p-4 rounded-xl bg-surface border border-surface-border space-y-1.5">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-primary uppercase">
                <Sparkles className="w-4 h-4 text-primary" />
                <span>Summary of Key Changes</span>
              </div>
              <p className="text-sm text-secondary font-serif leading-relaxed">
                {comparison.executiveDeltaSummary}
              </p>
            </div>
          </div>

          {/* Substantive Differences List */}
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="font-serif text-xl font-bold text-on-surface">
                  Clause-by-Clause Differences ({filteredDeltas.length})
                </h3>
                <p className="text-xs text-surface-muted">
                  Factual descriptions of how terms differ between the two drafts
                </p>
              </div>

              {/* Filter Pills */}
              <div className="flex items-center gap-1 bg-surface border border-surface-border p-1 rounded-lg">
                <button
                  onClick={() => setFilterType('ALL')}
                  className={`px-3 py-1 rounded text-xs font-semibold transition-colors ${
                    filterType === 'ALL' ? 'bg-primary text-white shadow-sm' : 'text-surface-muted hover:text-on-surface'
                  }`}
                >
                  All ({comparison.deltas.length})
                </button>
                <button
                  onClick={() => setFilterType('MODIFIED')}
                  className={`px-3 py-1 rounded text-xs font-semibold transition-colors ${
                    filterType === 'MODIFIED' ? 'bg-primary text-white shadow-sm' : 'text-surface-muted hover:text-on-surface'
                  }`}
                >
                  Modified
                </button>
                <button
                  onClick={() => setFilterType('ADDED')}
                  className={`px-3 py-1 rounded text-xs font-semibold transition-colors ${
                    filterType === 'ADDED' ? 'bg-primary text-white shadow-sm' : 'text-surface-muted hover:text-on-surface'
                  }`}
                >
                  Added
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4">
              {filteredDeltas.map((delta) => (
                <div 
                  key={delta.id}
                  className="bg-surface-card rounded-xl border border-surface-border p-5 shadow-card space-y-3"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded text-[10px] font-semibold uppercase bg-surface border border-surface-border text-on-surface flex items-center gap-1">
                        {delta.changeType === 'MODIFIED' && <FileDiff className="w-3 h-3 text-secondary" />}
                        {delta.changeType === 'ADDED' && <PlusCircle className="w-3 h-3 text-secondary" />}
                        {delta.changeType === 'REMOVED' && <MinusCircle className="w-3 h-3 text-secondary" />}
                        {delta.changeType}
                      </span>

                      <span className="text-xs font-semibold text-primary">
                        {delta.clauseRef}
                      </span>
                    </div>

                    <span className="text-xs text-surface-muted">
                      {delta.title}
                    </span>
                  </div>

                  {/* Factual Statement of Change */}
                  <div className="p-3.5 rounded-lg bg-surface border border-surface-border text-xs text-secondary leading-relaxed space-y-1">
                    <strong className="text-on-surface font-semibold block">Factual Difference:</strong>
                    {delta.factualChangeSummary}
                  </div>

                  {/* Plain English Practical Impact */}
                  {delta.plainEnglishImpact && (
                    <div className="text-xs text-surface-muted leading-relaxed px-1">
                      <strong>Practical Note: </strong>{delta.plainEnglishImpact}
                    </div>
                  )}

                  {/* Side-by-side textual diff */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1 text-xs">
                    <div className="p-3 rounded-lg bg-surface border border-surface-border font-mono text-[11px] leading-relaxed text-secondary">
                      <span className="font-sans font-bold text-surface-muted block mb-1">Baseline Text (v1):</span>
                      {delta.originalSnippet || '(No corresponding clause in Draft A)'}
                    </div>

                    <div className="p-3 rounded-lg bg-surface border border-surface-border font-mono text-[11px] leading-relaxed text-secondary">
                      <span className="font-sans font-bold text-primary block mb-1">Revised Text (v2):</span>
                      {delta.revisedSnippet || '(Removed in Draft B)'}
                    </div>
                  </div>

                </div>
              ))}
            </div>
          </div>
        </>
      )}

    </div>
  );
};

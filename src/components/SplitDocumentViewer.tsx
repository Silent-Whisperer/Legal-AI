import React, { useState, useEffect, useRef, useMemo } from 'react';
import { LegalDocument, RiskFlag, HighlightTarget, PdfSummaryResult } from '../types.ts';
import { VisualPdfViewer } from './VisualPdfViewer.tsx';
import { SupportedLanguage, getVernacularText } from '../utils/vernacular.ts';
import { PdfSummaryModal } from './PdfSummaryModal.tsx';
import { ErrorBoundary } from './ErrorBoundary.tsx';
import { generatePdfSummary } from '../services/api.ts';
import { 
  Search, 
  ZoomIn, 
  ZoomOut, 
  Copy, 
  Check, 
  AlertCircle, 
  FileText, 
  Sparkles, 
  Gavel, 
  Lightbulb, 
  Scale, 
  Layers, 
  BookOpen, 
  ShieldAlert, 
  ChevronRight
} from 'lucide-react';
import { 
  ReadingMode, 
  matchFlagToClause, 
  renderHighlightedText, 
  getGroundedExplanation 
} from './splitViewerHelpers.tsx';

interface SplitDocumentViewerProps {
  document: LegalDocument;
  selectedClauseRef?: string;
  selectedClauseId?: string;
  highlightTarget?: HighlightTarget;
  selectedLanguage?: SupportedLanguage;
  apiKey?: string;
  openRouterKey?: string;
  onSelectClause: (clauseRef: string, clauseId?: string, target?: HighlightTarget) => void;
  onUpdateDocument?: (updatedDoc: LegalDocument) => void;
}

export const SplitDocumentViewer: React.FC<SplitDocumentViewerProps> = ({
  document,
  selectedClauseRef,
  selectedClauseId,
  highlightTarget,
  selectedLanguage = 'en',
  apiKey,
  openRouterKey,
  onSelectClause,
  onUpdateDocument,
}) => {
  const isPdf = Boolean(document.hasOriginalFile && (document.fileType?.includes('pdf') || document.filename?.toLowerCase().endsWith('.pdf')));
  const isImage = Boolean(document.hasOriginalFile && (document.fileType?.includes('image') || /\.(png|jpe?g|webp|bmp|tiff)$/i.test(document.filename || '')));
  const [paneMode, setPaneMode] = useState<'canvas' | 'cards'>((isPdf || isImage) && document.fileUrl ? 'canvas' : 'cards');
  const [readingMode, setReadingMode] = useState<ReadingMode>('plain');
  const [searchTerm, setSearchTerm] = useState('');
  const [activeClauseId, setActiveClauseId] = useState<string>('');
  const [rightPaneTab, setRightPaneTab] = useState<'clauses' | 'inspector' | 'summary'>('clauses');
  const [clauseFilter, setClauseFilter] = useState('');
  const [copiedRedline, setCopiedRedline] = useState(false);
  const [fontSizeMultiplier, setFontSizeMultiplier] = useState(1);
  const [isSummaryModalOpen, setIsSummaryModalOpen] = useState(false);
  const [pdfSummary, setPdfSummary] = useState<PdfSummaryResult | undefined>(document.pdfSummary);
  const [isGeneratingSummary, setIsGeneratingSummary] = useState(false);
  const [summaryError, setSummaryError] = useState<string | null>(null);
  const [copiedSummary, setCopiedSummary] = useState(false);

  useEffect(() => {
    setPdfSummary(document.pdfSummary);
  }, [document.id, document.pdfSummary]);

  const documentPaneRef = useRef<HTMLDivElement>(null);

  const clauses = document.clauses || [];
  const analysis = document.analysis;
  const criticalFlags = analysis?.criticalFlagsAndRisks || [];

  const flagMap = React.useMemo(() => {
    const map = new Map<string, RiskFlag>();
    for (const clause of clauses) {
      const flag = criticalFlags.find(f => matchFlagToClause(f, clause));
      if (flag) map.set(clause.id, flag);
    }
    return map;
  }, [clauses, criticalFlags]);

  // Initialize or update active clause from clauseId, clauseRef or first clause
  useEffect(() => {
    if (selectedClauseId) {
      const match = clauses.find(c => c.id === selectedClauseId);
      if (match) {
        setActiveClauseId(match.id);
        scrollToClause(match.id);
        return;
      }
    }
    if (selectedClauseRef) {
      const numMatch = selectedClauseRef.match(/\b(?:Section|Clause)?\s*(\d+[A-Za-z]?)\b/i);
      if (numMatch) {
        const targetNum = numMatch[1].toLowerCase();
        const match = clauses.find(c => String(c.number || '').toLowerCase() === targetNum);
        if (match) {
          setActiveClauseId(match.id);
          scrollToClause(match.id);
          return;
        }
      }
      const match = clauses.find(c => 
        (c.title || '').length >= 3 && (
          selectedClauseRef.toLowerCase().includes((c.title || '').toLowerCase()) ||
          (c.title || '').toLowerCase().includes(selectedClauseRef.toLowerCase())
        )
      );
      if (match) {
        setActiveClauseId(match.id);
        scrollToClause(match.id);
        return;
      }
    }
    if (clauses.length > 0 && !activeClauseId) {
      setActiveClauseId(clauses[0].id);
    }
  }, [selectedClauseRef, selectedClauseId, document]);

  const scrollToClause = (clauseId: string) => {
    setTimeout(() => {
      const el = window.document.getElementById(`clause-anchor-${clauseId}`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 50);
  };

  const activeClause = clauses.find(c => c.id === activeClauseId) || clauses[0];

  // STRICT CLAUSE GROUNDING: Match ONLY exact clause ID or exact section word boundary safely via flagMap
  const activeRiskFlag = activeClause ? flagMap.get(activeClause.id) : undefined;

  const handleCopyRedline = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedRedline(true);
    setTimeout(() => setCopiedRedline(false), 2000);
  };

  const handleQuickGenerateSummary = async () => {
    setIsGeneratingSummary(true);
    setSummaryError(null);
    try {
      const res = await generatePdfSummary(document.id, apiKey, openRouterKey, 'openai/gpt-4o-mini');
      setPdfSummary(res);
      if (onUpdateDocument) {
        onUpdateDocument({
          ...document,
          pdfSummary: res
        });
      }
    } catch (err: any) {
      console.error('Quick summary generation error:', err);
      setSummaryError(err.message || 'Failed to generate PDF summary');
    } finally {
      setIsGeneratingSummary(false);
    }
  };

  const filteredClauses = useMemo(() => {
    if (!clauseFilter.trim()) return clauses;
    const q = clauseFilter.toLowerCase();
    return clauses.filter(c => {
      const num = String(c.number || '').toLowerCase();
      const title = String(c.title || '').toLowerCase();
      const raw = String(c.rawText || '').toLowerCase();
      return num.includes(q) || title.includes(q) || raw.includes(q);
    });
  }, [clauses, clauseFilter]);

  return (
    <div className="space-y-4 animate-fadeIn">
      
      {/* Top Reading Mode & Document View Toolbar */}
      <div className="bg-surface-card rounded-lg border border-surface-border p-3.5 shadow-card flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          
          {/* Dual-Mode Toggle for PDF or Image Uploads */}
          {(isPdf || isImage) && document.fileUrl && (
            <div className="flex items-center gap-1.5 pr-2 border-r border-surface-border/80">
              <span className="text-xs font-semibold text-surface-muted hidden sm:inline">
                View:
              </span>
              <div className="inline-flex rounded bg-surface border border-surface-border p-0.5">
                <button
                  onClick={() => setPaneMode('canvas')}
                  className={`px-3 py-1 rounded text-xs font-medium flex items-center gap-1.5 transition-all ${
                    paneMode === 'canvas' ? 'bg-primary text-white shadow-sm font-semibold' : 'text-surface-muted hover:text-on-surface'
                  }`}
                >
                  <BookOpen className="w-3.5 h-3.5" />
                  <span>{isImage ? '📷 Original Scan' : getVernacularText('originalPdf', selectedLanguage)}</span>
                  <span className="px-1 py-0.2 rounded text-[9px] bg-white/20 text-white font-mono uppercase">{isImage ? 'Image' : 'Canvas'}</span>
                </button>
                <button
                  onClick={() => setPaneMode('cards')}
                  className={`px-3 py-1 rounded text-xs font-medium flex items-center gap-1.5 transition-all ${
                    paneMode === 'cards' ? 'bg-primary text-white shadow-sm font-semibold' : 'text-surface-muted hover:text-on-surface'
                  }`}
                >
                  <Layers className="w-3.5 h-3.5" />
                  <span>{getVernacularText('structuredCards', selectedLanguage)}</span>
                </button>
              </div>
            </div>
          )}

          {/* Reading Mode Selector */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-surface-muted">
              Reading Mode:
            </span>
            <div className="inline-flex rounded bg-surface border border-surface-border p-0.5">
              <button
                onClick={() => setReadingMode('plain')}
                className={`px-3 py-1 rounded text-xs font-medium transition-all ${
                  readingMode === 'plain' ? 'bg-primary text-white shadow-sm font-semibold' : 'text-surface-muted hover:text-on-surface'
                }`}
              >
                Plain English (Grade 8)
              </button>
              <button
                onClick={() => setReadingMode('tldr')}
                className={`px-3 py-1 rounded text-xs font-medium transition-all ${
                  readingMode === 'tldr' ? 'bg-primary text-white shadow-sm font-semibold' : 'text-surface-muted hover:text-on-surface'
                }`}
              >
                Executive TL;DR
              </button>
              <button
                onClick={() => setReadingMode('bullets')}
                className={`px-3 py-1 rounded text-xs font-medium transition-all ${
                  readingMode === 'bullets' ? 'bg-primary text-white shadow-sm font-semibold' : 'text-surface-muted hover:text-on-surface'
                }`}
              >
                Actionable Bullets
              </button>
              <button
                onClick={() => setReadingMode('legal')}
                className={`px-3 py-1 rounded text-xs font-medium transition-all ${
                  readingMode === 'legal' ? 'bg-primary text-white shadow-sm font-semibold' : 'text-surface-muted hover:text-on-surface'
                }`}
              >
                Original Text
              </button>
            </div>
          </div>
        </div>

        {paneMode === 'cards' && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-surface-muted hidden sm:inline">Zoom:</span>
            <button
              onClick={() => setFontSizeMultiplier(prev => Math.max(0.85, prev - 0.1))}
              className="p-1 rounded bg-surface hover:bg-surface-hover border border-surface-border text-surface-muted"
              title="Decrease font size"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <span className="text-xs font-medium px-1">{Math.round(fontSizeMultiplier * 100)}%</span>
            <button
              onClick={() => setFontSizeMultiplier(prev => Math.min(1.3, prev + 0.1))}
              className="p-1 rounded bg-surface hover:bg-surface-hover border border-surface-border text-surface-muted"
              title="Increase font size"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>

      {/* Split Dual-Pane Viewport */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* LEFT PANE: VISUAL PDF CANVAS / ORIGINAL IMAGE OR STRUCTURED CARDS (6 cols) */}
        {paneMode === 'canvas' && document.fileUrl ? (
          <div className="lg:col-span-6">
            {isPdf ? (
              <ErrorBoundary 
                fallbackTitle="PDF Viewer Notice"
                fallbackMessage="The visual PDF canvas encountered an issue rendering this file. You can switch to 'Structured Cards' mode to view all extracted clauses."
              >
                <VisualPdfViewer
                  fileUrl={document.fileUrl}
                  document={document}
                  selectedClauseId={activeClauseId}
                  selectedClauseRef={selectedClauseRef}
                  highlightTarget={highlightTarget}
                  selectedLanguage={selectedLanguage}
                  onSelectClause={onSelectClause}
                />
              </ErrorBoundary>
            ) : isImage ? (
              <div className="flex flex-col bg-surface-card rounded-lg border border-surface-border shadow-card h-[750px] overflow-hidden">
                <div className="p-3 bg-surface border-b border-surface-border flex items-center justify-between text-xs shrink-0">
                  <div className="flex items-center gap-2 truncate">
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                      📷 OCR SCANNED IMAGE
                    </span>
                    <span className="font-semibold text-on-surface truncate">{document.filename}</span>
                  </div>
                  <span className="text-[11px] text-surface-muted">Original Document Scan</span>
                </div>
                <div className="flex-1 overflow-auto p-4 flex items-center justify-center bg-neutral-900/10 dark:bg-neutral-950">
                  <img
                    src={document.fileUrl}
                    alt={document.filename}
                    className="max-w-full max-h-full object-contain rounded shadow-elevation border border-neutral-300 bg-white"
                  />
                </div>
              </div>
            ) : null}
          </div>
        ) : (
          <div className="lg:col-span-6 bg-surface-card rounded-lg border border-surface-border shadow-card flex flex-col h-[750px] overflow-hidden">
            
            {/* Document Header Bar */}
            <div className="p-3 bg-surface border-b border-surface-border flex items-center justify-between gap-3 shrink-0">
              <div className="flex items-center gap-2 text-xs font-medium text-surface-muted truncate">
                <FileText className="w-4 h-4 text-primary" />
                <strong className="text-on-surface truncate">{document.filename}</strong>
                <span>• {document.totalPages} Pages</span>
              </div>

              <div className="relative w-40 sm:w-48">
                <input
                  type="text"
                  placeholder="Search scan..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full h-7 pl-7 pr-2 text-xs bg-surface-card border border-surface-border rounded focus:outline-none focus:border-primary"
                />
                <Search className="w-3.5 h-3.5 text-surface-muted absolute left-2 top-2" />
              </div>
            </div>

          {/* Document Text View */}
          <div 
            ref={documentPaneRef}
            className="flex-1 p-6 overflow-y-auto font-serif text-sm leading-relaxed text-on-surface bg-surface/30 space-y-4 select-text"
            style={{ fontSize: `${fontSizeMultiplier * 14}px` }}
          >
            {clauses.map((clause) => {
              const isSelected = clause.id === activeClauseId;
              
              // O(1) lookup via memoized flag map
              const flag = flagMap.get(clause.id);

              return (
                <div
                  key={clause.id}
                  id={`clause-anchor-${clause.id}`}
                  role="button"
                  tabIndex={0}
                  aria-pressed={isSelected}
                  aria-label={`Section ${clause.number}: ${clause.title}${flag ? ', Review Flagged' : ''}`}
                  style={{ contentVisibility: 'auto', containIntrinsicSize: '120px' }}
                  onClick={() => {
                    setActiveClauseId(clause.id);
                    onSelectClause(clause.title, clause.id, undefined);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      setActiveClauseId(clause.id);
                      onSelectClause(clause.title, clause.id, undefined);
                    }
                  }}
                  className={`p-4 rounded-lg transition-all cursor-pointer relative focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none ${
                    isSelected 
                      ? 'ring-2 ring-amber-400 bg-amber-50/80 dark:bg-amber-950/40 shadow-md border-l-4 border-l-amber-500' 
                      : flag
                      ? 'bg-surface-card border border-surface-border border-l-4 border-l-secondary hover:border-primary/40'
                      : 'bg-surface-card border border-surface-border hover:border-primary/40'
                  }`}
                >
                  <div className="flex flex-wrap items-center justify-between gap-1 mb-2">
                    <div className="flex items-center gap-2">
                      <span className={`font-sans text-xs font-bold uppercase tracking-wider ${isSelected ? 'text-amber-900 dark:text-amber-300' : 'text-primary'}`}>
                        SECTION {clause.number} — {clause.title}
                      </span>
                      {isSelected && (
                        <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-200 text-amber-900 border border-amber-300 flex items-center gap-1 shadow-sm animate-pulse">
                          ⚡ LIVE HIGHLIGHTED SECTION
                        </span>
                      )}
                    </div>
                    
                    {flag && (
                      <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-surface border border-surface-border text-on-surface flex items-center gap-1">
                        <AlertCircle className="w-3 h-3 text-secondary" /> Review
                      </span>
                    )}
                  </div>

                  <p className="font-serif leading-relaxed text-secondary whitespace-pre-line">
                    {renderHighlightedText(clause.rawText, searchTerm)}
                  </p>

                  <div className="mt-2 text-[10px] font-sans text-surface-muted text-right flex items-center justify-between">
                    <span className="font-mono text-[9px] text-surface-muted">ID: {clause.id}</span>
                    <span>Page {clause.pageNumber} • Click to inspect</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
        )}

        {/* RIGHT PANE: LEVEL-ALIGNED CLAUSE NAVIGATOR & INSPECTOR (6 cols) */}
        <div className="lg:col-span-6 flex flex-col bg-surface-card rounded-lg border border-surface-border shadow-card h-[750px] overflow-hidden">
          
          {/* 1. Header Bar: Aligned at the exact same vertical level as the left PDF canvas header */}
          <div className="p-3 bg-surface border-b border-surface-border flex flex-wrap items-center justify-between gap-2 shrink-0">
            {/* Tab switchers */}
            <div className="inline-flex rounded bg-surface-card border border-surface-border p-0.5 text-xs">
              <button
                type="button"
                onClick={() => setRightPaneTab('clauses')}
                className={`px-3 py-1 rounded font-semibold flex items-center gap-1.5 transition-all ${
                  rightPaneTab === 'clauses'
                    ? 'bg-primary text-white shadow-xs'
                    : 'text-surface-muted hover:text-on-surface'
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                <span>Clauses in Document</span>
                <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                  rightPaneTab === 'clauses' ? 'bg-white/20 text-white' : 'bg-surface border border-surface-border text-surface-muted'
                }`}>
                  {document.clauses.length}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setRightPaneTab('inspector')}
                className={`px-3 py-1 rounded font-semibold flex items-center gap-1.5 transition-all ${
                  rightPaneTab === 'inspector'
                    ? 'bg-primary text-white shadow-xs'
                    : 'text-surface-muted hover:text-on-surface'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Plain-English Meaning</span>
                {activeRiskFlag && (
                  <span className="w-2 h-2 rounded-full bg-amber-400 inline-block animate-pulse" />
                )}
              </button>

              <button
                type="button"
                onClick={() => setRightPaneTab('summary')}
                className={`px-3 py-1 rounded font-semibold flex items-center gap-1.5 transition-all ${
                  rightPaneTab === 'summary'
                    ? 'bg-primary text-white shadow-xs'
                    : 'text-surface-muted hover:text-on-surface'
                }`}
              >
                <FileText className="w-3.5 h-3.5" />
                <span>PDF Summary</span>
                <span className={`px-1.5 py-0.2 rounded text-[9px] font-bold ${
                  rightPaneTab === 'summary' ? 'bg-white/20 text-white' : 'bg-primary/10 text-primary border border-primary/20'
                }`}>
                  AI
                </span>
              </button>
            </div>

            {/* Quick Context Controls */}
            {rightPaneTab === 'clauses' ? (
              <div className="relative w-36 sm:w-44">
                <input
                  type="text"
                  placeholder="Filter clauses..."
                  value={clauseFilter}
                  onChange={(e) => setClauseFilter(e.target.value)}
                  className="w-full h-7 pl-7 pr-2 text-xs bg-surface-card border border-surface-border rounded focus:outline-none focus:border-primary"
                />
                <Search className="w-3.5 h-3.5 text-surface-muted absolute left-2 top-2" />
              </div>
            ) : rightPaneTab === 'summary' ? (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsSummaryModalOpen(true)}
                  className="px-2.5 py-1 bg-surface-card border border-surface-border text-xs font-semibold text-primary hover:bg-surface-hover rounded-lg transition-colors flex items-center gap-1 shadow-xs"
                >
                  <Sparkles className="w-3 h-3 text-primary" />
                  <span>Full View</span>
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] text-surface-muted font-semibold hidden sm:inline">Clause:</span>
                <select
                  value={activeClause?.id || ''}
                  onChange={(e) => {
                    const targetClause = document.clauses.find(c => c.id === e.target.value);
                    if (targetClause) {
                      setActiveClauseId(targetClause.id);
                      onSelectClause(targetClause.title, targetClause.id, undefined);
                    }
                  }}
                  className="h-7 px-2 text-xs font-medium bg-surface-card text-on-surface border border-surface-border rounded focus:outline-none focus:border-primary max-w-[170px] sm:max-w-[200px] truncate"
                >
                  {document.clauses.map((c) => (
                    <option key={c.id} value={c.id}>
                      Sec {c.number}: {c.title.substring(0, 24)}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* 2. Active Clause Context Banner (Exact matching height to PDF target banner) */}
          {activeClause && (
            <div className="px-3 sm:px-4 py-1.5 bg-amber-50/90 dark:bg-amber-950/40 border-b border-amber-200 dark:border-amber-900/60 flex items-center justify-between gap-2 text-xs shrink-0">
              <div className="flex items-center gap-2 truncate min-w-0">
                <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-200 text-amber-900 border border-amber-300 shrink-0">
                  ⚡ ACTIVE CLAUSE
                </span>
                <span className="font-semibold text-amber-900 dark:text-amber-200 truncate">
                  Section {activeClause.number}: {activeClause.title}
                </span>
                {activeClause.pageNumber && (
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-amber-100/80 dark:bg-amber-900/40 text-amber-800 dark:text-amber-300 border border-amber-300/60 shrink-0">
                    Page {activeClause.pageNumber}
                  </span>
                )}
              </div>

              {rightPaneTab === 'clauses' ? (
                <button
                  type="button"
                  onClick={() => setRightPaneTab('inspector')}
                  className="px-2 py-0.5 rounded text-[11px] font-semibold bg-primary text-white hover:bg-primary-hover shadow-xs flex items-center gap-1 shrink-0 transition-colors"
                  title="View plain English explanation, risk flags and redlines for this clause"
                >
                  <span>Meaning & Risks</span>
                  <ChevronRight className="w-3 h-3" />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setRightPaneTab('clauses')}
                  className="px-2 py-0.5 rounded text-[11px] font-semibold bg-surface-card border border-surface-border text-on-surface hover:bg-surface-hover flex items-center gap-1 shrink-0 transition-colors"
                  title="Return to the full list of clauses in this document"
                >
                  <span>← All Clauses ({clauses.length})</span>
                </button>
              )}
            </div>
          )}

          {/* 3. Main Content Area */}
          {rightPaneTab === 'clauses' ? (
            /* TAB 1: CLAUSES IN THIS DOCUMENT - ALIGNED AT THE EXACT SAME LEVEL AS THE DOCUMENT */
            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              {filteredClauses.map((c) => {
                const flag = flagMap.get(c.id);
                const isSelected = c.id === activeClauseId;

                return (
                  <div
                    key={c.id}
                    role="button"
                    tabIndex={0}
                    aria-pressed={isSelected}
                    aria-label={`Section ${c.number}: ${c.title}${flag ? ', Review Flagged' : ''}`}
                    style={{ contentVisibility: 'auto', containIntrinsicSize: '90px' }}
                    onClick={() => {
                      setActiveClauseId(c.id);
                      onSelectClause(c.title, c.id, undefined);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        setActiveClauseId(c.id);
                        onSelectClause(c.title, c.id, undefined);
                      }
                    }}
                    className={`p-3 rounded-lg text-xs cursor-pointer transition-all border focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none ${
                      isSelected
                        ? 'border-primary bg-primary/5 dark:bg-primary/10 shadow-sm ring-1 ring-primary'
                        : 'bg-surface hover:bg-surface-hover border-surface-border hover:border-primary/40'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold shrink-0 ${
                          isSelected
                            ? 'bg-primary text-white'
                            : 'bg-surface-card border border-surface-border text-primary'
                        }`}>
                          {/^\d+$/.test(c.number) ? `Sec ${c.number}` : c.number}
                        </span>

                        <span className={`truncate font-semibold ${isSelected ? 'text-primary' : 'text-on-surface'}`} title={c.title}>
                          {c.title}
                        </span>

                        {c.pageNumber && (
                          <span className="text-[10px] font-mono text-surface-muted shrink-0">
                            (P.{c.pageNumber})
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        {flag && (
                          <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-100 dark:bg-amber-950/70 text-amber-900 dark:text-amber-300 border border-amber-300 flex items-center gap-1">
                            <span>⚠️</span>
                            <span>Review</span>
                          </span>
                        )}

                        {isSelected ? (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setRightPaneTab('inspector');
                            }}
                            className="px-2 py-0.5 rounded text-[10px] font-bold bg-primary text-white hover:bg-primary-hover flex items-center gap-0.5 shadow-xs"
                            title="Inspect plain English explanation"
                          >
                            <span>Meaning</span>
                            <ChevronRight className="w-2.5 h-2.5" />
                          </button>
                        ) : null}
                      </div>
                    </div>

                    {isSelected && (
                      <div className="mt-2 pt-2 border-t border-primary/20 flex items-center justify-between text-[11px]">
                        <span className="text-amber-800 dark:text-amber-300 font-medium flex items-center gap-1">
                          ⚡ Currently highlighted on Page {c.pageNumber || 1}
                        </span>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setRightPaneTab('inspector');
                          }}
                          className="font-bold text-primary hover:underline flex items-center gap-0.5"
                        >
                          <span>View Analysis & Scenarios</span>
                          <ChevronRight className="w-3 h-3" />
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : rightPaneTab === 'summary' ? (
            /* TAB 3: PDF EXECUTIVE SUMMARY */
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-surface-border">
                <div>
                  <h3 className="font-serif text-base sm:text-lg font-bold text-on-surface flex items-center gap-2">
                    <span>PDF Executive Summary</span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-primary/10 text-primary border border-primary/20">
                      Gemma 4 / Gemini
                    </span>
                  </h3>
                  <p className="text-xs text-surface-muted">
                    Plain-English legal overview of this {document.totalPages}-page contract
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsSummaryModalOpen(true)}
                    className="px-2.5 py-1 bg-surface-card border border-surface-border text-xs font-semibold text-primary hover:bg-surface-hover rounded-lg transition-colors flex items-center gap-1 shadow-xs"
                    title="Open full expanded summary modal"
                  >
                    <span>Full View</span>
                    <ChevronRight className="w-3 h-3" />
                  </button>
                </div>
              </div>

              {isGeneratingSummary ? (
                <div className="py-14 text-center space-y-3">
                  <div className="w-10 h-10 rounded-full border-3 border-primary/20 border-t-primary animate-spin mx-auto" />
                  <p className="text-xs font-semibold text-on-surface">
                    Synthesizing PDF Summary with AI...
                  </p>
                  <p className="text-[11px] text-surface-muted max-w-xs mx-auto">
                    Evaluating all {clauses.length} clauses across all {document.totalPages || 1} pages...
                  </p>
                </div>
              ) : pdfSummary ? (
                <div className="space-y-4">
                  {/* Bottom Line */}
                  <div className="p-4 rounded-xl bg-gradient-to-br from-blue-50 to-indigo-50/50 dark:from-blue-950/30 dark:to-indigo-950/20 border border-blue-200 dark:border-blue-900/50 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-600 text-white uppercase tracking-wider">
                        Bottom Line
                      </span>
                      <span className="text-[10px] font-mono text-surface-muted">
                        {pdfSummary.modelUsed}
                      </span>
                    </div>
                    <p className="font-serif text-sm font-semibold text-navy-950 dark:text-blue-100 leading-relaxed pt-0.5">
                      "{pdfSummary.bottomLine}"
                    </p>
                  </div>

                  {/* Summary Text */}
                  <div className="p-4 rounded-xl bg-surface border border-surface-border space-y-1.5">
                    <span className="text-xs font-bold text-primary uppercase tracking-wider flex items-center gap-1.5">
                      <FileText className="w-3.5 h-3.5" />
                      <span>Executive Overview</span>
                    </span>
                    <p className="text-xs text-secondary leading-relaxed whitespace-pre-line font-sans">
                      {pdfSummary.summary}
                    </p>
                  </div>

                  {/* Key Points */}
                  {(pdfSummary.keyPoints || []).length > 0 && (
                    <div className="space-y-2">
                      <span className="text-xs font-bold text-emerald-800 dark:text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Key Provisions</span>
                      </span>
                      <div className="space-y-1.5">
                        {(pdfSummary.keyPoints || []).map((pt, i) => (
                          <div key={i} className="p-2.5 rounded-lg bg-surface border border-surface-border text-xs text-secondary flex items-start gap-2">
                            <span className="w-4 h-4 rounded bg-emerald-100 text-emerald-800 text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                              {i + 1}
                            </span>
                            <span>{pt}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Warning Traps */}
                  {(pdfSummary.warningTraps || []).length > 0 && (
                    <div className="space-y-2">
                      <span className="text-xs font-bold text-amber-900 dark:text-amber-300 uppercase tracking-wider flex items-center gap-1.5">
                        <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
                        <span>Red Flags to Note</span>
                      </span>
                      <div className="space-y-1.5">
                        {(pdfSummary.warningTraps || []).map((tr, i) => (
                          <div key={i} className="p-2.5 rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/50 text-xs text-amber-950 dark:text-amber-200 flex items-start gap-2">
                            <span className="shrink-0 mt-0.5">⚠️</span>
                            <span>{tr}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="pt-2 flex items-center justify-between">
                    <button
                      type="button"
                      onClick={() => {
                        const copyTxt = `${pdfSummary.bottomLine}\n\n${pdfSummary.summary}`;
                        navigator.clipboard.writeText(copyTxt);
                        setCopiedSummary(true);
                        setTimeout(() => setCopiedSummary(false), 2000);
                      }}
                      className="px-3 py-1.5 bg-surface border border-surface-border rounded-lg text-xs font-medium text-secondary hover:text-on-surface flex items-center gap-1.5 shadow-xs"
                    >
                      {copiedSummary ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedSummary ? 'Copied' : 'Copy'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setIsSummaryModalOpen(true)}
                      className="px-3 py-1.5 bg-primary text-white rounded-lg text-xs font-semibold hover:bg-primary-container flex items-center gap-1 shadow-xs"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Full PDF Summary</span>
                    </button>
                  </div>
                </div>
              ) : (
                <div className="py-12 text-center space-y-4 max-w-sm mx-auto">
                  <div className="w-12 h-12 rounded-2xl bg-indigo-50 border border-indigo-100 text-primary flex items-center justify-center mx-auto shadow-xs">
                    <FileText className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="font-serif font-bold text-base text-on-surface">
                      Generate PDF Executive Summary
                    </h4>
                    <p className="text-xs text-secondary mt-1 leading-relaxed">
                      Synthesize a plain-English summary of this {document.totalPages}-page contract using AI or Gemini.
                    </p>
                  </div>
                  {summaryError && (
                    <p className="text-xs text-rose-600 bg-rose-50 p-2 rounded border border-rose-200">
                      {summaryError}
                    </p>
                  )}
                  <button
                    type="button"
                    onClick={handleQuickGenerateSummary}
                    className="px-4 py-2 bg-primary text-white rounded-xl text-xs font-bold hover:bg-primary-container transition-all shadow-sm inline-flex items-center gap-2"
                  >
                    <Sparkles className="w-4 h-4" />
                    <span>Generate Summary with AI</span>
                  </button>
                </div>
              )}
            </div>
          ) : (
            /* TAB 2: PLAIN-ENGLISH INSPECTOR */
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {activeClause && (
                <div className="space-y-4">
                  {/* Title & Status Bar */}
                  <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-surface-border">
                    <div>
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-xs font-bold uppercase tracking-wider text-surface-muted">
                          SECTION {activeClause.number}
                        </span>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-surface border border-surface-border text-surface-muted">
                          ID: {activeClause.id}
                        </span>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-300 flex items-center gap-1">
                          ⚡ Live in Document (P.{activeClause.pageNumber || 1})
                        </span>
                      </div>
                      <h3 className="font-serif text-xl font-bold text-on-surface">
                        {activeClause.title}
                      </h3>
                    </div>

                    {activeRiskFlag ? (
                      <span className="px-2.5 py-1 rounded text-xs font-medium bg-surface text-secondary border border-surface-border flex items-center gap-1.5">
                        <AlertCircle className="w-3.5 h-3.5 text-primary" />
                        <span>Important to Review</span>
                      </span>
                    ) : (
                      <span className="px-2.5 py-1 rounded text-xs font-medium bg-surface text-surface-muted border border-surface-border">
                        Standard Provision
                      </span>
                    )}
                  </div>

                  {/* Plain English Explanation Box */}
                  <div className="p-4 rounded-lg bg-surface border border-surface-border space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-xs font-bold text-primary uppercase tracking-wider">
                        <Sparkles className="w-4 h-4 text-primary" />
                        <span>Plain-English Meaning ({readingMode.toUpperCase()})</span>
                      </div>
                      <div className="flex items-center gap-1 text-[11px] text-surface-muted">
                        <span>Reading Mode: <strong>{readingMode}</strong></span>
                      </div>
                    </div>
                    <p className="text-sm text-secondary leading-relaxed whitespace-pre-line font-sans">
                      {getGroundedExplanation(activeClause, activeRiskFlag, readingMode)}
                    </p>
                  </div>

                  {/* Concrete Scenario */}
                  {activeRiskFlag?.realWorldScenario && (
                    <div className="p-3.5 rounded bg-surface border border-surface-border text-xs text-secondary space-y-1">
                      <div className="flex items-center gap-1.5 font-semibold text-on-surface">
                        <Lightbulb className="w-4 h-4 text-primary" />
                        <span>Practical Scenario:</span>
                      </div>
                      <p className="leading-relaxed text-surface-muted">
                        {activeRiskFlag.realWorldScenario}
                      </p>
                    </div>
                  )}

                  {/* Why this is highlighted */}
                  {activeRiskFlag?.statutoryContext && (
                    <div className="p-3.5 rounded bg-surface border border-surface-border text-xs text-secondary space-y-1">
                      <div className="flex items-center gap-1.5 font-semibold text-on-surface">
                        <Gavel className="w-4 h-4 text-primary" />
                        <span>Why this is highlighted:</span>
                      </div>
                      <p className="leading-relaxed text-[11px] text-surface-muted">
                        {activeRiskFlag.statutoryContext}
                      </p>
                    </div>
                  )}

                  {/* Points to discuss or clarify */}
                  {activeRiskFlag?.suggestedRedline && (
                    <div className="p-4 rounded-lg bg-surface border border-surface-border space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-on-surface uppercase tracking-wider flex items-center gap-1">
                          <Scale className="w-3.5 h-3.5 text-primary" />
                          Points to discuss or clarify
                        </span>
                        <button
                          onClick={() => handleCopyRedline(activeRiskFlag.suggestedRedline!)}
                          className="flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
                        >
                          {copiedRedline ? <Check className="w-3.5 h-3.5 text-primary" /> : <Copy className="w-3.5 h-3.5" />}
                          <span>{copiedRedline ? 'Copied' : 'Copy Points'}</span>
                        </button>
                      </div>
                      <div className="p-3 rounded bg-surface-card border border-surface-border font-mono text-xs text-on-surface leading-relaxed italic">
                        "{activeRiskFlag.suggestedRedline}"
                      </div>
                    </div>
                  )}

                  {/* Dedicated Indian Statutory Framework & Compliance Card */}
                  {document.analysis?.indianLegalChecks && (
                    <div className="bg-gradient-to-br from-amber-50 to-orange-50/50 dark:from-amber-950/30 dark:to-orange-950/20 border border-amber-300 dark:border-amber-900/60 rounded-xl p-4 shadow-card space-y-3">
                      <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-amber-200 dark:border-amber-900/40">
                        <div className="flex items-center gap-1.5 text-xs font-bold text-amber-900 dark:text-amber-300 uppercase tracking-wider">
                          <Scale className="w-4 h-4 text-amber-600" />
                          <span>🇮🇳 Indian Statutory Framework & Compliance</span>
                        </div>
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-amber-200 text-amber-900 border border-amber-300">
                          {document.analysis.indianLegalChecks.stateTenancyAct ? 'State Rent Code' : 'Indian Contract Act'}
                        </span>
                      </div>

                      {/* 11-Month vs 12-Month Registration Rule */}
                      <div className="p-3 rounded-lg bg-surface/90 border border-surface-border text-xs space-y-1">
                        <div className="flex items-center gap-1.5 font-bold text-on-surface">
                          <ShieldAlert className="w-3.5 h-3.5 text-amber-600" />
                          <span>{getVernacularText('registrationAlert', selectedLanguage)}:</span>
                        </div>
                        <p className="text-[11px] text-surface-muted leading-relaxed">
                          {document.analysis.indianLegalChecks.registrationNotice}
                        </p>
                      </div>

                      {/* State Tenancy Legislation Specifics */}
                      {document.analysis.indianLegalChecks.stateTenancySpecifics && document.analysis.indianLegalChecks.stateTenancySpecifics.length > 0 && (
                        <div className="p-3 rounded-lg bg-surface/90 border border-surface-border text-xs space-y-1.5">
                          <div className="font-bold text-on-surface text-[11px] flex items-center gap-1">
                            <span>🏛️</span>
                            <span>{document.analysis.indianLegalChecks.stateTenancyAct}:</span>
                          </div>
                          <ul className="space-y-1 text-[11px] text-surface-muted list-disc list-inside">
                            {document.analysis.indianLegalChecks.stateTenancySpecifics.map((spec, sIdx) => (
                              <li key={sIdx} className="leading-relaxed">{spec}</li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {/* Stamp Duty Notice */}
                      {document.analysis.indianLegalChecks.stampDutyNotice && (
                        <div className="text-[10px] text-amber-800 dark:text-amber-300/90 font-medium px-1 flex items-center gap-1.5">
                          <span>📜</span>
                          <span>{document.analysis.indianLegalChecks.stampDutyNotice}</span>
                        </div>
                      )}
                    </div>
                  )}

                </div>
              )}
            </div>
          )}

        </div>

      </div>

      {/* Full AI PDF Summary Modal */}
      <PdfSummaryModal
        isOpen={isSummaryModalOpen}
        onClose={() => setIsSummaryModalOpen(false)}
        document={document}
        apiKey={apiKey}
        openRouterKey={openRouterKey}
        onUpdateDocument={(doc) => {
          setPdfSummary(doc.pdfSummary);
          if (onUpdateDocument) onUpdateDocument(doc);
        }}
      />

    </div>
  );
};

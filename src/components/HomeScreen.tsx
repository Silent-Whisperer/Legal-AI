import React, { useState } from 'react';
import { 
  Scale, 
  Upload, 
  ArrowRight, 
  CheckCircle2, 
  Trash2
} from 'lucide-react';
import { ColorfulFlowchart } from './ColorfulFlowchart.tsx';
import { LegalDocument } from '../types.ts';

interface HomeScreenProps {
  documents: Array<Partial<LegalDocument> & { totalClauses?: number; criticalFlagCount?: number; executiveSummary?: string }>;
  onSelectDoc: (id: string) => void;
  onDeleteDoc?: (id: string) => void;
  onOpenUpload: () => void;
  onNavigateTab: (tab: string) => void;
  onDropFile?: (file: File) => void;
}

export const HomeScreen: React.FC<HomeScreenProps> = ({
  documents,
  onSelectDoc,
  onDeleteDoc,
  onOpenUpload,
  onNavigateTab,
  onDropFile,
}) => {
  const [isDraggingDropzone, setIsDraggingDropzone] = useState(false);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingDropzone(false);
    const droppedFile = e.dataTransfer?.files?.[0];
    if (droppedFile && onDropFile) {
      onDropFile(droppedFile);
    } else {
      onOpenUpload();
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingDropzone(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingDropzone(false);
  };

  return (
    <div className="space-y-12 animate-fadeIn">
      
      {/* 1. HERO SECTION: High Impact, Hooking & Crystal Clear Purpose */}
      <section className="bg-surface-card rounded-2xl border border-surface-border p-8 sm:p-12 shadow-card relative overflow-hidden text-center max-w-5xl mx-auto space-y-6">
        {/* Subtle accent bar */}
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-primary via-indigo-600 to-emerald-600" />

        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-navy-50 text-primary text-xs font-semibold border border-navy-100">
          <Scale className="w-3.5 h-3.5" />
          <span>ClarityLegal • Legal Information Accessibility Platform</span>
          <span>•</span>
          <span>🇮🇳 India & 🇺🇸 International Frameworks</span>
        </div>

        <h1 className="font-serif text-3xl sm:text-4xl lg:text-5xl font-bold text-on-surface tracking-tight max-w-4xl mx-auto leading-tight text-balance text-center">
          Never sign what you don’t understand. ✍️
        </h1>

        <p className="text-base sm:text-lg text-secondary max-w-2xl mx-auto leading-relaxed">
          Upload any legal contract — lease, employment offer, NDA, or service agreement. ClarityLegal turns dense legal prose into plain English, outlines your obligations and deadlines, notes areas to review, and maps what happens next.
        </p>

        {/* Primary Action Callouts */}
        <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
          <button
            onClick={onOpenUpload}
            className="flex items-center gap-2 px-6 py-3.5 bg-primary text-white hover:bg-primary-container rounded-xl font-semibold text-sm transition-all shadow-card group"
          >
            <Upload className="w-4 h-4 group-hover:scale-110 transition-transform" />
            <span>📤 Upload Contract (PDF, Word, or Text)</span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </button>

          <button
            onClick={() => onNavigateTab('compare')}
            className="flex items-center gap-2 px-5 py-3.5 bg-surface hover:bg-surface-hover text-on-surface border border-surface-border rounded-xl font-semibold text-sm transition-all shadow-card"
          >
            <span>🔄 Version Compare Drafts</span>
          </button>
        </div>

        {/* Reassurance badges */}
        <div className="flex flex-wrap items-center justify-center gap-2.5 pt-4 text-xs text-secondary font-medium">
          <span className="px-3 py-1 rounded-full bg-surface border border-surface-border flex items-center gap-1.5 shadow-sm">
            <CheckCircle2 className="w-3.5 h-3.5 text-risk-safe" /> 📖 Grade 8 Plain English
          </span>
          <span className="px-3 py-1 rounded-full bg-surface border border-surface-border flex items-center gap-1.5 shadow-sm">
            <CheckCircle2 className="w-3.5 h-3.5 text-risk-safe" /> 🇮🇳 Indian Contract Act 1872
          </span>
          <span className="px-3 py-1 rounded-full bg-surface border border-surface-border flex items-center gap-1.5 shadow-sm">
            <CheckCircle2 className="w-3.5 h-3.5 text-risk-safe" /> 🔒 100% Sourced to Contract Text
          </span>
          <span className="px-3 py-1 rounded-full bg-surface border border-surface-border flex items-center gap-1.5 shadow-sm">
            <CheckCircle2 className="w-3.5 h-3.5 text-risk-safe" /> 💼 Lawyer Consultation Ready
          </span>
        </div>
      </section>

      {/* 2. LIVE DOCUMENT LIBRARY / ACTIVE UPLOAD ZONE */}
      <section className="max-w-5xl mx-auto space-y-6">
        <div className="text-center space-y-2 max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-navy-50 text-primary text-xs font-semibold border border-navy-100">
            <span>📂 Your Contract Workspace</span>
          </div>
          <h2 className="font-serif text-2xl sm:text-3xl font-bold text-on-surface text-balance text-center">
            {documents.length > 0 ? 'Your Uploaded Contracts & Documents 📜' : 'Get Started with Your Contract 🚀'}
          </h2>
          <p className="text-xs sm:text-sm text-secondary leading-relaxed max-w-2xl mx-auto text-center">
            {documents.length > 0 
              ? 'Select any analyzed contract below to inspect its plain-English summary, responsibilities, timeline, and questions for counsel.'
              : 'Upload or drag-and-drop your real PDF, Word document, or image to extract clauses and generate instant plain-language intelligence.'}
          </p>
          {documents.length > 0 && (
            <div className="pt-2 flex justify-center">
              <button
                onClick={onOpenUpload}
                className="flex items-center gap-1.5 px-4 py-2 bg-primary text-white rounded-lg text-xs font-semibold hover:bg-primary-container transition-all shadow-card"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>+ Add Document</span>
              </button>
            </div>
          )}
        </div>

        {documents.length > 0 ? (
          <div className="space-y-4">
            {/* Optional drop banner above existing documents */}
            <div
              onDragOver={handleDragOver}
              onDragEnter={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={onOpenUpload}
              className={`border-2 border-dashed rounded-xl p-3.5 text-center cursor-pointer transition-all ${
                isDraggingDropzone 
                  ? 'border-primary bg-primary/10 ring-4 ring-primary/20 scale-[1.01]' 
                  : 'border-surface-border/70 hover:border-primary bg-surface/40 hover:bg-surface'
              }`}
            >
              <div className="flex items-center justify-center gap-2 text-xs font-semibold text-secondary">
                <Upload className={`w-4 h-4 ${isDraggingDropzone ? 'text-primary animate-bounce' : 'text-surface-muted'}`} />
                <span>
                  {isDraggingDropzone ? 'Release file here to upload! 🚀' : 'Drag & drop another PDF, DOCX, Image, or Text file here to add to workspace'}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {documents.map((doc) => {
                const isNonLegal = doc.isLegalDocument === false || doc.stoppedAfterClassification === true;
                const docIcon = isNonLegal 
                  ? (doc.nonLegalCategory === 'CERTIFICATE_OR_AWARD' ? '🏆' 
                    : doc.nonLegalCategory === 'RESUME_OR_CV' ? '👤' 
                    : doc.nonLegalCategory === 'INVOICE_OR_RECEIPT' ? '🧾' 
                    : '📄')
                  : '📄';

                return (
                  <div 
                    key={doc.id}
                    className={`bg-surface-card rounded-xl border p-5 shadow-card hover:shadow-card-hover transition-all flex flex-col justify-between group relative overflow-hidden ${
                      isNonLegal ? 'border-amber-200 dark:border-amber-900/50 hover:border-amber-400' : 'border-surface-border hover:border-primary'
                    }`}
                  >
                    <div className={`absolute top-0 left-0 right-0 h-1 ${isNonLegal ? 'bg-amber-400' : 'bg-primary'}`} />
                    <div>
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className={`w-10 h-10 rounded-lg flex items-center justify-center font-bold text-lg shrink-0 transition-colors ${
                            isNonLegal 
                              ? 'bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300' 
                              : 'bg-navy-50 text-primary group-hover:bg-primary group-hover:text-white'
                          }`}>
                            {docIcon}
                          </div>
                          <div className="min-w-0">
                            <h3 className="font-serif text-base font-bold text-on-surface group-hover:text-primary transition-colors truncate">
                              {doc.title}
                            </h3>
                            <p className="text-[11px] text-surface-muted truncate">
                              {doc.filename} • {doc.uploadDate}
                            </p>
                          </div>
                        </div>

                        {onDeleteDoc && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onDeleteDoc(doc.id!);
                            }}
                            title="Delete document"
                            className="p-1.5 text-surface-muted hover:text-red-600 rounded hover:bg-surface transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>

                      {doc.executiveSummary && (
                        <p className="text-xs text-secondary leading-relaxed mt-3 line-clamp-2">
                          {doc.executiveSummary}
                        </p>
                      )}

                      <div className="flex flex-wrap items-center gap-2 mt-3 text-[11px]">
                        {isNonLegal ? (
                          <>
                            <span className="px-2 py-0.5 rounded bg-amber-50 text-amber-800 dark:bg-amber-950/60 dark:text-amber-200 border border-amber-300 dark:border-amber-800 font-semibold flex items-center gap-1">
                              <span>🛑 Non-Legal Document</span>
                            </span>
                            <span className="px-2 py-0.5 rounded bg-surface border border-surface-border text-surface-muted font-mono">
                              Analysis Halted
                            </span>
                          </>
                        ) : (
                          <>
                            <span className="px-2 py-0.5 rounded bg-surface border border-surface-border text-on-surface font-medium">
                              📑 {doc.totalClauses || 0} Clauses
                            </span>
                            {doc.criticalFlagCount ? (
                              <span className="px-2 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200 font-semibold">
                                ⚠️ {doc.criticalFlagCount} to Review
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200 font-semibold">
                                ✅ Standard Terms
                              </span>
                            )}
                          </>
                        )}
                      </div>
                    </div>

                    <div 
                      onClick={() => onSelectDoc(doc.id!)}
                      className="pt-4 mt-4 border-t border-surface-border flex items-center justify-between text-xs font-semibold text-primary cursor-pointer hover:underline"
                    >
                      <span>{isNonLegal ? 'Open Classification Dossier' : 'Open Document Intelligence Dossier'}</span>
                      <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div 
            onDragOver={handleDragOver}
            onDragEnter={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={onOpenUpload}
            className={`border-2 border-dashed rounded-2xl p-8 sm:p-12 text-center transition-all space-y-4 group shadow-card cursor-pointer ${
              isDraggingDropzone 
                ? 'border-primary bg-primary/10 ring-4 ring-primary/20 scale-[1.01]' 
                : 'border-surface-border hover:border-primary bg-surface-card/60 hover:bg-surface-card'
            }`}
          >
            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mx-auto text-2xl transition-transform shadow-sm ${
              isDraggingDropzone ? 'bg-primary text-white scale-125 animate-bounce' : 'bg-navy-50 text-primary group-hover:scale-110'
            }`}>
              {isDraggingDropzone ? '📥' : '📁'}
            </div>
            <div className="space-y-1.5">
              <h3 className="font-serif text-lg sm:text-xl font-bold text-on-surface group-hover:text-primary transition-colors">
                {isDraggingDropzone ? 'Drop your file here to upload!' : 'Drop your legal contract or document here to get started'}
              </h3>
              <p className="text-xs sm:text-sm text-secondary max-w-md mx-auto leading-relaxed">
                Accepts <strong>PDF</strong> (digital or scanned), Word (<strong>.docx, .doc</strong>), Images (<strong>PNG, JPG, WebP</strong>), or <strong>Text/Markdown</strong>. Or click to select from your device.
              </p>
            </div>
            <div className="pt-2">
              <span className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary text-white rounded-lg font-semibold text-xs shadow-sm group-hover:bg-primary-container transition-colors">
                <Upload className="w-3.5 h-3.5" />
                <span>Upload Document (PDF / DOCX / Image / Text)</span>
              </span>
            </div>
          </div>
        )}
      </section>

      {/* 3. VIBRANT INTERACTIVE FLOWCHART DEMONSTRATION */}
      <div className="max-w-5xl mx-auto">
        <ColorfulFlowchart />
      </div>

      {/* 4. THE 6 CORE INTELLIGENCE CAPABILITIES */}
      <section className="bg-surface rounded-2xl border border-surface-border p-6 sm:p-8 max-w-5xl mx-auto space-y-6">
        <div className="text-center space-y-2 max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-navy-50 text-primary text-xs font-semibold border border-navy-100">
            <span>🎯 Navigation Architecture</span>
          </div>
          <h2 className="font-serif text-2xl sm:text-3xl font-bold text-on-surface text-balance text-center">
            Every Contract Unpacked Into 6 Clear Views
          </h2>
          <p className="text-xs sm:text-sm text-secondary leading-relaxed max-w-2xl mx-auto text-center">
            Switch seamlessly across all perspectives once your contract is loaded
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 items-stretch">
          
          <div 
            onClick={() => onNavigateTab('overview')}
            className="p-4 rounded-xl bg-surface-card border border-surface-border shadow-card hover:border-primary cursor-pointer transition-all flex flex-col justify-between h-full group"
          >
            <div>
              <div className="flex items-center gap-2.5 font-bold text-sm text-on-surface group-hover:text-primary transition-colors">
                <span className="text-lg">✨</span>
                <span>What It Means For You</span>
              </div>
              <p className="text-xs text-secondary leading-relaxed mt-2">
                Immediate plain-language executive summary explaining your commitments, leverage balance, and key payment dates.
              </p>
            </div>
            <div className="pt-3 mt-3 border-t border-surface-border/50 text-[11px] font-semibold text-primary flex items-center gap-1">
              <span>View Summary</span>
              <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
            </div>
          </div>

          <div 
            onClick={() => onNavigateTab('responsibilities')}
            className="p-4 rounded-xl bg-surface-card border border-surface-border shadow-card hover:border-primary cursor-pointer transition-all flex flex-col justify-between h-full group"
          >
            <div>
              <div className="flex items-center gap-2.5 font-bold text-sm text-on-surface group-hover:text-primary transition-colors">
                <span className="text-lg">📋</span>
                <span>Obligations Matrix</span>
              </div>
              <p className="text-xs text-secondary leading-relaxed mt-2">
                Two-column comparison clearly separating what you must do from what the other party is legally required to do.
              </p>
            </div>
            <div className="pt-3 mt-3 border-t border-surface-border/50 text-[11px] font-semibold text-primary flex items-center gap-1">
              <span>View Obligations</span>
              <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
            </div>
          </div>

          <div 
            onClick={() => onNavigateTab('timeline')}
            className="p-4 rounded-xl bg-surface-card border border-surface-border shadow-card hover:border-primary cursor-pointer transition-all flex flex-col justify-between h-full group"
          >
            <div>
              <div className="flex items-center gap-2.5 font-bold text-sm text-on-surface group-hover:text-primary transition-colors">
                <span className="text-lg">⏳</span>
                <span>Next Steps Timeline</span>
              </div>
              <p className="text-xs text-secondary leading-relaxed mt-2">
                Step-by-step contractual roadmap showing "what happens next" from Day 0 signing through deposit returns and exit notices.
              </p>
            </div>
            <div className="pt-3 mt-3 border-t border-surface-border/50 text-[11px] font-semibold text-primary flex items-center gap-1">
              <span>View Timeline</span>
              <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
            </div>
          </div>

          <div 
            onClick={() => onNavigateTab('explainer')}
            className="p-4 rounded-xl bg-surface-card border border-surface-border shadow-card hover:border-primary cursor-pointer transition-all flex flex-col justify-between h-full group"
          >
            <div>
              <div className="flex items-center gap-2.5 font-bold text-sm text-on-surface group-hover:text-primary transition-colors">
                <span className="text-lg">🔍</span>
                <span>Clause Reader</span>
              </div>
              <p className="text-xs text-secondary leading-relaxed mt-2">
                Read the original contract text side-by-side with Grade 8 plain English translations and reading mode toggles.
              </p>
            </div>
            <div className="pt-3 mt-3 border-t border-surface-border/50 text-[11px] font-semibold text-primary flex items-center gap-1">
              <span>View Reader</span>
              <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
            </div>
          </div>

          <div 
            onClick={() => onNavigateTab('lawyer')}
            className="p-4 rounded-xl bg-surface-card border border-surface-border shadow-card hover:border-primary cursor-pointer transition-all flex flex-col justify-between h-full group"
          >
            <div>
              <div className="flex items-center gap-2.5 font-bold text-sm text-on-surface group-hover:text-primary transition-colors">
                <span className="text-lg">💼</span>
                <span>Lawyer Dossier</span>
              </div>
              <p className="text-xs text-secondary leading-relaxed mt-2">
                Copyable questions to ask counsel, missing contract protections, and an evidence checklist to save billable hours.
              </p>
            </div>
            <div className="pt-3 mt-3 border-t border-surface-border/50 text-[11px] font-semibold text-primary flex items-center gap-1">
              <span>View Dossier</span>
              <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
            </div>
          </div>

          <div 
            onClick={() => onNavigateTab('compare')}
            className="p-4 rounded-xl bg-surface-card border border-surface-border shadow-card hover:border-primary cursor-pointer transition-all flex flex-col justify-between h-full group"
          >
            <div>
              <div className="flex items-center gap-2.5 font-bold text-sm text-on-surface group-hover:text-primary transition-colors">
                <span className="text-lg">🔄</span>
                <span>Version Compare</span>
              </div>
              <p className="text-xs text-secondary leading-relaxed mt-2">
                Compare two drafts to see what actually changed in plain English rather than squinting at raw character diffs.
              </p>
            </div>
            <div className="pt-3 mt-3 border-t border-surface-border/50 text-[11px] font-semibold text-primary flex items-center gap-1">
              <span>Compare Drafts</span>
              <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
            </div>
          </div>

        </div>
      </section>

    </div>
  );
};

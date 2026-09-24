import React from 'react';
import { LegalDocument } from '../types.ts';
import { SupportedLanguage, getVernacularText } from '../utils/vernacular.ts';
import { LanguageSelector } from './LanguageSelector.tsx';
import { 
  Upload, 
  Settings, 
  Printer, 
  ChevronDown,
  Scale,
  Sparkles
} from 'lucide-react';

interface HeaderProps {
  currentDoc: LegalDocument | null;
  documents: Array<Partial<LegalDocument> & { totalClauses?: number; criticalFlagCount?: number }>;
  currentLanguage: SupportedLanguage;
  onSelectLanguage: (lang: SupportedLanguage) => void;
  onSelectDoc: (id: string) => void;
  onOpenUpload: () => void;
  onOpenSettings: () => void;
  onPrintDossier: () => void;
  onOpenSummary?: () => void;
  onNavigateHome?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentDoc,
  documents,
  currentLanguage,
  onSelectLanguage,
  onSelectDoc,
  onOpenUpload,
  onOpenSettings,
  onPrintDossier,
  onOpenSummary,
  onNavigateHome,
}) => {
  return (
    <header className="sticky top-0 z-40 bg-surface-card border-b border-surface-border shadow-card">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-4">
          
          {/* Logo & Brand Identity */}
          <button 
            type="button"
            className="flex items-center gap-3 shrink-0 cursor-pointer group text-left focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none rounded-lg p-1 transition-all"
            onClick={onNavigateHome}
            aria-label="Return to ClarityLegal Home"
          >
            <div className="w-9 h-9 rounded bg-primary flex items-center justify-center text-white shadow-sm group-hover:bg-primary-container transition-colors" aria-hidden="true">
              <Scale className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-serif font-bold text-xl text-primary tracking-tight group-hover:underline">
                  {getVernacularText('appName', currentLanguage)}
                </span>
                <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-surface text-surface-muted border border-surface-border">
                  Legal Information Platform
                </span>
              </div>
              <p className="text-[11px] text-surface-muted hidden sm:block">
                {getVernacularText('tagline', currentLanguage)}
              </p>
            </div>
          </button>

          {/* Active Document Selector */}
          <div className="flex-1 max-w-md mx-2 hidden md:block">
            <div className="relative">
              <select
                value={currentDoc?.id || ''}
                onChange={(e) => {
                  if (e.target.value === '__upload__') {
                    onOpenUpload();
                  } else if (e.target.value) {
                    onSelectDoc(e.target.value);
                  }
                }}
                aria-label="Select active legal document"
                className="w-full h-9 pl-3 pr-8 bg-surface border border-surface-border rounded-lg text-xs font-medium text-on-surface truncate focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary cursor-pointer"
              >
                {documents.length === 0 ? (
                  <option value="__upload__">📂 No contract loaded — Click to upload</option>
                ) : (
                  documents.map((d) => (
                    <option key={d.id} value={d.id}>
                      📄 {d.title}
                    </option>
                  ))
                )}
              </select>
              <ChevronDown className="w-4 h-4 text-surface-muted absolute right-2.5 top-2.5 pointer-events-none" />
            </div>
          </div>

          {/* Right Action Chrome */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            {/* Vernacular Language Switcher */}
            <LanguageSelector
              currentLanguage={currentLanguage}
              onSelectLanguage={onSelectLanguage}
            />

            {/* AI PDF Summary Button */}
            {currentDoc && onOpenSummary && (
              <button
                onClick={onOpenSummary}
                title="View Plain-English PDF Executive Summary (AI / Gemini)"
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-primary bg-primary/10 hover:bg-primary/20 border border-primary/30 rounded-lg transition-colors shadow-card"
              >
                <Sparkles className="w-3.5 h-3.5 text-primary" />
                <span className="hidden sm:inline">PDF Summary</span>
              </button>
            )}

            {/* Print / Export Consultation Packet */}
            <button
              onClick={onPrintDossier}
              disabled={!currentDoc}
              title={currentDoc ? "Print / Export Consultation Brief" : "Upload a contract first to export brief"}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-surface-muted hover:text-on-surface bg-surface border border-surface-border rounded-lg hover:bg-surface-hover disabled:opacity-40 disabled:pointer-events-none transition-colors shadow-card"
            >
              <Printer className="w-3.5 h-3.5 text-primary" />
              <span className="hidden sm:inline">{getVernacularText('exportBrief', currentLanguage)}</span>
            </button>

            {/* Upload Document Button */}
            <button
              onClick={onOpenUpload}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-primary hover:bg-primary-container rounded transition-all shadow-card"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>{getVernacularText('uploadDoc', currentLanguage)}</span>
            </button>

            {/* Settings */}
            <button
              onClick={onOpenSettings}
              aria-label="Configure Model Settings"
              title="Configure Model Settings"
              className="p-1.5 text-surface-muted hover:text-on-surface hover:bg-surface-hover rounded transition-colors focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
            >
              <Settings className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};

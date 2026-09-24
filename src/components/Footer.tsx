import React from 'react';
import { Upload } from 'lucide-react';

interface FooterProps {
  onNavigateHome: () => void;
  onOpenUpload: () => void;
  onNavigateTab?: (tab: string) => void;
}

export const Footer: React.FC<FooterProps> = ({
  onNavigateHome,
  onOpenUpload,
  onNavigateTab,
}) => {
  return (
    <footer className="bg-surface-card border-t border-surface-border mt-16 text-xs text-surface-muted">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
        
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand & Purpose */}
          <div className="md:col-span-2 space-y-3">
            <div className="flex items-center gap-2.5 cursor-pointer" onClick={onNavigateHome}>
              <div className="w-8 h-8 rounded-lg bg-primary text-white flex items-center justify-center shadow-sm text-sm">
                ⚖️
              </div>
              <span className="font-serif font-bold text-lg text-primary">ClarityLegal</span>
            </div>
            <p className="text-xs text-secondary leading-relaxed max-w-md">
              A GenAI legal information accessibility platform designed for ordinary people to understand contracts confidently. Making agreements clear, navigable, and actionable without legal jargon.
            </p>
            <div className="flex flex-wrap items-center gap-2.5 pt-1 text-[11px] text-surface-muted">
              <span>📖 Grade 8 Plain English</span>
              <span>•</span>
              <span>🇮🇳 Indian Contract Act 1872</span>
              <span>•</span>
              <span>🇺🇸 California & US Law</span>
              <span>•</span>
              <span>🔒 100% Sourced</span>
            </div>
          </div>

          {/* Quick Capabilities */}
          <div className="space-y-2">
            <h4 className="font-semibold text-on-surface text-xs uppercase tracking-wider">
              Core Capabilities
            </h4>
            <ul className="space-y-1.5">
              <li>
                <button
                  onClick={() => onNavigateTab ? onNavigateTab('overview') : onNavigateHome()}
                  className="hover:text-primary transition-colors text-left flex items-center gap-1.5"
                >
                  <span>✨</span>
                  <span>What It Means For You</span>
                </button>
              </li>
              <li>
                <button
                  onClick={() => onNavigateTab ? onNavigateTab('responsibilities') : onNavigateHome()}
                  className="hover:text-primary transition-colors text-left flex items-center gap-1.5"
                >
                  <span>📋</span>
                  <span>Obligations Matrix</span>
                </button>
              </li>
              <li>
                <button
                  onClick={() => onNavigateTab ? onNavigateTab('timeline') : onNavigateHome()}
                  className="hover:text-primary transition-colors text-left flex items-center gap-1.5"
                >
                  <span>⏳</span>
                  <span>Next Steps Timeline</span>
                </button>
              </li>
              <li>
                <button
                  onClick={() => onNavigateTab ? onNavigateTab('lawyer') : onNavigateHome()}
                  className="hover:text-primary transition-colors text-left flex items-center gap-1.5"
                >
                  <span>💼</span>
                  <span>Lawyer Prep Dossier</span>
                </button>
              </li>
              <li className="pt-1">
                <button
                  onClick={onOpenUpload}
                  className="hover:text-primary transition-colors text-left font-semibold text-primary flex items-center gap-1.5"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>Upload Real Contract (PDF / DOCX)</span>
                </button>
              </li>
            </ul>
          </div>

          {/* Standards & Transparency */}
          <div className="space-y-2">
            <h4 className="font-semibold text-on-surface text-xs uppercase tracking-wider">
              Product Principles
            </h4>
            <ul className="space-y-1.5 text-[11px] text-surface-muted">
              <li className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                <span>Zero AI Pretense / Legal Advice</span>
              </li>
              <li className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                <span>Every claim anchored to clause text</span>
              </li>
              <li className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                <span>In-memory private document processing</span>
              </li>
              <li className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                <span>Neutral, factual change reporting</span>
              </li>
              <li className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                <span>Empowers attorney consultation</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Mandatory Regulatory & Informational Disclaimer */}
        <div className="pt-6 border-t border-surface-border text-center sm:text-left flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-[11px] text-surface-muted max-w-3xl leading-relaxed">
            <strong>Legal Information Notice:</strong> ClarityLegal is an AI-powered document understanding and legal information accessibility tool. It is designed to assist non-lawyers in reading and organizing contractual language. ClarityLegal does not provide legal advice, legal representation, or definitive statutory determinations. For high-stakes commitments or legal disputes, consult a qualified attorney in your jurisdiction.
          </p>

          <div className="text-[11px] text-surface-muted shrink-0">
            © {new Date().getFullYear()} ClarityLegal • In-Memory Processing
          </div>
        </div>

      </div>
    </footer>
  );
};

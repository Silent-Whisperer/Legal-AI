import React, { useState } from 'react';
import { LegalDocument, NonLegalDocumentCategory } from '../types.ts';
import { 
  AlertTriangle, 
  Award, 
  UserCheck, 
  Receipt, 
  FileText, 
  Mail, 
  BookOpen, 
  Megaphone, 
  ArrowRight, 
  Upload, 
  ExternalLink,
  ChevronDown,
  ChevronUp,
  ShieldAlert,
  Info
} from 'lucide-react';

interface NonLegalDocumentViewProps {
  document: LegalDocument;
  onOpenUpload: () => void;
  onNavigateHome: () => void;
}

export const NonLegalDocumentView: React.FC<NonLegalDocumentViewProps> = ({
  document,
  onOpenUpload,
  onNavigateHome,
}) => {
  const [showFullText, setShowFullText] = useState(false);
  const analysis = document.analysis;
  const category = (document.nonLegalCategory || analysis?.nonLegalCategory || 'OTHER_NON_LEGAL') as NonLegalDocumentCategory;
  const metadata = document.detectedMetadata || analysis?.detectedMetadata || {};

  const getCategoryDetails = (cat: NonLegalDocumentCategory) => {
    switch (cat) {
      case 'CERTIFICATE_OR_AWARD':
        return {
          title: 'Certificate of Achievement / Award',
          icon: Award,
          iconBg: 'bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-300',
          borderColor: 'border-amber-200 dark:border-amber-800',
          badgeText: '🏆 Educational & Recognition Record',
          tagline: 'This document represents an award, completion certificate, or honorary credential.'
        };
      case 'RESUME_OR_CV':
        return {
          title: 'Resume / Curriculum Vitae',
          icon: UserCheck,
          iconBg: 'bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-300',
          borderColor: 'border-blue-200 dark:border-blue-800',
          badgeText: '👤 Professional Profile',
          tagline: 'This document summarizes individual qualifications, skills, and work history.'
        };
      case 'INVOICE_OR_RECEIPT':
        return {
          title: 'Commercial Invoice or Receipt',
          icon: Receipt,
          iconBg: 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-300',
          borderColor: 'border-emerald-200 dark:border-emerald-800',
          badgeText: '🧾 Transactional Receipt',
          tagline: 'This document records a completed purchase, payment, or billing item.'
        };
      case 'IDENTITY_DOCUMENT':
        return {
          title: 'Personal Identification Document',
          icon: ShieldAlert,
          iconBg: 'bg-purple-100 dark:bg-purple-900/40 text-purple-600 dark:text-purple-300',
          borderColor: 'border-purple-200 dark:border-purple-800',
          badgeText: '🪪 Identity Record',
          tagline: 'This document serves personal identification and credential verification.'
        };
      case 'CORRESPONDENCE_OR_MEMO':
        return {
          title: 'Informal Note / Correspondence',
          icon: Mail,
          iconBg: 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300',
          borderColor: 'border-slate-200 dark:border-slate-700',
          badgeText: '✉️ Informal Notes',
          tagline: 'This document contains informal discussions, loose notes, or correspondence.'
        };
      case 'PUBLICATION_OR_ARTICLE':
        return {
          title: 'Research Article / Publication',
          icon: BookOpen,
          iconBg: 'bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-300',
          borderColor: 'border-indigo-200 dark:border-indigo-800',
          badgeText: '📚 Informational Paper',
          tagline: 'This document is an academic, informational, or literary publication.'
        };
      case 'MARKETING_OR_FLYER':
        return {
          title: 'Marketing Flyer / Brochure',
          icon: Megaphone,
          iconBg: 'bg-rose-100 dark:bg-rose-900/40 text-rose-600 dark:text-rose-300',
          borderColor: 'border-rose-200 dark:border-rose-800',
          badgeText: '📢 Promotional Material',
          tagline: 'This document is a marketing pamphlet, announcement, or promotional brochure.'
        };
      default:
        return {
          title: 'Non-Legal Document',
          icon: FileText,
          iconBg: 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300',
          borderColor: 'border-slate-200 dark:border-slate-700',
          badgeText: '📄 Non-Contractual Record',
          tagline: 'This document does not contain binding contractual covenants or legal terms.'
        };
    }
  };

  const details = getCategoryDetails(category);
  const CategoryIcon = details.icon;
  const metadataEntries = Object.entries(metadata);

  return (
    <div className="space-y-6 max-w-4xl mx-auto animate-fadeIn">
      
      {/* 1. PRIMARY NOTICE BANNER */}
      <div className="bg-surface-card rounded-2xl border border-surface-border p-6 sm:p-8 shadow-card relative overflow-hidden">
        {/* Top Accent Strip */}
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-amber-500 via-rose-500 to-indigo-500" />

        <div className="flex flex-col sm:flex-row items-start gap-5">
          <div className={`w-14 h-14 rounded-2xl ${details.iconBg} flex items-center justify-center shrink-0 shadow-sm`}>
            <CategoryIcon className="w-7 h-7" />
          </div>

          <div className="space-y-3 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-800 dark:bg-amber-950/60 dark:text-amber-200 border border-amber-300 dark:border-amber-800 shadow-xs">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                <span>Non-Legal Document Identified</span>
              </span>
              <span className="text-xs text-surface-muted">•</span>
              <span className="text-xs font-semibold text-primary">{details.badgeText}</span>
              <span className="text-xs text-surface-muted">•</span>
              <span className="text-xs px-2 py-0.5 rounded bg-surface border border-surface-border text-surface-muted font-mono">
                Analysis Pipeline Halted
              </span>
            </div>

            <div>
              <h1 className="font-serif text-2xl sm:text-3xl font-bold text-on-surface">
                {details.title}
              </h1>
              <p className="text-xs sm:text-sm text-surface-muted font-mono mt-0.5">
                File: {document.filename} • Uploaded on {document.uploadDate}
              </p>
            </div>

            {/* Explanation Callout */}
            <div className="p-4 rounded-xl bg-surface border border-surface-border space-y-2 text-xs sm:text-sm leading-relaxed text-secondary">
              <div className="flex items-center gap-2 font-semibold text-on-surface">
                <Info className="w-4 h-4 text-primary shrink-0" />
                <span>Why Legal Analysis Stopped:</span>
              </div>
              <p>
                {analysis?.classificationExplanation || 
                  `This file was identified as a ${details.title.toLowerCase()}. ClarityLegal is specifically engineered for legally enforceable contracts (leases, employment agreements, NDAs, service contracts, etc.). To prevent generating false contractual obligations, risk scores, or lawyer prep questions, the analysis pipeline stopped immediately after classification.`
                }
              </p>
            </div>

            {/* Quick Actions */}
            <div className="flex flex-wrap items-center gap-3 pt-2">
              <button
                onClick={onOpenUpload}
                className="flex items-center gap-2 px-5 py-2.5 bg-primary text-white hover:bg-primary-container rounded-xl font-semibold text-xs transition-all shadow-sm group"
              >
                <Upload className="w-4 h-4 group-hover:scale-110 transition-transform" />
                <span>Upload a Legal Contract Instead</span>
                <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
              </button>

              <button
                onClick={onNavigateHome}
                className="px-4 py-2.5 bg-surface hover:bg-surface-hover text-on-surface border border-surface-border rounded-xl font-semibold text-xs transition-all shadow-xs"
              >
                Back to Workspace
              </button>

              {document.hasOriginalFile && document.fileUrl && (
                <a
                  href={document.fileUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-1.5 px-3.5 py-2.5 text-xs text-primary hover:underline font-semibold"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>View Original Uploaded File</span>
                </a>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 2. EXTRACTED METADATA / IDENTIFIED ATTRIBUTES */}
      {metadataEntries.length > 0 && (
        <section className="bg-surface-card rounded-xl border border-surface-border p-6 shadow-card space-y-4">
          <div className="flex items-center justify-between border-b border-surface-border/60 pb-3">
            <div>
              <h2 className="font-serif text-base font-bold text-on-surface">
                Extracted Document Attributes
              </h2>
              <p className="text-xs text-secondary">
                Parameters identified from the document image or text stream during classification
              </p>
            </div>
            <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-surface border border-surface-border text-surface-muted">
              Classification Grounding
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {metadataEntries.map(([key, value]) => (
              <div key={key} className="p-3.5 rounded-lg bg-surface border border-surface-border/80 space-y-1">
                <span className="text-[11px] uppercase tracking-wider font-bold text-surface-muted block">
                  {key}
                </span>
                <span className="text-xs font-semibold text-on-surface block break-words">
                  {value}
                </span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* 3. EXTRACTED TEXT PREVIEW (Transcribed Content) */}
      <section className="bg-surface-card rounded-xl border border-surface-border p-6 shadow-card space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-serif text-base font-bold text-on-surface">
              Extracted Content Preview
            </h2>
            <p className="text-xs text-secondary">
              Verbatim text extracted from the document via digital parsing or multimodal OCR
            </p>
          </div>
          <button
            onClick={() => setShowFullText(!showFullText)}
            className="flex items-center gap-1 text-xs text-primary font-semibold hover:underline"
          >
            <span>{showFullText ? 'Collapse Text' : 'Expand Full Text'}</span>
            {showFullText ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
        </div>

        <div className={`p-4 rounded-lg bg-surface border border-surface-border font-mono text-xs leading-relaxed text-secondary whitespace-pre-wrap overflow-y-auto ${
          showFullText ? 'max-h-96' : 'max-h-36'
        }`}>
          {document.rawText || 'No text extracted.'}
        </div>
      </section>

    </div>
  );
};

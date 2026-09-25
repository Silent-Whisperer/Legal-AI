import React, { useState, useEffect } from 'react';
import { 
  Scale, 
  Sparkles, 
  CheckCircle2, 
  X,
  Loader2
} from 'lucide-react';

interface AnalysisLoadingModalProps {
  isOpen: boolean;
  documentTitle: string;
  onCancel?: () => void;
}

const STAGES = [
  {
    id: 1,
    title: 'Text Extraction & OCR',
    desc: 'Extracting text stream from PDF/DOCX or executing local OCR for scanned pages',
    icon: '📄',
    minPercent: 0,
    targetPercent: 28
  },
  {
    id: 2,
    title: 'Document Classification',
    desc: 'Verifying legal nature: Contractual, Non-Contractual record, or Uncertain',
    icon: '⚖️',
    minPercent: 28,
    targetPercent: 54
  },
  {
    id: 3,
    title: 'Section & Clause Segmentation',
    desc: 'Isolating operative sections, covenants, and live coordinate anchors',
    icon: '📑',
    minPercent: 54,
    targetPercent: 76
  },
  {
    id: 4,
    title: 'Plain-Meaning & Risk Grounding',
    desc: 'Deriving grounded facts, parties, financial metrics, and statutory flags',
    icon: '✨',
    minPercent: 76,
    targetPercent: 92
  },
  {
    id: 5,
    title: 'Finalizing Document Canvas',
    desc: 'Mounting live visual viewer and interactive clause highlights',
    icon: '🎯',
    minPercent: 92,
    targetPercent: 98
  }
];

export const AnalysisLoadingModal: React.FC<AnalysisLoadingModalProps> = ({
  isOpen,
  documentTitle,
  onCancel,
}) => {
  const [progress, setProgress] = useState<number>(5);
  const [elapsedSeconds, setElapsedSeconds] = useState<number>(0);

  useEffect(() => {
    if (!isOpen) {
      setProgress(5);
      setElapsedSeconds(0);
      return;
    }

    const startTime = Date.now();
    const timerInterval = setInterval(() => {
      const elapsed = Math.floor((Date.now() - startTime) / 100) / 10;
      setElapsedSeconds(elapsed);

      // Smooth realistic curve: rapid start, steady middle, cautious asymptote at 96%
      setProgress(() => {
        if (elapsed < 1.2) {
          return Math.min(28, Math.round(5 + (elapsed / 1.2) * 23));
        } else if (elapsed < 3.0) {
          return Math.min(54, Math.round(28 + ((elapsed - 1.2) / 1.8) * 26));
        } else if (elapsed < 6.0) {
          return Math.min(76, Math.round(54 + ((elapsed - 3.0) / 3.0) * 22));
        } else if (elapsed < 11.0) {
          return Math.min(92, Math.round(76 + ((elapsed - 6.0) / 5.0) * 16));
        } else {
          return Math.min(98, Math.round(92 + Math.min(6, (elapsed - 11.0) * 0.5)));
        }
      });
    }, 100);

    return () => clearInterval(timerInterval);
  }, [isOpen]);

  if (!isOpen) return null;

  // Determine active stage based on current percentage
  const currentStageIndex = STAGES.findIndex(
    (stage) => progress >= stage.minPercent && progress < stage.targetPercent
  );
  const activeStage = currentStageIndex !== -1 ? STAGES[currentStageIndex] : STAGES[STAGES.length - 1];

  return (
    <div 
      className="fixed inset-0 z-50 bg-black/65 backdrop-blur-md flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="loading-modal-title"
    >
      {/* Screen Reader Live Region for Pipeline Stage Transitions */}
      <div role="status" aria-live="polite" aria-atomic="true" className="sr-only">
        {`Analyzing document ${documentTitle || 'Legal Document'}. Stage ${activeStage.id} of ${STAGES.length}: ${activeStage.title}.`}
      </div>

      <div className="bg-surface-card rounded-2xl border border-surface-border shadow-2xl w-full max-w-lg overflow-hidden animate-fadeIn p-6 sm:p-7 space-y-5 relative">
        
        {/* Close / Cancel Button */}
        {onCancel && (
          <button 
            onClick={onCancel}
            title="Cancel analysis"
            aria-label="Cancel document analysis"
            className="absolute top-4 right-4 p-1.5 rounded-lg text-surface-muted hover:text-on-surface hover:bg-surface-hover transition-colors focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
          >
            <X className="w-4 h-4" />
          </button>
        )}

        {/* Header with Title & Animated Brand Icon */}
        <div className="text-center space-y-1.5 pt-1">
          <div className="relative w-14 h-14 mx-auto mb-3">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-primary/20 via-primary/10 to-indigo-500/20 text-primary flex items-center justify-center shadow-inner border border-primary/20" aria-hidden="true">
              <Scale className="w-7 h-7 text-primary animate-pulse" />
            </div>
            <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-primary text-white rounded-full flex items-center justify-center text-[10px] font-mono shadow-sm" aria-hidden="true">
              <Sparkles className="w-3 h-3" />
            </div>
          </div>
          <h3 id="loading-modal-title" className="font-serif font-bold text-xl sm:text-2xl text-on-surface tracking-tight">
            Analyzing Document
          </h3>
          <p className="text-xs text-secondary font-medium truncate max-w-md mx-auto px-2">
            📄 <span className="font-semibold text-on-surface">{documentTitle || 'Legal Document'}</span>
          </p>
        </div>

        {/* Smooth Animated Progress Bar */}
        <div className="space-y-2 bg-surface/80 rounded-xl p-4 border border-surface-border">
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-on-surface flex items-center gap-1.5">
              <Loader2 className="w-3.5 h-3.5 text-primary animate-spin" />
              <span>{activeStage.title}</span>
            </span>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-mono text-surface-muted">
                Elapsed: {elapsedSeconds.toFixed(1)}s
              </span>
              <span className="font-mono text-xs font-extrabold text-primary bg-primary/10 px-2 py-0.5 rounded-full border border-primary/20">
                {progress}%
              </span>
            </div>
          </div>

          {/* Continuous Smooth Progress Track */}
          <div className="h-2.5 w-full bg-surface-border/70 rounded-full overflow-hidden p-0.5 shadow-inner">
            <div 
              className="h-full bg-gradient-to-r from-blue-600 via-indigo-500 to-emerald-500 rounded-full transition-all duration-300 ease-out shadow-sm"
              style={{ width: `${progress}%` }}
            />
          </div>

          <p className="text-[11px] text-surface-muted leading-tight pt-0.5">
            {activeStage.desc}
          </p>
        </div>

        {/* Pipeline Stages Progress List */}
        <div className="space-y-2 text-xs">
          <div className="text-[10px] font-bold uppercase tracking-wider text-surface-muted flex items-center justify-between px-1">
            <span>Pipeline Stages</span>
            <span className="text-primary font-mono text-[10px]">Deterministic Engine</span>
          </div>

          <div className="space-y-1.5">
            {STAGES.map((stg) => {
              const isDone = progress >= stg.targetPercent;
              const isCurrent = progress >= stg.minPercent && progress < stg.targetPercent;

              return (
                <div
                  key={stg.id}
                  className={`flex items-center justify-between p-2 rounded-lg border transition-all ${
                    isCurrent
                      ? 'bg-primary/5 border-primary/40 shadow-xs ring-1 ring-primary/20'
                      : isDone
                      ? 'bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-900/50 text-surface-muted'
                      : 'bg-surface/40 border-surface-border/50 text-surface-muted opacity-60'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="text-sm shrink-0">{stg.icon}</span>
                    <div className="min-w-0">
                      <p className={`font-semibold truncate text-[11px] ${isCurrent ? 'text-primary' : isDone ? 'text-on-surface' : ''}`}>
                        {stg.title}
                      </p>
                    </div>
                  </div>

                  <div className="shrink-0 ml-2">
                    {isDone ? (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-950/60 px-1.5 py-0.5 rounded">
                        <CheckCircle2 className="w-3 h-3" /> Done
                      </span>
                    ) : isCurrent ? (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-primary bg-primary/10 px-1.5 py-0.5 rounded animate-pulse">
                        <Loader2 className="w-2.5 h-2.5 animate-spin" /> In Progress
                      </span>
                    ) : (
                      <span className="text-[10px] font-mono text-surface-muted px-1">
                        Queued
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer Cancel / Notice */}
        <div className="flex items-center justify-between pt-1 border-t border-surface-border text-[11px] text-surface-muted">
          <span>Processing document safely & locally</span>
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="font-semibold text-rose-600 hover:text-rose-700 hover:underline cursor-pointer"
            >
              Cancel Upload
            </button>
          )}
        </div>

      </div>
    </div>
  );
};

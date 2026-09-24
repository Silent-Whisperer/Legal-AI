import React from 'react';
import { TimelineMilestone } from '../types.ts';
import { 
  CheckCircle2, 
  Clock, 
  Calendar, 
  ArrowRight
} from 'lucide-react';

interface TimelineViewProps {
  timeline: TimelineMilestone[];
  onSelectClause: (clauseRef: string, clauseId?: string) => void;
}

export const TimelineView: React.FC<TimelineViewProps> = ({
  timeline,
  onSelectClause,
}) => {
  const milestones = timeline || [];

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header Banner */}
      <div className="bg-surface-card rounded-xl border border-surface-border p-6 shadow-card">
        <div className="flex items-center gap-2 text-primary font-semibold text-xs uppercase tracking-wider">
          <Calendar className="w-4 h-4" />
          <span>Chronological Roadmap</span>
        </div>
        <h2 className="font-serif text-2xl font-bold text-on-surface mt-1">
          What Happens Next? (Document Lifecycle)
        </h2>
        <p className="text-sm text-surface-muted mt-1 leading-relaxed">
          A step-by-step chronological roadmap explaining key dates, required actions, and statutory timelines established by this document.
        </p>
      </div>

      {milestones.length === 0 ? (
        <div className="bg-surface-card rounded-2xl border border-surface-border p-12 text-center space-y-3 shadow-card">
          <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center mx-auto text-xl font-bold">
            ⏳
          </div>
          <h3 className="font-serif font-bold text-lg text-on-surface">
            No Contractual Timeline Found
          </h3>
          <p className="text-xs text-secondary max-w-md mx-auto leading-relaxed">
            No chronological contract milestones or recurring performance timelines were identified in this document. This applies to non-contractual records such as certificates, resumes, or informational documents.
          </p>
        </div>
      ) : (
        /* Timeline Steps */
        <div className="relative border-l-2 border-primary/20 ml-4 sm:ml-8 pl-6 sm:pl-8 space-y-8 py-2">
          {milestones.map((milestone) => (
            <div key={milestone.stepNumber} className="relative group">
              
              {/* Step circle indicator */}
              <div className={`absolute -left-[35px] sm:-left-[43px] top-1 w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white shadow-sm ring-4 ring-surface ${
                milestone.status === 'COMPLETED' ? 'bg-risk-safe' : 'bg-primary'
              }`}>
                {milestone.status === 'COMPLETED' ? (
                  <CheckCircle2 className="w-4 h-4" />
                ) : (
                  milestone.stepNumber
                )}
              </div>

              {/* Card Content */}
              <div className="bg-surface-card rounded-xl border border-surface-border p-5 sm:p-6 shadow-card hover:border-primary/50 transition-colors space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-primary">
                      {milestone.phase}
                    </span>
                    <span className="text-xs text-surface-muted">•</span>
                    <span className="text-xs font-medium text-secondary">
                      {milestone.timeframe}
                    </span>
                  </div>

                  <button
                    onClick={() => onSelectClause(milestone.clauseRef, milestone.clauseId)}
                    title="Click to view & highlight clause in reader"
                    className="flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
                  >
                    <span>👁️ Highlight in Document</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>

                <h3 className="font-serif text-lg font-bold text-on-surface">
                  {milestone.title}
                </h3>

                <p className="text-xs text-secondary leading-relaxed">
                  {milestone.description}
                </p>

                {/* Required Action Callout */}
                <div className="p-3 bg-surface rounded-lg border border-surface-border flex items-start gap-2 text-xs">
                  <Clock className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-on-surface font-semibold">Required Action: </strong>
                    <span className="text-secondary">{milestone.requiredAction}</span>
                  </div>
                </div>

              </div>

            </div>
          ))}
        </div>
      )}
    </div>
  );
};

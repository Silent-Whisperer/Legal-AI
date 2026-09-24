import React, { useState } from 'react';
import { 
  ArrowRight, 
  CheckCircle2, 
  Sparkles
} from 'lucide-react';

interface FlowchartNode {
  id: string;
  stepNumber: number;
  title: string;
  subtitle: string;
  emoji: string;
  badge: string;
  badgeColor: string;
  borderColor: string;
  accentBg: string;
  iconBg: string;
  textColor: string;
  arrowColor: string;
  summary: string;
  details: string[];
  statutoryGrounding: string;
}

export const ColorfulFlowchart: React.FC = () => {
  const [selectedNodeId, setSelectedNodeId] = useState<string>('node-3');

  const nodes: FlowchartNode[] = [
    {
      id: 'node-1',
      stepNumber: 1,
      title: 'Ingestion & OCR',
      subtitle: 'Upload PDF or Text',
      emoji: '📥',
      badge: 'Step 1: Input',
      badgeColor: 'bg-sky-100 text-sky-800 border-sky-300',
      borderColor: 'border-sky-400 hover:border-sky-600',
      accentBg: 'bg-gradient-to-br from-sky-500/10 via-sky-500/5 to-transparent',
      iconBg: 'bg-sky-500 text-white shadow-sky-200',
      textColor: 'text-sky-950',
      arrowColor: 'text-sky-500',
      summary: 'Upload any PDF, Word document, or raw pasted agreement. Works with leases, job offers, NDAs, or vendor contracts.',
      details: [
        '📄 Extracts page numbers, clause structures, and sub-clauses',
        '🇮🇳 Handles Indian Stamp Paper formats, e-stamps, and agreements',
        '⚡ Processes full documents in under 2 seconds'
      ],
      statutoryGrounding: 'Preserves exact raw text and layout for authoritative reference'
    },
    {
      id: 'node-2',
      stepNumber: 2,
      title: 'Clause Segmentation',
      subtitle: 'Strict 1:1 Isolation',
      emoji: '🔍',
      badge: 'Step 2: Parsing',
      badgeColor: 'bg-indigo-100 text-indigo-800 border-indigo-300',
      borderColor: 'border-indigo-400 hover:border-indigo-600',
      accentBg: 'bg-gradient-to-br from-indigo-500/10 via-indigo-500/5 to-transparent',
      iconBg: 'bg-indigo-600 text-white shadow-indigo-200',
      textColor: 'text-indigo-950',
      arrowColor: 'text-indigo-500',
      summary: 'Every section is isolated into an exact clause-to-explanation bound object to prevent explanation leakage across sections.',
      details: [
        '🔒 100% deterministic clause binding — Section 1 never bleeds into Section 14',
        '🏷️ Indexed with exact line numbers and page citations',
        '📑 Cross-references definitions and exhibits automatically'
      ],
      statutoryGrounding: 'Eliminates AI hallucinations by anchoring strictly to source clauses'
    },
    {
      id: 'node-3',
      stepNumber: 3,
      title: 'Plain-English AI',
      subtitle: 'Grade 8 Readability',
      emoji: '⚖️',
      badge: 'Step 3: Translation',
      badgeColor: 'bg-emerald-100 text-emerald-800 border-emerald-300',
      borderColor: 'border-emerald-500 hover:border-emerald-600 ring-2 ring-emerald-500/20',
      accentBg: 'bg-gradient-to-br from-emerald-500/10 via-emerald-500/5 to-transparent',
      iconBg: 'bg-emerald-600 text-white shadow-emerald-200',
      textColor: 'text-emerald-950',
      arrowColor: 'text-emerald-500',
      summary: 'Converts archaic legalese into clear, conversational plain English that any ordinary person can understand in seconds.',
      details: [
        '📖 Grade 8 reading level without omitting critical legal consequences',
        '🇮🇳 Sourced against Indian Contract Act 1872 and Model Tenancy Act',
        '🇺🇸 Sourced against California Civil Code and US Federal Standards'
      ],
      statutoryGrounding: 'Objective legal-information translation without assuming the role of a lawyer'
    },
    {
      id: 'node-4',
      stepNumber: 4,
      title: 'Review Scanner',
      subtitle: 'Identify Traps & Flags',
      emoji: '⚠️',
      badge: 'Step 4: Attention',
      badgeColor: 'bg-amber-100 text-amber-800 border-amber-300',
      borderColor: 'border-amber-400 hover:border-amber-600',
      accentBg: 'bg-gradient-to-br from-amber-500/10 via-amber-500/5 to-transparent',
      iconBg: 'bg-amber-500 text-white shadow-amber-200',
      textColor: 'text-amber-950',
      arrowColor: 'text-amber-500',
      summary: 'Flags high-friction provisions: unreasonable deposit forfeitures, void non-compete clauses, and one-sided indemnity.',
      details: [
        '🇮🇳 Flags Section 27 Indian Contract Act (non-compete void in India)',
        '💰 Flags Section 74 Indian Contract Act (excessive liquidated damages / lock-in)',
        '💡 Provides concrete real-world scenarios and points to discuss'
      ],
      statutoryGrounding: 'Identifies non-standard deviations and statutory conflicts neutrally'
    },
    {
      id: 'node-5',
      stepNumber: 5,
      title: 'Action Roadmap',
      subtitle: 'Timeline & Matrix',
      emoji: '⏳',
      badge: 'Step 5: Execution',
      badgeColor: 'bg-purple-100 text-purple-800 border-purple-300',
      borderColor: 'border-purple-400 hover:border-purple-600',
      accentBg: 'bg-gradient-to-br from-purple-500/10 via-purple-500/5 to-transparent',
      iconBg: 'bg-purple-600 text-white shadow-purple-200',
      textColor: 'text-purple-950',
      arrowColor: 'text-purple-500',
      summary: 'Maps out "What Happens Next" on a chronological milestone tracker alongside a two-column You vs. Them duty matrix.',
      details: [
        '📅 Day 0 signing, payment cycles, milestones, and notice requirements',
        '👥 Clear division of your obligations versus other party commitments',
        '⏰ Notice windows, grace periods, and deposit return deadlines'
      ],
      statutoryGrounding: 'Turns static legal paragraphs into actionable chronological tasks'
    },
    {
      id: 'node-6',
      stepNumber: 6,
      title: 'Counsel Dossier',
      subtitle: 'Lawyer Consultation Prep',
      emoji: '💼',
      badge: 'Step 6: Readiness',
      badgeColor: 'bg-rose-100 text-rose-800 border-rose-300',
      borderColor: 'border-rose-400 hover:border-rose-600',
      accentBg: 'bg-gradient-to-br from-rose-500/10 via-rose-500/5 to-transparent',
      iconBg: 'bg-rose-600 text-white shadow-rose-200',
      textColor: 'text-rose-950',
      arrowColor: 'text-rose-500',
      summary: 'Equips the user with copyable, strategic questions to ask their lawyer, missing statutory protections, and an evidence checklist.',
      details: [
        '📋 Copyable questions with statutory citations to save billable hours',
        '🛡️ Missing protections scanner (structural repairs, severance terms)',
        '🖨️ 1-Click print-ready consultation brief formatted for attorney review'
      ],
      statutoryGrounding: 'Empowers citizens to have high-leverage conversations with licensed counsel'
    }
  ];

  const activeNode = nodes.find(n => n.id === selectedNodeId) || nodes[2];

  return (
    <section className="bg-surface-card rounded-2xl border border-surface-border p-6 sm:p-8 shadow-card space-y-8 relative overflow-hidden">
      
      {/* Decorative top color bar with rainbow gradient */}
      <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-sky-500 via-emerald-500 via-amber-500 via-purple-500 to-rose-500" />

      {/* Header with Emojis & Description */}
      <div className="text-center space-y-2 max-w-3xl mx-auto">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-navy-50 text-primary text-xs font-semibold border border-navy-100">
          <span>🌈 Interactive Intelligence Pipeline</span>
          <span>•</span>
          <span>🇮🇳 India & 🇺🇸 US Grounded</span>
        </div>
        <h2 className="font-serif text-2xl sm:text-3xl font-bold text-on-surface">
          How ClarityLegal Unpacks Your Contract 🚀
        </h2>
        <p className="text-xs sm:text-sm text-secondary leading-relaxed">
          From raw legal scan to plain-English comprehension and lawyer readiness — click any node below to inspect how each stage works.
        </p>
      </div>

      {/* The 6-Stage Flowchart Nodes Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3.5 relative">
        {nodes.map((node) => {
          const isSelected = selectedNodeId === node.id;
          return (
            <div
              key={node.id}
              onClick={() => setSelectedNodeId(node.id)}
              className={`rounded-xl border p-4 cursor-pointer transition-all duration-200 flex flex-col justify-between relative group ${node.accentBg} ${
                isSelected 
                  ? `${node.borderColor} shadow-elevation scale-[1.03] bg-white ring-2 ring-primary/20` 
                  : 'border-surface-border bg-surface-card hover:border-primary/40 hover:shadow-card'
              }`}
            >
              <div>
                {/* Step badge & Emoji */}
                <div className="flex items-center justify-between gap-1 mb-2.5">
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${node.badgeColor}`}>
                    {node.badge}
                  </span>
                  <span className="text-lg">{node.emoji}</span>
                </div>

                {/* Node Title & Subtitle */}
                <h3 className="font-serif font-bold text-sm text-on-surface leading-tight">
                  {node.title}
                </h3>
                <p className="text-[11px] text-surface-muted mt-1 leading-snug">
                  {node.subtitle}
                </p>
              </div>

              {/* Bottom interactive indicator */}
              <div className="pt-3 mt-3 border-t border-surface-border/60 flex items-center justify-between text-[11px] font-semibold">
                <span className={isSelected ? 'text-primary' : 'text-surface-muted group-hover:text-primary'}>
                  {isSelected ? 'Active View' : 'Click to inspect'}
                </span>
                <ArrowRight className={`w-3.5 h-3.5 transition-transform ${isSelected ? 'text-primary translate-x-1' : 'text-surface-muted group-hover:translate-x-0.5'}`} />
              </div>
            </div>
          );
        })}
      </div>

      {/* Selected Node Deep-Dive Card (Colorful Interactive Focus Panel) */}
      <div className="rounded-xl border border-surface-border p-5 sm:p-6 bg-surface shadow-card transition-all">
        <div className="flex flex-wrap items-start justify-between gap-4 pb-4 border-b border-surface-border">
          <div className="flex items-center gap-3">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-xl font-bold shadow-sm ${activeNode.iconBg}`}>
              {activeNode.emoji}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${activeNode.badgeColor}`}>
                  Stage {activeNode.stepNumber} of 6
                </span>
                <span className="text-xs font-semibold text-secondary">
                  Pipeline Stage: {activeNode.title}
                </span>
              </div>
              <h3 className="font-serif text-lg sm:text-xl font-bold text-on-surface mt-0.5">
                {activeNode.title} — {activeNode.subtitle}
              </h3>
            </div>
          </div>

          <div className="px-3 py-1.5 rounded-lg bg-surface-card border border-surface-border text-xs text-secondary flex items-center gap-2">
            <Sparkles className="w-3.5 h-3.5 text-primary" />
            <span>{activeNode.statutoryGrounding}</span>
          </div>
        </div>

        {/* Content details */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 pt-4">
          <div className="lg:col-span-1 space-y-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-surface-muted">
              Stage Purpose & Function
            </h4>
            <p className="text-xs sm:text-sm text-secondary leading-relaxed font-sans">
              {activeNode.summary}
            </p>
          </div>

          <div className="lg:col-span-2 space-y-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-surface-muted">
              Key Capabilities in this Stage
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {activeNode.details.map((detail, idx) => (
                <div 
                  key={idx} 
                  className="p-3 rounded-lg bg-surface-card border border-surface-border text-xs text-on-surface leading-relaxed shadow-sm flex items-start gap-2"
                >
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                  <span>{detail}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

    </section>
  );
};

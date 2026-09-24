import React, { useState } from 'react';
import { X, CheckCircle2, ShieldCheck, Cpu } from 'lucide-react';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  apiKey: string;
  onSaveKey: (key: string) => void;
  openRouterKey?: string;
  onSaveOpenRouterKey?: (key: string) => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  apiKey,
  onSaveKey,
  openRouterKey = '',
  onSaveOpenRouterKey,
}) => {
  const [geminiInput, setGeminiInput] = useState(apiKey);
  const [openRouterInput, setOpenRouterInput] = useState(openRouterKey);
  const [saved, setSaved] = useState(false);
  const modalRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => {
        const first = modalRef.current?.querySelector<HTMLElement>(
          'button:not([disabled]), input:not([disabled])'
        );
        first?.focus();
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSave = () => {
    onSaveKey(geminiInput.trim());
    if (onSaveOpenRouterKey) {
      onSaveOpenRouterKey(openRouterInput.trim());
    }
    setSaved(true);
    setTimeout(() => {
      setSaved(false);
      onClose();
    }, 700);
  };

  return (
    <div 
      className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="settings-modal-title"
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
          if (e.shiftKey && document.activeElement === first) {
            e.preventDefault();
            last.focus();
          } else if (!e.shiftKey && document.activeElement === last) {
            e.preventDefault();
            first.focus();
          }
        }
      }}
    >
      <div ref={modalRef} className="bg-surface-card rounded-xl border border-surface-border shadow-elevation w-full max-w-lg overflow-hidden animate-fadeIn">
        
        {/* Header */}
        <div className="p-4 bg-surface border-b border-surface-border flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-primary text-white flex items-center justify-center" aria-hidden="true">
              <Cpu className="w-4 h-4" />
            </div>
            <div>
              <h3 id="settings-modal-title" className="font-serif font-bold text-base text-on-surface">
                Platform Intelligence Settings
              </h3>
              <p className="text-xs text-surface-muted">
                Configure OpenRouter & Google Gemini API models
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            aria-label="Close settings dialog"
            className="p-1.5 text-surface-muted hover:text-on-surface rounded focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
          <div className="p-3.5 rounded-lg bg-navy-50/70 border border-navy-100 text-xs text-navy-900 leading-relaxed space-y-1">
            <div className="flex items-center gap-1.5 font-bold text-primary">
              <ShieldCheck className="w-4 h-4" />
              <span>Multi-Tier AI Architecture:</span>
            </div>
            <p>
              ClarityLegal uses a hybrid architecture: OpenRouter models (e.g. <code>openai/gpt-4o-mini</code>) provide fast, high-capability legal analysis and executive PDF summaries, backed by OpenRouter free models, Google Gemini, and offline heuristic legal intelligence.
            </p>
          </div>

          {/* OpenRouter Configuration */}
          <div className="space-y-1.5 p-3.5 rounded-lg bg-surface border border-surface-border">
            <div className="flex items-center justify-between">
              <label htmlFor="openrouter-api-key" className="block text-xs font-bold text-on-surface">
                OpenRouter API Key
              </label>
              <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
                Primary (Free Models)
              </span>
            </div>
            <input
              id="openrouter-api-key"
              type="password"
              placeholder="sk-or-v1-..."
              value={openRouterInput}
              onChange={(e) => setOpenRouterInput(e.target.value)}
              className="w-full h-9 px-3 text-xs bg-surface-card border border-surface-border rounded focus:outline-none focus:border-primary font-mono"
            />
            <div className="flex items-center justify-between text-[11px] text-surface-muted pt-1">
              <span>Primary Model: <strong className="text-primary">inclusionai/ling-3.0-flash-vl:free</strong></span>
              <span className="text-emerald-700 font-medium">Free Tier • Ultra Fast</span>
            </div>
          </div>

          {/* Gemini Configuration */}
          <div className="space-y-1.5 p-3.5 rounded-lg bg-surface border border-surface-border">
            <div className="flex items-center justify-between">
              <label htmlFor="gemini-api-key" className="block text-xs font-bold text-on-surface">
                Google Gemini API Key
              </label>
              <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-800 border border-slate-200">
                Fallback
              </span>
            </div>
            <input
              id="gemini-api-key"
              type="password"
              placeholder="AIzaSy..."
              value={geminiInput}
              onChange={(e) => setGeminiInput(e.target.value)}
              className="w-full h-9 px-3 text-xs bg-surface-card border border-surface-border rounded focus:outline-none focus:border-primary font-mono"
            />
            <p className="text-[11px] text-surface-muted">
              Used when OpenRouter is unconfigured or rate-limited.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-surface border-t border-surface-border flex items-center justify-between">
          <button
            onClick={() => {
              setGeminiInput('');
              setOpenRouterInput('');
              onSaveKey('');
              if (onSaveOpenRouterKey) onSaveOpenRouterKey('');
            }}
            className="text-xs text-rose-600 hover:text-rose-800 font-semibold"
          >
            Clear Stored Keys
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-3 py-1.5 text-xs text-surface-muted hover:text-on-surface font-semibold"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="px-4 py-1.5 bg-primary text-white rounded text-xs font-semibold hover:bg-primary-container transition-colors flex items-center gap-1 shadow-sm"
            >
              {saved && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />}
              <span>{saved ? 'Saved!' : 'Save Settings'}</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};

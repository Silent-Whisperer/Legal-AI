import React, { useState, useRef, useEffect } from 'react';
import { LegalDocument, ChatMessage } from '../types.ts';
import { sendChatMessage } from '../services/api.ts';
import { 
  Send, 
  Sparkles, 
  X, 
  Bot, 
  ChevronRight, 
  Link,
  Minimize2,
  Maximize2
} from 'lucide-react';
import { SupportedLanguage, getVernacularText } from '../utils/vernacular.ts';

interface GroundedChatDrawerProps {
  document: LegalDocument;
  isOpen: boolean;
  onClose: () => void;
  onSelectClause: (clauseRef: string) => void;
  apiKey?: string;
  selectedLanguage?: SupportedLanguage;
  openRouterKey?: string;
}

export const GroundedChatDrawer: React.FC<GroundedChatDrawerProps> = ({
  document,
  isOpen,
  onClose,
  onSelectClause,
  apiKey,
  selectedLanguage = 'en',
  openRouterKey,
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>(document.chatHistory || []);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMessages(document.chatHistory || []);
  }, [document]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async (textToSend?: string) => {
    const text = textToSend || inputText;
    if (!text.trim() || isLoading) return;

    const userMsg: ChatMessage = {
      id: `usr-${Date.now()}`,
      role: 'user',
      content: text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages(prev => [...prev, userMsg]);
    setInputText('');
    setIsLoading(true);

    try {
      const res = await sendChatMessage(document.id, text, apiKey, selectedLanguage, openRouterKey);
      setMessages(res.history);
    } catch (err: any) {
      setMessages(prev => [
        ...prev,
        {
          id: `err-${Date.now()}`,
          role: 'assistant',
          content: 'Sorry, I encountered an error processing your query. Please check your connection and try again.',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  const samplePrompts = [
    'Is my security deposit refundable?',
    'Who pays if a building pipe bursts?',
    'Can I host on Airbnb or sublet?',
    'Is the 4-hour entry notice legal in California?'
  ];

  return (
    <div 
      role="region"
      aria-label="Grounded document chat assistant"
      onKeyDown={(e) => {
        if (e.key === 'Escape') {
          onClose();
        }
      }}
      className={`fixed bottom-4 right-4 z-50 bg-surface-card rounded-lg border border-surface-border shadow-elevation flex flex-col transition-all duration-200 ${
        isExpanded ? 'w-[680px] h-[720px]' : 'w-[420px] h-[560px]'
      }`}
    >
      
      {/* Header */}
      <div className="p-3.5 bg-primary text-white rounded-t-lg flex items-center justify-between shadow-sm shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded bg-white/15 flex items-center justify-center" aria-hidden="true">
            <Sparkles className="w-4 h-4 text-white" />
          </div>
          <div>
            <h3 className="font-semibold text-xs leading-tight">
              {getVernacularText('chatTitle', selectedLanguage)}
            </h3>
            <p className="text-[10px] text-white/80">
              {getVernacularText('chatSubtitle', selectedLanguage)}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1 text-white/80">
          <button 
            onClick={() => setIsExpanded(!isExpanded)}
            aria-label={isExpanded ? "Collapse chat drawer" : "Expand chat drawer"}
            className="p-1 hover:text-white hover:bg-white/10 rounded focus-visible:ring-2 focus-visible:ring-white focus-visible:outline-none"
            title={isExpanded ? "Collapse" : "Expand"}
          >
            {isExpanded ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
          <button 
            onClick={onClose}
            aria-label="Close chat assistant"
            className="p-1 hover:text-white hover:bg-white/10 rounded focus-visible:ring-2 focus-visible:ring-white focus-visible:outline-none"
            title="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Messages Scroll Area */}
      <div role="log" aria-live="polite" className="flex-1 p-4 overflow-y-auto space-y-4 bg-surface/40 text-xs">
        {messages.length === 0 && (
          <div className="text-center py-6 space-y-3">
            <div className="w-10 h-10 rounded-full bg-navy-50 text-primary mx-auto flex items-center justify-center">
              <Bot className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-semibold text-on-surface text-sm">Ask about your contract</h4>
              <p className="text-[11px] text-surface-muted max-w-xs mx-auto mt-1">
                Every answer retains document context and links directly to specific clauses.
              </p>
            </div>

            <div className="pt-2 flex flex-col gap-1.5 text-left">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-surface-muted">Suggested Queries:</span>
              {samplePrompts.map((p, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSend(p)}
                  className="p-2 rounded bg-surface-card hover:bg-surface-hover border border-surface-border text-on-surface text-[11px] text-left transition-colors flex items-center justify-between group"
                >
                  <span>{p}</span>
                  <ChevronRight className="w-3.5 h-3.5 text-surface-muted group-hover:text-primary transition-transform group-hover:translate-x-0.5" />
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}
          >
            <div
              className={`p-3.5 rounded-lg max-w-[85%] leading-relaxed ${
                msg.role === 'user'
                  ? 'bg-primary text-white rounded-br-none shadow-sm'
                  : 'bg-surface-card border border-surface-border text-on-surface rounded-bl-none shadow-card'
              }`}
            >
              <div className="text-xs whitespace-pre-line font-sans">
                {msg.content}
              </div>

              {/* Citations */}
              {msg.citations && msg.citations.length > 0 && (
                <div className="mt-2.5 pt-2 border-t border-surface-border/60 space-y-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-primary flex items-center gap-1">
                    <Link className="w-3 h-3" /> Grounded Source Citations:
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {msg.citations.map((cite, idx) => (
                      <button
                        key={idx}
                        onClick={() => onSelectClause(cite.clauseRef)}
                        title={cite.excerpt}
                        className="px-2 py-0.5 rounded bg-navy-50 hover:bg-navy-100 text-primary border border-navy-100 text-[10px] font-semibold transition-colors flex items-center gap-1"
                      >
                        <span>{cite.clauseRef}</span>
                        <ChevronRight className="w-2.5 h-2.5" />
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <span className="text-[9px] text-surface-muted mt-1 px-1">{msg.timestamp}</span>
          </div>
        ))}

        {isLoading && (
          <div className="flex items-center gap-2 text-surface-muted text-xs p-2">
            <div className="w-2 h-2 rounded-full bg-primary animate-ping" />
            <span>ClarityLegal Copilot is synthesizing grounded answer...</span>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Footer */}
      <div className="p-3 bg-surface-card border-t border-surface-border rounded-b-lg shrink-0">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSend();
          }}
          className="flex items-center gap-2"
        >
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder={getVernacularText('chatPlaceholder', selectedLanguage)}
            aria-label="Ask a question about your contract"
            disabled={isLoading}
            className="flex-1 h-9 px-3 text-xs bg-surface border border-surface-border rounded focus:outline-none focus:border-primary focus-visible:ring-1 focus-visible:ring-primary text-on-surface placeholder:text-surface-muted"
          />
          <button
            type="submit"
            disabled={isLoading || !inputText.trim()}
            aria-label="Send query to ClarityLegal Copilot"
            className="h-9 px-3 bg-primary text-white rounded font-semibold text-xs hover:bg-primary-container disabled:opacity-40 transition-colors flex items-center justify-center shrink-0 shadow-sm focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
          >
            <Send className="w-3.5 h-3.5" aria-hidden="true" />
          </button>
        </form>
      </div>

    </div>
  );
};

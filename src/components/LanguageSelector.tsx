import React, { useState, useRef, useEffect } from 'react';
import { SupportedLanguage, SUPPORTED_LANGUAGES } from '../utils/vernacular.ts';
import { Globe, ChevronDown, Check } from 'lucide-react';

interface LanguageSelectorProps {
  currentLanguage: SupportedLanguage;
  onSelectLanguage: (lang: SupportedLanguage) => void;
}

export const LanguageSelector: React.FC<LanguageSelectorProps> = ({
  currentLanguage,
  onSelectLanguage,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const activeLang = SUPPORTED_LANGUAGES.find(l => l.code === currentLanguage) || SUPPORTED_LANGUAGES[0];

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-surface border border-surface-border text-on-surface hover:bg-surface-hover transition-colors shadow-sm"
        title="Change Language / भाषा बदलें / ಭಾಷೆ ಬದಲಿಸಿ"
      >
        <Globe className="w-3.5 h-3.5 text-primary" />
        <span className="text-sm leading-none">{activeLang.flag}</span>
        <span className="font-medium text-xs hidden sm:inline">{activeLang.nativeName}</span>
        <ChevronDown className="w-3 h-3 text-surface-muted" />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-1.5 w-48 bg-surface-card border border-surface-border rounded-xl shadow-elevation py-1.5 z-50 animate-fadeIn">
          <div className="px-3 py-1 text-[10px] font-bold text-surface-muted uppercase tracking-wider border-b border-surface-border/50">
            Select Language / भाषा
          </div>
          {SUPPORTED_LANGUAGES.map((lang) => {
            const isSelected = lang.code === currentLanguage;
            return (
              <button
                key={lang.code}
                onClick={() => {
                  onSelectLanguage(lang.code);
                  setIsOpen(false);
                }}
                className={`w-full px-3 py-2 text-xs flex items-center justify-between transition-colors ${
                  isSelected 
                    ? 'bg-navy-50 text-primary font-bold' 
                    : 'text-on-surface hover:bg-surface-hover'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className="text-sm">{lang.flag}</span>
                  <div className="text-left">
                    <div className="font-medium text-xs">{lang.nativeName}</div>
                    <div className="text-[10px] text-surface-muted">{lang.name}</div>
                  </div>
                </div>
                {isSelected && <Check className="w-3.5 h-3.5 text-primary" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

import React, { useState, useRef } from 'react';
import { uploadDocument } from '../services/api.ts';
import { LegalDocument } from '../types.ts';
import { SupportedLanguage } from '../utils/vernacular.ts';
import { 
  X, 
  Upload, 
  FileText, 
  AlertCircle, 
  FolderOpen,
  Image as ImageIcon,
  Scan
} from 'lucide-react';
import { AnalysisLoadingModal } from './AnalysisLoadingModal.tsx';

interface UploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (newDoc: LegalDocument) => void;
  apiKey?: string;
  selectedLanguage?: SupportedLanguage;
  openRouterKey?: string;
  initialFile?: File | null;
}

export const UploadModal: React.FC<UploadModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  apiKey,
  selectedLanguage = 'en',
  openRouterKey,
  initialFile,
}) => {
  const [activeTab, setActiveTab] = useState<'upload' | 'paste'>('upload');
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState('');
  const [rawText, setRawText] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);
  const modalRef = useRef<HTMLDivElement>(null);
  const previouslyFocusedElementRef = useRef<HTMLElement | null>(null);

  React.useEffect(() => {
    if (initialFile && isOpen) {
      setFile(initialFile);
      setTitle(initialFile.name.replace(/\.[^/.]+$/, "").replace(/_/g, ' '));
      setActiveTab('upload');
    }
    if (isOpen) {
      previouslyFocusedElementRef.current = document.activeElement as HTMLElement | null;
      const timer = setTimeout(() => {
        const first = modalRef.current?.querySelector<HTMLElement>(
          'button:not([disabled]), input:not([disabled]), textarea:not([disabled])'
        );
        first?.focus();
      }, 50);
      return () => clearTimeout(timer);
    } else {
      previouslyFocusedElementRef.current?.focus();
    }
  }, [initialFile, isOpen]);

  if (!isOpen) return null;

  const resetForm = () => {
    setFile(null);
    setTitle('');
    setRawText('');
    setErrorMsg('');
    setIsDraggingOver(false);
  };

  const handleClose = () => {
    if (isProcessing) return; // don't abort mid-flight
    resetForm();
    onClose();
  };

  const isImageFile = Boolean(file && (file.type.startsWith('image/') || /\.(png|jpe?g|webp|bmp|tiff|tif|svg|gif)$/i.test(file.name)));

  const handleFileSubmit = async () => {
    if (!file && activeTab === 'upload') return;
    if (!rawText.trim() && activeTab === 'paste') return;

    setIsProcessing(true);
    setErrorMsg('');

    const controller = new AbortController();
    abortControllerRef.current = controller;

    // Safety net timeout of 120s (2 minutes) to prevent indefinitely hanging connections
    const timeoutId = setTimeout(() => {
      controller.abort();
    }, 120000);

    try {
      const doc = await uploadDocument(
        file || undefined,
        rawText || undefined,
        title || undefined,
        apiKey,
        selectedLanguage,
        openRouterKey,
        controller.signal
      );

      clearTimeout(timeoutId);
      resetForm();
      onSuccess(doc);
      onClose();
    } catch (err: any) {
      clearTimeout(timeoutId);
      if (err.name === 'AbortError' || controller.signal.aborted) {
        setErrorMsg('Upload was canceled or timed out after 2 minutes. Please verify your connection or try a smaller text excerpt.');
      } else {
        console.error('Upload error:', err);
        setErrorMsg(err.message || 'Failed to process document. Please ensure the file is valid and try again.');
      }
    } finally {
      setIsProcessing(false);
      abortControllerRef.current = null;
    }
  };

  return (
    <>
      <div 
        className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4"
        role="dialog"
        aria-modal="true"
        aria-labelledby="upload-modal-title"
        aria-describedby="upload-modal-desc"
        onKeyDown={(e) => {
          if (e.key === 'Escape' && !isProcessing) {
            handleClose();
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
        <div ref={modalRef} className="bg-surface-card rounded-xl border border-surface-border shadow-elevation w-full max-w-xl overflow-hidden animate-fadeIn">
          
          {/* Header */}
          <div className="p-4 sm:p-5 bg-surface border-b border-surface-border flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-primary text-white flex items-center justify-center text-sm shadow-sm" aria-hidden="true">
                <Upload className="w-4 h-4" />
              </div>
              <div>
                <h3 id="upload-modal-title" className="font-serif font-bold text-base text-on-surface">
                  Upload & Ingest Legal Document
                </h3>
                <p id="upload-modal-desc" className="text-xs text-surface-muted">
                  Supports PDF, Word (.docx), Scanned Images (PNG/JPG with OCR), and Text
                </p>
              </div>
            </div>
            <button 
              onClick={handleClose}
              disabled={isProcessing}
              aria-label="Close upload dialog"
              className="p-1.5 text-surface-muted hover:text-on-surface rounded disabled:opacity-30 focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Tab Switcher */}
          <div role="tablist" aria-label="Ingestion mode" className="flex border-b border-surface-border bg-surface/50 text-xs font-semibold">
            <button
              role="tab"
              id="tab-upload"
              aria-selected={activeTab === 'upload'}
              aria-controls="panel-upload"
              onClick={() => setActiveTab('upload')}
              disabled={isProcessing}
              className={`flex-1 py-2.5 text-center transition-colors flex items-center justify-center gap-1.5 focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none ${
                activeTab === 'upload' 
                  ? 'border-b-2 border-primary text-primary bg-surface-card' 
                  : 'text-surface-muted hover:text-on-surface'
              }`}
            >
              <FolderOpen className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Upload PDF / DOCX / Image</span>
            </button>
            <button
              role="tab"
              id="tab-paste"
              aria-selected={activeTab === 'paste'}
              aria-controls="panel-paste"
              onClick={() => setActiveTab('paste')}
              disabled={isProcessing}
              className={`flex-1 py-2.5 text-center transition-colors flex items-center justify-center gap-1.5 focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none ${
                activeTab === 'paste' 
                  ? 'border-b-2 border-primary text-primary bg-surface-card' 
                  : 'text-surface-muted hover:text-on-surface'
              }`}
            >
              <FileText className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Paste Contract Text</span>
            </button>
          </div>

          {/* Modal Body */}
          <div className="p-6 space-y-4">
            
            {errorMsg && (
              <div className="p-3.5 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-800 flex items-start gap-2 shadow-sm">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 mt-0.5" />
                <div>
                  <strong className="font-bold block">Ingestion Notice:</strong>
                  <span>{errorMsg}</span>
                </div>
              </div>
            )}

            {/* TAB 1: Upload File */}
            {activeTab === 'upload' && (
              <div className="space-y-4">
                <div 
                  onDragOver={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setIsDraggingOver(true);
                  }}
                  onDragEnter={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setIsDraggingOver(true);
                  }}
                  onDragLeave={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setIsDraggingOver(false);
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setIsDraggingOver(false);
                    const dropped = e.dataTransfer?.files?.[0];
                    if (dropped) {
                      setFile(dropped);
                      if (!title) {
                        setTitle(dropped.name.replace(/\.[^/.]+$/, "").replace(/_/g, ' '));
                      }
                      setErrorMsg('');
                    }
                  }}
                  className={`border-2 border-dashed rounded-xl p-6 text-center transition-all cursor-pointer relative group ${
                    isDraggingOver 
                      ? 'border-primary bg-primary/10 ring-4 ring-primary/20 scale-[1.01]' 
                      : 'border-surface-border hover:border-primary bg-surface/50'
                  }`}
                >
                  <input
                    id="file-upload-input"
                    aria-label="Upload legal document, contract, or image file"
                    type="file"
                    accept=".pdf,.docx,.doc,.txt,.rtf,.md,.markdown,.odt,.png,.jpg,.jpeg,.webp,.bmp,.tiff,.tif,.svg,.gif,image/*,text/*,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                    onChange={(e) => {
                      const selected = e.target.files?.[0] || null;
                      setFile(selected);
                      if (selected && !title) {
                        setTitle(selected.name.replace(/\.[^/.]+$/, "").replace(/_/g, ' '));
                      }
                      setErrorMsg('');
                    }}
                    className="absolute inset-0 opacity-0 cursor-pointer"
                  />
                  <div className="space-y-2 pointer-events-none">
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center mx-auto transition-transform ${
                      isDraggingOver ? 'bg-primary text-white scale-125 animate-bounce' : 'bg-navy-50 text-primary group-hover:scale-110'
                    }`}>
                      {isDraggingOver ? (
                        <Upload className="w-6 h-6" />
                      ) : isImageFile ? (
                        <ImageIcon className="w-6 h-6 text-emerald-600" />
                      ) : (
                        <FolderOpen className="w-6 h-6" />
                      )}
                    </div>
                    <div className="text-xs font-semibold text-on-surface">
                      {isDraggingOver ? (
                        <span className="text-primary font-bold text-sm">Release to drop your document or image right here! 🚀</span>
                      ) : file ? (
                        <span className="text-primary font-bold flex items-center justify-center gap-1">
                          {isImageFile ? '📷' : '📄'} {file.name} ({(file.size / 1024).toFixed(1)} KB)
                        </span>
                      ) : (
                        'Click to select or drag and drop your document or image'
                      )}
                    </div>
                    <p className="text-[11px] text-surface-muted">
                      Supports PDF (digital & scanned), Word (.docx, .doc), Images (PNG, JPG, WebP), Text, RTF, or Markdown up to 15MB
                    </p>
                    {isImageFile && (
                      <div className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                        <Scan className="w-3 h-3" /> Automatic OCR Text Recognition Active
                      </div>
                    )}
                  </div>
                </div>

                <div>
                  <label htmlFor="upload-doc-title" className="block text-xs font-semibold text-on-surface mb-1">
                    Document Title (Optional)
                  </label>
                  <input
                    id="upload-doc-title"
                    type="text"
                    placeholder="E.g., Legal Services Agreement or Certificate of Achievement"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full h-9 px-3 text-xs bg-surface border border-surface-border rounded-lg focus:outline-none focus:border-primary"
                  />
                </div>
              </div>
            )}

            {/* TAB 2: Paste Text */}
            {activeTab === 'paste' && (
              <div className="space-y-3">
                <div>
                  <label htmlFor="paste-doc-title" className="block text-xs font-semibold text-on-surface mb-1">
                    Document Title (Optional)
                  </label>
                  <input
                    id="paste-doc-title"
                    type="text"
                    placeholder="E.g., Consulting Agreement or Non-Disclosure Agreement"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full h-9 px-3 text-xs bg-surface border border-surface-border rounded-lg focus:outline-none focus:border-primary"
                  />
                </div>

                <div>
                  <label htmlFor="paste-raw-text" className="block text-xs font-semibold text-on-surface mb-1">
                    Contract Text
                  </label>
                  <textarea
                    id="paste-raw-text"
                    rows={8}
                    placeholder="Paste the full contract or agreement text here..."
                    value={rawText}
                    onChange={(e) => setRawText(e.target.value)}
                    className="w-full p-3 text-xs bg-surface border border-surface-border rounded-lg focus:outline-none focus:border-primary font-serif leading-relaxed"
                  />
                  <div className="flex items-center justify-between text-[11px] text-surface-muted mt-1">
                    <span>{rawText.length} characters</span>
                    <span>Supports any length</span>
                  </div>
                </div>
              </div>
            )}

          </div>

          {/* Footer Actions */}
          <div className="p-4 bg-surface border-t border-surface-border flex items-center justify-end gap-2">
            <button
              onClick={handleClose}
              disabled={isProcessing}
              className="px-3 py-1.5 text-xs text-surface-muted hover:text-on-surface font-semibold disabled:opacity-30"
            >
              Cancel
            </button>
            <button
              onClick={handleFileSubmit}
              disabled={isProcessing || (activeTab === 'upload' && !file) || (activeTab === 'paste' && !rawText.trim())}
              className="flex items-center gap-1.5 px-4 py-2 bg-primary text-white rounded-lg text-xs font-semibold hover:bg-primary-container disabled:opacity-40 transition-colors shadow-sm"
            >
              <span>Ingest & Analyze Document 🚀</span>
            </button>
          </div>

        </div>
      </div>

      {/* Modern Pipeline Loading Modal (displays during backend analysis) */}
      <AnalysisLoadingModal 
        isOpen={isProcessing} 
        documentTitle={file?.name || title || 'Pasted Legal Document'} 
        onCancel={() => {
          if (abortControllerRef.current) {
            abortControllerRef.current.abort();
          }
          setIsProcessing(false);
          setErrorMsg('Analysis canceled by user.');
        }}
      />
    </>
  );
};

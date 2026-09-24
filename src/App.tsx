import React, { useState, useEffect } from 'react';
import { LegalDocument, ComparisonResult, HighlightTarget } from './types.ts';
import { fetchDocuments, fetchDocument, deleteDocument } from './services/api.ts';
import { Header } from './components/Header.tsx';
import { HomeScreen } from './components/HomeScreen.tsx';
import { Footer } from './components/Footer.tsx';
import { WhatItMeansView } from './components/WhatItMeansView.tsx';
import { ResponsibilityMatrix } from './components/ResponsibilityMatrix.tsx';
import { TimelineView } from './components/TimelineView.tsx';
import { SplitDocumentViewer } from './components/SplitDocumentViewer.tsx';
import { LawyerPrepDossier } from './components/LawyerPrepDossier.tsx';
import { ContractCompare } from './components/ContractCompare.tsx';
import { GroundedChatDrawer } from './components/GroundedChatDrawer.tsx';
import { UploadModal } from './components/UploadModal.tsx';
import { SettingsModal } from './components/SettingsModal.tsx';
import { PdfSummaryModal } from './components/PdfSummaryModal.tsx';
import { NonLegalDocumentView } from './components/NonLegalDocumentView.tsx';
import { ErrorBoundary } from './components/ErrorBoundary.tsx';
import { SupportedLanguage, getVernacularText } from './utils/vernacular.ts';
import { 
  Home,
  BookOpen, 
  CheckSquare, 
  Clock, 
  Gavel, 
  Scale, 
  MessageSquare,
  Sparkles,
  Upload
} from 'lucide-react';

export const App: React.FC = () => {
  const [documents, setDocuments] = useState<Array<Partial<LegalDocument> & { totalClauses?: number; criticalFlagCount?: number; executiveSummary?: string }>>([]);
  const [currentDoc, setCurrentDoc] = useState<LegalDocument | null>(null);
  const [activeTab, setActiveTab] = useState<string>('home');
  const [selectedLanguage, setSelectedLanguage] = useState<SupportedLanguage>('en');
  const [selectedClauseRef, setSelectedClauseRef] = useState<string>('');
  const [selectedClauseId, setSelectedClauseId] = useState<string>('');
  const [highlightTarget, setHighlightTarget] = useState<HighlightTarget | undefined>(undefined);
  const [comparison, setComparison] = useState<ComparisonResult | null>(null);
  
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isPdfSummaryOpen, setIsPdfSummaryOpen] = useState(false);
  const [droppedFile, setDroppedFile] = useState<File | null>(null);
  const [isGlobalDragging, setIsGlobalDragging] = useState(false);
  const [apiKey, setApiKey] = useState<string>(() => sessionStorage.getItem('clarity_gemini_key') || localStorage.getItem('clarity_gemini_key') || '');
  const [openRouterKey, setOpenRouterKey] = useState<string>(() => sessionStorage.getItem('clarity_openrouter_key') || localStorage.getItem('clarity_openrouter_key') || '');
  const [liveAnnouncement, setLiveAnnouncement] = useState<string>('');

  const handleSaveOpenRouterKey = (key: string) => {
    setOpenRouterKey(key);
    sessionStorage.setItem('clarity_openrouter_key', key);
    localStorage.removeItem('clarity_openrouter_key');
  };

  useEffect(() => {
    if (currentDoc?.title) {
      setLiveAnnouncement(`Document loaded: ${currentDoc.title}. Active view: ${activeTab}.`);
    } else {
      setLiveAnnouncement(`Viewing ${activeTab}.`);
    }
  }, [currentDoc?.title, activeTab]);

  // Synchronize browser tab title with current state to eradicate any stale/cached titles
  useEffect(() => {
    if (currentDoc?.title) {
      window.document.title = `${currentDoc.title} | ClarityLegal`;
    } else {
      window.document.title = 'ClarityLegal | Plain-English Legal Information Platform';
    }
  }, [currentDoc]);

  // Synchronize document language attribute with selected vernacular language for screen readers
  useEffect(() => {
    document.documentElement.lang = selectedLanguage;
  }, [selectedLanguage]);

  // Global window drag-and-drop listener for universal document ingestion
  useEffect(() => {
    let dragCounter = 0;

    const handleDragEnter = (e: DragEvent) => {
      e.preventDefault();
      dragCounter++;
      if (e.dataTransfer?.types?.includes('Files')) {
        setIsGlobalDragging(true);
      }
    };

    const handleDragLeave = (e: DragEvent) => {
      e.preventDefault();
      dragCounter--;
      if (dragCounter <= 0) {
        setIsGlobalDragging(false);
      }
    };

    const handleDragOver = (e: DragEvent) => {
      e.preventDefault();
    };

    const handleDrop = (e: DragEvent) => {
      e.preventDefault();
      dragCounter = 0;
      setIsGlobalDragging(false);
      const file = e.dataTransfer?.files?.[0];
      if (file) {
        setDroppedFile(file);
        setIsUploadOpen(true);
      }
    };

    window.addEventListener('dragenter', handleDragEnter);
    window.addEventListener('dragleave', handleDragLeave);
    window.addEventListener('dragover', handleDragOver);
    window.addEventListener('drop', handleDrop);

    return () => {
      window.removeEventListener('dragenter', handleDragEnter);
      window.removeEventListener('dragleave', handleDragLeave);
      window.removeEventListener('dragover', handleDragOver);
      window.removeEventListener('drop', handleDrop);
    };
  }, []);

  // Load initial documents (starts clean with zero dummy data)
  useEffect(() => {
    loadDocs();
  }, []);

  const loadDocs = async () => {
    try {
      const docs = await fetchDocuments();
      setDocuments(docs);
      if (docs.length > 0) {
        const fullDoc = await fetchDocument(docs[0].id!);
        setCurrentDoc(fullDoc);
      }
    } catch (err) {
      console.error('Failed to load documents:', err);
    }
  };

  const handleSelectDoc = async (id: string) => {
    try {
      const doc = await fetchDocument(id);
      setCurrentDoc(doc);
      setSelectedClauseRef('');
      setSelectedClauseId('');
      setHighlightTarget(undefined);
    } catch (err) {
      console.error('Failed to switch document:', err);
    }
  };

  const handleDeleteDoc = async (id: string) => {
    try {
      await deleteDocument(id);
      const updated = documents.filter(d => d.id !== id);
      setDocuments(updated);
      if (currentDoc?.id === id) {
        setSelectedClauseRef('');
        setSelectedClauseId('');
        setHighlightTarget(undefined);
        if (updated.length > 0) {
          await handleSelectDoc(updated[0].id!);
        } else {
          setCurrentDoc(null);
          setActiveTab('home');
        }
      }
    } catch (err) {
      console.error('Failed to delete document:', err);
    }
  };

  const handleSelectClause = (clauseRef: string, clauseId?: string, target?: HighlightTarget) => {
    setSelectedClauseRef(clauseRef);
    setSelectedClauseId(clauseId || '');
    setHighlightTarget(target);
    setActiveTab('explainer');
  };

  const handleSaveApiKey = (key: string) => {
    setApiKey(key);
    sessionStorage.setItem('clarity_gemini_key', key);
    localStorage.removeItem('clarity_gemini_key');
  };

  const handlePrintDossier = () => {
    setActiveTab('lawyer');
    setTimeout(() => {
      window.print();
    }, 300);
  };

  const isNonLegal = currentDoc?.isLegalDocument === false || currentDoc?.stoppedAfterClassification === true;

  const navTabs = isNonLegal
    ? [
        { id: 'home', label: '🏠 Home & Guide', icon: Home },
        { id: 'overview', label: '🛑 Classification Report', icon: Sparkles },
        { id: 'explainer', label: '📄 Extracted Document Preview', icon: BookOpen },
        { id: 'responsibilities', label: getVernacularText('obligations', selectedLanguage), icon: CheckSquare, badge: 'N/A' },
        { id: 'timeline', label: getVernacularText('timeline', selectedLanguage), icon: Clock, badge: 'N/A' },
        { id: 'lawyer', label: getVernacularText('lawyerDossier', selectedLanguage), icon: Gavel, badge: 'N/A' },
        { id: 'compare', label: getVernacularText('compareVersions', selectedLanguage), icon: Scale },
      ]
    : [
        { id: 'home', label: '🏠 Home & Guide', icon: Home },
        { id: 'overview', label: getVernacularText('whatItMeans', selectedLanguage), icon: Sparkles },
        { id: 'explainer', label: getVernacularText('clauseReader', selectedLanguage), icon: BookOpen },
        { id: 'responsibilities', label: getVernacularText('obligations', selectedLanguage), icon: CheckSquare },
        { id: 'timeline', label: getVernacularText('timeline', selectedLanguage), icon: Clock },
        { id: 'lawyer', label: getVernacularText('lawyerDossier', selectedLanguage), icon: Gavel, badge: currentDoc?.analysis?.lawyerDossier?.questionsForCounsel?.length ? `${currentDoc.analysis.lawyerDossier.questionsForCounsel.length} Qs` : undefined },
        { id: 'compare', label: getVernacularText('compareVersions', selectedLanguage), icon: Scale },
      ];

  return (
    <div className="min-h-screen bg-surface flex flex-col">
      {/* Skip to Main Content Link for Keyboard and Screen Reader Accessibility */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:px-4 focus:py-2 focus:bg-primary focus:text-white focus:font-semibold focus:rounded-md focus:shadow-xl focus:outline-none focus:ring-2 focus:ring-primary-focus"
      >
        Skip to main content
      </a>

      {/* Global Screen Reader Live Announcement Region */}
      <div role="status" aria-live="polite" aria-atomic="true" className="sr-only">
        {liveAnnouncement}
      </div>

      {/* 1. Universal Top Header */}
      <Header
        currentDoc={currentDoc}
        documents={documents}
        currentLanguage={selectedLanguage}
        onSelectLanguage={setSelectedLanguage}
        onSelectDoc={(id) => {
          handleSelectDoc(id);
          setActiveTab('overview');
        }}
        onOpenUpload={() => setIsUploadOpen(true)}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onPrintDossier={handlePrintDossier}
        onOpenSummary={() => setIsPdfSummaryOpen(true)}
        onNavigateHome={() => setActiveTab('home')}
      />

      {/* 2. Sub-Header Navigation & Context Bar */}
      <div className="bg-surface-card border-b border-surface-border sticky top-16 z-30 shadow-card">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          {/* Top row: Document title & meta chips (only when document loaded & not on home) */}
          {currentDoc && activeTab !== 'home' && (
            <div className="py-2.5 flex flex-wrap items-center justify-between gap-3 border-b border-surface-border/50 text-xs">
              <div className="flex items-center gap-2 min-w-0">
                <span className="font-semibold text-on-surface truncate max-w-sm sm:max-w-xl">
                  {isNonLegal ? '🛑' : '📄'} {currentDoc.title}
                </span>
                <span className="text-surface-muted hidden sm:inline">•</span>
                <span className="text-surface-muted hidden sm:inline font-mono">
                  {isNonLegal 
                    ? `Non-Legal: ${currentDoc.nonLegalCategory?.replace(/_/g, ' ') || 'Record'} (Analysis Halted)`
                    : `${currentDoc.clauses.length} Clauses Assessed`}
                </span>
              </div>

              <div className="flex items-center gap-2">
                {isNonLegal ? (
                  <span className="px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-800 dark:bg-amber-950/60 dark:text-amber-200 border border-amber-300 dark:border-amber-800 font-semibold text-[11px]">
                    🛑 Classification Halted
                  </span>
                ) : (
                  <>
                    <span className="px-2 py-0.5 rounded bg-surface border border-surface-border text-primary font-medium text-[11px]">
                      Jurisdiction: {currentDoc.analysis?.jurisdiction || 'General'}
                    </span>
                    {currentDoc.analysis?.quickStats?.criticalFlagCount ? (
                      <span className="px-2 py-0.5 rounded bg-surface border border-surface-border text-secondary font-medium text-[11px]">
                        ⚠️ {currentDoc.analysis.quickStats.criticalFlagCount} Sections to Review
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded bg-surface border border-surface-border text-surface-muted font-medium text-[11px]">
                        Standard Terms
                      </span>
                    )}
                  </>
                )}
              </div>
            </div>
          )}

          {/* Bottom row: Non-scrollable Tab Switcher */}
          <div
            role="tablist"
            aria-label="Document view modes"
            className="flex flex-wrap items-center justify-center gap-1.5 sm:gap-2 py-2"
          >
            {navTabs.map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  id={`tab-${tab.id}`}
                  role="tab"
                  aria-selected={isActive}
                  aria-controls={`panel-${tab.id}`}
                  tabIndex={isActive ? 0 : -1}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-1.5 py-1.5 px-3 rounded-lg text-xs font-semibold transition-all ${
                    isActive
                      ? 'bg-primary text-white shadow-sm'
                      : 'bg-surface text-surface-muted hover:text-on-surface hover:bg-surface-hover border border-surface-border/50'
                  }`}
                >
                  <span>{tab.label}</span>
                  {tab.badge && (
                    <span className={`px-1.5 py-0.2 rounded text-[10px] font-bold ${
                      isActive ? 'bg-white/20 text-white' : tab.badge === 'N/A' ? 'bg-surface border border-surface-border text-surface-muted' : 'bg-navy-100 text-primary'
                    }`}>
                      {tab.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

        </div>
      </div>

      {/* 3. Main Workspace Container */}
      <main
        id="main-content"
        tabIndex={-1}
        role="main"
        aria-label="Document analysis workspace"
        data-panel-id={`panel-${activeTab}`}
        className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 focus:outline-none"
      >
        <ErrorBoundary fallbackTitle="Display Notice">
          {activeTab === 'home' ? (
            <HomeScreen
              documents={documents}
              onSelectDoc={async (id) => {
                await handleSelectDoc(id);
                setActiveTab('overview');
              }}
              onDeleteDoc={handleDeleteDoc}
              onOpenUpload={() => setIsUploadOpen(true)}
              onNavigateTab={(tab) => setActiveTab(tab)}
              onDropFile={(file) => {
                setDroppedFile(file);
                setIsUploadOpen(true);
              }}
            />
          ) : activeTab === 'compare' ? (
            <ContractCompare
              comparison={comparison}
              documents={documents}
              apiKey={apiKey}
              openRouterKey={openRouterKey}
              onComparisonComplete={(comp) => setComparison(comp)}
            />
          ) : currentDoc && isNonLegal ? (
            <NonLegalDocumentView
              document={currentDoc}
              onOpenUpload={() => setIsUploadOpen(true)}
              onNavigateHome={() => setActiveTab('home')}
            />
          ) : currentDoc && currentDoc.analysis ? (
            <>
              {activeTab === 'overview' && (
                <WhatItMeansView
                  document={currentDoc}
                  selectedLanguage={selectedLanguage}
                  onNavigateTab={(tab) => setActiveTab(tab)}
                  onSelectClause={handleSelectClause}
                  onOpenSummary={() => setIsPdfSummaryOpen(true)}
                />
              )}

              {activeTab === 'explainer' && (
                <SplitDocumentViewer
                  document={currentDoc}
                  selectedClauseRef={selectedClauseRef}
                  selectedClauseId={selectedClauseId}
                  highlightTarget={highlightTarget}
                  selectedLanguage={selectedLanguage}
                  apiKey={apiKey}
                  openRouterKey={openRouterKey}
                  onSelectClause={handleSelectClause}
                  onUpdateDocument={(updated) => setCurrentDoc(updated)}
                />
              )}

              {activeTab === 'responsibilities' && (
                <ResponsibilityMatrix
                  analysis={currentDoc.analysis}
                  onSelectClause={handleSelectClause}
                />
              )}

              {activeTab === 'timeline' && (
                <TimelineView
                  timeline={currentDoc.analysis.timelineSequence}
                  onSelectClause={handleSelectClause}
                />
              )}

              {activeTab === 'lawyer' && (
                <LawyerPrepDossier
                  document={currentDoc}
                  onPrint={() => window.print()}
                />
              )}
            </>
          ) : (
            <div className="bg-surface-card rounded-2xl border border-surface-border p-8 sm:p-12 text-center max-w-xl mx-auto my-12 space-y-4 shadow-card animate-fadeIn">
              <div className="w-14 h-14 rounded-2xl bg-navy-50 text-primary flex items-center justify-center mx-auto text-2xl">
                📑
              </div>
              <h3 className="font-serif text-xl font-bold text-on-surface">
                No Document Selected
              </h3>
              <p className="text-xs sm:text-sm text-secondary leading-relaxed">
                Upload a legal contract (PDF, Word .docx, or plain text) to unlock plain-English clause breakdowns, obligations matrix, next steps timeline, and attorney dossier.
              </p>
              <div className="pt-2">
                <button
                  onClick={() => setIsUploadOpen(true)}
                  className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-white rounded-xl text-xs font-semibold hover:bg-primary-container transition-all shadow-card"
                >
                  <Upload className="w-4 h-4" />
                  <span>Upload Legal Contract Now 🚀</span>
                </button>
              </div>
            </div>
          )}
        </ErrorBoundary>
      </main>

      {/* 4. Platform Trust & Explanatory Footer */}
      <Footer
        onNavigateHome={() => setActiveTab('home')}
        onOpenUpload={() => setIsUploadOpen(true)}
        onNavigateTab={(tab) => setActiveTab(tab)}
      />

      {/* 5. Grounded Contextual Chat Drawer */}
      {currentDoc && !isNonLegal && (
        <GroundedChatDrawer
          document={currentDoc}
          isOpen={isChatOpen}
          onClose={() => setIsChatOpen(false)}
          onSelectClause={handleSelectClause}
          apiKey={apiKey}
          selectedLanguage={selectedLanguage}
          openRouterKey={openRouterKey}
        />
      )}

      {/* Floating Chat Trigger Button (only for legal contracts) */}
      {!isChatOpen && currentDoc && !isNonLegal && (
        <button
          onClick={() => setIsChatOpen(true)}
          className="chat-floating-btn fixed bottom-6 right-6 z-40 bg-primary hover:bg-primary-container text-white px-4 py-3 rounded-full shadow-elevation flex items-center gap-2.5 transition-transform hover:scale-105"
        >
          <MessageSquare className="w-4 h-4" />
          <span className="text-xs font-semibold">{getVernacularText('chatTitle', selectedLanguage)}</span>
          <span className="w-2 h-2 rounded-full bg-emerald-400" />
        </button>
      )}

      {/* Modals */}
      <UploadModal
        isOpen={isUploadOpen}
        onClose={() => {
          setDroppedFile(null);
          setIsUploadOpen(false);
        }}
        onSuccess={(newDoc) => {
          setDroppedFile(null);
          setDocuments(prev => [newDoc, ...prev.filter(d => d.id !== newDoc.id)]);
          setCurrentDoc(newDoc);
          setSelectedClauseRef('');
          setSelectedClauseId('');
          setHighlightTarget(undefined);
          setActiveTab('overview');
        }}
        apiKey={apiKey}
        selectedLanguage={selectedLanguage}
        openRouterKey={openRouterKey}
        initialFile={droppedFile}
      />

      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        apiKey={apiKey}
        onSaveKey={handleSaveApiKey}
        openRouterKey={openRouterKey}
        onSaveOpenRouterKey={handleSaveOpenRouterKey}
      />

      {/* Global AI PDF Executive Summary Modal */}
      {currentDoc && !isNonLegal && (
        <PdfSummaryModal
          isOpen={isPdfSummaryOpen}
          onClose={() => setIsPdfSummaryOpen(false)}
          document={currentDoc}
          apiKey={apiKey}
          openRouterKey={openRouterKey}
          onUpdateDocument={(updated) => setCurrentDoc(updated)}
        />
      )}

      {/* Global Drag-and-Drop Overlay */}
      {isGlobalDragging && (
        <div className="fixed inset-0 z-50 bg-primary/20 backdrop-blur-md flex items-center justify-center p-6 border-4 border-dashed border-primary animate-fadeIn pointer-events-none">
          <div className="bg-surface-card/95 p-8 rounded-2xl shadow-elevation border border-primary text-center space-y-3 max-w-md">
            <div className="w-16 h-16 rounded-2xl bg-primary text-white flex items-center justify-center mx-auto text-3xl animate-bounce shadow-md">
              📥
            </div>
            <h2 className="font-serif text-2xl font-bold text-on-surface">
              Drop file anywhere to ingest
            </h2>
            <p className="text-xs text-secondary leading-relaxed">
              Supports PDF (digital & scanned), Word (.docx, .doc), Images (PNG, JPG, WebP), Text, RTF, or Markdown.
            </p>
          </div>
        </div>
      )}

    </div>
  );
};

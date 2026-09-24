import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import { LegalDocument, Clause, HighlightCategory, HighlightTarget } from '../types.ts';
import { SupportedLanguage, getVernacularText } from '../utils/vernacular.ts';
import { 
  ChevronLeft, 
  ChevronRight, 
  ZoomIn, 
  ZoomOut, 
  Search, 
  AlertCircle,
  Loader2,
  Filter,
  Eye,
  EyeOff,
  Target,
  X
} from 'lucide-react';
// Configure PDF.js worker using local static asset (served from /public/pdf.worker.min.js)
if (typeof window !== 'undefined') {
  pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.js';
}

const escapeRegExp = (str: string) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

interface VisualPdfViewerProps {
  fileUrl: string;
  document: LegalDocument;
  selectedClauseId?: string;
  selectedClauseRef?: string;
  highlightTarget?: HighlightTarget;
  selectedLanguage?: SupportedLanguage;
  onSelectClause?: (clauseRef: string, clauseId?: string, target?: HighlightTarget) => void;
}

interface HighlightBox {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  text: string;
  category: HighlightCategory;
  label?: string;
  isPrimary?: boolean;
}

const CATEGORY_THEMES: Record<HighlightCategory, {
  bg: string;
  border: string;
  ring: string;
  badgeBg: string;
  badgeText: string;
  dot: string;
  title: string;
  icon: string;
}> = {
  party: {
    bg: 'bg-blue-500/25',
    border: 'border-blue-600',
    ring: 'ring-blue-400',
    badgeBg: 'bg-blue-100 text-blue-900 border-blue-300',
    badgeText: 'text-blue-700',
    dot: '#2563eb',
    title: 'Party / Entity',
    icon: '👤'
  },
  risk: {
    bg: 'bg-rose-500/25',
    border: 'border-rose-600',
    ring: 'ring-rose-400',
    badgeBg: 'bg-rose-100 text-rose-900 border-rose-300',
    badgeText: 'text-rose-700',
    dot: '#e11d48',
    title: 'Risk / Flag',
    icon: '⚠️'
  },
  financial: {
    bg: 'bg-emerald-500/25',
    border: 'border-emerald-600',
    ring: 'ring-emerald-400',
    badgeBg: 'bg-emerald-100 text-emerald-900 border-emerald-300',
    badgeText: 'text-emerald-700',
    dot: '#059669',
    title: 'Financial / Fee',
    icon: '💰'
  },
  obligation: {
    bg: 'bg-purple-500/25',
    border: 'border-purple-600',
    ring: 'ring-purple-400',
    badgeBg: 'bg-purple-100 text-purple-900 border-purple-300',
    badgeText: 'text-purple-700',
    dot: '#9333ea',
    title: 'Obligation / Duty',
    icon: '📋'
  },
  term: {
    bg: 'bg-amber-500/25',
    border: 'border-amber-600',
    ring: 'ring-amber-400',
    badgeBg: 'bg-amber-100 text-amber-900 border-amber-300',
    badgeText: 'text-amber-700',
    dot: '#d97706',
    title: 'Term & Duration',
    icon: '⏳'
  },
  agreement: {
    bg: 'bg-cyan-500/25',
    border: 'border-cyan-600',
    ring: 'ring-cyan-400',
    badgeBg: 'bg-cyan-100 text-cyan-900 border-cyan-300',
    badgeText: 'text-cyan-700',
    dot: '#0891b2',
    title: 'Agreement Clause',
    icon: '📜'
  },
  clause: {
    bg: 'bg-sky-500/25',
    border: 'border-sky-600',
    ring: 'ring-sky-400',
    badgeBg: 'bg-sky-100 text-sky-900 border-sky-300',
    badgeText: 'text-sky-700',
    dot: '#0284c7',
    title: 'Clause Section',
    icon: '📑'
  }
};

export const VisualPdfViewer: React.FC<VisualPdfViewerProps> = ({
  fileUrl,
  document: doc,
  selectedClauseId,
  selectedClauseRef,
  highlightTarget,
  selectedLanguage = 'en',
  onSelectClause,
}) => {
  const [pdfDoc, setPdfDoc] = useState<any>(null);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(doc.totalPages || 1);
  const [zoomScale, setZoomScale] = useState<number>(1.0);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [highlightBoxes, setHighlightBoxes] = useState<HighlightBox[]>([]);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [renderProgress, setRenderProgress] = useState<boolean>(false);
  const [activeCategoryFilter, setActiveCategoryFilter] = useState<HighlightCategory | 'all'>('all');
  const [showHighlights, setShowHighlights] = useState<boolean>(true);
  
  // Single-target vs All mode: Default to 'focused' (only highlight what is pressed/viewed)
  const [highlightMode, setHighlightMode] = useState<'focused' | 'all'>('focused');
  
  // Scroll jitter elimination: disable pointer events on boxes while scrolling
  const [isScrolling, setIsScrolling] = useState<boolean>(false);
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const renderTaskRef = useRef<any>(null);
  const renderedKeyRef = useRef<string>('');
  const pageDataCacheRef = useRef<Map<number, { page: any; textContent: any; annotations: any }>>(new Map());

  // 1. Load PDF document binary via PDF.js
  useEffect(() => {
    let isCancelled = false;
    setIsLoading(true);
    setLoadError(null);
    renderedKeyRef.current = '';
    pageDataCacheRef.current.clear();

    const loadTask = pdfjsLib.getDocument({
      url: fileUrl,
      withCredentials: false
    });

    loadTask.promise
      .then((loadedPdf: any) => {
        if (isCancelled) return;
        setPdfDoc(loadedPdf);
        setTotalPages(loadedPdf.numPages);
        setIsLoading(false);
      })
      .catch((err: any) => {
        if (isCancelled) return;
        console.error('Failed to load PDF in canvas viewer:', err);
        setLoadError(`Unable to render original PDF canvas: ${err.message || 'Error parsing binary stream'}`);
        setIsLoading(false);
      });

    return () => {
      isCancelled = true;
      if (renderTaskRef.current) {
        try {
          renderTaskRef.current.cancel();
        } catch {
          // ignore
        }
        renderTaskRef.current = null;
      }
      loadTask.destroy();
    };
  }, [fileUrl]);

  // 2. Identify the active target clause
  const activeClause: Clause | undefined = useMemo(() => {
    const clauses = doc?.clauses || [];
    // 1. Exact clauseId match
    if (selectedClauseId) {
      const found = clauses.find(c => c.id === selectedClauseId);
      if (found) return found;
    }
    // 2. Exact section number match (e.g., "Section 4", "Clause 4", "4")
    if (selectedClauseRef) {
      const numMatch = selectedClauseRef.match(/\b(?:Section|Clause)?\s*(\d+[A-Za-z]?)\b/i);
      if (numMatch) {
        const targetNum = numMatch[1].toLowerCase();
        const found = clauses.find(c => String(c.number || '').toLowerCase() === targetNum);
        if (found) return found;
      }
      // 3. Title match
      const titleMatch = clauses.find(c => {
        const cTitle = String(c.title || '');
        return cTitle.length >= 3 && (
          selectedClauseRef.toLowerCase().includes(cTitle.toLowerCase()) ||
          cTitle.toLowerCase().includes(selectedClauseRef.toLowerCase())
        );
      });
      if (titleMatch) return titleMatch;
    }
    return clauses[0];
  }, [doc?.clauses, selectedClauseId, selectedClauseRef]);

  // 3. Jump to target page when active clause or target changes (with full PDF text search)
  useEffect(() => {
    if (!pdfDoc) return;
    let isCancelled = false;

    const resolveTargetPage = async () => {
      // Priority 1: If highlightTarget has text, search across pages for the exact or best-matching text
      if (highlightTarget?.text && highlightTarget.text.trim().length >= 3) {
        const query = highlightTarget.text.toLowerCase().trim();
        const searchKeywords = query.replace(/[^\w\s₹$]/g, ' ')
          .split(/\s+/)
          .filter(w => w.length >= 4 && !['shall', 'will', 'this', 'that', 'with', 'from', 'under', 'into'].includes(w));

        try {
          // Check current page first
          const curPageObj = await pdfDoc.getPage(currentPage);
          const curText = await curPageObj.getTextContent();
          const curAnnots = await curPageObj.getAnnotations().catch(() => []);
          const curAnnotStrs = (curAnnots || []).map((a: any) => String(a.fieldValue || a.buttonValue || a.contents || '')).filter(Boolean);
          const curStr = (curText.items.map((i: any) => (i.str || '')).concat(curAnnotStrs)).join(' ').toLowerCase();

          const hasExact = curStr.includes(query);
          const matchesCount = searchKeywords.filter(w => curStr.includes(w)).length;
          const hasSignificant = searchKeywords.length > 0 && matchesCount >= Math.min(2, searchKeywords.length);

          if (hasExact || hasSignificant) {
            return; // Already on the matching page
          }

          // Search across all pages in the PDF document
          for (let p = 1; p <= totalPages; p++) {
            if (p === currentPage) continue;
            const pageObj = await pdfDoc.getPage(p);
            const pageText = await pageObj.getTextContent();
            const pageAnnots = await pageObj.getAnnotations().catch(() => []);
            const pageAnnotStrs = (pageAnnots || []).map((a: any) => String(a.fieldValue || a.buttonValue || a.contents || '')).filter(Boolean);
            const pageStr = (pageText.items.map((i: any) => (i.str || '')).concat(pageAnnotStrs)).join(' ').toLowerCase();

            if (pageStr.includes(query) || (searchKeywords.length > 0 && searchKeywords.filter(w => pageStr.includes(w)).length >= Math.min(2, searchKeywords.length))) {
              if (!isCancelled) {
                setCurrentPage(p);
              }
              return;
            }
          }
        } catch (scanErr) {
          console.warn('Target page scan error:', scanErr);
        }
      }

      // Priority 2: Jump to activeClause's specified pageNumber
      if (activeClause?.pageNumber && activeClause.pageNumber !== currentPage && activeClause.pageNumber <= totalPages) {
        if (!isCancelled) {
          setCurrentPage(activeClause.pageNumber);
        }
      }
    };

    resolveTargetPage();

    return () => {
      isCancelled = true;
    };
  }, [pdfDoc, activeClause, highlightTarget, totalPages]);

  // 4. Scroll jitter elimination: detect scroll and temporarily suppress hover pointer events
  const handleScroll = useCallback(() => {
    if (!isScrolling) {
      setIsScrolling(true);
    }
    if (scrollTimeoutRef.current) {
      clearTimeout(scrollTimeoutRef.current);
    }
    scrollTimeoutRef.current = setTimeout(() => {
      setIsScrolling(false);
    }, 150);
  }, [isScrolling]);

  // 5A. Render PDF page onto canvas ONLY when document, page number, or zoom scale changes
  useEffect(() => {
    if (!pdfDoc || !canvasRef.current) return;

    const renderKey = `${currentPage}-${zoomScale}`;
    if (renderedKeyRef.current === renderKey) {
      // Canvas is already painted with this page at this scale. Zero reload needed!
      return;
    }

    let isCancelled = false;
    setRenderProgress(true);

    pdfDoc.getPage(currentPage).then(async (page: any) => {
      if (isCancelled || !canvasRef.current) return;

      const viewport = page.getViewport({ scale: zoomScale });
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // Only adjust canvas width/height if dimensions changed (setting canvas.width resets bitmap in HTML5)
      const targetW = Math.floor(viewport.width);
      const targetH = Math.floor(viewport.height);
      if (canvas.width !== targetW) canvas.width = targetW;
      if (canvas.height !== targetH) canvas.height = targetH;

      // Cancel previous rendering task if running
      if (renderTaskRef.current) {
        try {
          renderTaskRef.current.cancel();
        } catch {
          // ignore cancellation
        }
        renderTaskRef.current = null;
      }

      // Render PDF page onto canvas
      const renderContext = {
        canvasContext: ctx,
        viewport
      };

      const renderTask = page.render(renderContext);
      renderTaskRef.current = renderTask;

      try {
        await renderTask.promise;
        if (!isCancelled) {
          renderedKeyRef.current = renderKey;
        }
      } catch (rErr: any) {
        if (rErr?.name !== 'RenderingCancelledException') {
          console.warn('PDF page canvas render error:', rErr);
        }
      } finally {
        if (renderTaskRef.current === renderTask) {
          renderTaskRef.current = null;
        }
        if (!isCancelled) {
          setRenderProgress(false);
        }
      }
    });

    return () => {
      isCancelled = true;
    };
  }, [pdfDoc, currentPage, zoomScale]);

  // 5B. Compute focused bounding box highlights (runs instantly in memory without touching or reloading the canvas)
  useEffect(() => {
    if (!pdfDoc) return;
    let isCancelled = false;

    const computeHighlights = async () => {
      try {
        let cached = pageDataCacheRef.current.get(currentPage);
        if (!cached) {
          const page = await pdfDoc.getPage(currentPage);
          if (isCancelled) return;
          const [textContent, annotations] = await Promise.all([
            page.getTextContent(),
            page.getAnnotations().catch(() => [])
          ]);
          if (isCancelled) return;
          cached = { page, textContent, annotations };
          pageDataCacheRef.current.set(currentPage, cached);
        }

        const { page, textContent, annotations } = cached;
        const viewport = page.getViewport({ scale: zoomScale });

        const scoredBoxes: { box: HighlightBox; score: number }[] = [];
        const targetSearch = searchTerm.trim().toLowerCase();

        // Build focused tokens for what the user is actively pressing / viewing
        const stopWords = new Set(['the', 'and', 'for', 'with', 'this', 'that', 'from', 'into', 'under', 'herein', 'thereof', 'shall', 'will', 'all', 'any', 'not', 'are', 'was', 'were', 'been', 'has', 'have', 'had']);

        // Explicit target passed from WhatItMeansView / metric click
        const rawTargetText = (highlightTarget?.text || '').trim();
        const targetTokens = rawTargetText
          .replace(/[^\w\s₹$]/g, ' ')
          .split(/\s+/)
          .filter(w => w.length >= 3 && !stopWords.has(w.toLowerCase()))
          .map(w => w.toLowerCase());

        // Global dictionaries (only used if highlightMode === 'all')
        const analysis = doc.analysis;
        const partyKeywords: string[] = [];
        const riskKeywords: string[] = [
          'indemnify', 'indemnification', 'penalty', 'forfeit', 'forfeiture', 'breach',
          'liquidated damages', 'liability', 'termination', 'non-compete', 'void'
        ];
        const obligationKeywords = ['shall', 'must', 'responsible', 'ensure', 'agrees to', 'undertakes'];
        const termKeywords = ['months', 'years', 'validity', 'effective date', 'commencement', 'term of'];
        const financialRegex = /(?:₹|Rs\.?|INR|\$|USD)\s*[\d,]+(?:\.\d+)?|monthly\s+rent|deposit/i;

        if (highlightMode === 'all' && analysis?.parties) {
          analysis.parties.forEach(p => {
            p.name.replace(/[^\w\s]/g, ' ').toLowerCase().split(/\s+/).filter(w => w.length >= 3).forEach(w => partyKeywords.push(w));
          });
        }

        // Check if an active clause is being viewed on this page without an explicit target or search
        const isCurrentPageClause = Boolean(activeClause && (activeClause.pageNumber === currentPage || !activeClause.pageNumber));

        if (isCurrentPageClause && activeClause && !rawTargetText && !targetSearch) {
          const activeNum = (activeClause.number || '').trim();
          const activeTitle = (activeClause.title || '').trim().toLowerCase();

          // 1. Find the header item for activeClause on this page
          let headerY: number | null = null;

          for (let i = 0; i < textContent.items.length; i++) {
            const it = textContent.items[i];
            if (!it.str || !it.str.trim()) continue;
            if (it.transform[5] < 50) continue; // Ignore page footer line e.g. "Page 1 of 7"
            const str = it.str.trim();
            const strLower = str.toLowerCase();

            const escapedActiveNum = escapeRegExp(activeNum);
            const numPrefixRegex = new RegExp(`^${escapedActiveNum}(?:\\.|\\s+[A-Z]|$)`, 'i');
            const secWordRegex = new RegExp(`^(?:Section|Clause)\\s+${escapedActiveNum}(?:[\\.\\s]|$)`, 'i');

            if (
              (activeNum && (numPrefixRegex.test(str) || secWordRegex.test(str))) ||
              (activeTitle.length >= 4 && strLower === activeTitle)
            ) {
              headerY = it.transform[5];
              break;
            }
          }

          // Fallback if headerY not found: check if title appears anywhere
          if (headerY === null && activeTitle.length >= 4) {
            for (let i = 0; i < textContent.items.length; i++) {
              const it = textContent.items[i];
              if (!it.str || !it.str.trim()) continue;
              if (it.transform[5] < 50) continue;
              if (it.str.toLowerCase().includes(activeTitle)) {
                headerY = it.transform[5];
                break;
              }
            }
          }

          // 2. Find next section header below headerY to determine bottom boundary of this clause
          let nextHeaderY: number = 50; // default fallback (just above bottom footer margin)

          if (headerY !== null) {
            const parsedNum = parseInt(activeNum, 10);
            const nextNum = !isNaN(parsedNum) ? (parsedNum + 1).toString() : null;
            const escapedNextNum = nextNum ? escapeRegExp(nextNum) : null;

            for (let i = 0; i < textContent.items.length; i++) {
              const it = textContent.items[i];
              if (!it.str || !it.str.trim()) continue;
              const itY = it.transform[5];

              // Must be below headerY by at least 14 points and above footer
              if (itY < headerY - 14 && itY >= 50) {
                const str = it.str.trim();

                let isNextSection = false;
                if (escapedNextNum && new RegExp(`^${escapedNextNum}(?:[\\.\\s]|$)`, 'i').test(str)) {
                  isNextSection = true;
                } else if (/^\d{1,3}(?:\.|\s+[A-Z])/.test(str)) {
                  isNextSection = true;
                } else if (/^(?:Section|Clause)\s+\d+/i.test(str)) {
                  isNextSection = true;
                }

                if (isNextSection) {
                  nextHeaderY = itY;
                  break;
                }
              }
            }
          }

          // 3. Collect items strictly belonging to this active clause
          let clauseItems: any[] = [];
          if (headerY !== null) {
            clauseItems = textContent.items.filter((it: any) => {
              if (!it.str || !it.str.trim()) return false;
              const y = it.transform[5];
              return y <= headerY! + 8 && y > nextHeaderY + 6;
            });
          }

          // Fallback: If no items bounded, match sentences from activeClause.rawText
          if (clauseItems.length === 0 && activeClause.rawText) {
            const rawTokens = activeClause.rawText
              .replace(/[^\w\s]/g, ' ')
              .split(/\s+/)
              .filter(w => w.length >= 6)
              .slice(0, 10);
            
            if (rawTokens.length > 0) {
              clauseItems = textContent.items.filter((it: any) => {
                if (!it.str || !it.str.trim()) return false;
                const itStr = it.str.toLowerCase();
                return rawTokens.some(tok => itStr.includes(tok.toLowerCase()));
              });
            }
          }

          // 4. Group items by visual line (same Y +/- 5 points) for clean, unified boxes
          const lineMap = new Map<number, { items: any[]; y: number; minX: number; maxX: number; height: number }>();
          
          for (const it of clauseItems) {
            const rawY = it.transform[5];
            let foundLineKey: number | null = null;
            for (const k of lineMap.keys()) {
              if (Math.abs(k - rawY) <= 5) {
                foundLineKey = k;
                break;
              }
            }

            const itX1 = it.transform[4];
            const itX2 = itX1 + (it.width || 10);
            const itH = it.height || 11;

            if (foundLineKey !== null) {
              const line = lineMap.get(foundLineKey)!;
              line.items.push(it);
              line.minX = Math.min(line.minX, itX1);
              line.maxX = Math.max(line.maxX, itX2);
              line.height = Math.max(line.height, itH);
            } else {
              lineMap.set(rawY, {
                items: [it],
                y: rawY,
                minX: itX1,
                maxX: itX2,
                height: itH
              });
            }
          }

          // Sort lines top to bottom (descending Y in PDF coordinate space)
          const sortedLines = Array.from(lineMap.values()).sort((a, b) => b.y - a.y);

          sortedLines.forEach((line, lineIdx) => {
            const [vx1, vyTop] = viewport.convertToViewportPoint(line.minX, line.y + line.height + 1);
            const [vx2, vyBottom] = viewport.convertToViewportPoint(line.maxX, line.y - 1);
            
            const x = Math.max(0, Math.min(vx1, vx2) - 2);
            const y = Math.max(0, Math.min(vyTop, vyBottom));
            const width = Math.max(Math.abs(vx2 - vx1) + 4, 30);
            const height = Math.max(Math.abs(vyBottom - vyTop), 13);
            const lineText = line.items.map(it => it.str).join(' ');

            const box: HighlightBox = {
              id: `clause-line-${currentPage}-${lineIdx}`,
              x,
              y,
              width,
              height,
              text: lineText,
              category: 'agreement',
              label: lineIdx === 0 
                ? `Section ${activeClause.number}: ${activeClause.title}` 
                : `Section ${activeClause.number}`,
              isPrimary: lineIdx === 0
            };

            scoredBoxes.push({ box, score: 100 - lineIdx });
          });

          // Include interactive PDF form annotations ONLY if they fall within [nextHeaderY..headerY]
          if (annotations && annotations.length > 0 && headerY !== null) {
            annotations.forEach((annot: any, aIdx: number) => {
              if (!annot.rect || !Array.isArray(annot.rect) || annot.rect.length < 4) return;
              const annotY = annot.rect[1];
              if (annotY <= headerY! + 8 && annotY >= nextHeaderY - 5) {
                const rawStr = String(annot.fieldValue || annot.buttonValue || annot.contents || '').trim();
                if (!rawStr) return;
                const [vx1, vy1] = viewport.convertToViewportPoint(annot.rect[0], annot.rect[3]);
                const [vx2, vy2] = viewport.convertToViewportPoint(annot.rect[2], annot.rect[1]);
                const x = Math.min(vx1, vx2);
                const y = Math.min(vy1, vy2);
                const w = Math.max(Math.abs(vx2 - vx1), 20);
                const h = Math.max(Math.abs(vy2 - vy1), 14);

                scoredBoxes.push({
                  box: {
                    id: `annot-${currentPage}-${aIdx}`,
                    x: Math.max(0, x),
                    y: Math.max(0, y),
                    width: w,
                    height: h,
                    text: rawStr,
                    category: 'agreement',
                    label: `Form: ${rawStr}`,
                    isPrimary: false
                  },
                  score: 85
                });
              }
            });
          }
        } else {
          // Search term, explicit target text (e.g. from What It Means view), or "all annotations" mode
          textContent.items.forEach((item: any, itemIdx: number) => {
            if (!item.str || item.str.trim().length === 0) return;

            const rawStr = item.str;
            const itemStr = rawStr.toLowerCase();
            
            let matchedCategory: HighlightCategory | null = null;
            let boxLabel: string | undefined = undefined;
            let matchScore = 0;

            // Priority 1: User typed in PDF search
            if (targetSearch && itemStr.includes(targetSearch)) {
              matchedCategory = 'clause';
              boxLabel = `Search: ${rawStr}`;
              matchScore = 100;
            }
            // Priority 2: User clicked an explicit target (What It Means / Party / Metric / Risk)
            else if (rawTargetText && targetTokens.length > 0) {
              if (rawTargetText.toLowerCase().includes(itemStr) && itemStr.length >= 4) {
                matchedCategory = highlightTarget?.category || 'clause';
                boxLabel = highlightTarget?.label || rawStr;
                matchScore = 80 + itemStr.length;
              } else if (itemStr.includes(rawTargetText.toLowerCase()) && rawTargetText.length >= 3) {
                matchedCategory = highlightTarget?.category || 'clause';
                boxLabel = highlightTarget?.label || rawStr;
                matchScore = 90;
              } else {
                const matchedTokens = targetTokens.filter(tok => itemStr.includes(tok));
                if (matchedTokens.length > 0) {
                  matchedCategory = highlightTarget?.category || 'clause';
                  boxLabel = highlightTarget?.label || rawStr;
                  matchScore = matchedTokens.length * 20;
                }
              }
            }
            // Priority 3: All annotations mode
            else if (highlightMode === 'all' && !targetSearch && !rawTargetText) {
              if (partyKeywords.some(tok => itemStr.includes(tok))) {
                matchedCategory = 'party';
                boxLabel = `Party: ${rawStr}`;
                matchScore = 10;
              } else if (financialRegex.test(rawStr)) {
                matchedCategory = 'financial';
                boxLabel = `Financial: ${rawStr}`;
                matchScore = 10;
              } else if (riskKeywords.some(tok => itemStr.includes(tok))) {
                matchedCategory = 'risk';
                boxLabel = `Risk: ${rawStr}`;
                matchScore = 10;
              } else if (obligationKeywords.some(tok => itemStr.includes(tok))) {
                matchedCategory = 'obligation';
                boxLabel = `Obligation: ${rawStr}`;
                matchScore = 10;
              } else if (termKeywords.some(tok => itemStr.includes(tok))) {
                matchedCategory = 'term';
                boxLabel = `Term: ${rawStr}`;
                matchScore = 10;
              }
            }

            if (matchedCategory) {
              const [canvasX, canvasYTop] = viewport.convertToViewportPoint(
                item.transform[4],
                item.transform[5] + (item.height || 10)
              );

              const w = Math.max((item.width || 20) * zoomScale, 18);
              const h = Math.max((item.height || 12) * zoomScale, 14);

              const box: HighlightBox = {
                id: `box-${currentPage}-${itemIdx}`,
                x: Math.max(0, canvasX),
                y: Math.max(0, canvasYTop),
                width: w,
                height: h,
                text: rawStr,
                category: matchedCategory,
                label: boxLabel,
                isPrimary: false
              };

              scoredBoxes.push({ box, score: matchScore });
            }
          });

          // Also process interactive PDF form field annotations in non-clause mode
          if (annotations && annotations.length > 0) {
            annotations.forEach((annot: any, aIdx: number) => {
              if (!annot.rect || !Array.isArray(annot.rect) || annot.rect.length < 4) return;
              const rawStr = String(annot.fieldValue || annot.buttonValue || annot.contents || '').trim();
              if (!rawStr) return;

              const itemStr = rawStr.toLowerCase();
              let matchedCategory: HighlightCategory | null = null;
              let boxLabel: string | undefined = undefined;
              let matchScore = 0;

              // Priority 1: PDF search
              if (targetSearch && itemStr.includes(targetSearch)) {
                matchedCategory = 'clause';
                boxLabel = `Search: ${rawStr}`;
                matchScore = 100;
              }
              // Priority 2: Explicit target match
              else if (rawTargetText && targetTokens.length > 0) {
                if (rawTargetText.toLowerCase().includes(itemStr) && itemStr.length >= 3) {
                  matchedCategory = highlightTarget?.category || 'clause';
                  boxLabel = highlightTarget?.label || rawStr;
                  matchScore = 85 + itemStr.length;
                } else if (itemStr.includes(rawTargetText.toLowerCase()) && rawTargetText.length >= 3) {
                  matchedCategory = highlightTarget?.category || 'clause';
                  boxLabel = highlightTarget?.label || rawStr;
                  matchScore = 95;
                } else {
                  const matchedTokens = targetTokens.filter(tok => itemStr.includes(tok));
                  if (matchedTokens.length > 0) {
                    matchedCategory = highlightTarget?.category || 'clause';
                    boxLabel = highlightTarget?.label || rawStr;
                    matchScore = matchedTokens.length * 25;
                  }
                }
              }
              // Priority 3: All annotations mode
              else if (highlightMode === 'all' && !targetSearch && !rawTargetText) {
                if (partyKeywords.some(tok => itemStr.includes(tok))) {
                  matchedCategory = 'party';
                  boxLabel = `Party: ${rawStr}`;
                  matchScore = 15;
                } else if (financialRegex.test(rawStr)) {
                  matchedCategory = 'financial';
                  boxLabel = `Financial: ${rawStr}`;
                  matchScore = 15;
                } else if (riskKeywords.some(tok => itemStr.includes(tok))) {
                  matchedCategory = 'risk';
                  boxLabel = `Risk: ${rawStr}`;
                  matchScore = 15;
                } else if (termKeywords.some(tok => itemStr.includes(tok))) {
                  matchedCategory = 'term';
                  boxLabel = `Term: ${rawStr}`;
                  matchScore = 15;
                }
              }

              if (matchedCategory) {
                const [vx1, vy1] = viewport.convertToViewportPoint(annot.rect[0], annot.rect[3]);
                const [vx2, vy2] = viewport.convertToViewportPoint(annot.rect[2], annot.rect[1]);
                const x = Math.min(vx1, vx2);
                const y = Math.min(vy1, vy2);
                const w = Math.max(Math.abs(vx2 - vx1), 20);
                const h = Math.max(Math.abs(vy2 - vy1), 14);

                const box: HighlightBox = {
                  id: `annot-${currentPage}-${aIdx}`,
                  x: Math.max(0, x),
                  y: Math.max(0, y),
                  width: w,
                  height: h,
                  text: rawStr,
                  category: matchedCategory,
                  label: boxLabel,
                  isPrimary: false
                };

                scoredBoxes.push({ box, score: matchScore });
              }
            });
          }
        }

        // Mark highest-scoring matching boxes as primary
        if (scoredBoxes.length > 0) {
          let highestScore = 0;
          scoredBoxes.forEach(sb => {
            if (sb.score > highestScore) highestScore = sb.score;
          });

          scoredBoxes.forEach(sb => {
            if (sb.score === highestScore && highestScore > 0) {
              sb.box.isPrimary = true;
            }
          });
        }

        if (!isCancelled) {
          setHighlightBoxes(scoredBoxes.map(sb => sb.box));
        }
      } catch (tErr) {
        console.warn('Text content coordinate extraction error:', tErr);
      }
    };

    computeHighlights();

    return () => {
      isCancelled = true;
    };
  }, [pdfDoc, currentPage, zoomScale, activeClause, searchTerm, highlightTarget, highlightMode]);

  // 6. Smoothly auto-scroll container to the primary highlighted box if present
  useEffect(() => {
    if (highlightBoxes.length > 0 && containerRef.current) {
      const primary = highlightBoxes.find(b => b.isPrimary);
      if (primary && containerRef.current) {
        const container = containerRef.current;
        const targetScroll = Math.max(0, primary.y - container.clientHeight / 3);
        container.scrollTo({ top: targetScroll, behavior: 'smooth' });
      }
    }
  }, [highlightBoxes]);

  const handlePrevPage = () => {
    setCurrentPage(prev => Math.max(1, prev - 1));
  };

  const handleNextPage = () => {
    setCurrentPage(prev => Math.min(totalPages, prev + 1));
  };

  // Filter boxes according to showHighlights and active category filter
  const visibleBoxes = !showHighlights
    ? []
    : (activeCategoryFilter === 'all'
      ? highlightBoxes
      : highlightBoxes.filter(b => b.category === activeCategoryFilter));

  // Group box counts by category for current page
  const categoryCounts = highlightBoxes.reduce((acc, box) => {
    acc[box.category] = (acc[box.category] || 0) + 1;
    return acc;
  }, {} as Record<HighlightCategory, number>);

  return (
    <div className="flex flex-col bg-surface-card rounded-lg border border-surface-border shadow-card h-[750px] overflow-hidden">
      
      {/* 1. Top PDF Canvas Controls Bar */}
      <div className="p-3 bg-surface border-b border-surface-border flex flex-wrap items-center justify-between gap-2.5 shrink-0">
        
        {/* Left: Page Navigation */}
        <div className="flex items-center gap-1.5 text-xs">
          <button
            onClick={handlePrevPage}
            disabled={currentPage <= 1 || isLoading}
            className="p-1 rounded bg-surface-card border border-surface-border hover:bg-surface-hover disabled:opacity-40 disabled:cursor-not-allowed"
            title={getVernacularText('prevPage', selectedLanguage)}
          >
            <ChevronLeft className="w-4 h-4 text-on-surface" />
          </button>
          
          <span className="px-2 font-mono text-xs font-semibold text-on-surface">
            {getVernacularText('page', selectedLanguage)} {currentPage} {getVernacularText('of', selectedLanguage)} {totalPages}
          </span>

          <button
            onClick={handleNextPage}
            disabled={currentPage >= totalPages || isLoading}
            className="p-1 rounded bg-surface-card border border-surface-border hover:bg-surface-hover disabled:opacity-40 disabled:cursor-not-allowed"
            title={getVernacularText('nextPage', selectedLanguage)}
          >
            <ChevronRight className="w-4 h-4 text-on-surface" />
          </button>
        </div>

        {/* Center: Search within PDF Canvas */}
        <div className="relative w-36 sm:w-44">
          <input
            type="text"
            placeholder={getVernacularText('searchPdf', selectedLanguage)}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full h-7 pl-7 pr-2 text-xs bg-surface-card border border-surface-border rounded focus:outline-none focus:border-primary"
          />
          <Search className="w-3.5 h-3.5 text-surface-muted absolute left-2 top-2" />
        </div>

        {/* Right: Zoom Controls & Mode Toggle */}
        <div className="flex items-center gap-1 text-xs">
          <button
            onClick={() => setZoomScale(prev => Math.max(0.5, Math.round((prev - 0.1) * 100) / 100))}
            className="p-1 rounded bg-surface-card border border-surface-border hover:bg-surface-hover"
            title={getVernacularText('zoomOut', selectedLanguage)}
          >
            <ZoomOut className="w-3.5 h-3.5 text-surface-muted" />
          </button>
          
          <span className="font-mono text-[11px] font-semibold text-surface-muted px-1 min-w-[36px] text-center">
            {Math.round(zoomScale * 100)}%
          </span>

          <button
            onClick={() => setZoomScale(prev => Math.min(2.5, Math.round((prev + 0.1) * 100) / 100))}
            className="p-1 rounded bg-surface-card border border-surface-border hover:bg-surface-hover"
            title={getVernacularText('zoomIn', selectedLanguage)}
          >
            <ZoomIn className="w-3.5 h-3.5 text-surface-muted" />
          </button>

          <button
            onClick={() => setZoomScale(1.0)}
            className="p-1 px-1.5 rounded bg-surface-card border border-surface-border hover:bg-surface-hover ml-0.5 font-mono text-[11px] font-semibold text-surface-muted hover:text-on-surface"
            title="Reset to 100% default zoom"
          >
            100%
          </button>

          {/* Highlights Show/Hide Toggle */}
          <button
            onClick={() => setShowHighlights(prev => !prev)}
            className={`ml-1.5 px-2 py-1 rounded text-[11px] font-semibold flex items-center gap-1 border transition-colors ${
              showHighlights
                ? 'bg-surface-card border-surface-border text-surface-muted hover:text-on-surface'
                : 'bg-neutral-800 text-white border-neutral-700'
            }`}
            title={showHighlights ? 'Click to hide all colored highlights' : 'Click to show colored highlights'}
          >
            {showHighlights ? <Eye className="w-3 h-3 text-primary" /> : <EyeOff className="w-3 h-3 text-rose-400" />}
            <span className="hidden sm:inline">{showHighlights ? 'Highlights' : 'Hidden'}</span>
          </button>

          {/* Focused vs All mode toggle */}
          <button
            onClick={() => setHighlightMode(prev => prev === 'focused' ? 'all' : 'focused')}
            className={`ml-1 px-2 py-1 rounded text-[11px] font-semibold flex items-center gap-1 border transition-colors ${
              highlightMode === 'focused'
                ? 'bg-primary/10 border-primary/30 text-primary'
                : 'bg-surface border-surface-border text-surface-muted hover:text-on-surface'
            }`}
            title={highlightMode === 'focused' ? 'Only highlighting the selected part' : 'Highlighting all document annotations'}
          >
            <Target className="w-3 h-3" />
            <span className="hidden md:inline">{highlightMode === 'focused' ? 'Focused' : 'All'}</span>
          </button>
        </div>

      </div>

      {/* 2. Interactive Multi-Color Semantic Legend & Status Bar */}
      <div className="px-3 py-1.5 bg-surface/80 border-b border-surface-border/80 flex flex-wrap items-center justify-between gap-1.5 text-[11px]">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-[10px] font-bold uppercase tracking-wider text-surface-muted flex items-center gap-1">
            <Filter className="w-3 h-3" /> Filter:
          </span>

          {/* All */}
          <button
            onClick={() => setActiveCategoryFilter('all')}
            className={`px-2 py-0.5 rounded-full text-[10px] font-medium transition-all ${
              activeCategoryFilter === 'all'
                ? 'bg-neutral-800 text-white font-semibold shadow-xs'
                : 'bg-surface text-surface-muted hover:text-on-surface border border-surface-border'
            }`}
          >
            {getVernacularText('legendAll', selectedLanguage)} ({highlightBoxes.length})
          </button>

          {/* Parties (Blue) */}
          <button
            onClick={() => setActiveCategoryFilter(activeCategoryFilter === 'party' ? 'all' : 'party')}
            className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium transition-all ${
              activeCategoryFilter === 'party'
                ? 'bg-blue-600 text-white font-semibold ring-1 ring-blue-400'
                : 'bg-blue-50 text-blue-900 border border-blue-200 hover:bg-blue-100 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-900'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-blue-600 inline-block" />
            <span>{getVernacularText('legendParties', selectedLanguage)}</span>
            {categoryCounts.party ? <span className="font-mono">({categoryCounts.party})</span> : null}
          </button>

          {/* Risks (Red) */}
          <button
            onClick={() => setActiveCategoryFilter(activeCategoryFilter === 'risk' ? 'all' : 'risk')}
            className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium transition-all ${
              activeCategoryFilter === 'risk'
                ? 'bg-rose-600 text-white font-semibold ring-1 ring-rose-400'
                : 'bg-rose-50 text-rose-900 border border-rose-200 hover:bg-rose-100 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-900'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-rose-600 inline-block" />
            <span>{getVernacularText('legendRisks', selectedLanguage)}</span>
            {categoryCounts.risk ? <span className="font-mono">({categoryCounts.risk})</span> : null}
          </button>

          {/* Financials (Green) */}
          <button
            onClick={() => setActiveCategoryFilter(activeCategoryFilter === 'financial' ? 'all' : 'financial')}
            className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium transition-all ${
              activeCategoryFilter === 'financial'
                ? 'bg-emerald-600 text-white font-semibold ring-1 ring-emerald-400'
                : 'bg-emerald-50 text-emerald-900 border border-emerald-200 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-900'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-emerald-600 inline-block" />
            <span>{getVernacularText('legendFinancials', selectedLanguage)}</span>
            {categoryCounts.financial ? <span className="font-mono">({categoryCounts.financial})</span> : null}
          </button>

          {/* Obligations (Purple) */}
          <button
            onClick={() => setActiveCategoryFilter(activeCategoryFilter === 'obligation' ? 'all' : 'obligation')}
            className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium transition-all ${
              activeCategoryFilter === 'obligation'
                ? 'bg-purple-600 text-white font-semibold ring-1 ring-purple-400'
                : 'bg-purple-50 text-purple-900 border border-purple-200 hover:bg-purple-100 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-900'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-purple-600 inline-block" />
            <span>{getVernacularText('legendObligations', selectedLanguage)}</span>
            {categoryCounts.obligation ? <span className="font-mono">({categoryCounts.obligation})</span> : null}
          </button>

          {/* Terms (Amber) */}
          <button
            onClick={() => setActiveCategoryFilter(activeCategoryFilter === 'term' ? 'all' : 'term')}
            className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium transition-all ${
              activeCategoryFilter === 'term'
                ? 'bg-amber-600 text-white font-semibold ring-1 ring-amber-400'
                : 'bg-amber-50 text-amber-900 border border-amber-200 hover:bg-amber-100 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-900'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-amber-600 inline-block" />
            <span>{getVernacularText('legendTerms', selectedLanguage)}</span>
            {categoryCounts.term ? <span className="font-mono">({categoryCounts.term})</span> : null}
          </button>
        </div>
      </div>

      {/* 3. Active Grounded Target Banner Indicator */}
      {(highlightTarget || activeClause) && (
        <div className="px-3 sm:px-4 py-1.5 bg-amber-50/90 dark:bg-amber-950/40 border-b border-amber-200 dark:border-amber-900/60 flex flex-wrap items-center justify-between gap-2 text-xs shrink-0">
          <div className="flex items-center gap-2 truncate min-w-0">
            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-200 text-amber-900 border border-amber-300 shrink-0">
              ⚡ {highlightTarget ? 'TARGET HIGHLIGHT' : 'ACTIVE CLAUSE'}
            </span>
            <span className="font-semibold text-amber-900 dark:text-amber-200 truncate">
              {highlightTarget?.label ? highlightTarget.label : activeClause ? `Section ${activeClause.number}: ${activeClause.title}` : 'Selected Section'}
            </span>
            {highlightTarget && (
              <button
                type="button"
                onClick={() => onSelectClause?.(activeClause ? `Section ${activeClause.number}` : '', activeClause?.id, undefined)}
                className="ml-1 px-1.5 py-0.5 rounded bg-amber-200 hover:bg-amber-300 text-amber-900 text-[10px] font-bold border border-amber-400 flex items-center gap-0.5 shrink-0 transition-colors"
                title="Clear target filter and return to full clause view"
              >
                <X className="w-3 h-3" /> Clear Target
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 text-[10px] font-mono text-amber-800 dark:text-amber-300 shrink-0">
            {/* Quick Clause Selector Dropdown */}
            {doc.clauses && doc.clauses.length > 0 && (
              <select
                value={activeClause?.id || ''}
                onChange={(e) => {
                  const selectedId = e.target.value;
                  const targetClause = doc.clauses.find(c => c.id === selectedId);
                  if (targetClause) {
                    onSelectClause?.(`Section ${targetClause.number}`, targetClause.id, undefined);
                    if (targetClause.pageNumber && targetClause.pageNumber !== currentPage) {
                      setCurrentPage(targetClause.pageNumber);
                    }
                  }
                }}
                className="h-6 px-1.5 text-[11px] font-sans font-medium bg-surface-card text-on-surface border border-amber-300 dark:border-amber-800 rounded focus:outline-none focus:ring-1 focus:ring-amber-500 max-w-[170px] sm:max-w-[220px] truncate"
                title="Jump directly to any clause section"
              >
                {doc.clauses.map((c) => (
                  <option key={c.id} value={c.id}>
                    Sec {c.number}: {c.title.substring(0, 24)} (P.{c.pageNumber || 1})
                  </option>
                ))}
              </select>
            )}

            <span>{visibleBoxes.length} {getVernacularText('coordinateMarkers', selectedLanguage)}</span>
            {activeClause?.pageNumber && activeClause.pageNumber !== currentPage && (
              <button
                type="button"
                onClick={() => setCurrentPage(activeClause.pageNumber!)}
                className="underline font-bold hover:text-amber-900 ml-1"
              >
                Go to Page {activeClause.pageNumber}
              </button>
            )}
          </div>
        </div>
      )}

      {/* 4. Canvas Viewport Container (Rock-solid scroll stability with overscroll-contain & pointer event suppression during scroll) */}
      <div 
        ref={containerRef}
        onScroll={handleScroll}
        className="flex-1 bg-neutral-900/10 dark:bg-neutral-950 overflow-y-auto overscroll-contain p-4 flex justify-center relative select-none"
        style={{ scrollBehavior: 'smooth' }}
      >
        {isLoading ? (
          <div className="flex flex-col items-center justify-center space-y-3 m-auto text-center">
            <Loader2 className="w-8 h-8 text-primary animate-spin" />
            <p className="text-xs font-semibold text-surface-muted">
              Loading original PDF canvas document...
            </p>
          </div>
        ) : loadError ? (
          <div className="bg-surface-card p-6 rounded-xl border border-surface-border max-w-md m-auto text-center space-y-3">
            <AlertCircle className="w-8 h-8 text-secondary mx-auto" />
            <h4 className="font-serif text-sm font-bold text-on-surface">Original Canvas Preview Unavailable</h4>
            <p className="text-xs text-surface-muted leading-relaxed">{loadError}</p>
            <p className="text-[11px] text-surface-muted">
              You can still read, inspect, and analyze all extracted sections in <strong>Structured Clause Cards</strong> mode.
            </p>
          </div>
        ) : (
          <div className="relative shadow-elevation border border-neutral-300 bg-white inline-block">
            {/* The HTML5 Canvas rendered by PDF.js */}
            <canvas ref={canvasRef} className="block" />

            {/* Live Multi-Colored Grounded Bounding-Box Overlays (Disappears on hover so original PDF text is 100% visible) */}
            {visibleBoxes.map((box) => {
              const theme = CATEGORY_THEMES[box.category] || CATEGORY_THEMES.clause;

              return (
                <div
                  key={box.id}
                  className={`absolute rounded-sm border transition-opacity duration-150 ${
                    theme.bg
                  } ${
                    theme.border
                  } ${
                    box.isPrimary 
                      ? `ring-2 ${theme.ring} shadow-xs z-20` 
                      : 'ring-1 ring-white/50 z-10'
                  } hover:opacity-0`}
                  style={{
                    left: `${box.x}px`,
                    top: `${box.y}px`,
                    width: `${box.width}px`,
                    height: `${box.height}px`,
                    // Disable pointer events during active scrolling so wheel scroll is silky-smooth
                    pointerEvents: isScrolling ? 'none' : 'auto'
                  }}
                />
              );
            })}

            {renderProgress && (
              <div className="absolute top-2 right-2 px-2 py-1 bg-black/60 text-white rounded text-[10px] flex items-center gap-1 z-30">
                <Loader2 className="w-3 h-3 animate-spin" /> Rendering...
              </div>
            )}
          </div>
        )}
      </div>

    </div>
  );
};

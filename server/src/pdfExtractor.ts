// Provide lightweight Node-environment canvas stubs so pdfjs initializes cleanly
if (typeof (globalThis as any).DOMMatrix === 'undefined') {
  (globalThis as any).DOMMatrix = class DOMMatrix {};
}
if (typeof (globalThis as any).Path2D === 'undefined') {
  (globalThis as any).Path2D = class Path2D {};
}

import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const pdfjs = require('pdfjs-dist/legacy/build/pdf.js');

export interface ExtractedPdfResult {
  rawText: string;
  totalPages: number;
  formData: Record<string, string>;
}

export function cleanFormUnderlines(text: string): string {
  let cleaned = text;
  // 1. Clean currency followed by underlines and number: "$______ 2200.00" -> "$ 2200.00"
  cleaned = cleaned.replace(/([\$₹€£]|(?:Rs\.?|INR|USD))\s*[_—\-\.]{2,}\s*(\d[\d,]*(?:\.\d{2})?)/gi, '$1 $2');
  // 2. Clean number followed by underlines: "2200.00 ___" -> "2200.00"
  cleaned = cleaned.replace(/(\d[\d,]*(?:\.\d{2})?)\s*[_—\-]{2,}/g, '$1');
  // 3. Clean labels followed by underlines and text: "Landlord Name: _____ (the Kevin Malone" -> "Landlord Name: Kevin Malone"
  cleaned = cleaned.replace(/([A-Za-z0-9\):])\s*[_—\-]{3,}\s*(?:\(the\s+)?([A-Za-z0-9])/gi, '$1 $2');
  // 4. Clean remaining standalone underlines of 3+ chars
  cleaned = cleaned.replace(/[_—\-]{3,}/g, ' ');
  return cleaned;
}

export async function extractPdfTextAndForms(buffer: Buffer): Promise<ExtractedPdfResult> {
  const doc = await pdfjs.getDocument({
    data: new Uint8Array(buffer),
    useSystemFonts: true,
    disableFontFace: true
  }).promise;

  const totalPages = doc.numPages;
  const pageTexts: string[] = [];
  const formData: Record<string, string> = {};

  for (let p = 1; p <= totalPages; p++) {
    const page = await doc.getPage(p);
    const textContent = await page.getTextContent();
    const annotations = await page.getAnnotations();

    // 1. Gather text content items with coordinate positions
    const items: { str: string; x: number; y: number; isField?: boolean; fieldName?: string }[] = [];

    for (const it of textContent.items) {
      if (it.str && it.str.trim()) {
        items.push({
          str: it.str,
          x: it.transform[4],
          y: it.transform[5]
        });
      }
    }

    // 2. Extract Form / Widget Annotations
    for (const a of annotations) {
      if (a.fieldType === 'Tx' && a.fieldValue && typeof a.fieldValue === 'string' && a.fieldValue.trim()) {
        const val = a.fieldValue.trim();
        const fieldKey = a.fieldName || `field_p${p}`;
        formData[fieldKey] = val;

        items.push({
          str: val,
          x: a.rect ? a.rect[0] : 0,
          y: a.rect ? a.rect[1] : 0,
          isField: true,
          fieldName: a.fieldName
        });
      } else if (a.fieldType === 'Btn' && (a.fieldValue === 'Yes' || a.fieldValue === 'On' || a.buttonValue === true || a.checkBox === true)) {
        const label = a.alternativeText || a.fieldName || a.buttonValue || '';
        if (label && typeof label === 'string' && label.trim()) {
          formData[a.fieldName || `btn_p${p}`] = label.trim();
        }
      }
    }

    // 3. Sort elements by vertical position Y (top to bottom, descending), then horizontal X (left to right)
    items.sort((a, b) => {
      const yDiff = b.y - a.y;
      if (Math.abs(yDiff) > 8) return yDiff;
      return a.x - b.x;
    });

    // 4. Line grouping
    const lines: string[] = [];
    let curLine: string[] = [];
    let lastY: number | null = null;

    for (const it of items) {
      if (lastY === null || Math.abs(lastY - it.y) <= 8) {
        curLine.push(it.str);
        lastY = it.y;
      } else {
        lines.push(curLine.join(' '));
        curLine = [it.str];
        lastY = it.y;
      }
    }
    if (curLine.length > 0) {
      lines.push(curLine.join(' '));
    }

    pageTexts.push(`[Page ${p}]\n` + lines.join('\n'));
  }

  // Clean form underlines that separate labels and filled values
  let rawText = cleanFormUnderlines(pageTexts.join('\n\n'));

  // If structured form fields were captured, append a dedicated block to guarantee 100% downstream visibility
  const fieldKeys = Object.keys(formData);
  if (fieldKeys.length > 0) {
    const formSummary = fieldKeys.map(k => `${k}: ${formData[k]}`).join('\n');
    rawText += `\n\n--- EXECUTED CONTRACT FORM DATA ---\n${formSummary}`;
  }

  return {
    rawText,
    totalPages,
    formData
  };
}

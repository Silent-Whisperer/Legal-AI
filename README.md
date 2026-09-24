# ClarityLegal ⚖️
### Plain-English Legal Intelligence & Accessibility Platform
*Empowering everyday individuals and businesses to understand, navigate, and act on contracts with confidence.*

[![Tests](https://img.shields.io/badge/Tests-53%2F53%20Passing-brightgreen?style=flat-square)](https://github.com/Silent-Whisperer/Legal-AI)
[![TypeScript](https://img.shields.io/badge/TypeScript-Strict%20Typechecked-blue?style=flat-square&logo=typescript)](https://www.typescriptlang.org/)
[![Accessibility](https://img.shields.io/badge/Accessibility-WCAG%202.1%20AA-success?style=flat-square)](https://www.w3.org/WAI/standards-guidelines/wcag/)
[![Languages](https://img.shields.io/badge/Localization-8%20Languages-indigo?style=flat-square)](https://github.com/Silent-Whisperer/Legal-AI)
[![Frameworks](https://img.shields.io/badge/Legal%20Grounding-India%20%26%20International-navy?style=flat-square)](https://github.com/Silent-Whisperer/Legal-AI)

---

## 🌟 The Core Vision

> **"Anyone should be able to upload a complex legal contract and immediately understand what it means for their rights, finances, and obligations—without needing a law degree."**

Legal agreements govern our homes, jobs, intellectual property, and businesses, yet they are routinely written in dense, archaic prose designed by attorneys for attorneys. 

**ClarityLegal** bridges this gap. It is a high-trust, privacy-first **document understanding platform** that transforms opaque agreements into plain-language intelligence, maps obligations and timelines, flags unfair clauses, and prepares users for high-leverage conversations with legal counsel.

---

## 🚀 Key Capabilities & Experiences

### 1. Plain-English Executive Intelligence ("What It Means")
* **Clear Language Verdict:** An executive plain-English synthesis breaking down commitments, payment schedules, and leverage balance.
* **Financial & Duration Metric Deck:** Immediate clarity on total annualized commitment, deposit escrow terms, notice periods, and renewal deadlines.
* **Asymmetric Risk Scanner:** Identifies one-sided indemnity clauses, unreasonable inspection rights, and liability waivers, providing concrete real-world impact scenarios (*e.g., "If maintenance is required during your tenancy..."*).

### 2. Two-Column Responsibility Matrix
* **Clear Division of Duties:** Side-by-side breakdown separating **What You Are Legally Required To Do** from **What The Other Party Must Do**.
* **Filterable & Sourced:** Searchable by keyword, with condition deadlines, clause cross-references, and expandable verbatim source text.

### 3. Chronological Lifecycle Roadmap ("Next Steps Timeline")
* Maps the entire contractual timeline into an actionable roadmap:
  1. *Execution & Initial Security Transfer (Day 0)*
  2. *Handover, Inspection & Onboarding (Days 1–3)*
  3. *Recurring Performance & Grace Periods*
  4. *Exit Notices & Cure Periods*
  5. *Surrender, Itemized Settlement & Statutory Deposit Return*

### 4. Side-by-Side Clause Reader & Redline Engine
* **Interactive Document Viewer:** Split-pane interface pairing original text with plain-language translations. Clicking any citation anywhere in the app highlights the clause with a pulsating visual anchor.
* **Reading Level Transformer:**
  - *Grade 8 Plain English* (Clear, accessible language)
  - *Executive Summary* (Key takeaways)
  - *Actionable Bullet Points* (Immediate tasks)
  - *Statutory Formulation* (Legal precision)
* **Balanced Counter-Proposals:** Generates ready-to-copy balanced redline language to negotiate fairer terms.

### 5. Attorney Consultation Preparation Dossier
* **Intake Case Brief:** Summarizes document essentials and risk points to minimize billable intake hours.
* **Statutory Questions for Counsel:** Prepares high-leverage questions with legal grounding (*e.g., Indian Contract Act 1872, RERA § 13, Cal. Civ. Code § 1953*).
* **Missing Protections Scanner:** Detects what is conspicuously omitted from the contract (e.g., structural repair obligations, severance protections).
* **Evidence Checklist:** Interactive checklist of documents, receipts, photos, and records to assemble before meeting an attorney.
* **1-Click Print Brief:** Clean, print-ready PDF export optimized for formal lawyer review.

### 6. Semantic Version Comparison
* Compares original drafts against revised counter-offers.
* Explains the **substantive real-world changes** in plain language rather than raw character diffs, pinpointing shifts in legal leverage (*e.g., "Advantage Shift: Favors You"*).

### 7. Grounded Document Copilot (AI Chat)
* Context-aware conversational assistant grounded in the uploaded document.
* **XML Fencing Defense:** Guardrails to prevent prompt injection and hallucination.
* **Clickable Citations:** Every answer references exact clauses, with 1-click navigation to the source text.

### 8. Vernacular Multi-Language Localization
* Native support across **8 languages**: English, Hindi (हिंदी), Tamil (தமிழ்), Telugu (తెలుగు), Bengali (বাংলা), Marathi (मराठी), Kannada (ಕನ್ನಡ), and Gujarati (ગુજરાતી).
* Live interface translation and vernacular legal explanations for localized accessibility.

---

## 🛡️ Security, Privacy & Architecture

ClarityLegal is designed from the ground up for strict privacy, performance, and reliability:

* **Session-Based Privacy Isolation:** Every user session receives an ephemeral, cryptographically random session token (`x-session-id`). Users can never see or access another user's uploaded documents.
* **In-Memory Zero Hard-Drive Footprint:** Files are processed in-memory (`multer.memoryStorage()`) through bounded LRU buffers. No raw document files are saved to the server's local file system.
* **Multimodal Ingestion & OCR Fallback:** Ingests digital PDFs, scanned documents (Tesseract OCR), Word (.docx), Images (PNG, JPG, WebP), and plain text.
* **Early Non-Legal Document Classification:** Automatically identifies non-contractual records (e.g., award certificates, resumes, invoices) and safely halts contract analysis with an informational report.
* **Defensive Hardening:** Magic-number byte inspection (`%PDF`, `PK\x03\x04`, blocking `MZ`/`ELF` payloads), Helmet Content Security Policy (CSP), origin-validated CORS, and rate limiting on compute endpoints.
* **Multi-Tier AI Resiliency:** Automatic graceful fallback pipeline:
  $$\text{OpenRouter (Gemma/GPT/Claude)} \longrightarrow \text{Google Gemini} \longrightarrow \text{Deterministic Offline Legal Heuristic Engine}$$

---

## 🛠️ Tech Stack & Directory Structure

* **Frontend:** React 18, TypeScript, Tailwind CSS, Lucide Icons, PDF.js
* **Backend:** Express, Node.js, TypeScript (`tsx`), Multer, PDF-Parse, Mammoth
* **AI & NLP:** OpenRouter API, Google Gemini API, Tesseract OCR, Custom Legal Heuristic Engine
* **Persistence (Optional):** Supabase (PostgreSQL + Encrypted Storage Bucket) or 100% In-Memory RAM Store
* **Testing:** Vitest, Supertest, V8 Coverage

```
Legal-AI/
├── server/                    # Express + TypeScript Backend API
│   ├── src/
│   │   ├── index.ts           # REST API endpoints & security middleware
│   │   ├── analyzer.ts        # AI pipeline coordinator & classifier
│   │   ├── chatService.ts     # Grounded chat with citation tracking & XML fencing
│   │   ├── comparator.ts      # Semantic version diffing & advantage shift analysis
│   │   ├── pdfExtractor.ts    # PDF text, forms, and layout extractor
│   │   ├── config.ts          # Centralized configuration & environment loader
│   │   ├── services/
│   │   │   ├── supabaseClient.ts    # Supabase PostgreSQL & Cloud Storage client
│   │   │   ├── heuristicAnalyzer.ts # Grounded deterministic legal analysis engine
│   │   │   ├── fileValidator.ts     # Magic-number byte validation & key verification
│   │   │   ├── classifier.ts        # Legal contract vs non-contractual record classifier
│   │   │   ├── clauseExtractor.ts   # Regex-based deterministic clause boundary parser
│   │   │   ├── indianLaw.ts         # Indian Contract Act, RERA & statutory knowledge base
│   │   │   ├── ocrPool.ts           # Tesseract OCR engine for scanned documents
│   │   │   └── cache.ts             # Bounded in-memory LRU stores with SHA-256 hashing
│   │   └── types.ts           # Core TypeScript domain models
├── src/                       # Frontend Single Page Application
│   ├── components/            # UI Views (Reader, Matrix, Timeline, Dossier, Compare, Modals)
│   ├── services/              # API client & session manager
│   ├── utils/                 # Vernacular translations & language dictionaries
│   └── App.tsx                # Accessible application workspace shell
├── tests/                     # 11 automated test suites (53 tests)
└── vite.config.ts             # Production bundle & chunk splitting configuration
```

---

## ⚡ Quick Start & Local Setup

### Prerequisites
* **Node.js** v18+ (tested on Node v20/v22/v24)
* **npm** v9+

### 1. Clone & Install
```bash
git clone https://github.com/Silent-Whisperer/Legal-AI.git
cd Legal-AI
npm install
```

### 2. Configure Environment
Copy the sample environment file:
```bash
cp .env.example .env
```

Add your AI API key in `.env`:
```env
PORT=5000
OPENROUTER_API_KEY=your_openrouter_key
OPENROUTER_MODEL=openai/gpt-4o-mini
# Optional: GEMINI_API_KEY=your_gemini_key
# Optional: SUPABASE_URL=https://your-project.supabase.co
# Optional: SUPABASE_ANON_KEY=your_supabase_anon_key
```
> *Note:* Supabase is completely optional. If omitted, ClarityLegal runs 100% in-memory with zero cloud dependencies.

### 3. Launch the Platform
```bash
npm run dev
```
* **Frontend Application:** [http://localhost:3000](http://localhost:3000)
* **Backend API Server:** [http://localhost:5000](http://localhost:5000)

### 4. Run Test Suite
```bash
npm test
```

### 5. Build for Production
```bash
npm run build
```

---

## 🚢 Live Cloud Deployment

ClarityLegal is production-ready for single-service deployment (e.g., **Render**, **Railway**, **Fly.io**, or **Docker**):

1. **Build Command:** `npm run build`
2. **Start Command:** `npm start`
3. **Environment Variables:**
   * `OPENROUTER_API_KEY` (or `GEMINI_API_KEY`)
   * `OPENROUTER_MODEL` (e.g. `openai/gpt-4o-mini` or `google/gemini-2.0-flash-001`)
   * `PORT` (automatically assigned by cloud hosts)

The Express server automatically serves the compiled production frontend (`dist/`) and all API endpoints from a single host and port.

---

## 📄 License
This project is licensed under the MIT License — see the [LICENSE](LICENSE) file for details.

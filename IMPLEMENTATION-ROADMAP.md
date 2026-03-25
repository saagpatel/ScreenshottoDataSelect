# Screenshot to DataSelect — Implementation Roadmap

## Architecture

### System Diagram

```
┌─────────────────────────────────────────────────────┐
│                    CHROME BROWSER                     │
│                                                       │
│  ┌──────────┐    ┌──────────────┐    ┌────────────┐  │
│  │  Popup    │◄──►│   Service    │◄──►│  Content   │  │
│  │  (React)  │    │   Worker     │    │  Script    │  │
│  │           │    │   (bg.ts)    │    │ (overlay)  │  │
│  └──────────┘    └──────┬───────┘    └────────────┘  │
│       │                 │                  │          │
│       │          ┌──────┴───────┐          │          │
│       │          │  Offscreen   │    ┌─────┴──────┐   │
│       │          │  Document    │    │  Selection  │   │
│       │          │ (canvas ops) │    │  Overlay    │   │
│       │          └──────────────┘    │ (drag rect) │   │
│       │                              └────────────┘   │
│  ┌────┴─────┐                                         │
│  │ Settings │                                         │
│  │ History  │                                         │
│  │ Export   │                                         │
│  └──────────┘                                         │
└───────────────────────────┬───────────────────────────┘
                            │ HTTPS
                            ▼
                 ┌────────────────────┐
                 │  Anthropic API     │
                 │  /v1/messages      │
                 │  (Vision + Text)   │
                 └────────────────────┘
```

### Data Flow

1. User clicks extension icon → Popup opens → User clicks "Select Region"
2. Popup sends `START_SELECTION` message to service worker
3. Service worker injects content script overlay into active tab via `chrome.scripting.executeScript`
4. User drags rectangle over table area on the page
5. Content script sends `REGION_SELECTED` with coordinates to service worker
6. Service worker calls `chrome.tabs.captureVisibleTab()` → full page screenshot as data URL
7. Service worker creates offscreen document → crops screenshot to selected region using canvas
8. Service worker sends cropped image (base64) to Anthropic Vision API with extraction prompt
9. API returns structured JSON → service worker parses and validates → sends to popup
10. Popup displays extracted data in preview table → user clicks Copy CSV / Copy JSON / Download

### File Structure

```
screenshot-to-dataselect/
├── src/
│   ├── manifest.ts                 # Typed manifest (CRXJS generates manifest.json)
│   ├── background/
│   │   └── service-worker.ts       # Message routing, API calls, tab capture
│   ├── content/
│   │   ├── overlay.ts              # Selection rectangle overlay (vanilla JS)
│   │   └── overlay.css             # Overlay styles (crosshair, selection rect)
│   ├── offscreen/
│   │   ├── offscreen.html          # Offscreen document shell
│   │   └── offscreen.ts            # Canvas crop operations
│   ├── popup/
│   │   ├── index.html              # Popup shell
│   │   ├── main.tsx                # React entry
│   │   ├── App.tsx                 # Main popup component
│   │   ├── components/
│   │   │   ├── DataPreview.tsx     # Extracted data table preview
│   │   │   ├── ExportBar.tsx       # CSV/JSON/TSV copy/download buttons
│   │   │   ├── Settings.tsx        # API key input, model selection
│   │   │   └── History.tsx         # Recent extractions list
│   │   └── hooks/
│   │       ├── useExtraction.ts    # Extraction state management
│   │       └── useSettings.ts      # chrome.storage.local wrapper
│   ├── lib/
│   │   ├── api.ts                  # Anthropic Vision API wrapper
│   │   ├── parser.ts               # JSON/CSV/TSV/Markdown output parsing + formatting
│   │   ├── messages.ts             # Typed message definitions (union types)
│   │   ├── storage.ts              # chrome.storage.local typed wrapper
│   │   └── prompts.ts              # System prompts for table/chart extraction
│   └── types/
│       └── index.ts                # Shared type definitions
├── public/
│   └── icons/                      # Extension icons (16, 32, 48, 128)
├── tests/
│   ├── parser.test.ts              # CSV/JSON round-trip tests
│   ├── storage.test.ts             # Storage wrapper tests
│   └── fixtures/                   # Sample API responses for testing
├── vite.config.ts
├── tsconfig.json
├── tailwind.config.js
├── package.json
├── CLAUDE.md
└── IMPLEMENTATION-ROADMAP.md
```

### Data Model (chrome.storage.local)

```typescript
interface StorageSchema {
  // API configuration
  'settings.apiKey': string;
  'settings.model': 'claude-haiku-4-5-20251001' | 'claude-sonnet-4-5-20250514';
  'settings.defaultFormat': 'csv' | 'json' | 'tsv' | 'markdown';
  'settings.autoClipboard': boolean;

  // Extraction history (last 50)
  'history.extractions': ExtractionRecord[];

  // Usage tracking
  'usage.totalExtractions': number;
  'usage.tokensUsed': number;
}

interface ExtractionRecord {
  id: string;                    // crypto.randomUUID()
  timestamp: number;             // Date.now()
  url: string;                   // Page URL where extraction happened
  pageTitle: string;
  imageDataUrl: string;          // Cropped screenshot thumbnail (compressed, max 50KB)
  result: ExtractionResult;
  model: string;
  tokensUsed: number;
  durationMs: number;
}

interface ExtractionResult {
  headers: string[];
  rows: string[][];
  confidence: number;            // 0-1, reported by the model
  rawResponse: string;           // Raw API response for debugging
}
```

### Type Definitions

```typescript
// src/lib/messages.ts — Message passing types
type ExtensionMessage =
  | { type: 'START_SELECTION' }
  | { type: 'CANCEL_SELECTION' }
  | { type: 'REGION_SELECTED'; payload: SelectionRegion }
  | { type: 'EXTRACT_REQUEST'; payload: ExtractRequest }
  | { type: 'EXTRACT_PROGRESS'; payload: { stage: ExtractionStage } }
  | { type: 'EXTRACT_RESULT'; payload: ExtractionResult }
  | { type: 'EXTRACT_ERROR'; payload: { message: string; code: string } };

// src/types/index.ts
interface SelectionRegion {
  x: number;
  y: number;
  width: number;
  height: number;
  devicePixelRatio: number;
}

interface ExtractRequest {
  imageBase64: string;
  model: string;
  outputFormat: 'csv' | 'json';
}

type ExtractionStage =
  | 'capturing'
  | 'cropping'
  | 'extracting'
  | 'parsing'
  | 'complete';

type OutputFormat = 'csv' | 'json' | 'tsv' | 'markdown';
```

### API Contracts

#### External: Anthropic Vision API

- **Endpoint:** `POST https://api.anthropic.com/v1/messages`
- **Auth:** `x-api-key: <user_api_key>`, `anthropic-version: 2023-06-01`
- **Rate limits:** 60 RPM (Haiku), 40 RPM (Sonnet) on standard tier
- **Max image:** 20MB, recommended < 5MB for speed
- **Supported image formats:** JPEG, PNG, GIF, WebP
- **Token cost:** ~1,600 tokens per 1024×1024 image

**Table extraction request:**
```json
{
  "model": "claude-haiku-4-5-20251001",
  "max_tokens": 4096,
  "messages": [{
    "role": "user",
    "content": [
      {
        "type": "image",
        "source": { "type": "base64", "media_type": "image/png", "data": "<base64>" }
      },
      {
        "type": "text",
        "text": "Extract all tabular data from this screenshot. Return ONLY a JSON object: {\"headers\": [\"col1\", ...], \"rows\": [[\"val1\", ...], ...], \"confidence\": 0.95}. If this is a chart, extract data points as a table. No markdown, no explanation, JSON only."
      }
    ]
  }]
}
```

**Expected response:**
```json
{
  "content": [{
    "type": "text",
    "text": "{\"headers\":[\"Product\",\"Q1\",\"Q2\"],\"rows\":[[\"Widget A\",\"1200\",\"1450\"],[\"Widget B\",\"890\",\"920\"]],\"confidence\":0.92}"
  }],
  "usage": { "input_tokens": 1843, "output_tokens": 156 }
}
```

#### Internal: Message Passing

All internal communication uses `chrome.runtime.sendMessage` (one-shot) or `chrome.runtime.connect` (long-lived port for streaming progress updates).

```typescript
// Popup → Service Worker
chrome.runtime.sendMessage({ type: 'START_SELECTION' });

// Service Worker → Content Script (via tab messaging)
chrome.tabs.sendMessage(tabId, { type: 'START_SELECTION' });

// Content Script → Service Worker
chrome.runtime.sendMessage({ type: 'REGION_SELECTED', payload: region });

// Service Worker → Popup (via port for progress)
port.postMessage({ type: 'EXTRACT_PROGRESS', payload: { stage: 'extracting' } });
```

### Dependencies

```bash
# Initialize project
npm create vite@latest screenshot-to-dataselect -- --template react-ts
cd screenshot-to-dataselect

# Core dependencies
npm install @anthropic-ai/sdk react react-dom

# Dev dependencies
npm install -D @crxjs/vite-plugin@beta @types/chrome @types/react @types/react-dom
npm install -D tailwindcss postcss autoprefixer
npm install -D typescript @typescript-eslint/eslint-plugin
npm install -D vitest @testing-library/react

# Initialize Tailwind
npx tailwindcss init -p
```

---

## Scope Boundaries

### In Scope (MVP)
- Region selection via drag overlay on any webpage
- Screenshot capture + crop via offscreen document
- Claude Vision API extraction (Haiku default, Sonnet option)
- Export to CSV, JSON, TSV, Markdown
- Clipboard copy (one-click)
- File download
- Extraction history (last 50)
- API key management via popup settings
- Keyboard shortcut (Ctrl/Cmd+Shift+S)
- Right-click context menu
- Progress indicator during extraction
- Token usage tracking

### Out of Scope (v1)
- Backend server / proxy
- User accounts / auth
- Chrome Web Store publishing (manual load for v1)
- Scroll-and-stitch for tables taller than viewport
- Batch extraction (multiple tables at once)
- Google Sheets direct API integration (URL scheme only)
- PDF-specific extraction (works via screenshot, no PDF parsing)
- API key encryption with user passphrase
- Multi-language support

### Deferred (v2+)
- DOM-first hybrid extraction (try HTML parsing before vision)
- "Smart Detect" auto-highlighting of all tables on page
- Chart-specific extraction prompts (bar, line, pie, scatter)
- Google Sheets API direct push
- Scroll-and-stitch capture for large tables
- API key encryption
- Export to Notion, Airtable
- Chrome Web Store listing with proper privacy policy

---

## Security & Credentials

- **API key storage:** `chrome.storage.local` — only sent to `api.anthropic.com` over HTTPS
- **CSP:** `"content_security_policy": { "extension_pages": "script-src 'self'; object-src 'self'; connect-src https://api.anthropic.com" }`
- **Permissions (minimal):** `activeTab`, `scripting`, `offscreenDocument`, `storage`, `contextMenus`
- **No `<all_urls>`** — `activeTab` grants temporary access only when user activates extension
- **No remote code** — all JS bundled in extension package per MV3
- **Data boundaries:** Screenshot images sent to Anthropic API only. Subject to Anthropic's data retention policy (30-day default, opt-out available via API headers). No other data leaves the browser.
- **Sensitive data warning:** Add note in settings that screenshots may contain sensitive data visible on screen. User's responsibility to verify before sending to API.

---

## Phased Implementation

### Phase 0: Foundation (Week 1, Days 1-3)

**Objectives:** Scaffolded MV3 extension that loads in Chrome, typed message passing works end-to-end, API key can be saved and retrieved.

**Tasks:**

1. **Initialize Vite + CRXJS project with TypeScript**
   - Create project with `npm create vite@latest`, add CRXJS plugin
   - Configure `vite.config.ts` with CRXJS MV3 settings
   - **Acceptance:** `npm run dev` builds, `chrome://extensions` loads unpacked without errors

2. **Create typed manifest (`src/manifest.ts`)**
   - Permissions: `activeTab`, `scripting`, `offscreenDocument`, `storage`, `contextMenus`
   - Background: service worker at `src/background/service-worker.ts`
   - Content scripts: `src/content/overlay.ts` + `overlay.css`
   - Popup: `src/popup/index.html`
   - Commands: keyboard shortcut `Ctrl+Shift+S` / `Cmd+Shift+S`
   - **Acceptance:** Extension shows icon in toolbar, popup opens, all permissions granted

3. **Implement typed storage wrapper (`src/lib/storage.ts`)**
   - Generic get/set/remove with StorageSchema type enforcement
   - Async wrappers around `chrome.storage.local`
   - **Acceptance:** `setApiKey("sk-ant-...")` persists across browser restart, `getApiKey()` retrieves it

4. **Build service worker message router (`src/background/service-worker.ts`)**
   - `chrome.runtime.onMessage` listener with switch on `message.type`
   - `chrome.runtime.onConnect` for long-lived port (progress updates)
   - Tab-specific message forwarding to content scripts
   - **Acceptance:** Console logs show messages routing between popup → service worker → content script

5. **Create Settings component in popup**
   - API key input (password field, show/hide toggle)
   - Model selector (Haiku/Sonnet radio buttons)
   - Default format selector
   - Auto-clipboard toggle
   - Save button with confirmation toast
   - **Acceptance:** Enter API key → select model → save → refresh browser → settings persist

**Phase Verification Checklist:**
- [ ] `npm run build` produces `dist/` with valid `manifest.json`
- [ ] Load unpacked in Chrome → icon in toolbar → popup opens with settings
- [ ] Enter API key → refresh browser → key persists in settings
- [ ] Service worker logs visible in `chrome://extensions` → Inspect service worker
- [ ] Send test message from popup → service worker logs receipt → replies
- [ ] Content script placeholder injects when triggered (console.log in tab)

**Risks:** CRXJS beta may have breaking issues with Vite 6. **Mitigation:** Pin `@crxjs/vite-plugin@2.0.0-beta.25` (last stable beta). **Fallback:** Use manual Vite config with `rollup-plugin-chrome-extension`.

---

### Phase 1: Core Extraction Loop (Week 1, Days 3-7)

**Objectives:** End-to-end flow: select region on page → screenshot → crop → Vision API → see extracted data in popup. The "magic moment."

**Tasks:**

1. **Build selection overlay (`src/content/overlay.ts` + `overlay.css`)**
   - Full-viewport transparent div (`position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; z-index: 2147483647`)
   - Crosshair cursor
   - Mouse drag creates visible selection rectangle with dashed border
   - Live dimension display (px) on rectangle
   - ESC key or right-click cancels selection
   - On mouseup, calculate region coords accounting for `window.devicePixelRatio`
   - Send `REGION_SELECTED` message with coords to service worker
   - Remove overlay from DOM
   - **Acceptance:** User draws rectangle on Wikipedia table → coordinates logged correctly. Test on 3 sites: Wikipedia, GitHub (issues table), Google Finance.

2. **Implement screenshot capture in service worker**
   - `chrome.tabs.captureVisibleTab(null, { format: 'png' })` → data URL
   - Handle errors: permission denied, tab not accessible
   - **Acceptance:** Full-page screenshot captured, dimensions = viewport × devicePixelRatio

3. **Create offscreen document for canvas crop (`src/offscreen/`)**
   - `chrome.offscreen.createDocument({ url: 'offscreen.html', reasons: ['CANVAS'], justification: 'Crop screenshot to selection region' })`
   - Offscreen script: receive image data URL + crop coords → draw on canvas → export cropped PNG as data URL
   - Account for devicePixelRatio in crop coordinates
   - Close offscreen document after crop complete
   - **Acceptance:** Given full screenshot + region {x:100, y:200, w:400, h:300} at 2x DPR → correctly cropped 800×600 actual pixel image

4. **Build Anthropic Vision API wrapper (`src/lib/api.ts`)**
   - Accept base64 PNG + model name + API key
   - Construct messages payload with image + extraction prompt from `prompts.ts`
   - Call `anthropic.messages.create()` via SDK
   - Parse response: extract JSON from `content[0].text`
   - Handle errors: 401 (bad key), 429 (rate limit), 400 (bad request), 500 (server error)
   - Return typed `ExtractionResult` or throw typed error
   - **Acceptance:** Send screenshot of HTML table → receive valid JSON with correct headers/rows

5. **Build extraction prompt (`src/lib/prompts.ts`)**
   ```
   Extract all tabular data from this screenshot.

   Rules:
   - Return ONLY a JSON object, no markdown, no explanation
   - Structure: {"headers": ["col1", "col2"], "rows": [["val1", "val2"]], "confidence": 0.95}
   - If the image contains a chart (bar, line, pie), extract the underlying data points as a table
   - If multiple tables are visible, extract the largest/most prominent one
   - Confidence should reflect your certainty about the extraction accuracy (0.0-1.0)
   - Preserve original number formatting (commas, decimals, currency symbols)
   - If a cell is empty, use an empty string ""
   ```
   - **Acceptance:** Prompt produces consistent JSON output across 5 different table types

6. **Wire the full extraction loop**
   - Popup "Select Region" button → service worker → inject overlay → user selects → capture → crop → API → parse → display
   - Use `chrome.runtime.connect` port for progress updates
   - Progress stages: capturing → cropping → extracting → parsing → complete
   - **Acceptance:** End-to-end extraction on Wikipedia GDP table → correct data in popup

7. **Add progress indicator in popup**
   - Animated progress bar with stage labels
   - Timer showing elapsed seconds
   - Cancel button (aborts API call)
   - **Acceptance:** User sees smooth progression through stages, timer accurate to ±1s

**Phase Verification Checklist:**
- [ ] Select region on `https://en.wikipedia.org/wiki/List_of_countries_by_GDP_(nominal)` → CSV matches table data
- [ ] Select region on a `<canvas>` Chart.js demo → extracted data points returned
- [ ] Progress indicator shows each stage with timing
- [ ] Invalid API key shows clear 401 error message in popup
- [ ] Rate limit (429) shows "Rate limited — try again in X seconds"
- [ ] Selection overlay does NOT break page scroll, links, or click events after dismissal
- [ ] ESC key cancels selection cleanly (overlay removed, no residual event listeners)
- [ ] Works on page with Retina display (2x DPR) — crop coordinates correct

**Risks:**
- `captureVisibleTab` captures visible viewport only. Tables taller than viewport won't fully capture. **Mitigation:** v1 constrains selection to visible viewport. Clear UX: dim areas outside viewport. Scroll-capture deferred to v2.
- Service worker may terminate during long API call (>30s). **Mitigation:** Use `chrome.runtime.connect` port — keeps service worker alive while port is open. Add `chrome.alarms.create` as backup keepalive.

---

### Phase 2: Export & UX Polish (Week 2, Days 1-4)

**Objectives:** Multiple export formats, clipboard integration, extraction history, refined popup UI.

**Tasks:**

1. **Build parser module (`src/lib/parser.ts`)**
   - `toCSV(result: ExtractionResult): string` — proper CSV with quoting, comma escaping
   - `toJSON(result: ExtractionResult): string` — pretty-printed JSON array of objects (headers as keys)
   - `toTSV(result: ExtractionResult): string` — tab-separated
   - `toMarkdown(result: ExtractionResult): string` — GitHub-flavored markdown table
   - **Acceptance:** Each format round-trips correctly. CSV paste into Google Sheets produces correct cells.

2. **Create DataPreview component (`src/popup/components/DataPreview.tsx`)**
   - Rendered HTML table showing extracted data
   - Alternating row colors, header row styling
   - Horizontal scroll for wide tables
   - Row/column count display
   - Confidence badge (green ≥0.9, yellow ≥0.7, red <0.7)
   - **Acceptance:** 20-column table renders cleanly with scroll, confidence badge visible

3. **Build ExportBar component (`src/popup/components/ExportBar.tsx`)**
   - One-click copy buttons: CSV, JSON, TSV, Markdown
   - Download button (saves as file with timestamp filename)
   - "Copied!" toast animation on copy
   - **Acceptance:** Each button copies correct format to clipboard. Download produces valid file.

4. **Implement extraction history (`src/popup/components/History.tsx`)**
   - Store last 50 extractions in `chrome.storage.local`
   - List view: timestamp, page URL (truncated), row count, small thumbnail
   - Click entry → re-display result in DataPreview + ExportBar
   - Clear history button with confirmation
   - Auto-purge: when >50 entries, remove oldest
   - Compress thumbnails to ≤50KB (resize to max 200px wide)
   - **Acceptance:** Extract 3 tables → all 3 appear in history → click each → data re-displays correctly

5. **Add keyboard shortcut**
   - Register `Ctrl+Shift+S` (Mac: `Cmd+Shift+S`) in manifest commands
   - Service worker listens for `chrome.commands.onCommand`
   - Triggers selection overlay directly without opening popup
   - **Acceptance:** Shortcut works on 3 different sites without opening popup first

6. **Add right-click context menu**
   - `chrome.contextMenus.create({ title: "Extract table from this area", contexts: ["page"] })`
   - Click triggers selection mode
   - **Acceptance:** Right-click on any page shows menu item, triggers selection overlay

**Phase Verification Checklist:**
- [ ] Copy CSV → paste into Google Sheets → data in correct cells with no formatting issues
- [ ] Copy JSON → paste into VS Code → valid JSON, parseable
- [ ] Download CSV → open in Excel → correct columns/rows
- [ ] History shows 3 extractions after 3 uses → click each → data loads
- [ ] History persists across browser restart
- [ ] Keyboard shortcut triggers selection on active tab
- [ ] Context menu appears and triggers selection
- [ ] Popup renders in <200ms (no flash of unstyled content)
- [ ] Total storage usage stays under 5MB with 50 history entries

**Risks:** `chrome.storage.local` 10MB limit with screenshot thumbnails. **Mitigation:** Compress thumbnails to ≤50KB, purge beyond 50 entries, store only cropped region not full page.

---

### Phase 3: Smart Features & Edge Cases (Week 2 Day 4 — Week 3)

**Objectives:** DOM-first hybrid extraction, chart data support, auto-detect tables, error recovery, final polish.

**Tasks:**

1. **DOM-first extraction fallback**
   - Before calling Vision API, content script checks if selection region contains `<table>` elements
   - If found, extract headers/rows from DOM directly → instant result, no API call
   - Show "Extracted from HTML (instant)" vs "Extracted with AI" label
   - Always offer "Re-extract with AI" button to override DOM extraction
   - **Acceptance:** Standard HTML table extracts in <100ms without API call (verify no network request)

2. **"Smart Detect" mode**
   - User clicks extension icon → option to "Detect all tables"
   - Content script scans page for `<table>`, common div-table patterns, `<canvas>`, `<svg>` chart elements
   - Highlights each with a numbered blue outline badge
   - Click a number → auto-select that region → extract
   - ESC dismisses all highlights
   - **Acceptance:** Wikipedia country comparison page → 3+ tables highlighted with numbers

3. **Chart-specific extraction prompt**
   - Detect if screenshot looks like a chart (user can toggle "Chart mode")
   - Specialized prompt: "Extract the data points from this chart. Include axis labels, legend entries, and all visible values."
   - Return format: `{ "chartType": "bar", "xAxis": "Quarter", "yAxis": "Revenue ($M)", "series": [{ "name": "Product A", "values": [...] }] }`
   - Convert to table format for export
   - **Acceptance:** Screenshot of a Recharts bar chart → correct data points extracted

4. **Google Sheets URL integration**
   - "Open in Google Sheets" button in ExportBar
   - Construct URL: `https://docs.google.com/spreadsheets/d/create?title=DataSelect+Export` + populate via Sheets URL API
   - Alternative: copy TSV to clipboard + open blank Sheet (user pastes)
   - **Acceptance:** Click button → new Google Sheets tab opens → paste → correct data

5. **Edge case handling**
   - Fixed/sticky headers: detect and account for in selection coordinates
   - iFrames: use `allFrames: true` in `chrome.scripting.executeScript` for overlay injection
   - Dark mode pages: ensure overlay contrast works on dark backgrounds
   - Very large tables (>100 rows visible): warn about API token cost before extraction
   - **Acceptance:** Extension works on Bloomberg terminal, Notion tables, Airtable views, GitHub issues

6. **Token usage display**
   - After each extraction, show "~2,100 tokens used (~$0.001)"
   - Cumulative usage in settings: "Total: 45,000 tokens (~$0.05)"
   - Calculate from `usage.input_tokens + usage.output_tokens` in API response
   - Use Anthropic pricing: Haiku input $0.25/MTok, output $1.25/MTok; Sonnet input $3/MTok, output $15/MTok
   - **Acceptance:** Token count matches Anthropic dashboard within 5%

**Phase Verification Checklist:**
- [ ] HTML `<table>` on simple page extracts via DOM — no network request in DevTools
- [ ] DOM extraction shows "Extracted from HTML (instant)" label
- [ ] "Re-extract with AI" button works after DOM extraction
- [ ] Smart Detect highlights ≥3 tables on Wikipedia country comparison page
- [ ] Chart extraction works on Chart.js sample page
- [ ] Google Sheets button opens new sheet with data
- [ ] Extension works on: Bloomberg, Notion, GitHub issues, Google Finance, Airtable
- [ ] Token usage display accurate within 5% vs Anthropic dashboard
- [ ] 100-row table shows cost warning before extraction
- [ ] Extension handles iframe-embedded tables (e.g., embedded dashboards)

**Risks:** DOM-first extraction may disagree with vision extraction on the same table, confusing users. **Mitigation:** DOM extraction labeled as "Quick Extract (HTML)" — clearly different from "AI Extract." Always allow re-extraction with AI. If DOM extraction finds 0 rows, skip straight to AI.

---

## Testing Strategy

### Phase 0
- **Manual:** Load extension, verify popup renders, service worker lifecycle in DevTools
- **Automated:** Unit tests for `storage.ts` typed wrapper (vitest), message type guards

### Phase 1
- **Manual:** Selection overlay on 5 sites (Wikipedia, GitHub, Bloomberg, Google Finance, Notion). Verify coordinates, screenshot crop accuracy, API response parsing
- **Automated:** Unit tests for `parser.ts` (round-trips), `api.ts` (mock responses), `prompts.ts` (response shape validation)
- **Integration:** End-to-end extraction on 3 known table pages, compare output against manually verified ground truth CSV files

### Phase 2
- **Manual:** Clipboard paste into Google Sheets, Excel Online, VS Code. History persistence across sessions. Keyboard shortcut and context menu on 3 sites
- **Automated:** Export format unit tests, storage quota tracking, history CRUD operations

### Phase 3
- **Manual:** Edge case testing on 10 target sites. DOM vs vision comparison. Chart extraction accuracy
- **Automated:** DOM extraction unit tests against known HTML table structures, token cost calculation tests

### Test Sites (Reference)
1. `https://en.wikipedia.org/wiki/List_of_countries_by_GDP_(nominal)` — complex HTML table
2. `https://github.com/facebook/react/issues` — div-based table layout
3. `https://www.chartjs.org/docs/latest/samples/bar/vertical.html` — canvas chart
4. `https://www.google.com/finance/quote/AAPL:NASDAQ` — financial data table
5. `https://notion.so` (any table page) — Notion's custom table implementation

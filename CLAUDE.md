# Screenshot to DataSelect

A Chrome Extension (Manifest V3) that lets users select any visible table or chart on a webpage, captures a screenshot of the region, sends it to Anthropic Claude Vision API for structured data extraction, and returns CSV/JSON/TSV/Markdown. Works on any visual content — HTML tables, canvas charts, images, PDFs in browser — with DOM-first extraction as the primary strategy and Vision API as fallback/confirmation. Includes extraction history, cost display, and context menu access.

## Tech Stack
- **TypeScript 5.5+** — all source files
- **Vite 6.x + @crxjs/vite-plugin 2.x (beta)** — build system with Chrome extension HMR
- **React 18.3+** — popup UI and history view
- **Tailwind CSS 3.4+** — popup styling
- **@anthropic-ai/sdk 0.80+** — Vision API calls
- **Chrome MV3 APIs** — tabs, scripting, storage, offscreenDocument
- **Vanilla JS** — content script overlay (no React in content scripts)

## Status
Phase 3 complete — all planned phases shipped:
- Phase 0: MV3 scaffold, typed messaging system, settings UI
- Phase 1: Core extraction loop — select region, capture, crop, Vision API call, display results
- Phase 2: Export formats (CSV/JSON/TSV/Markdown), history UI, context menu, 3-view navigation
- Phase 3: DOM-first extraction strategy, chart-specific prompts, cost display, edge case handling, thumbnail compression for history

## Build & Run
```bash
npm install
npm run build      # production build → dist/
npm run dev        # development build with HMR
```

Load the `dist/` directory as an unpacked extension in `chrome://extensions`. API key configured in extension settings (stored in `chrome.storage.local`).

## Architecture
- `src/background/` — message routing hub; all API calls and storage ops go here
- `src/content/` — vanilla JS overlay for region selection (no React — avoids host page conflicts)
- `src/popup/` — React UI: extraction view, history view, settings view (3-view navigation)
- `src/lib/messages.ts` — typed `ExtensionMessage` union discriminants for all IPC
- `src/content/dom-extractor.ts` — DOM-first extraction logic; Vision API (`src/lib/api.ts`) as fallback
- Offscreen document handles canvas operations (screenshot cropping, thumbnail compression)
- API key stored only in `chrome.storage.local`, only sent to `api.anthropic.com`
- History capped at 50 entries with thumbnail compression to stay within storage limits

## Known Issues
- `@crxjs/vite-plugin` 2.x is beta — occasional HMR quirks in development
- DOM-first extraction quality varies by site structure; Vision API fallback adds latency and cost
- Cost display is estimated based on token counts; actual Anthropic billing may differ slightly

<!-- portfolio-context:start -->
# Portfolio Context

## What This Project Is

ScreenshottoDataSelect is a Chrome MV3 extension for selecting a screen or page region, extracting structured table/chart/text data from the capture, and exporting the result in analyst-friendly formats. It combines DOM-first extraction with an Anthropic Vision fallback so users can turn screenshots or rendered page fragments into CSV, JSON, TSV, or Markdown.

## Current State

Phase 3 complete — all planned phases shipped:
- Phase 0: MV3 scaffold, typed messaging system, settings UI
- Phase 1: Core extraction loop — select region, capture, crop, Vision API call, display results
- Phase 2: Export formats (CSV/JSON/TSV/Markdown), history UI, context menu, 3-view navigation
- Phase 3: DOM-first extraction strategy, chart-specific prompts, cost display, edge case handling, thumbnail compression for history

## Stack

- **TypeScript 5.5+** — all source files
- **Vite 6.x + @crxjs/vite-plugin 2.x (beta)** — build system with Chrome extension HMR
- **React 18.3+** — popup UI and history view
- **Tailwind CSS 3.4+** — popup styling
- **@anthropic-ai/sdk 0.80+** — Vision API calls
- **Chrome MV3 APIs** — tabs, scripting, storage, offscreenDocument
- **Vanilla JS** — content script overlay (no React in content scripts)

## How To Run

```bash
npm install
npm run build      # production build → dist/
npm run dev        # development build with HMR
```

Load the `dist/` directory as an unpacked extension in `chrome://extensions`. API key configured in extension settings (stored in `chrome.storage.local`).

## Known Risks

- `@crxjs/vite-plugin` 2.x is beta — occasional HMR quirks in development
- DOM-first extraction quality varies by site structure; Vision API fallback adds latency and cost
- Cost display is estimated based on token counts; actual Anthropic billing may differ slightly

## Next Recommended Move

Use this context plus the README and supporting docs to resume the next active task, then promote the repo beyond minimum-viable by capturing a dedicated handoff, roadmap, or discovery artifact.

<!-- portfolio-context:end -->

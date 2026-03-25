# Screenshot to DataSelect

Chrome extension (Manifest V3) that lets users select any visible table or chart on a webpage, captures a screenshot of the region, sends it to Anthropic Claude Vision API for structured data extraction, and returns CSV/JSON/TSV/Markdown. Works on any visual content — HTML tables, canvas charts, images, PDFs in browser — unlike DOM-only extractors.

## Tech Stack

- **TypeScript 5.5+** — all source files
- **Vite 6.x + @crxjs/vite-plugin 2.x (beta)** — build system with Chrome extension HMR
- **React 18.3+** — popup UI only
- **Tailwind CSS 3.4+** — popup styling
- **@anthropic-ai/sdk 0.52+** — Vision API calls
- **Chrome MV3 APIs** — tabs, scripting, storage, offscreenDocument
- **Vanilla JS** — content script overlay (no React in content scripts)

## Development Conventions

- All message passing uses typed union discriminants (`ExtensionMessage` in `src/lib/messages.ts`)
- Service worker is the single routing hub — content scripts and popup never talk directly
- Content script overlay is vanilla JS/CSS — no framework injection into host pages
- API key stored in `chrome.storage.local`, only sent to `api.anthropic.com`
- Offscreen document handles canvas operations (screenshot cropping)
- All async Chrome API calls wrapped in try/catch with typed error handling

## Current Phase

Phase 0: Foundation — See IMPLEMENTATION-ROADMAP.md for full plan.

## Key Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Build system | Vite + CRXJS | MV3-aware HMR, manifest generation |
| Content script UI | Vanilla JS | Avoid React conflicts with host page |
| Vision model default | Haiku 4.5 | Speed for simple tables (~3s) |
| API architecture | Direct client→API | No backend server, user's own key |
| Storage | chrome.storage.local | Sufficient for settings + 50 history entries |
| Screenshot method | captureVisibleTab + offscreen crop | MV3-compliant, handles devicePixelRatio |

## Do NOT

- Do not inject React or any framework into content scripts — vanilla JS only for overlay
- Do not use `chrome.tabs.executeScript` (MV2) — use `chrome.scripting.executeScript` (MV3)
- Do not store API keys in source code, env files, or anywhere except chrome.storage.local
- Do not use `<all_urls>` host permission — use `activeTab` for minimal permissions
- Do not add features not in the current phase of IMPLEMENTATION-ROADMAP.md
- Do not use `eval()` or remote code execution — violates MV3 CSP
- Do not call Anthropic API from content scripts — all API calls go through service worker

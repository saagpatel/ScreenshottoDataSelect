# DataSelect

![Version](https://img.shields.io/badge/version-1.0.0-blue?style=flat-square)
![TypeScript](https://img.shields.io/badge/TypeScript-5.5-3178C6?style=flat-square&logo=typescript&logoColor=white)
![React](https://img.shields.io/badge/React-18.3-61DAFB?style=flat-square&logo=react&logoColor=black)
![License](https://img.shields.io/badge/license-MIT-green?style=flat-square)
![Build](https://img.shields.io/badge/build-Vite-646CFF?style=flat-square&logo=vite&logoColor=white)

A Chrome extension that lets you draw a selection box over any table or chart on a webpage and instantly extract the underlying data as CSV, JSON, TSV, or Markdown. It tries DOM extraction first for native HTML tables — no API tokens consumed — and falls back to Claude Vision (Anthropic API) for rendered charts, canvas elements, or non-semantic tables.

## Screenshot

> _Add a screenshot of the extension popup here_

## How It Works

1. Click the extension icon or press `Ctrl+Shift+S`
2. Draw a rectangle over a table or chart on the page
3. DataSelect captures the selection and first attempts to read the data directly from the DOM
4. If the DOM approach finds no table, the cropped screenshot is sent to the Claude Vision API for AI-powered extraction
5. Results appear in the popup — copy to clipboard or download in your preferred format

Extraction history is stored locally (up to 50 records), and a usage counter tracks total API tokens consumed.

## Tech Stack

| Layer | Technology |
|---|---|
| Extension framework | Chrome MV3 + `@crxjs/vite-plugin` |
| UI | React 18 + Tailwind CSS |
| Build | Vite 6 + TypeScript 5.5 |
| AI extraction | Anthropic Claude Vision (`@anthropic-ai/sdk`) |
| Tests | Vitest + Testing Library |

## Prerequisites

- Google Chrome (or any Chromium-based browser)
- Node.js 18+
- An [Anthropic API key](https://console.anthropic.com/) (only required for chart/vision extraction)

## Getting Started

```bash
# Install dependencies
npm install

# Development build with hot-reload
npm run dev

# Production build
npm run build
```

Then load the extension in Chrome:

1. Navigate to `chrome://extensions`
2. Enable **Developer mode** (top-right toggle)
3. Click **Load unpacked** and select the `dist/` folder
4. Open the extension popup and paste your Anthropic API key under **Settings**

## Project Structure

```
src/
├── background/
│   └── service-worker.ts   # MV3 service worker — orchestrates the extraction pipeline
├── content/
│   ├── overlay.ts           # Injected selection UI (draws the drag-to-select overlay)
│   ├── dom-extractor.ts     # Reads data directly from HTML <table> elements
│   └── overlay.css
├── offscreen/               # Offscreen document for canvas-based screenshot cropping
├── popup/
│   ├── App.tsx              # Root component — main / history / settings views
│   ├── components/          # DataPreview, ExtractionProgress, History, Settings
│   └── hooks/               # useExtraction, useSettings
├── lib/                     # API client, storage helpers, message type guards
└── types/
    └── index.ts             # Shared TypeScript types for the whole extension
manifest.ts                  # Chrome extension manifest (typed)
```

## Supported Models

| Model | Use case |
|---|---|
| `claude-haiku-4-5` | Fast, low-cost — good for simple tables |
| `claude-sonnet-4-5` | Higher accuracy for complex charts and mixed layouts |

## Output Formats

`CSV` · `JSON` · `TSV` · `Markdown table`

The default format and auto-copy-to-clipboard behaviour are configurable in Settings.

## Development

```bash
# Type-check only
npm run typecheck

# Run tests
npm test

# Watch mode
npm run test:watch
```

## License

MIT — see [LICENSE](LICENSE) for details.

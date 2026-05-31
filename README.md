# DataSelect

[![TypeScript](https://img.shields.io/badge/TypeScript-3178c6?style=flat-square&logo=typescript)](#) [![License](https://img.shields.io/badge/license-MIT-blue?style=flat-square)](#)

> Draw a box, get your data — no copy-paste archaeology required

DataSelect is a Chrome extension that lets you draw a selection rectangle over any table or chart on a webpage and instantly extract the underlying data as CSV, JSON, TSV, or Markdown. DOM extraction runs first with no API cost; Claude Vision handles rendered charts, canvas elements, and non-semantic tables as a fallback.

## Features

- **DOM-first extraction** — reads native HTML tables directly, consuming zero API tokens
- **Claude Vision fallback** — sends a cropped screenshot to the Anthropic API for charts, canvases, and image-based tables
- **Four export formats** — copy or download as CSV, JSON, TSV, or Markdown
- **Extraction history** — stores the last 50 extractions locally with a searchable log
- **Usage tracking** — running API token counter so you stay aware of costs
- **Keyboard shortcut** — trigger the selection tool with `Ctrl+Shift+S` without opening the popup

## Quick Start

### Prerequisites
- Node.js 18+
- Anthropic API key (only needed for chart/canvas extraction)

### Installation
```bash
npm install
npm run build
```
Then load the `dist/` folder as an unpacked extension in `chrome://extensions`.

### Usage
```bash
# Development with hot reload
npm run dev

# Type-check without building
npm run typecheck
```

## Tech Stack

| Layer | Technology |
|-------|------------|
| Language | TypeScript 5.5 |
| UI | React 18.3 |
| Bundler | Vite |
| Styling | Tailwind CSS |
| AI | Anthropic Claude Vision API |

## Architecture

A content script injects the selection overlay. When a region is confirmed, the background service worker captures the screenshot and crops it via an offscreen document. The service worker then asks the content script to attempt DOM extraction on the region. If no table is found, the service worker sends the cropped image to the Anthropic Vision API. Results are posted back to the popup via Chrome messaging, where the user picks a format and copies or downloads the data.

## License

MIT
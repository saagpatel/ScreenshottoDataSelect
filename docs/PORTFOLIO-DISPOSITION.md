# ScreenshottoDataSelect — Portfolio Disposition

**Status:** Release Frozen (Chrome Web Store, pre-publish) — Chrome
Manifest V3 + React 18 + Vite + TypeScript 5 + Tailwind extension on
`origin/main` at **v1.0.0** in `package.json`, with phases 0-3
shipped (scaffold + typed messaging + settings UI / core extraction
loop with Claude Vision API / export formats + history UI + context
menu + 3-view navigation / DOM-first extraction + chart prompts +
cost display + edge cases). Tooling: `@crxjs/vite-plugin` for MV3
bundling, `vitest` for tests, `@anthropic-ai/sdk` for Vision API
integration. Full OSS scaffolding wave on canonical main. **Second
member of the Chrome MV3 extension cluster** that PageDiffBookmark
founded — and the **first React + AI-API-dependent Chrome MV3 sub-
shape**, distinct from PageDiffBookmark's vanilla local-only shape.

> Disposition uses strict `origin/main` verification.
> **Introduces the React + AI-API-dependent sub-shape inside the
> Chrome MV3 cluster.**

---

## Verification posture

This repo has **only `origin`** (`saagpatel/ScreenshottoDataSelect`)
— no `legacy-origin` remote. Clean migration state. Local clone's
`main` is tracking `origin/main` correctly.

Specifically verified on `origin/main`:

- Tip: `2dc497c` docs: update CLAUDE.md to reflect current project
  state
- **Substantive feat commits** on `origin/main`:
  - `136cb33` fix: wire onReExtract prop, add thumbnail compression
    for history
  - `4ce7042` feat(phase3): DOM-first extraction, chart prompts, cost
    display, edge cases
  - `8e0624c` feat(phase2): export formats, history UI, context menu,
    3-view navigation
  - `57def4a` feat(phase1): core extraction loop — select, capture,
    crop, Vision API, display
  - `de29d77` feat(phase0): scaffold MV3 extension with typed
    messaging and settings UI
  - `71f8cfb` docs: add project identity and implementation roadmap
- **OSS scaffolding cadence** on canonical main: MIT license, README
  docs, security policy, contributing, Dependabot, Makefile, .env
  example, CoC, issue templates, PR template, CHANGELOG
- `package.json` version: **1.0.0**
- `package.json` describes itself as: "Chrome extension: screenshot
  any table or chart, extract structured data with Claude Vision"
- Default branch: `main`

---

## Current state in one paragraph

ScreenshottoDataSelect is a Chrome MV3 extension that lets the user
screenshot a table or chart on any web page and extract structured
data (CSV / TSV / markdown / JSON) using Claude Vision. Phase 1
shipped the core loop (select region → capture → crop → send to
Vision API → display structured output). Phase 2 added export
formats, history UI, context menu, and 3-view navigation. Phase 3
added DOM-first extraction (try semantic HTML before falling back to
Vision), chart-specific prompts, **cost display** in the UI, and
edge-case handling. Built with React 18 + Vite + Tailwind +
TypeScript 5; tested with vitest; bundled via `@crxjs/vite-plugin`.
Per memory: Phase 3 complete. The current state is v1.0.0 in
`package.json` with full OSS scaffolding — pre-publish on Chrome
Web Store; the polish commits suggest the operator is mid-final-
cleanup before submission.

For full detail see `README.md` on `origin/main`.

---

## Why "Release Frozen (Chrome Web Store, pre-publish)" — second cluster member

The Chrome MV3 cluster pattern from PageDiffBookmark (R12.3) holds.
ScreenshottoDataSelect adds new dimensions:

| Signal | PageDiffBookmark | **ScreenshottoDataSelect** |
|---|---|---|
| MV3 manifest | ✓ | ✓ |
| OSS scaffolding wave | ✓ | ✓ |
| Distribution channel | Chrome Web Store | Chrome Web Store |
| UI tech | Vanilla HTML/CSS/JS | **React 18 + Vite + Tailwind** |
| Build tooling | None (vanilla) | **@crxjs/vite-plugin** |
| AI dependency | None | **Anthropic Claude Vision** |
| API key handling | None | **User-supplied or operator-proxy** |
| Data persistence | `chrome.storage.local` | **`chrome.storage.local`** (history + thumbnails) |
| Background work | Service worker (polling) | Service worker (extraction request handling) |
| Cost UX visibility | n/a | **Cost display in UI** (Phase 3 feat) |

The new columns (React + Vite + crxjs / AI API dependency / API key
handling / cost UX) define a real sub-shape: **React + AI-API-
dependent Chrome MV3 extensions**. Future Chrome extensions that
add an AI API dependency (translation, summarization, image
analysis, etc.) batch here.

---

## Cluster taxonomy update

| Cluster | Count | Sub-shapes |
|---|---|---|
| Signing (Apple desktop) | 23 | (no sub-shapes) |
| iOS App Store | 5 | local-first (4) / cloud-backed (1) |
| Static-host (web) | 3 | PWA / static SPA / SSR+Supabase |
| Self-hosted service | 1 | (n/a) |
| PyPI distribution | 2 | Release Frozen / Active |
| Local-first pipeline | 1 | (n/a) |
| Operator-tool / dogfood | 1 | (n/a) |
| **Chrome MV3 extension** | **2** | **vanilla/local-only (1) / React + AI-API (1)** |

Chrome MV3 cluster reaches 2 members with sub-shape structure.
Mirroring the iOS App Store cluster's local-first / cloud-backed
split: vanilla/local-only / API-dependent. Future cluster member
TabTriage (per memory) needs triage to determine its sub-shape.

---

## Unblock trigger (operator)

When ready to ship publicly:

1. **API key delivery model — primary product decision.** Three
   options:
   - **User-supplied (BYOK)**: user pastes their own Anthropic key
     into extension settings. Simplest; zero operator cost; users
     pay Anthropic directly. Risk: friction for non-technical
     users.
   - **Operator-managed proxy**: extension calls operator's
     proxy endpoint which holds the Anthropic key. Operator pays
     for usage; users pay operator (or it's free). Required if
     selling on Chrome Web Store as a paid extension.
   - **Hybrid**: free tier through operator proxy with rate limits;
     paid tier unlocks BYOK with no proxy markup.
   The operator should decide this before submission — it affects
   Chrome Web Store privacy disclosures.
2. **Permission minimization.** Likely requested permissions:
   `storage`, `notifications` (Phase 1 likely), host permissions
   for content script injection, `contextMenus`. Audit before
   submission — Chrome Web Store reviewers reject over-broad
   `<all_urls>` if `activeTab` suffices.
3. **Privacy nutrition disclosures** — extension sends user-
   selected screenshots to a third-party API (Anthropic).
   Disclose this clearly in Chrome Web Store listing and
   in-extension UI. Some users will want to know:
   - Does Anthropic train on user data? (Default: no for API users;
     verify current ToS.)
   - Are screenshots stored server-side? (Anthropic policy:
     processing only, not stored long-term beyond standard
     retention.)
   - Can the user disable history / thumbnail storage locally?
4. **Cost UX** (Phase 3 added this) — verify the displayed cost
   matches actual API spend per request, especially after
   Anthropic pricing rotations.
5. **DOM-first extraction (Phase 3)** — pre-empts unnecessary API
   calls when HTML is already structured. Verify the fallback
   logic is correct and the user understands when Vision is
   actually called.
6. **Chrome MV3 service worker lifecycle** — extraction requests
   may take 5-30 seconds for chart understanding. Verify the
   service worker doesn't terminate mid-request; use
   `chrome.runtime.connect` for long-lived ports if needed.
7. **Chrome Web Store developer account + asset preparation**
   (per `PageDiffBookmark` disposition).
8. **Permission justification** for each manifest permission.
9. **Submit for Chrome Web Store Review.**

Estimated operator time once API key delivery model + assets exist:
~5-6 hours (API key delivery decision is the dominant cost; assets
+ submission are mechanical).

---

## Portfolio operating system instructions

| Aspect | Posture |
|---|---|
| Portfolio status | `Release Frozen (Chrome Web Store, pre-publish)` |
| Distribution channel | **Chrome Web Store** |
| Current version | **1.0.0** in `package.json` |
| Review cadence | Suspend overdue counting |
| Resurface conditions | (a) API key delivery model decided, (b) submission to Chrome Web Store, (c) Anthropic Vision API pricing rotation breaks cost display, (d) Chrome MV3 host permission tightening, (e) v1.1 scope (more chart types, cross-browser) |
| Co-batch with | Chrome MV3 cluster: PageDiffBookmark / **ScreenshottoDataSelect** — **now 2 repos** |
| Sub-shape | **React + AI-API-dependent Chrome MV3 extension.** First in this sub-shape. |
| Special concern | **API key delivery model.** Primary product decision. Affects pricing, privacy disclosures, and Chrome Web Store listing scope. |
| Special concern | **Anthropic API key + cost UX accuracy.** Cost display in extension UI is a high-trust signal but requires keeping the displayed pricing in sync with Anthropic rate cards. |
| Special concern | **Screenshot data flow disclosure.** Users sending screenshots to a third-party API needs explicit consent UX, not just a Privacy Policy URL. |
| Special concern | **Service worker lifecycle on slow Vision API calls.** Chart understanding can take 30+ seconds; verify SW persistence patterns or use `chrome.runtime.connect` long-lived ports. |
| Special concern | **DOM-first fallback logic.** When does the extension use semantic HTML vs Vision? Make this user-visible to build trust. |

---

## Why this row introduces the React + AI-API Chrome MV3 sub-shape

PageDiffBookmark founded the Chrome MV3 cluster with a vanilla
local-only shape (no external API, no React, no bundler complexity).
ScreenshottoDataSelect demonstrates a structurally-different shape
that's still legitimately Chrome MV3:

- **React + Vite + crxjs build toolchain** — significantly different
  developer ergonomics + bundling complexity from vanilla.
- **AI API dependency** — adds API key handling, cost UX, third-
  party data disclosure as core concerns. Vanilla extensions don't
  have these.
- **Service worker + heavy compute** — chart extraction is multi-
  second; service worker lifecycle becomes load-bearing.

These differences justify a sub-shape, not a separate cluster — they
still ship via Chrome Web Store and follow MV3 manifest semantics.
Future React + AI extensions (translation tools, summarization
sidebars, image-analysis helpers) batch here. TabTriage's shape
remains TBD until audited.

---

## Reactivation procedure (for the next code session)

1. Verify `git branch -vv` shows `main` tracking `origin/main`.
   Already correct as of this disposition pass.
2. Review the local stash (`r13-screenshottodataselect-stash`) —
   contains modifications to `CLAUDE.md` plus untracked `.codex/`
   and `AGENTS.md`. Minimal carry-over.
3. **Test in Chrome by loading unpacked** from `chrome://extensions`
   with developer mode on.
4. **Verify Anthropic API key UX** — settings panel, key validation,
   error handling for invalid keys / rate limits.
5. **Audit `manifest.json`** for permission minimization — confirm
   `manifest_version: 3`, prefer `activeTab` over `<all_urls>`.
6. **Verify DOM-first fallback** behavior — what happens when
   semantic HTML extraction succeeds vs falls back to Vision.
7. **Run `pnpm test` / `npm test`** — vitest suite should pass.
8. **Run `pnpm build` / `npm run build`** — confirm Vite produces a
   valid Chrome extension bundle.
9. **Test cost display accuracy** against Anthropic's current rate
   card.
10. **Decide API key delivery model before submission** (see
    Unblock trigger #1).

---

## Last known reference

| Field | Value |
|---|---|
| `origin/main` tip | `2dc497c` docs: update CLAUDE.md to reflect current project state |
| Last substantive commit | `136cb33` fix: wire onReExtract prop, add thumbnail compression for history |
| Default branch | `main` |
| Build system | **Chrome MV3 + React 18 + Vite 6 + TypeScript 5 + Tailwind + @crxjs/vite-plugin + vitest** |
| Phases shipped | 0 (scaffold + typed messaging + settings UI) / 1 (extraction loop + Vision API) / 2 (export + history + context menu + 3-view nav) / 3 (DOM-first + chart prompts + cost display + edge cases) |
| `package.json` version | **1.0.0** |
| OSS scaffolding | **Full wave on canonical main** — MIT, security policy, CoC, contributing, Dependabot, issue/PR templates, Makefile, CHANGELOG, README, .env.example |
| Distribution channel | **Chrome Web Store** (pre-publish) |
| AI integration | Anthropic Claude Vision API via `@anthropic-ai/sdk` 0.80.0 |
| Blocker | API key delivery model decision + Chrome Web Store developer account + asset preparation + permission justification (operator-only) |
| Migration state | **No `legacy-origin` remote** — clean |
| Distinguishing feature | **Second Chrome MV3 extension cluster member AND first React + AI-API-dependent sub-shape.** Structurally distinct from PageDiffBookmark's vanilla local-only shape — same cluster, different sub-shape. |

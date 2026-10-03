import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { Script } from "node:vm";

// Exercise the emitted worker with mocked Chrome APIs to capture its file paths.
// This checks packaging only: no browser, DOM, screenshots, or provider calls.
const root = resolve("dist");
const manifest = JSON.parse(readFileSync(resolve(root, "manifest.json"), "utf8"));
const files = [];
const pages = [];
let onMessage;
let scriptReady;
let pageReady;
const scriptCaptured = new Promise((done) => { scriptReady = done; });
const pageCaptured = new Promise((done) => { pageReady = done; });
const event = { addListener() {} };

globalThis.fetch = () => { throw new Error("Network forbidden in packaging check"); };
globalThis.chrome = {
	runtime: {
		onMessage: { addListener(listener) { onMessage = listener; } },
		onConnect: event,
		onInstalled: event,
	},
	commands: { onCommand: event },
	contextMenus: { onClicked: event },
	tabs: {
		async query() { return [{ id: 1 }]; },
		async sendMessage() {},
		async captureVisibleTab() { return "synthetic-packaging-input"; },
	},
	storage: { local: { async set() {} } },
	action: { setBadgeText() {}, setBadgeBackgroundColor() {} },
	scripting: { async executeScript(options) { files.push(...options.files); scriptReady(); } },
	offscreen: {
		createDocument(options) {
			pages.push(options.url);
			pageReady();
			// Stop the mocked pipeline here; no image processing or extraction runs.
			return new Promise(() => {});
		},
	},
};

await import(pathToFileURL(resolve(root, manifest.background.service_worker)).href);
assert.equal(typeof onMessage, "function", "Built worker must register its message handler");
onMessage({ type: "START_SELECTION" }, {}, () => {});
onMessage({ type: "REGION_SELECTED", payload: {} }, {}, () => {});
let timeout;
try {
	await Promise.race([
		Promise.all([scriptCaptured, pageCaptured]),
		new Promise((_, reject) => { timeout = setTimeout(() => reject(new Error("Worker asset references not reached")), 5000); }),
	]);
} finally {
	clearTimeout(timeout);
}

const missing = [];
function requireAsset(path) {
	const file = resolve(root, path.replace(/^\//, ""));
	assert.ok(file.startsWith(`${root}/`), `Asset escapes dist: ${path}`);
	if (!existsSync(file)) missing.push(path);
	return file;
}
for (const path of files) {
	const file = requireAsset(path);
	if (existsSync(file)) new Script(readFileSync(file, "utf8"), { filename: file });
}
for (const path of pages) {
	const page = requireAsset(path);
	if (!existsSync(page)) continue;
	const html = readFileSync(page, "utf8");
	const scripts = [...html.matchAll(/<script\b[^>]*\bsrc=["']([^"']+)["']/g)];
	assert.ok(scripts.length > 0, "Offscreen page has no emitted script");
	for (const [, src] of scripts) {
		requireAsset(src.startsWith("/") ? src : resolve(dirname(page), src).slice(root.length + 1));
	}
}
assert.deepEqual(missing, [], `Missing packaged runtime assets: ${missing.join(", ")}`);
console.log(`Package references verified: ${files.join(", ")}; ${pages.join(", ")} and its scripts.`);

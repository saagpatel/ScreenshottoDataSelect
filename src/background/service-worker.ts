import { extractTable } from "../lib/api";
import { type ExtensionMessage, isExtensionMessage } from "../lib/messages";
import { get, getApiKey, set, setExtractionState } from "../lib/storage";
import type {
	ExtractionRecord,
	ExtractionResult,
	ExtractionState,
	SelectionRegion,
} from "../types";

// ── Message routing ───────────────────────────────────────

chrome.runtime.onMessage.addListener(
	(
		message: unknown,
		sender: chrome.runtime.MessageSender,
		sendResponse: (response?: unknown) => void,
	) => {
		if (!isExtensionMessage(message)) {
			console.warn("[SW] Unknown message:", message);
			return false;
		}

		handleMessage(message, sender)
			.then(sendResponse)
			.catch((err: unknown) => {
				console.error("[SW] Handler error:", err);
				sendResponse({
					type: "EXTRACT_ERROR",
					payload: {
						message: err instanceof Error ? err.message : "Unknown error",
						code: "HANDLER_ERROR",
					},
				});
			});

		return true;
	},
);

// ── Long-lived port for progress updates ──────────────────

chrome.runtime.onConnect.addListener((port) => {
	if (port.name !== "extraction-progress") return;
	console.log("[SW] Progress port connected");
	port.onDisconnect.addListener(() => {
		console.log("[SW] Progress port disconnected");
	});
});

// ── Handler dispatch ──────────────────────────────────────

async function handleMessage(
	message: ExtensionMessage,
	sender: chrome.runtime.MessageSender,
): Promise<unknown> {
	console.log("[SW] Received:", message.type, sender.tab?.id ?? "popup");

	switch (message.type) {
		case "START_SELECTION":
			return handleStartSelection();
		case "CANCEL_SELECTION":
			return handleCancelSelection();
		case "REGION_SELECTED":
			handleExtractionPipeline(message.payload).catch(console.error);
			return { ok: true };
		case "EXTRACT_PROGRESS":
		case "EXTRACT_RESULT":
		case "EXTRACT_ERROR":
		case "CROP_REQUEST":
		case "CROP_RESULT":
		case "DOM_EXTRACT_REQUEST":
		case "DOM_EXTRACT_RESULT":
		case "DETECT_TABLES":
		case "TABLES_DETECTED":
			return { ok: true };
	}
}

// ── Selection handlers ────────────────────────────────────

async function handleStartSelection(): Promise<{ ok: boolean }> {
	const [tab] = await chrome.tabs.query({
		active: true,
		currentWindow: true,
	});
	if (!tab?.id) throw new Error("No active tab found");

	await chrome.scripting.executeScript({
		target: { tabId: tab.id, allFrames: true },
		files: ["src/content/overlay.ts"],
	});

	await chrome.tabs.sendMessage(tab.id, { type: "START_SELECTION" });
	await updateState({ status: "selecting" });
	return { ok: true };
}

async function handleCancelSelection(): Promise<{ ok: boolean }> {
	try {
		const [tab] = await chrome.tabs.query({
			active: true,
			currentWindow: true,
		});
		if (tab?.id) {
			await chrome.tabs.sendMessage(tab.id, { type: "CANCEL_SELECTION" });
		}
	} catch {
		// Tab may not be accessible
	}
	await updateState({ status: "idle" });
	chrome.action.setBadgeText({ text: "" });
	return { ok: true };
}

// ── Extraction pipeline ───────────────────────────────────

async function handleExtractionPipeline(
	region: SelectionRegion,
): Promise<void> {
	const startedAt = Date.now();

	try {
		// 1. Capture screenshot
		await updateState({ status: "capturing", startedAt });
		chrome.action.setBadgeText({ text: "..." });
		chrome.action.setBadgeBackgroundColor({ color: "#4F46E5" });

		const screenshotDataUrl = await chrome.tabs.captureVisibleTab({
			format: "png",
		});

		// 2. Crop to selection
		await updateState({ status: "cropping", startedAt });

		const croppedDataUrl = await cropScreenshot(screenshotDataUrl, region);

		// 3. Try DOM extraction first (if enabled)
		const domFirst = (await get("settings.domFirst")) ?? true;
		let finalResult: ExtractionResult | null = null;
		let tokensUsed = 0;

		if (domFirst) {
			await updateState({ status: "dom-extracting", startedAt });

			const [tab] = await chrome.tabs.query({
				active: true,
				currentWindow: true,
			});
			if (tab?.id) {
				try {
					const domResponse = (await chrome.tabs.sendMessage(tab.id, {
						type: "DOM_EXTRACT_REQUEST",
						payload: region,
					})) as { type: string; payload: ExtractionResult | null };

					if (
						domResponse?.type === "DOM_EXTRACT_RESULT" &&
						domResponse.payload &&
						domResponse.payload.rows.length > 0
					) {
						finalResult = domResponse.payload;
						console.log(
							"[SW] DOM extraction succeeded:",
							finalResult.rows.length,
							"rows",
						);
					}
				} catch {
					// Content script may not support DOM extraction yet
				}
			}
		}

		// 4. Fall back to Vision API if DOM extraction didn't work
		if (!finalResult) {
			await updateState({ status: "extracting", startedAt });

			const apiKey = await getApiKey();
			if (!apiKey) {
				throw new Error("No API key configured — set one in Settings");
			}

			const model =
				(await get("settings.model")) ?? "claude-haiku-4-5-20251001";

			const base64 = croppedDataUrl.replace(/^data:image\/png;base64,/, "");
			const apiResponse = await extractTable(base64, model, apiKey);

			finalResult = apiResponse.result;
			tokensUsed = apiResponse.totalTokens;

			// Update split token counters
			const prevInput = (await get("usage.inputTokens")) ?? 0;
			const prevOutput = (await get("usage.outputTokens")) ?? 0;
			await set("usage.inputTokens", prevInput + apiResponse.inputTokens);
			await set("usage.outputTokens", prevOutput + apiResponse.outputTokens);
		}

		// 5. Parse + validate
		await updateState({ status: "parsing", startedAt });

		const durationMs = Date.now() - startedAt;
		const model = (await get("settings.model")) ?? "claude-haiku-4-5-20251001";

		// 6. Store result
		await updateState({
			status: "complete",
			result: finalResult,
			imageDataUrl: croppedDataUrl,
			durationMs,
			tokensUsed,
		});

		await saveToHistory({
			result: finalResult,
			imageDataUrl: croppedDataUrl,
			model,
			tokensUsed,
			durationMs,
		});

		// Update usage counters
		const totalExtractions = ((await get("usage.totalExtractions")) ?? 0) + 1;
		const totalTokens = ((await get("usage.tokensUsed")) ?? 0) + tokensUsed;
		await set("usage.totalExtractions", totalExtractions);
		await set("usage.tokensUsed", totalTokens);

		chrome.action.setBadgeText({ text: "\u2713" });
		chrome.action.setBadgeBackgroundColor({ color: "#059669" });
		setTimeout(() => chrome.action.setBadgeText({ text: "" }), 5000);

		console.log(
			"[SW] Extraction complete:",
			finalResult.rows.length,
			"rows in",
			durationMs,
			"ms",
			finalResult.extractionMethod === "dom" ? "(DOM)" : "(Vision)",
		);
	} catch (err: unknown) {
		const message = err instanceof Error ? err.message : "Unknown error";
		const code =
			err instanceof Error && "code" in err
				? String((err as { code: string }).code)
				: "EXTRACTION_ERROR";

		console.error("[SW] Extraction failed:", message);
		await updateState({ status: "error", message, code });

		chrome.action.setBadgeText({ text: "!" });
		chrome.action.setBadgeBackgroundColor({ color: "#DC2626" });
		setTimeout(() => chrome.action.setBadgeText({ text: "" }), 10000);
	}
}

// ── Offscreen crop ────────────────────────────────────────

async function cropScreenshot(
	imageDataUrl: string,
	region: SelectionRegion,
): Promise<string> {
	// Create offscreen document (guard against "already exists")
	try {
		await chrome.offscreen.createDocument({
			url: "src/offscreen/offscreen.html",
			reasons: ["CANVAS" as chrome.offscreen.Reason],
			justification: "Crop screenshot to selection region",
		});
	} catch (err: unknown) {
		if (
			!(err instanceof Error) ||
			!err.message.includes("Only a single offscreen")
		) {
			throw err;
		}
	}

	const response = (await chrome.runtime.sendMessage({
		type: "CROP_REQUEST",
		payload: { imageDataUrl, region },
	})) as { type: string; payload: { croppedDataUrl: string } };

	try {
		await chrome.offscreen.closeDocument();
	} catch {
		// May already be closed
	}

	if (response?.type === "EXTRACT_ERROR") {
		const errPayload = (response as unknown as { payload: { message: string } })
			.payload;
		throw new Error(errPayload.message);
	}

	return response.payload.croppedDataUrl;
}

// ── State management ──────────────────────────────────────

async function updateState(state: ExtractionState): Promise<void> {
	await setExtractionState(state);
}

// ── History persistence ───────────────────────────────────

async function saveToHistory(entry: {
	result: ExtractionRecord["result"];
	imageDataUrl: string;
	model: string;
	tokensUsed: number;
	durationMs: number;
}): Promise<void> {
	const [tab] = await chrome.tabs.query({
		active: true,
		currentWindow: true,
	});

	const record: ExtractionRecord = {
		id: crypto.randomUUID(),
		timestamp: Date.now(),
		url: tab?.url ?? "",
		pageTitle: tab?.title ?? "",
		imageDataUrl: entry.imageDataUrl,
		result: entry.result,
		model: entry.model,
		tokensUsed: entry.tokensUsed,
		durationMs: entry.durationMs,
	};

	const history = (await get("history.extractions")) ?? [];
	history.unshift(record);
	if (history.length > 50) history.length = 50;
	await set("history.extractions", history);
}

// ── Keyboard shortcut ─────────────────────────────────────

chrome.commands.onCommand.addListener((command) => {
	if (command === "start-selection") {
		handleStartSelection().catch(console.error);
	}
});

// ── Context menu ──────────────────────────────────────────

chrome.runtime.onInstalled.addListener(() => {
	chrome.contextMenus.create({
		id: "dataselect-extract",
		title: "Extract table from this area",
		contexts: ["page"],
	});
});

chrome.contextMenus.onClicked.addListener((info) => {
	if (info.menuItemId === "dataselect-extract") {
		handleStartSelection().catch(console.error);
	}
});

console.log("[SW] Screenshot to DataSelect service worker loaded");

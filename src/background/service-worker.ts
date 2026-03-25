import { type ExtensionMessage, isExtensionMessage } from "../lib/messages";

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

		// Return true to indicate async response
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
			console.log("[SW] Region:", message.payload);
			return { ok: true };
		case "EXTRACT_REQUEST":
			console.log("[SW] Extract request (stub)");
			return { ok: true };
		case "EXTRACT_PROGRESS":
		case "EXTRACT_RESULT":
		case "EXTRACT_ERROR":
			return { ok: true };
	}
}

// ── Selection handlers ────────────────────────────────────

async function handleStartSelection(): Promise<{ ok: boolean }> {
	try {
		const [tab] = await chrome.tabs.query({
			active: true,
			currentWindow: true,
		});
		if (!tab?.id) throw new Error("No active tab found");

		await chrome.scripting.executeScript({
			target: { tabId: tab.id },
			files: ["src/content/overlay.ts"],
		});

		await chrome.tabs.sendMessage(tab.id, { type: "START_SELECTION" });
		return { ok: true };
	} catch (err) {
		console.error("[SW] Failed to start selection:", err);
		throw err;
	}
}

async function handleCancelSelection(): Promise<{ ok: boolean }> {
	try {
		const [tab] = await chrome.tabs.query({
			active: true,
			currentWindow: true,
		});
		if (!tab?.id) throw new Error("No active tab found");

		await chrome.tabs.sendMessage(tab.id, { type: "CANCEL_SELECTION" });
		return { ok: true };
	} catch (err) {
		console.error("[SW] Failed to cancel selection:", err);
		throw err;
	}
}

// ── Keyboard shortcut ─────────────────────────────────────

chrome.commands.onCommand.addListener((command) => {
	if (command === "start-selection") {
		handleStartSelection().catch(console.error);
	}
});

console.log("[SW] Screenshot to DataSelect service worker loaded");

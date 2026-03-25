// Content script — vanilla JS only, no React
// Listens for START_SELECTION / CANCEL_SELECTION from service worker

let overlayElement: HTMLDivElement | null = null;

function createOverlay(): void {
	if (overlayElement) return;

	overlayElement = document.createElement("div");
	overlayElement.id = "dataselect-overlay";
	overlayElement.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100vw;
    height: 100vh;
    z-index: 2147483647;
    cursor: crosshair;
    background: rgba(0, 0, 0, 0.05);
    border: 3px solid #4F46E5;
    box-sizing: border-box;
  `;
	document.body.appendChild(overlayElement);
	console.log("[DataSelect] Overlay active — selection mode ready");
}

function removeOverlay(): void {
	if (overlayElement) {
		overlayElement.remove();
		overlayElement = null;
		console.log("[DataSelect] Overlay removed");
	}
}

// ── Message listener ──────────────────────────────────────

chrome.runtime.onMessage.addListener(
	(message: { type: string }, _sender, sendResponse) => {
		switch (message.type) {
			case "START_SELECTION":
				createOverlay();
				sendResponse({ ok: true });
				break;
			case "CANCEL_SELECTION":
				removeOverlay();
				sendResponse({ ok: true });
				break;
		}
		return false;
	},
);

// ── ESC to cancel ─────────────────────────────────────────

document.addEventListener("keydown", (e) => {
	if (e.key === "Escape" && overlayElement) {
		removeOverlay();
		chrome.runtime.sendMessage({ type: "CANCEL_SELECTION" });
	}
});

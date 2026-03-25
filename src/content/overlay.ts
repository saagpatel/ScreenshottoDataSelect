// Content script — vanilla JS only, no React
// Full drag-selection overlay for region capture

let overlayElement: HTMLDivElement | null = null;
let selectionRect: HTMLDivElement | null = null;
let dimensionBadge: HTMLDivElement | null = null;

let startX = 0;
let startY = 0;
let isDragging = false;

// ── Overlay lifecycle ─────────────────────────────────────

function createOverlay(): void {
	if (overlayElement) return;

	overlayElement = document.createElement("div");
	overlayElement.id = "dataselect-overlay";
	document.body.appendChild(overlayElement);

	overlayElement.addEventListener("mousedown", onMouseDown);
	overlayElement.addEventListener("contextmenu", onContextMenu);
	document.addEventListener("keydown", onKeyDown);

	console.log("[DataSelect] Selection overlay active");
}

function removeOverlay(): void {
	if (overlayElement) {
		overlayElement.removeEventListener("mousedown", onMouseDown);
		overlayElement.removeEventListener("contextmenu", onContextMenu);
		overlayElement.remove();
		overlayElement = null;
	}
	if (selectionRect) {
		selectionRect.remove();
		selectionRect = null;
	}
	if (dimensionBadge) {
		dimensionBadge.remove();
		dimensionBadge = null;
	}
	document.removeEventListener("mousemove", onMouseMove);
	document.removeEventListener("mouseup", onMouseUp);
	document.removeEventListener("keydown", onKeyDown);
	isDragging = false;
	console.log("[DataSelect] Overlay removed");
}

// ── Mouse handlers ────────────────────────────────────────

function onMouseDown(e: MouseEvent): void {
	if (e.button !== 0) return; // left click only
	e.preventDefault();

	startX = e.clientX;
	startY = e.clientY;
	isDragging = true;

	// Create selection rectangle
	selectionRect = document.createElement("div");
	selectionRect.id = "dataselect-selection-rect";
	selectionRect.style.left = `${startX}px`;
	selectionRect.style.top = `${startY}px`;
	selectionRect.style.width = "0px";
	selectionRect.style.height = "0px";
	document.body.appendChild(selectionRect);

	// Create dimension badge
	dimensionBadge = document.createElement("div");
	dimensionBadge.id = "dataselect-dimension-badge";
	document.body.appendChild(dimensionBadge);

	document.addEventListener("mousemove", onMouseMove);
	document.addEventListener("mouseup", onMouseUp);
}

function onMouseMove(e: MouseEvent): void {
	if (!isDragging || !selectionRect || !dimensionBadge) return;
	e.preventDefault();

	const x = Math.min(startX, e.clientX);
	const y = Math.min(startY, e.clientY);
	const w = Math.abs(e.clientX - startX);
	const h = Math.abs(e.clientY - startY);

	selectionRect.style.left = `${x}px`;
	selectionRect.style.top = `${y}px`;
	selectionRect.style.width = `${w}px`;
	selectionRect.style.height = `${h}px`;

	// Position badge at bottom-right of selection
	dimensionBadge.textContent = `${w} × ${h}`;
	dimensionBadge.style.left = `${x + w + 8}px`;
	dimensionBadge.style.top = `${y + h + 8}px`;
}

function onMouseUp(e: MouseEvent): void {
	if (!isDragging) return;
	e.preventDefault();

	const x = Math.min(startX, e.clientX);
	const y = Math.min(startY, e.clientY);
	const w = Math.abs(e.clientX - startX);
	const h = Math.abs(e.clientY - startY);

	// Minimum 10px selection to avoid accidental clicks
	if (w < 10 || h < 10) {
		removeOverlay();
		return;
	}

	const dpr = window.devicePixelRatio || 1;

	chrome.runtime.sendMessage({
		type: "REGION_SELECTED",
		payload: {
			x,
			y,
			width: w,
			height: h,
			devicePixelRatio: dpr,
		},
	});

	removeOverlay();
}

// ── Cancel handlers ───────────────────────────────────────

function onContextMenu(e: MouseEvent): void {
	e.preventDefault();
	removeOverlay();
	chrome.runtime.sendMessage({ type: "CANCEL_SELECTION" });
}

function onKeyDown(e: KeyboardEvent): void {
	if (e.key === "Escape") {
		removeOverlay();
		chrome.runtime.sendMessage({ type: "CANCEL_SELECTION" });
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

// Offscreen document — canvas crop operations
// Receives CROP_REQUEST, returns CROP_RESULT

chrome.runtime.onMessage.addListener(
	(message: { type: string; payload?: unknown }, _sender, sendResponse) => {
		if (message.type !== "CROP_REQUEST") return false;

		const payload = message.payload as {
			imageDataUrl: string;
			region: {
				x: number;
				y: number;
				width: number;
				height: number;
				devicePixelRatio: number;
			};
		};

		cropImage(payload.imageDataUrl, payload.region)
			.then((croppedDataUrl) => {
				sendResponse({ type: "CROP_RESULT", payload: { croppedDataUrl } });
			})
			.catch((err: unknown) => {
				console.error("[Offscreen] Crop failed:", err);
				sendResponse({
					type: "EXTRACT_ERROR",
					payload: {
						message: err instanceof Error ? err.message : "Crop failed",
						code: "CROP_ERROR",
					},
				});
			});

		return true; // async response
	},
);

async function cropImage(
	imageDataUrl: string,
	region: {
		x: number;
		y: number;
		width: number;
		height: number;
		devicePixelRatio: number;
	},
): Promise<string> {
	const img = new Image();
	await new Promise<void>((resolve, reject) => {
		img.onload = () => resolve();
		img.onerror = () => reject(new Error("Failed to load image for cropping"));
		img.src = imageDataUrl;
	});

	const dpr = region.devicePixelRatio || 1;
	const sx = Math.round(region.x * dpr);
	const sy = Math.round(region.y * dpr);
	const sw = Math.round(region.width * dpr);
	const sh = Math.round(region.height * dpr);

	const canvas = document.getElementById("crop-canvas") as HTMLCanvasElement;
	canvas.width = sw;
	canvas.height = sh;

	const ctx = canvas.getContext("2d");
	if (!ctx) throw new Error("Failed to get canvas context");

	ctx.drawImage(img, sx, sy, sw, sh, 0, 0, sw, sh);

	return canvas.toDataURL("image/png");
}

console.log("[Offscreen] Crop document loaded");

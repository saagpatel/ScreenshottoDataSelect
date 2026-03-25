import type {
	CropRequest,
	CropResult,
	DetectedRegion,
	ExtractionResult,
	ExtractionStage,
	SelectionRegion,
} from "../types";

// ── Message union ─────────────────────────────────────────

export type ExtensionMessage =
	| { type: "START_SELECTION" }
	| { type: "CANCEL_SELECTION" }
	| { type: "REGION_SELECTED"; payload: SelectionRegion }
	| { type: "EXTRACT_PROGRESS"; payload: { stage: ExtractionStage } }
	| { type: "EXTRACT_RESULT"; payload: ExtractionResult }
	| { type: "EXTRACT_ERROR"; payload: { message: string; code: string } }
	| { type: "CROP_REQUEST"; payload: CropRequest }
	| { type: "CROP_RESULT"; payload: CropResult }
	| { type: "DOM_EXTRACT_REQUEST"; payload: SelectionRegion }
	| { type: "DOM_EXTRACT_RESULT"; payload: ExtractionResult | null }
	| { type: "DETECT_TABLES" }
	| { type: "TABLES_DETECTED"; payload: { regions: DetectedRegion[] } };

// ── Type guard ────────────────────────────────────────────

const MESSAGE_TYPES = new Set([
	"START_SELECTION",
	"CANCEL_SELECTION",
	"REGION_SELECTED",
	"EXTRACT_PROGRESS",
	"EXTRACT_RESULT",
	"EXTRACT_ERROR",
	"CROP_REQUEST",
	"CROP_RESULT",
	"DOM_EXTRACT_REQUEST",
	"DOM_EXTRACT_RESULT",
	"DETECT_TABLES",
	"TABLES_DETECTED",
]);

export function isExtensionMessage(msg: unknown): msg is ExtensionMessage {
	return (
		typeof msg === "object" &&
		msg !== null &&
		"type" in msg &&
		typeof (msg as { type: unknown }).type === "string" &&
		MESSAGE_TYPES.has((msg as { type: string }).type)
	);
}

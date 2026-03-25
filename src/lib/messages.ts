import type {
	ExtractionResult,
	ExtractionStage,
	ExtractRequest,
	SelectionRegion,
} from "../types";

// ── Message union ─────────────────────────────────────────

export type ExtensionMessage =
	| { type: "START_SELECTION" }
	| { type: "CANCEL_SELECTION" }
	| { type: "REGION_SELECTED"; payload: SelectionRegion }
	| { type: "EXTRACT_REQUEST"; payload: ExtractRequest }
	| { type: "EXTRACT_PROGRESS"; payload: { stage: ExtractionStage } }
	| { type: "EXTRACT_RESULT"; payload: ExtractionResult }
	| { type: "EXTRACT_ERROR"; payload: { message: string; code: string } };

// ── Type guard ────────────────────────────────────────────

const MESSAGE_TYPES = new Set([
	"START_SELECTION",
	"CANCEL_SELECTION",
	"REGION_SELECTED",
	"EXTRACT_REQUEST",
	"EXTRACT_PROGRESS",
	"EXTRACT_RESULT",
	"EXTRACT_ERROR",
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

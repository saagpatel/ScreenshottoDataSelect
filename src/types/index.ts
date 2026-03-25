// ── Selection ──────────────────────────────────────────────

export interface SelectionRegion {
	x: number;
	y: number;
	width: number;
	height: number;
	devicePixelRatio: number;
}

// ── Extraction ────────────────────────────────────────────

export type ExtractionMethod = "dom" | "vision";

export interface ExtractionResult {
	headers: string[];
	rows: string[][];
	confidence: number;
	rawResponse: string;
	extractionMethod?: ExtractionMethod;
	chartType?: string;
}

export type ExtractionStage =
	| "capturing"
	| "cropping"
	| "dom-extracting"
	| "extracting"
	| "parsing"
	| "complete";

export type OutputFormat = "csv" | "json" | "tsv" | "markdown";

export type ModelId =
	| "claude-haiku-4-5-20251001"
	| "claude-sonnet-4-5-20250514";

export type ExtractionMode = "table" | "chart";

export interface DetectedRegion extends SelectionRegion {
	label: string;
}

// ── History ───────────────────────────────────────────────

export interface ExtractionRecord {
	id: string;
	timestamp: number;
	url: string;
	pageTitle: string;
	imageDataUrl: string;
	result: ExtractionResult;
	model: string;
	tokensUsed: number;
	durationMs: number;
}

// ── Extraction State Machine ──────────────────────────────

export type ExtractionState =
	| { status: "idle" }
	| { status: "selecting" }
	| {
			status:
				| "capturing"
				| "cropping"
				| "dom-extracting"
				| "extracting"
				| "parsing";
			startedAt: number;
	  }
	| {
			status: "complete";
			result: ExtractionResult;
			imageDataUrl: string;
			durationMs: number;
			tokensUsed: number;
	  }
	| { status: "error"; message: string; code: string };

// ── Crop (offscreen document) ─────────────────────────────

export interface CropRequest {
	imageDataUrl: string;
	region: SelectionRegion;
}

export interface CropResult {
	croppedDataUrl: string;
}

// ── Storage ───────────────────────────────────────────────

export interface StorageSchema {
	"settings.apiKey": string;
	"settings.model": ModelId;
	"settings.defaultFormat": OutputFormat;
	"settings.autoClipboard": boolean;
	"settings.domFirst": boolean;
	"history.extractions": ExtractionRecord[];
	"usage.totalExtractions": number;
	"usage.tokensUsed": number;
	"usage.inputTokens": number;
	"usage.outputTokens": number;
	"extraction.current": ExtractionState;
}

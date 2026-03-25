// ── Selection ──────────────────────────────────────────────

export interface SelectionRegion {
	x: number;
	y: number;
	width: number;
	height: number;
	devicePixelRatio: number;
}

// ── Extraction ────────────────────────────────────────────

export interface ExtractionResult {
	headers: string[];
	rows: string[][];
	confidence: number;
	rawResponse: string;
}

export type ExtractionStage =
	| "capturing"
	| "cropping"
	| "extracting"
	| "parsing"
	| "complete";

export type OutputFormat = "csv" | "json" | "tsv" | "markdown";

export type ModelId =
	| "claude-haiku-4-5-20251001"
	| "claude-sonnet-4-5-20250514";

export interface ExtractRequest {
	imageBase64: string;
	model: ModelId;
	outputFormat: OutputFormat;
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

// ── Storage ───────────────────────────────────────────────

export interface StorageSchema {
	"settings.apiKey": string;
	"settings.model": ModelId;
	"settings.defaultFormat": OutputFormat;
	"settings.autoClipboard": boolean;
	"history.extractions": ExtractionRecord[];
	"usage.totalExtractions": number;
	"usage.tokensUsed": number;
}

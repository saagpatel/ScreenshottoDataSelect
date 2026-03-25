import type {
	ExtractionState,
	ModelId,
	OutputFormat,
	StorageSchema,
} from "../types";

// ── Defaults ──────────────────────────────────────────────

const DEFAULTS: Partial<StorageSchema> = {
	"settings.model": "claude-haiku-4-5-20251001" as ModelId,
	"settings.defaultFormat": "csv" as OutputFormat,
	"settings.autoClipboard": true,
	"history.extractions": [],
	"usage.totalExtractions": 0,
	"usage.tokensUsed": 0,
	"extraction.current": { status: "idle" } as ExtractionState,
};

// ── Generic accessors ─────────────────────────────────────

export async function get<K extends keyof StorageSchema>(
	key: K,
): Promise<StorageSchema[K] | undefined> {
	const result = await chrome.storage.local.get(key);
	if (key in result) return result[key] as StorageSchema[K];
	if (key in DEFAULTS) return DEFAULTS[key] as StorageSchema[K];
	return undefined;
}

export async function set<K extends keyof StorageSchema>(
	key: K,
	value: StorageSchema[K],
): Promise<void> {
	await chrome.storage.local.set({ [key]: value });
}

export async function remove(key: keyof StorageSchema): Promise<void> {
	await chrome.storage.local.remove(key);
}

// ── Convenience helpers ───────────────────────────────────

export async function getApiKey(): Promise<string | undefined> {
	return get("settings.apiKey");
}

export async function setApiKey(apiKey: string): Promise<void> {
	return set("settings.apiKey", apiKey);
}

export interface Settings {
	apiKey: string | undefined;
	model: ModelId;
	defaultFormat: OutputFormat;
	autoClipboard: boolean;
}

export async function getSettings(): Promise<Settings> {
	const result = await chrome.storage.local.get([
		"settings.apiKey",
		"settings.model",
		"settings.defaultFormat",
		"settings.autoClipboard",
	]);

	return {
		apiKey: result["settings.apiKey"] as string | undefined,
		model:
			(result["settings.model"] as ModelId) ??
			(DEFAULTS["settings.model"] as ModelId),
		defaultFormat:
			(result["settings.defaultFormat"] as OutputFormat) ??
			(DEFAULTS["settings.defaultFormat"] as OutputFormat),
		autoClipboard:
			(result["settings.autoClipboard"] as boolean) ??
			(DEFAULTS["settings.autoClipboard"] as boolean),
	};
}

export async function setSettings(settings: Partial<Settings>): Promise<void> {
	const items: Record<string, unknown> = {};
	if (settings.apiKey !== undefined) items["settings.apiKey"] = settings.apiKey;
	if (settings.model !== undefined) items["settings.model"] = settings.model;
	if (settings.defaultFormat !== undefined)
		items["settings.defaultFormat"] = settings.defaultFormat;
	if (settings.autoClipboard !== undefined)
		items["settings.autoClipboard"] = settings.autoClipboard;
	await chrome.storage.local.set(items);
}

// ── Extraction state ──────────────────────────────────────

export async function getExtractionState(): Promise<ExtractionState> {
	return (
		(await get("extraction.current")) ?? ({ status: "idle" } as ExtractionState)
	);
}

export async function setExtractionState(
	state: ExtractionState,
): Promise<void> {
	await set("extraction.current", state);
}

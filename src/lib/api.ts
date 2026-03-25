import Anthropic from "@anthropic-ai/sdk";
import type { ExtractionResult, ModelId } from "../types";
import { getTableExtractionPrompt } from "./prompts";

// ── Error types ───────────────────────────────────────────

export class ApiKeyError extends Error {
	code = "API_KEY_ERROR" as const;
	constructor(message = "Invalid or missing API key") {
		super(message);
		this.name = "ApiKeyError";
	}
}

export class RateLimitError extends Error {
	code = "RATE_LIMIT" as const;
	retryAfterMs: number;
	constructor(retryAfterMs = 60_000) {
		super(
			`Rate limited — try again in ${Math.ceil(retryAfterMs / 1000)} seconds`,
		);
		this.name = "RateLimitError";
		this.retryAfterMs = retryAfterMs;
	}
}

export class ExtractionError extends Error {
	code = "EXTRACTION_ERROR" as const;
	constructor(message: string) {
		super(message);
		this.name = "ExtractionError";
	}
}

// ── API response types ────────────────────────────────────

interface ApiExtractionResponse {
	tokensUsed: number;
	result: ExtractionResult;
}

// ── Main extraction function ──────────────────────────────

export async function extractTable(
	imageBase64: string,
	model: ModelId,
	apiKey: string,
): Promise<ApiExtractionResponse> {
	if (!apiKey) throw new ApiKeyError();

	const client = new Anthropic({
		apiKey,
		dangerouslyAllowBrowser: true,
	});

	let response: Anthropic.Message;
	try {
		response = await client.messages.create({
			model,
			max_tokens: 4096,
			messages: [
				{
					role: "user",
					content: [
						{
							type: "image",
							source: {
								type: "base64",
								media_type: "image/png",
								data: imageBase64,
							},
						},
						{
							type: "text",
							text: getTableExtractionPrompt(),
						},
					],
				},
			],
		});
	} catch (err: unknown) {
		if (err instanceof Anthropic.AuthenticationError) {
			throw new ApiKeyError("Invalid API key — check your key in Settings");
		}
		if (err instanceof Anthropic.RateLimitError) {
			throw new RateLimitError();
		}
		if (err instanceof Error) {
			throw new ExtractionError(`API call failed: ${err.message}`);
		}
		throw new ExtractionError("Unknown API error");
	}

	const tokensUsed =
		(response.usage?.input_tokens ?? 0) + (response.usage?.output_tokens ?? 0);

	const textBlock = response.content.find((b) => b.type === "text");
	if (!textBlock || textBlock.type !== "text") {
		throw new ExtractionError("No text content in API response");
	}

	const rawResponse = textBlock.text;
	const result = parseExtractionResponse(rawResponse);

	return { tokensUsed, result };
}

// ── Response parsing ──────────────────────────────────────

function parseExtractionResponse(raw: string): ExtractionResult {
	// Strip markdown code fences if present
	let cleaned = raw.trim();
	if (cleaned.startsWith("```")) {
		cleaned = cleaned.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
	}

	let parsed: unknown;
	try {
		parsed = JSON.parse(cleaned);
	} catch {
		throw new ExtractionError(
			`Failed to parse API response as JSON: ${cleaned.slice(0, 200)}`,
		);
	}

	if (typeof parsed !== "object" || parsed === null) {
		throw new ExtractionError("API response is not an object");
	}

	const obj = parsed as Record<string, unknown>;

	if (!Array.isArray(obj.headers)) {
		throw new ExtractionError("Missing or invalid 'headers' array");
	}
	if (!Array.isArray(obj.rows)) {
		throw new ExtractionError("Missing or invalid 'rows' array");
	}

	const headers = obj.headers.map(String);
	const rows = (obj.rows as unknown[][]).map((row) =>
		Array.isArray(row) ? row.map(String) : [],
	);
	const confidence =
		typeof obj.confidence === "number"
			? Math.max(0, Math.min(1, obj.confidence))
			: 0.5;

	return { headers, rows, confidence, rawResponse: raw };
}

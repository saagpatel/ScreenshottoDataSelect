import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { extractTable, ApiKeyError, ExtractionError, RateLimitError } = await import(
	"../src/lib/api"
);

describe("extractTable", () => {
	const mockFetch = vi.fn<typeof fetch>();

	beforeEach(() => {
		vi.stubGlobal("fetch", mockFetch);
	});

	afterEach(() => {
		mockFetch.mockReset();
		vi.unstubAllGlobals();
	});

	function mockApiResponse(
		body: unknown,
		init: { status?: number; statusText?: string; headers?: HeadersInit } = {},
	) {
		mockFetch.mockResolvedValueOnce(
			new Response(JSON.stringify(body), {
				status: init.status ?? 200,
				statusText: init.statusText ?? "OK",
				headers: { "content-type": "application/json", ...init.headers },
			}),
		);
	}

	it("parses a valid extraction response", async () => {
		mockApiResponse({
			content: [
				{
					type: "text",
					text: JSON.stringify({
						headers: ["Name", "Age"],
						rows: [
							["Alice", "30"],
							["Bob", "25"],
						],
						confidence: 0.95,
					}),
				},
			],
			usage: { input_tokens: 1000, output_tokens: 200 },
		});

		const result = await extractTable(
			"base64data",
			"claude-haiku-4-5-20251001",
			"sk-ant-test",
		);

		expect(mockFetch).toHaveBeenCalledWith(
			"https://api.anthropic.com/v1/messages",
			expect.objectContaining({
				method: "POST",
				headers: expect.objectContaining({
					"anthropic-version": "2023-06-01",
					"x-api-key": "sk-ant-test",
				}),
			}),
		);
		expect(result.result.headers).toEqual(["Name", "Age"]);
		expect(result.result.rows).toHaveLength(2);
		expect(result.result.confidence).toBe(0.95);
		expect(result.result.extractionMethod).toBe("vision");
		expect(result.totalTokens).toBe(1200);
		expect(result.inputTokens).toBe(1000);
		expect(result.outputTokens).toBe(200);
	});

	it("strips markdown code fences from response", async () => {
		mockApiResponse({
			content: [
				{
					type: "text",
					text: '```json\n{"headers":["A"],"rows":[["1"]],"confidence":0.8}\n```',
				},
			],
			usage: { input_tokens: 500, output_tokens: 100 },
		});

		const result = await extractTable(
			"base64data",
			"claude-haiku-4-5-20251001",
			"sk-ant-test",
		);

		expect(result.result.headers).toEqual(["A"]);
		expect(result.result.rows).toEqual([["1"]]);
	});

	it("throws ApiKeyError for empty key", async () => {
		await expect(
			extractTable("base64data", "claude-haiku-4-5-20251001", ""),
		).rejects.toThrow(ApiKeyError);
	});

	it("throws ExtractionError for invalid JSON response", async () => {
		mockApiResponse({
			content: [{ type: "text", text: "not json at all" }],
			usage: { input_tokens: 500, output_tokens: 50 },
		});

		await expect(
			extractTable("base64data", "claude-haiku-4-5-20251001", "sk-ant-test"),
		).rejects.toThrow(ExtractionError);
	});

	it("throws ExtractionError when headers missing", async () => {
		mockApiResponse({
			content: [
				{
					type: "text",
					text: JSON.stringify({ rows: [["1"]], confidence: 0.5 }),
				},
			],
			usage: { input_tokens: 500, output_tokens: 50 },
		});

		await expect(
			extractTable("base64data", "claude-haiku-4-5-20251001", "sk-ant-test"),
		).rejects.toThrow("Missing or invalid 'headers' array");
	});

	it("clamps confidence to [0, 1]", async () => {
		mockApiResponse({
			content: [
				{
					type: "text",
					text: JSON.stringify({
						headers: ["X"],
						rows: [["1"]],
						confidence: 1.5,
					}),
				},
			],
			usage: { input_tokens: 500, output_tokens: 50 },
		});

		const result = await extractTable(
			"base64data",
			"claude-haiku-4-5-20251001",
			"sk-ant-test",
		);

		expect(result.result.confidence).toBe(1);
	});

	it("throws ApiKeyError for Anthropic auth failures", async () => {
		mockApiResponse(
			{ error: { message: "invalid x-api-key" } },
			{ status: 401, statusText: "Unauthorized" },
		);

		await expect(
			extractTable("base64data", "claude-haiku-4-5-20251001", "bad-key"),
		).rejects.toThrow(ApiKeyError);
	});

	it("throws RateLimitError with retry-after seconds", async () => {
		mockApiResponse(
			{ error: { message: "rate limit exceeded" } },
			{
				status: 429,
				statusText: "Too Many Requests",
				headers: { "retry-after": "7" },
			},
		);

		await expect(
			extractTable("base64data", "claude-haiku-4-5-20251001", "sk-ant-test"),
		).rejects.toMatchObject({
			name: "RateLimitError",
			retryAfterMs: 7000,
		} satisfies Partial<InstanceType<typeof RateLimitError>>);
	});
});

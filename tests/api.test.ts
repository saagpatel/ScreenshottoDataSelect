import { beforeEach, describe, expect, it, vi } from "vitest";

const { extractTable, ApiKeyError, ExtractionError } = await import(
	"../src/lib/api"
);

const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

function mockApiResponse(body: unknown, init: ResponseInit = {}) {
	mockFetch.mockResolvedValueOnce(
		new Response(JSON.stringify(body), {
			status: 200,
			headers: { "content-type": "application/json" },
			...init,
		}),
	);
}

describe("extractTable", () => {
	beforeEach(() => {
		mockFetch.mockReset();
	});

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
});
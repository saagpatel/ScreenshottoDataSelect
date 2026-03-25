import { describe, expect, it, vi } from "vitest";

// Mock the Anthropic SDK before importing api.ts
vi.mock("@anthropic-ai/sdk", () => {
	const mockCreate = vi.fn();
	return {
		default: class Anthropic {
			messages = { create: mockCreate };
			static AuthenticationError = class extends Error {
				status = 401;
			};
			static RateLimitError = class extends Error {
				status = 429;
			};
		},
		__mockCreate: mockCreate,
	};
});

// Get the mock reference — use type assertion for the test-only export
const { __mockCreate: mockCreate } = (await import(
	"@anthropic-ai/sdk"
)) as unknown as {
	__mockCreate: ReturnType<typeof vi.fn>;
};

const { extractTable, ApiKeyError, ExtractionError } = await import(
	"../src/lib/api"
);

describe("extractTable", () => {
	it("parses a valid extraction response", async () => {
		(mockCreate as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
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
		expect(result.tokensUsed).toBe(1200);
	});

	it("strips markdown code fences from response", async () => {
		(mockCreate as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
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
		(mockCreate as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
			content: [{ type: "text", text: "not json at all" }],
			usage: { input_tokens: 500, output_tokens: 50 },
		});

		await expect(
			extractTable("base64data", "claude-haiku-4-5-20251001", "sk-ant-test"),
		).rejects.toThrow(ExtractionError);
	});

	it("throws ExtractionError when headers missing", async () => {
		(mockCreate as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
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
		(mockCreate as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
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

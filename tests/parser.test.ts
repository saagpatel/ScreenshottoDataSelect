import { describe, expect, it } from "vitest";
import {
	formatExtension,
	toCSV,
	toFormat,
	toJSON,
	toMarkdown,
	toTSV,
} from "../src/lib/parser";
import type { ExtractionResult } from "../src/types";

const SAMPLE: ExtractionResult = {
	headers: ["Name", "Age", "City"],
	rows: [
		["Alice", "30", "New York"],
		["Bob", "25", "London"],
	],
	confidence: 0.95,
	rawResponse: "",
};

describe("toCSV", () => {
	it("formats basic table", () => {
		const csv = toCSV(SAMPLE);
		expect(csv).toBe("Name,Age,City\r\nAlice,30,New York\r\nBob,25,London");
	});

	it("escapes commas in values", () => {
		const result: ExtractionResult = {
			headers: ["Item"],
			rows: [["1,000"]],
			confidence: 1,
			rawResponse: "",
		};
		expect(toCSV(result)).toBe('Item\r\n"1,000"');
	});

	it("escapes double quotes", () => {
		const result: ExtractionResult = {
			headers: ["Quote"],
			rows: [['He said "hello"']],
			confidence: 1,
			rawResponse: "",
		};
		expect(toCSV(result)).toBe('Quote\r\n"He said ""hello"""');
	});

	it("escapes newlines in values", () => {
		const result: ExtractionResult = {
			headers: ["Text"],
			rows: [["line1\nline2"]],
			confidence: 1,
			rawResponse: "",
		};
		expect(toCSV(result)).toBe('Text\r\n"line1\nline2"');
	});

	it("handles empty table", () => {
		const result: ExtractionResult = {
			headers: ["A", "B"],
			rows: [],
			confidence: 1,
			rawResponse: "",
		};
		expect(toCSV(result)).toBe("A,B");
	});

	it("handles empty cells", () => {
		const result: ExtractionResult = {
			headers: ["A"],
			rows: [[""], ["x"]],
			confidence: 1,
			rawResponse: "",
		};
		expect(toCSV(result)).toBe("A\r\n\r\nx");
	});
});

describe("toJSON", () => {
	it("formats as array of objects", () => {
		const json = toJSON(SAMPLE);
		const parsed = JSON.parse(json);
		expect(parsed).toEqual([
			{ Name: "Alice", Age: "30", City: "New York" },
			{ Name: "Bob", Age: "25", City: "London" },
		]);
	});

	it("handles missing columns gracefully", () => {
		const result: ExtractionResult = {
			headers: ["A", "B"],
			rows: [["1"]],
			confidence: 1,
			rawResponse: "",
		};
		const parsed = JSON.parse(toJSON(result));
		expect(parsed[0]).toEqual({ A: "1", B: "" });
	});
});

describe("toTSV", () => {
	it("formats with tabs", () => {
		const tsv = toTSV(SAMPLE);
		expect(tsv).toBe(
			"Name\tAge\tCity\r\nAlice\t30\tNew York\r\nBob\t25\tLondon",
		);
	});

	it("replaces tabs in values with spaces", () => {
		const result: ExtractionResult = {
			headers: ["Val"],
			rows: [["a\tb"]],
			confidence: 1,
			rawResponse: "",
		};
		expect(toTSV(result)).toBe("Val\r\na b");
	});
});

describe("toMarkdown", () => {
	it("formats GFM table", () => {
		const md = toMarkdown(SAMPLE);
		expect(md).toBe(
			"| Name | Age | City |\n| --- | --- | --- |\n| Alice | 30 | New York |\n| Bob | 25 | London |",
		);
	});

	it("escapes pipe characters", () => {
		const result: ExtractionResult = {
			headers: ["A"],
			rows: [["a|b"]],
			confidence: 1,
			rawResponse: "",
		};
		expect(toMarkdown(result)).toContain("a\\|b");
	});
});

describe("toFormat", () => {
	it("dispatches to correct formatter", () => {
		expect(toFormat(SAMPLE, "csv")).toContain(",");
		expect(toFormat(SAMPLE, "json")).toContain("{");
		expect(toFormat(SAMPLE, "tsv")).toContain("\t");
		expect(toFormat(SAMPLE, "markdown")).toContain("|");
	});
});

describe("formatExtension", () => {
	it("returns correct extensions", () => {
		expect(formatExtension("csv")).toBe("csv");
		expect(formatExtension("json")).toBe("json");
		expect(formatExtension("tsv")).toBe("tsv");
		expect(formatExtension("markdown")).toBe("md");
	});
});

import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { ComponentProps } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { toCSV, toJSON, toMarkdown, toTSV } from "../src/lib/parser";
import DataPreview from "../src/popup/components/DataPreview";
import type { ExtractionRecord, ExtractionResult } from "../src/types";

const writeText = vi.fn().mockResolvedValue(undefined);

function sampleResult(
	overrides: Partial<ExtractionResult> = {},
): ExtractionResult {
	return {
		headers: ["Name", "Age"],
		rows: [
			["Alice", "30"],
			["Bob", "25"],
		],
		confidence: 0.95,
		rawResponse: '{"headers":["Name","Age"]}',
		extractionMethod: "vision",
		...overrides,
	};
}

function deepFreezeResult(result: ExtractionResult): ExtractionResult {
	for (const row of result.rows) Object.freeze(row);
	Object.freeze(result.rows);
	Object.freeze(result.headers);
	return Object.freeze(result);
}

function renderPreview(
	result: ExtractionResult,
	props: Partial<ComponentProps<typeof DataPreview>> = {},
) {
	const onReset = props.onReset ?? vi.fn();
	return {
		...render(<DataPreview result={result} onReset={onReset} {...props} />),
		onReset,
	};
}

async function copiedText(buttonName: string): Promise<string> {
	fireEvent.click(screen.getByRole("button", { name: buttonName }));
	await waitFor(() => expect(writeText).toHaveBeenCalled());
	const text = writeText.mock.calls.at(-1)?.[0];
	expect(typeof text).toBe("string");
	return text as string;
}

describe("DataPreview editable draft", () => {
	beforeEach(() => {
		writeText.mockClear();
		Object.defineProperty(navigator, "clipboard", {
			configurable: true,
			value: { writeText },
		});
	});

	it("lets users edit headers and cells from the keyboard", () => {
		renderPreview(sampleResult());

		const header = screen.getByRole("textbox", { name: "Column 1 header" });
		const cell = screen.getByRole("textbox", { name: "Name, row 1" });

		expect(header).toBeEnabled();
		expect(cell).toBeEnabled();
		header.focus();
		expect(header).toHaveFocus();

		fireEvent.change(header, { target: { value: "Full name" } });
		expect(header).toHaveValue("Full name");
		expect(
			screen.getByRole("textbox", { name: "Full name, row 1" }),
		).toHaveValue("Alice");

		const renamed = screen.getByRole("textbox", { name: "Full name, row 1" });
		renamed.focus();
		expect(renamed).toHaveFocus();
		fireEvent.change(renamed, { target: { value: "Alicia" } });
		expect(renamed).toHaveValue("Alicia");
	});

	it("passes edited values through every export path", async () => {
		const result = sampleResult();
		renderPreview(result, { defaultFormat: "csv" });

		fireEvent.change(screen.getByRole("textbox", { name: "Column 1 header" }), {
			target: { value: "Full name" },
		});
		fireEvent.change(screen.getByRole("textbox", { name: "Full name, row 1" }), {
			target: { value: "Alicia" },
		});
		fireEvent.change(screen.getByRole("textbox", { name: "Age, row 2" }), {
			target: { value: "26" },
		});

		const edited: ExtractionResult = {
			...result,
			headers: ["Full name", "Age"],
			rows: [
				["Alicia", "30"],
				["Bob", "26"],
			],
		};

		expect(await copiedText("CSV")).toBe(toCSV(edited));
		expect(await copiedText("JSON")).toBe(toJSON(edited));
		expect(await copiedText("TSV")).toBe(toTSV(edited));
		expect(await copiedText("MD")).toBe(toMarkdown(edited));

		const createObjectURL = vi
			.spyOn(URL, "createObjectURL")
			.mockReturnValue("blob:preview-test");
		const revokeObjectURL = vi
			.spyOn(URL, "revokeObjectURL")
			.mockImplementation(() => {});
		const click = vi
			.spyOn(HTMLAnchorElement.prototype, "click")
			.mockImplementation(() => {});

		try {
			fireEvent.click(screen.getByRole("button", { name: "Download CSV" }));
			expect(createObjectURL).toHaveBeenCalled();
			const blob = createObjectURL.mock.calls[0]?.[0];
			expect(blob).toBeInstanceOf(Blob);
			expect(await (blob as Blob).text()).toBe(toCSV(edited));
			expect(click).toHaveBeenCalled();
			expect(revokeObjectURL).toHaveBeenCalledWith("blob:preview-test");
		} finally {
			createObjectURL.mockRestore();
			revokeObjectURL.mockRestore();
			click.mockRestore();
		}

		const open = vi.spyOn(window, "open").mockImplementation(() => null);
		try {
			fireEvent.click(
				screen.getByRole("button", { name: "Open in Google Sheets" }),
			);
			await waitFor(() =>
				expect(writeText).toHaveBeenLastCalledWith(toTSV(edited)),
			);
			expect(open).toHaveBeenCalledWith(
				"https://docs.google.com/spreadsheets/create",
				"_blank",
			);
		} finally {
			open.mockRestore();
		}
	});

	it("renders and exports ragged rows, including previously missing cells", async () => {
		const result = sampleResult({
			headers: ["A", "B", "C"],
			rows: [["1"], ["2", "3"], ["4", "5", "6"]],
		});
		renderPreview(result);

		expect(screen.getByRole("textbox", { name: "B, row 1" })).toHaveValue("");
		expect(screen.getByRole("textbox", { name: "C, row 1" })).toHaveValue("");
		expect(screen.getByRole("textbox", { name: "C, row 2" })).toHaveValue("");
		expect(screen.getByRole("textbox", { name: "C, row 3" })).toHaveValue("6");

		fireEvent.change(screen.getByRole("textbox", { name: "B, row 1" }), {
			target: { value: "filled" },
		});
		fireEvent.change(screen.getByRole("textbox", { name: "C, row 2" }), {
			target: { value: "extra" },
		});

		const edited: ExtractionResult = {
			...result,
			headers: ["A", "B", "C"],
			rows: [
				["1", "filled"],
				["2", "3", "extra"],
				["4", "5", "6"],
			],
		};

		expect(await copiedText("CSV")).toBe(toCSV(edited));
		expect(JSON.parse(await copiedText("JSON"))).toEqual(
			JSON.parse(toJSON(edited)),
		);
	});

	it("keeps commas, quotes, newlines, and Unicode intact through edits and exports", async () => {
		const result = sampleResult({
			headers: ["Note"],
			rows: [["plain"]],
		});
		renderPreview(result);

		const special = '1,000 "quoted"\n日本語 🎉 café';
		fireEvent.change(screen.getByRole("textbox", { name: "Column 1 header" }), {
			target: { value: 'Col, "hdr"\n헤더' },
		});
		fireEvent.change(screen.getByRole("textbox", { name: /row 1/ }), {
			target: { value: special },
		});

		const edited: ExtractionResult = {
			...result,
			headers: ['Col, "hdr"\n헤더'],
			rows: [[special]],
		};

		expect(await copiedText("CSV")).toBe(toCSV(edited));
		expect(await copiedText("JSON")).toBe(toJSON(edited));
		expect(await copiedText("TSV")).toBe(toTSV(edited));
		expect(await copiedText("MD")).toBe(toMarkdown(edited));
		expect(toCSV(edited)).toContain('""');
		expect(toCSV(edited)).toContain("\n");
		expect(toJSON(edited)).toContain("🎉");
	});

	it("replaces the draft when the incoming result changes", () => {
		const first = sampleResult();
		const { rerender, onReset } = renderPreview(first);

		fireEvent.change(screen.getByRole("textbox", { name: "Name, row 1" }), {
			target: { value: "Alicia" },
		});
		expect(screen.getByRole("textbox", { name: "Name, row 1" })).toHaveValue(
			"Alicia",
		);

		const second = sampleResult({
			headers: ["City"],
			rows: [["Paris"]],
			rawResponse: '{"headers":["City"]}',
		});
		rerender(<DataPreview result={second} onReset={onReset} />);

		expect(screen.getByRole("textbox", { name: "City, row 1" })).toHaveValue(
			"Paris",
		);
		expect(
			screen.queryByRole("textbox", { name: "Name, row 1" }),
		).not.toBeInTheDocument();
		expect(first.rows[0][0]).toBe("Alice");
	});

	it("discards the draft when reset or re-extract remounts the preview", () => {
		const onReset = vi.fn();
		const onReExtract = vi.fn();
		const first = sampleResult({ extractionMethod: "dom" });
		const { rerender } = renderPreview(first, { onReset, onReExtract });

		fireEvent.change(screen.getByRole("textbox", { name: "Name, row 1" }), {
			target: { value: "Alicia" },
		});
		fireEvent.click(screen.getByRole("button", { name: "New extraction" }));
		expect(onReset).toHaveBeenCalledTimes(1);

		fireEvent.click(
			screen.getByRole("button", {
				name: "Re-extract with AI for more accuracy",
			}),
		);
		expect(onReExtract).toHaveBeenCalledTimes(1);

		const next = sampleResult({
			headers: ["City"],
			rows: [["Paris"]],
			extractionMethod: "vision",
		});
		rerender(
			<DataPreview result={next} onReset={onReset} onReExtract={onReExtract} />,
		);

		expect(screen.getByRole("textbox", { name: "City, row 1" })).toHaveValue(
			"Paris",
		);
		expect(
			screen.queryByRole("textbox", { name: "Name, row 1" }),
		).not.toBeInTheDocument();
	});

	it("does not mutate the original result, history records, or storage", async () => {
		const result = deepFreezeResult(
			sampleResult({
				rawResponse: "untouched-raw",
			}),
		);
		const history: ExtractionRecord[] = [
			{
				id: "rec-1",
				timestamp: 1,
				url: "https://example.com",
				pageTitle: "Example",
				imageDataUrl: "",
				result,
				model: "claude-haiku-4-5-20251001",
				tokensUsed: 10,
				durationMs: 100,
			},
		];
		const historySnapshot = structuredClone(history);

		renderPreview(history[0].result);

		fireEvent.change(screen.getByRole("textbox", { name: "Name, row 1" }), {
			target: { value: "Alicia" },
		});
		fireEvent.change(screen.getByRole("textbox", { name: "Column 2 header" }), {
			target: { value: "Years" },
		});

		expect(await copiedText("CSV")).toContain("Alicia");

		expect(result.headers).toEqual(["Name", "Age"]);
		expect(result.rows).toEqual([
			["Alice", "30"],
			["Bob", "25"],
		]);
		expect(result.rawResponse).toBe("untouched-raw");
		expect(history).toEqual(historySnapshot);
		expect(chrome.storage.local.set).not.toHaveBeenCalled();
		expect(chrome.storage.local.remove).not.toHaveBeenCalled();
		expect(chrome.storage.local.clear).not.toHaveBeenCalled();
	});

	it("keeps unedited rows beyond the preview limit in the exported draft", async () => {
		const rows = Array.from({ length: 21 }, (_, i) => [`r${i}`, `${i}`]);
		const result = sampleResult({ headers: ["Name", "Age"], rows });
		renderPreview(result);

		expect(screen.getByText("Showing 20 of 21 rows")).toBeInTheDocument();
		expect(
			screen.queryByRole("textbox", { name: "Name, row 21" }),
		).not.toBeInTheDocument();

		fireEvent.change(screen.getByRole("textbox", { name: "Name, row 1" }), {
			target: { value: "edited" },
		});

		const csv = await copiedText("CSV");
		expect(csv).toContain("edited");
		expect(csv).toContain("r20");
		expect(result.rows[0][0]).toBe("r0");
	});
});

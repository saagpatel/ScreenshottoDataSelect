import type { ExtractionResult, OutputFormat } from "../types";

// ── CSV (RFC 4180) ────────────────────────────────────────

function csvEscape(value: string): string {
	if (/[,"\r\n]/.test(value)) {
		return `"${value.replace(/"/g, '""')}"`;
	}
	return value;
}

export function toCSV(result: ExtractionResult): string {
	const header = result.headers.map(csvEscape).join(",");
	const rows = result.rows.map((row) => row.map(csvEscape).join(","));
	return [header, ...rows].join("\r\n");
}

// ── JSON (array of objects) ───────────────────────────────

export function toJSON(result: ExtractionResult): string {
	const objects = result.rows.map((row) =>
		Object.fromEntries(result.headers.map((h, i) => [h, row[i] ?? ""])),
	);
	return JSON.stringify(objects, null, 2);
}

// ── TSV ───────────────────────────────────────────────────

function tsvEscape(value: string): string {
	return value.replace(/\t/g, " ").replace(/[\r\n]/g, " ");
}

export function toTSV(result: ExtractionResult): string {
	const header = result.headers.map(tsvEscape).join("\t");
	const rows = result.rows.map((row) => row.map(tsvEscape).join("\t"));
	return [header, ...rows].join("\r\n");
}

// ── Markdown (GFM) ───────────────────────────────────────

function mdEscape(value: string): string {
	return value.replace(/\|/g, "\\|").replace(/\n/g, "<br>");
}

export function toMarkdown(result: ExtractionResult): string {
	const header = `| ${result.headers.map(mdEscape).join(" | ")} |`;
	const separator = `| ${result.headers.map(() => "---").join(" | ")} |`;
	const rows = result.rows.map((row) => `| ${row.map(mdEscape).join(" | ")} |`);
	return [header, separator, ...rows].join("\n");
}

// ── Dispatcher ────────────────────────────────────────────

export function toFormat(
	result: ExtractionResult,
	format: OutputFormat,
): string {
	switch (format) {
		case "csv":
			return toCSV(result);
		case "json":
			return toJSON(result);
		case "tsv":
			return toTSV(result);
		case "markdown":
			return toMarkdown(result);
	}
}

// ── File extension helper ─────────────────────────────────

export function formatExtension(format: OutputFormat): string {
	switch (format) {
		case "csv":
			return "csv";
		case "json":
			return "json";
		case "tsv":
			return "tsv";
		case "markdown":
			return "md";
	}
}

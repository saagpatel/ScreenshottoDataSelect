import type { ExtractionResult, SelectionRegion } from "../types";

/**
 * Attempt to extract table data from the DOM within a selection region.
 * Returns null if no table is found.
 */
export function extractTableFromRegion(
	region: SelectionRegion,
): ExtractionResult | null {
	const table = findTableInRegion(region);
	if (!table) return null;

	const { headers, rows } = parseHtmlTable(table);
	if (rows.length === 0) return null;

	return {
		headers,
		rows,
		confidence: 1.0,
		rawResponse: "DOM extraction",
		extractionMethod: "dom",
	};
}

function findTableInRegion(region: SelectionRegion): HTMLTableElement | null {
	// Check center and corners of the selection
	const points = [
		[region.x + region.width / 2, region.y + region.height / 2],
		[region.x + 5, region.y + 5],
		[region.x + region.width - 5, region.y + 5],
		[region.x + 5, region.y + region.height - 5],
		[region.x + region.width - 5, region.y + region.height - 5],
	];

	for (const [px, py] of points) {
		const elements = document.elementsFromPoint(px, py);
		for (const el of elements) {
			// Direct table
			if (el instanceof HTMLTableElement) return el;
			// Element inside a table
			const parent = el.closest("table");
			if (parent instanceof HTMLTableElement) return parent;
		}
	}

	return null;
}

function parseHtmlTable(table: HTMLTableElement): {
	headers: string[];
	rows: string[][];
} {
	const headers: string[] = [];
	const rows: string[][] = [];

	// Try <thead> first
	const thead = table.querySelector("thead");
	if (thead) {
		const headerRow = thead.querySelector("tr");
		if (headerRow) {
			for (const cell of headerRow.querySelectorAll("th, td")) {
				headers.push(cellText(cell));
			}
		}
	}

	// Body rows
	const tbody = table.querySelector("tbody") ?? table;
	const trs = tbody.querySelectorAll("tr");

	let startIndex = 0;

	// If no thead, use first row as headers
	if (headers.length === 0 && trs.length > 0) {
		const firstRow = trs[0];
		for (const cell of firstRow.querySelectorAll("th, td")) {
			headers.push(cellText(cell));
		}
		startIndex = 1;
	}

	// Extract data rows
	for (let i = startIndex; i < trs.length; i++) {
		const tr = trs[i];
		// Skip rows inside thead (already processed)
		if (tr.closest("thead")) continue;

		const row: string[] = [];
		for (const cell of tr.querySelectorAll("th, td")) {
			row.push(cellText(cell));
		}
		if (row.length > 0) rows.push(row);
	}

	return { headers, rows };
}

function cellText(cell: Element): string {
	return (cell.textContent ?? "").trim().replace(/\s+/g, " ");
}

import type { ExtractionMode } from "../types";

export function getExtractionPrompt(mode: ExtractionMode = "table"): string {
	return mode === "chart"
		? getChartExtractionPrompt()
		: getTableExtractionPrompt();
}

export function getTableExtractionPrompt(): string {
	return `Extract all tabular data from this screenshot.

Rules:
- Return ONLY a JSON object, no markdown, no explanation, no code fences
- Structure: {"headers": ["col1", "col2"], "rows": [["val1", "val2"]], "confidence": 0.95}
- If the image contains a chart (bar, line, pie), extract the underlying data points as a table
- If multiple tables are visible, extract the largest/most prominent one
- Confidence should reflect your certainty about the extraction accuracy (0.0-1.0)
- Preserve original number formatting (commas, decimals, currency symbols)
- If a cell is empty, use an empty string ""
- Headers should match the column labels exactly as shown`;
}

export function getChartExtractionPrompt(): string {
	return `Extract data points from this chart screenshot.

Rules:
- Return ONLY a JSON object, no markdown, no explanation, no code fences
- Structure: {"headers": ["<x-axis label>", "<series1 name>", "<series2 name>", ...], "rows": [["x1", "y1", "y2"], ...], "confidence": 0.95, "chartType": "bar"}
- chartType should be one of: "bar", "line", "pie", "scatter", "area", "other"
- For pie charts: headers should be ["Category", "Value"], rows list each slice
- Extract ALL visible data points, including axis labels and legend entries
- Preserve original number formatting
- If a value is not clearly readable, use your best estimate and lower confidence
- Confidence should reflect your certainty about the extraction accuracy (0.0-1.0)`;
}

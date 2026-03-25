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

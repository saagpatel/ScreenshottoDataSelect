import { useCallback, useEffect, useState } from "react";
import { calculateCost, formatCost } from "../../lib/cost";
import type { ExtractionResult, ModelId, OutputFormat } from "../../types";
import ExportBar from "./ExportBar";

interface DataPreviewProps {
	result: ExtractionResult;
	imageDataUrl?: string;
	durationMs?: number;
	tokensUsed?: number;
	model?: ModelId;
	defaultFormat?: OutputFormat;
	onReset: () => void;
	onReExtract?: () => void;
}

const PREVIEW_ROW_LIMIT = 20;

const editorClassName =
	"w-full min-w-[4rem] min-h-[1.25rem] bg-transparent border-0 p-0 m-0 font-sans text-xs leading-5 rounded-sm resize-none overflow-auto focus:outline-none focus:ring-1 focus:ring-indigo-400 focus:bg-white";

function cloneResult(result: ExtractionResult): ExtractionResult {
	return {
		...result,
		headers: result.headers.slice(),
		rows: result.rows.map((row) => row.slice()),
	};
}

function columnCountOf(result: ExtractionResult): number {
	return result.rows.reduce(
		(max, row) => Math.max(max, row.length),
		result.headers.length,
	);
}

function headerLabel(index: number): string {
	return `Column ${index + 1} header`;
}

function cellLabel(header: string, rowIndex: number, colIndex: number): string {
	const column = header.trim() ? header : `column ${colIndex + 1}`;
	return `${column}, row ${rowIndex + 1}`;
}

export default function DataPreview({
	result,
	imageDataUrl,
	durationMs,
	tokensUsed,
	model,
	defaultFormat,
	onReset,
	onReExtract,
}: DataPreviewProps) {
	const [draft, setDraft] = useState(() => cloneResult(result));

	useEffect(() => {
		setDraft(cloneResult(result));
	}, [result]);

	const columnCount = columnCountOf(draft);
	const previewRows = draft.rows.slice(0, PREVIEW_ROW_LIMIT);

	const updateHeader = useCallback((index: number, value: string) => {
		setDraft((prev) => {
			const headers = prev.headers.slice();
			while (headers.length <= index) headers.push("");
			headers[index] = value;
			return { ...prev, headers };
		});
	}, []);

	const updateCell = useCallback(
		(rowIndex: number, colIndex: number, value: string) => {
			setDraft((prev) => {
				const rows = prev.rows.map((row) => row.slice());
				const row = rows[rowIndex] ?? [];
				while (row.length <= colIndex) row.push("");
				row[colIndex] = value;
				rows[rowIndex] = row;
				return { ...prev, rows };
			});
		},
		[],
	);

	const { confidence } = result;

	const confidenceColor =
		confidence >= 0.9
			? "bg-emerald-100 text-emerald-700"
			: confidence >= 0.7
				? "bg-amber-100 text-amber-700"
				: "bg-red-100 text-red-700";

	return (
		<div className="flex flex-col gap-3">
			{/* Header row: meta + new button */}
			<div className="flex items-center justify-between">
				<div className="flex items-center gap-2 text-xs text-slate-500 flex-wrap">
					{/* Extraction method badge */}
					{result.extractionMethod === "dom" ? (
						<span className="px-1.5 py-0.5 rounded font-medium bg-emerald-100 text-emerald-700">
							HTML
						</span>
					) : result.extractionMethod === "vision" ? (
						<span className="px-1.5 py-0.5 rounded font-medium bg-indigo-100 text-indigo-700">
							AI
						</span>
					) : null}
					<span
						className={`px-1.5 py-0.5 rounded font-medium ${confidenceColor}`}
					>
						{Math.round(confidence * 100)}%
					</span>
					<span>
						{draft.rows.length} rows × {columnCount} cols
					</span>
					{durationMs !== undefined && (
						<span>{(durationMs / 1000).toFixed(1)}s</span>
					)}
					{tokensUsed !== undefined && tokensUsed > 0 && (
						<span>
							{tokensUsed.toLocaleString()} tok
							{model && (
								<>
									{" "}
									(
									{formatCost(
										calculateCost(
											model,
											Math.round(tokensUsed * 0.9),
											Math.round(tokensUsed * 0.1),
										),
									)}
									)
								</>
							)}
						</span>
					)}
				</div>
				<button
					type="button"
					onClick={onReset}
					className="text-slate-400 hover:text-slate-600 transition-colors p-1"
					aria-label="New extraction"
					title="New extraction"
				>
					<svg
						className="w-4 h-4"
						fill="none"
						stroke="currentColor"
						viewBox="0 0 24 24"
					>
						<path
							strokeLinecap="round"
							strokeLinejoin="round"
							strokeWidth={2}
							d="M12 4v16m8-8H4"
						/>
					</svg>
				</button>
			</div>

			{/* Re-extract with AI (for DOM extractions) */}
			{result.extractionMethod === "dom" && onReExtract && (
				<button
					type="button"
					onClick={onReExtract}
					className="text-xs text-indigo-600 hover:text-indigo-800 transition-colors text-left"
				>
					Re-extract with AI for more accuracy
				</button>
			)}

			{/* Thumbnail */}
			{imageDataUrl && (
				<img
					src={imageDataUrl}
					alt="Captured region"
					className="w-full max-h-24 object-contain rounded border border-slate-200 bg-white"
				/>
			)}

			{/* Table */}
			<div className="overflow-x-auto border border-slate-200 rounded-lg max-h-[220px] overflow-y-auto">
				<table className="w-full text-xs text-left">
					<caption className="sr-only">
						Extracted data preview. Headers and cells are editable. Changes
						apply to export only.
					</caption>
					<thead className="bg-slate-50 sticky top-0">
						<tr>
							{Array.from({ length: columnCount }, (_, i) => (
								<th
									key={`h-${i}`}
									className="px-2 py-1.5 font-semibold text-slate-600 border-b border-slate-200 align-top"
									scope="col"
								>
									<textarea
										aria-label={headerLabel(i)}
										value={draft.headers[i] ?? ""}
										onChange={(event) => updateHeader(i, event.target.value)}
										rows={1}
										spellCheck={false}
										autoComplete="off"
										className={`${editorClassName} font-semibold text-slate-600`}
									/>
								</th>
							))}
						</tr>
					</thead>
					<tbody>
						{previewRows.map((row, ri) => (
							<tr
								key={`r-${ri}`}
								className={ri % 2 === 0 ? "bg-white" : "bg-slate-50/50"}
							>
								{Array.from({ length: columnCount }, (_, ci) => (
									<td
										key={`c-${ri}-${ci}`}
										className="px-2 py-1 border-b border-slate-100 align-top"
									>
										<textarea
											aria-label={cellLabel(
												draft.headers[ci] ?? "",
												ri,
												ci,
											)}
											value={row[ci] ?? ""}
											onChange={(event) =>
												updateCell(ri, ci, event.target.value)
											}
											rows={1}
											spellCheck={false}
											autoComplete="off"
											className={`${editorClassName} text-slate-700`}
										/>
									</td>
								))}
							</tr>
						))}
					</tbody>
				</table>
			</div>

			{draft.rows.length > PREVIEW_ROW_LIMIT && (
				<p className="text-xs text-slate-400 text-center">
					Showing {PREVIEW_ROW_LIMIT} of {draft.rows.length} rows
				</p>
			)}

			{/* Export uses the local draft so copy/download reflect edits */}
			<ExportBar result={draft} defaultFormat={defaultFormat} />
		</div>
	);
}

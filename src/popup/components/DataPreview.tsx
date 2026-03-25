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
	const { headers, rows, confidence } = result;

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
						{rows.length} rows × {headers.length} cols
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
					<thead className="bg-slate-50 sticky top-0">
						<tr>
							{headers.map((h, i) => (
								<th
									key={`h-${i}`}
									className="px-2 py-1.5 font-semibold text-slate-600 border-b border-slate-200 whitespace-nowrap"
								>
									{h}
								</th>
							))}
						</tr>
					</thead>
					<tbody>
						{rows.slice(0, 20).map((row, ri) => (
							<tr
								key={`r-${ri}`}
								className={ri % 2 === 0 ? "bg-white" : "bg-slate-50/50"}
							>
								{row.map((cell, ci) => (
									<td
										key={`c-${ri}-${ci}`}
										className="px-2 py-1 border-b border-slate-100 whitespace-nowrap"
									>
										{cell}
									</td>
								))}
							</tr>
						))}
					</tbody>
				</table>
			</div>

			{rows.length > 20 && (
				<p className="text-xs text-slate-400 text-center">
					Showing 20 of {rows.length} rows
				</p>
			)}

			{/* Export */}
			<ExportBar result={result} defaultFormat={defaultFormat} />
		</div>
	);
}

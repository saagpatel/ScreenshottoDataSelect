import type { ExtractionResult } from "../../types";

interface DataPreviewProps {
	result: ExtractionResult;
	imageDataUrl?: string;
	durationMs?: number;
	tokensUsed?: number;
	onReset: () => void;
}

export default function DataPreview({
	result,
	durationMs,
	tokensUsed,
	onReset,
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
			{/* Meta bar */}
			<div className="flex items-center gap-2 text-xs text-slate-500">
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
				{tokensUsed !== undefined && (
					<span>{tokensUsed.toLocaleString()} tokens</span>
				)}
			</div>

			{/* Table */}
			<div className="overflow-x-auto border border-slate-200 rounded-lg max-h-[280px] overflow-y-auto">
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

			{/* Actions */}
			<div className="flex gap-2">
				<button
					type="button"
					onClick={() => {
						const csv = [
							headers.join(","),
							...rows.map((r) =>
								r
									.map((c) =>
										/[,"\n]/.test(c) ? `"${c.replace(/"/g, '""')}"` : c,
									)
									.join(","),
							),
						].join("\n");
						navigator.clipboard.writeText(csv);
					}}
					className="flex-1 py-2 text-xs font-medium bg-indigo-600 text-white rounded-lg
								 hover:bg-indigo-700 transition-colors min-h-[36px]"
				>
					Copy CSV
				</button>
				<button
					type="button"
					onClick={() => {
						const jsonArr = rows.map((row) =>
							Object.fromEntries(headers.map((h, i) => [h, row[i] ?? ""])),
						);
						navigator.clipboard.writeText(JSON.stringify(jsonArr, null, 2));
					}}
					className="flex-1 py-2 text-xs font-medium bg-white text-slate-700 border border-slate-300
								 rounded-lg hover:bg-slate-50 transition-colors min-h-[36px]"
				>
					Copy JSON
				</button>
				<button
					type="button"
					onClick={onReset}
					className="py-2 px-3 text-xs text-slate-400 hover:text-slate-600 transition-colors min-h-[36px]"
				>
					New
				</button>
			</div>
		</div>
	);
}

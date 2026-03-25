import { useCallback, useEffect, useState } from "react";
import { clearHistory, getHistory } from "../../lib/storage";
import type { ExtractionRecord } from "../../types";

interface HistoryProps {
	onSelect: (record: ExtractionRecord) => void;
}

function relativeTime(timestamp: number): string {
	const diff = Date.now() - timestamp;
	const seconds = Math.floor(diff / 1000);
	if (seconds < 60) return "just now";
	const minutes = Math.floor(seconds / 60);
	if (minutes < 60) return `${minutes}m ago`;
	const hours = Math.floor(minutes / 60);
	if (hours < 24) return `${hours}h ago`;
	const days = Math.floor(hours / 24);
	return `${days}d ago`;
}

function truncateUrl(url: string, max = 40): string {
	try {
		const u = new URL(url);
		const path = u.hostname + u.pathname;
		return path.length > max ? path.slice(0, max - 1) + "\u2026" : path;
	} catch {
		return url.length > max ? url.slice(0, max - 1) + "\u2026" : url;
	}
}

export default function History({ onSelect }: HistoryProps) {
	const [records, setRecords] = useState<ExtractionRecord[]>([]);
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		getHistory()
			.then(setRecords)
			.catch(console.error)
			.finally(() => setLoading(false));
	}, []);

	const handleClear = useCallback(async () => {
		if (!confirm("Clear all extraction history?")) return;
		await clearHistory();
		setRecords([]);
	}, []);

	if (loading) {
		return (
			<div className="text-sm text-slate-400 text-center py-8">Loading...</div>
		);
	}

	if (records.length === 0) {
		return (
			<div className="flex flex-col items-center gap-3 py-12 text-center">
				<svg
					className="w-10 h-10 text-slate-300"
					fill="none"
					stroke="currentColor"
					viewBox="0 0 24 24"
				>
					<path
						strokeLinecap="round"
						strokeLinejoin="round"
						strokeWidth={1.5}
						d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
					/>
				</svg>
				<p className="text-sm text-slate-500 font-medium">No extractions yet</p>
				<p className="text-xs text-slate-400">
					Select a region on any page to get started
				</p>
			</div>
		);
	}

	return (
		<div className="flex flex-col gap-2">
			<div className="flex items-center justify-between mb-1">
				<span className="text-xs text-slate-400 font-medium">
					{records.length} extraction{records.length !== 1 ? "s" : ""}
				</span>
				<button
					type="button"
					onClick={handleClear}
					className="text-xs text-slate-400 hover:text-red-500 transition-colors"
				>
					Clear All
				</button>
			</div>

			<div className="flex flex-col gap-1 max-h-[380px] overflow-y-auto">
				{records.map((record) => (
					<button
						key={record.id}
						type="button"
						onClick={() => onSelect(record)}
						className="flex items-center gap-2.5 p-2 rounded-lg border border-slate-200
									 hover:border-indigo-300 hover:bg-indigo-50/50 transition-colors
									 text-left w-full"
					>
						{record.imageDataUrl && (
							<img
								src={record.imageDataUrl}
								alt=""
								className="w-10 h-10 object-cover rounded border border-slate-100 flex-shrink-0"
							/>
						)}
						<div className="flex-1 min-w-0">
							<p className="text-xs text-slate-600 truncate">
								{truncateUrl(record.url)}
							</p>
							<div className="flex items-center gap-2 mt-0.5">
								<span className="text-[10px] text-slate-400">
									{relativeTime(record.timestamp)}
								</span>
								<span className="text-[10px] text-slate-400">
									{record.result.rows.length} rows
								</span>
							</div>
						</div>
					</button>
				))}
			</div>
		</div>
	);
}

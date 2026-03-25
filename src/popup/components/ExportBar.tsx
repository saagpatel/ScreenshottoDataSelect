import { useCallback, useState } from "react";
import { formatExtension, toFormat } from "../../lib/parser";
import type { ExtractionResult, OutputFormat } from "../../types";

interface ExportBarProps {
	result: ExtractionResult;
	defaultFormat?: OutputFormat;
}

const FORMATS: { format: OutputFormat; label: string }[] = [
	{ format: "csv", label: "CSV" },
	{ format: "json", label: "JSON" },
	{ format: "tsv", label: "TSV" },
	{ format: "markdown", label: "MD" },
];

export default function ExportBar({
	result,
	defaultFormat = "csv",
}: ExportBarProps) {
	const [copiedFormat, setCopiedFormat] = useState<OutputFormat | null>(null);

	const handleCopy = useCallback(
		async (format: OutputFormat) => {
			const text = toFormat(result, format);
			await navigator.clipboard.writeText(text);
			setCopiedFormat(format);
			setTimeout(() => setCopiedFormat(null), 1500);
		},
		[result],
	);

	const handleDownload = useCallback(() => {
		const format = defaultFormat;
		const text = toFormat(result, format);
		const ext = formatExtension(format);
		const timestamp = new Date()
			.toISOString()
			.replace(/[:.]/g, "-")
			.slice(0, 19);
		const filename = `dataselect-${timestamp}.${ext}`;

		const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
		const url = URL.createObjectURL(blob);
		const a = document.createElement("a");
		a.href = url;
		a.download = filename;
		a.click();
		URL.revokeObjectURL(url);
	}, [result, defaultFormat]);

	// Sort so default format is first
	const sorted = [...FORMATS].sort((a, b) => {
		if (a.format === defaultFormat) return -1;
		if (b.format === defaultFormat) return 1;
		return 0;
	});

	return (
		<div className="flex flex-col gap-2">
			<div className="flex gap-1.5">
				{sorted.map(({ format, label }) => (
					<button
						key={format}
						type="button"
						onClick={() => handleCopy(format)}
						className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-all min-h-[32px]
							${
								copiedFormat === format
									? "bg-emerald-500 text-white"
									: format === defaultFormat
										? "bg-indigo-600 text-white hover:bg-indigo-700"
										: "bg-white text-slate-600 border border-slate-200 hover:border-slate-300"
							}`}
					>
						{copiedFormat === format ? "Copied!" : label}
					</button>
				))}
			</div>
			<button
				type="button"
				onClick={handleDownload}
				className="w-full py-1.5 text-xs font-medium text-slate-500 bg-white border border-slate-200
							 rounded-md hover:border-slate-300 hover:text-slate-700 transition-colors min-h-[32px]
							 flex items-center justify-center gap-1.5"
			>
				<svg
					className="w-3.5 h-3.5"
					fill="none"
					stroke="currentColor"
					viewBox="0 0 24 24"
				>
					<path
						strokeLinecap="round"
						strokeLinejoin="round"
						strokeWidth={2}
						d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
					/>
				</svg>
				Download {formatExtension(defaultFormat).toUpperCase()}
			</button>
		</div>
	);
}

import { useState } from "react";
import type { ExtractionRecord } from "../types";
import DataPreview from "./components/DataPreview";
import ExtractionProgress from "./components/ExtractionProgress";
import History from "./components/History";
import Settings from "./components/Settings";
import { useExtraction } from "./hooks/useExtraction";
import { useSettings } from "./hooks/useSettings";

type View = "main" | "history" | "settings";

export default function App() {
	const [view, setView] = useState<View>("main");
	const { state, reset } = useExtraction();
	const { settings } = useSettings();
	const [selectedRecord, setSelectedRecord] = useState<ExtractionRecord | null>(
		null,
	);

	const handleSelectRegion = () => {
		setSelectedRecord(null);
		chrome.runtime.sendMessage({ type: "START_SELECTION" });
		window.close();
	};

	const handleCancel = () => {
		chrome.runtime.sendMessage({ type: "CANCEL_SELECTION" });
		reset();
	};

	const handleReset = () => {
		setSelectedRecord(null);
		reset();
	};

	const handleHistorySelect = (record: ExtractionRecord) => {
		setSelectedRecord(record);
		setView("main");
	};

	const isActive =
		state.status === "capturing" ||
		state.status === "cropping" ||
		state.status === "dom-extracting" ||
		state.status === "extracting" ||
		state.status === "parsing";

	// Normalize preview data from either source
	const previewData = selectedRecord
		? {
				result: selectedRecord.result,
				imageDataUrl: selectedRecord.imageDataUrl,
				durationMs: selectedRecord.durationMs,
				tokensUsed: selectedRecord.tokensUsed,
			}
		: state.status === "complete"
			? {
					result: state.result,
					imageDataUrl: state.imageDataUrl,
					durationMs: state.durationMs,
					tokensUsed: state.tokensUsed,
				}
			: null;

	return (
		<div className="flex flex-col min-h-[480px] bg-slate-50">
			{/* Header */}
			<header className="flex items-center justify-between px-4 py-2.5 bg-indigo-600">
				<h1 className="text-sm font-bold text-white tracking-tight">
					DataSelect
				</h1>
				<nav className="flex items-center gap-1">
					{(
						[
							[
								"main",
								"M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z",
							],
							["history", "M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"],
							[
								"settings",
								"M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z",
							],
						] as const
					).map(([id, path]) => (
						<button
							key={id}
							type="button"
							onClick={() => setView(id as View)}
							className={`p-1.5 rounded transition-colors ${
								view === id
									? "text-white bg-indigo-500"
									: "text-indigo-300 hover:text-white"
							}`}
							aria-label={id.charAt(0).toUpperCase() + id.slice(1)}
						>
							<svg
								className="w-4 h-4"
								fill={id === "main" ? "currentColor" : "none"}
								stroke={id === "main" ? "none" : "currentColor"}
								viewBox="0 0 24 24"
							>
								<path
									strokeLinecap="round"
									strokeLinejoin="round"
									strokeWidth={id === "main" ? 0 : 2}
									d={path}
								/>
								{id === "settings" && (
									<path
										strokeLinecap="round"
										strokeLinejoin="round"
										strokeWidth={2}
										d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
									/>
								)}
							</svg>
						</button>
					))}
				</nav>
			</header>

			{/* Content */}
			<main className="flex-1 p-4 overflow-y-auto">
				{view === "settings" ? (
					<Settings />
				) : view === "history" ? (
					<History onSelect={handleHistorySelect} />
				) : isActive ? (
					<ExtractionProgress state={state} onCancel={handleCancel} />
				) : previewData ? (
					<DataPreview
						result={previewData.result}
						imageDataUrl={previewData.imageDataUrl}
						durationMs={previewData.durationMs}
						tokensUsed={previewData.tokensUsed}
						model={settings?.model}
						defaultFormat={settings?.defaultFormat}
						onReset={handleReset}
						onReExtract={
							previewData.result.extractionMethod === "dom"
								? handleSelectRegion
								: undefined
						}
					/>
				) : state.status === "error" ? (
					<div className="flex flex-col items-center gap-4 py-8">
						<div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
							<svg
								className="w-5 h-5 text-red-500"
								fill="none"
								stroke="currentColor"
								viewBox="0 0 24 24"
							>
								<path
									strokeLinecap="round"
									strokeLinejoin="round"
									strokeWidth={2}
									d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z"
								/>
							</svg>
						</div>
						<p className="text-sm text-red-600 text-center font-medium">
							{state.message}
						</p>
						<div className="flex gap-2">
							<button
								type="button"
								onClick={handleSelectRegion}
								className="px-4 py-2 text-sm bg-indigo-600 text-white rounded-lg
											 hover:bg-indigo-700 transition-colors min-h-[36px]"
							>
								Try Again
							</button>
							<button
								type="button"
								onClick={handleReset}
								className="px-4 py-2 text-sm text-slate-500 hover:text-slate-700 transition-colors min-h-[36px]"
							>
								Dismiss
							</button>
						</div>
					</div>
				) : (
					<div className="flex flex-col items-center justify-center h-full gap-6 py-12">
						<div className="text-center">
							<p className="text-sm text-slate-500 mb-1">
								Select any table or chart on the page
							</p>
							<p className="text-xs text-slate-400">
								Ctrl+Shift+S for quick access
							</p>
						</div>

						<button
							type="button"
							onClick={handleSelectRegion}
							className="px-6 py-3 bg-indigo-600 text-white font-semibold rounded-lg
										 hover:bg-indigo-700 active:bg-indigo-800
										 transition-colors shadow-sm hover:shadow-md
										 min-h-[44px]"
						>
							Select Region
						</button>
					</div>
				)}
			</main>
		</div>
	);
}

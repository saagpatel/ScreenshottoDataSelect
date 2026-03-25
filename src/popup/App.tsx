import { useState } from "react";
import DataPreview from "./components/DataPreview";
import ExtractionProgress from "./components/ExtractionProgress";
import Settings from "./components/Settings";
import { useExtraction } from "./hooks/useExtraction";

type View = "main" | "settings";

export default function App() {
	const [view, setView] = useState<View>("main");
	const { state, reset } = useExtraction();

	const handleSelectRegion = () => {
		chrome.runtime.sendMessage({ type: "START_SELECTION" });
		window.close();
	};

	const handleCancel = () => {
		chrome.runtime.sendMessage({ type: "CANCEL_SELECTION" });
		reset();
	};

	const isActive =
		state.status === "capturing" ||
		state.status === "cropping" ||
		state.status === "extracting" ||
		state.status === "parsing";

	return (
		<div className="flex flex-col min-h-[480px] bg-slate-50">
			{/* Header */}
			<header className="flex items-center justify-between px-4 py-3 bg-indigo-600">
				<h1 className="text-base font-bold text-white tracking-tight">
					DataSelect
				</h1>
				<button
					type="button"
					onClick={() => setView(view === "settings" ? "main" : "settings")}
					className="text-indigo-200 hover:text-white transition-colors"
					aria-label={view === "settings" ? "Back" : "Settings"}
				>
					{view === "settings" ? (
						<svg
							className="w-5 h-5"
							fill="none"
							stroke="currentColor"
							viewBox="0 0 24 24"
						>
							<path
								strokeLinecap="round"
								strokeLinejoin="round"
								strokeWidth={2}
								d="M10 19l-7-7m0 0l7-7m-7 7h18"
							/>
						</svg>
					) : (
						<svg
							className="w-5 h-5"
							fill="none"
							stroke="currentColor"
							viewBox="0 0 24 24"
						>
							<path
								strokeLinecap="round"
								strokeLinejoin="round"
								strokeWidth={2}
								d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
							/>
							<path
								strokeLinecap="round"
								strokeLinejoin="round"
								strokeWidth={2}
								d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
							/>
						</svg>
					)}
				</button>
			</header>

			{/* Content */}
			<main className="flex-1 p-4">
				{view === "settings" ? (
					<Settings />
				) : isActive ? (
					<ExtractionProgress state={state} onCancel={handleCancel} />
				) : state.status === "complete" ? (
					<DataPreview
						result={state.result}
						imageDataUrl={state.imageDataUrl}
						durationMs={state.durationMs}
						tokensUsed={state.tokensUsed}
						onReset={reset}
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
								onClick={reset}
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

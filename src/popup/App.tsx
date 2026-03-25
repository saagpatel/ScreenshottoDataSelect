import { useState } from "react";
import Settings from "./components/Settings";

type View = "main" | "settings";

export default function App() {
	const [view, setView] = useState<View>("main");

	const handleSelectRegion = () => {
		chrome.runtime.sendMessage({ type: "START_SELECTION" });
		window.close();
	};

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

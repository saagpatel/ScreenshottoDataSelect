import { useEffect, useState } from "react";
import type { ExtractionState } from "../../types";

type ActiveStage = Extract<
	ExtractionState,
	{
		status:
			| "capturing"
			| "cropping"
			| "dom-extracting"
			| "extracting"
			| "parsing";
	}
>;

const STAGE_LABELS: Record<ActiveStage["status"], string> = {
	capturing: "Capturing screenshot...",
	cropping: "Cropping selection...",
	"dom-extracting": "Checking HTML tables...",
	extracting: "Extracting data with AI...",
	parsing: "Parsing response...",
};

const STAGE_ORDER: ActiveStage["status"][] = [
	"capturing",
	"cropping",
	"dom-extracting",
	"extracting",
	"parsing",
];

interface ExtractionProgressProps {
	state: ActiveStage;
	onCancel: () => void;
}

export default function ExtractionProgress({
	state,
	onCancel,
}: ExtractionProgressProps) {
	const [elapsed, setElapsed] = useState(0);

	useEffect(() => {
		const start = state.startedAt;
		const tick = () => setElapsed(Math.round((Date.now() - start) / 1000));
		tick();
		const interval = setInterval(tick, 1000);
		return () => clearInterval(interval);
	}, [state.startedAt]);

	const currentIndex = STAGE_ORDER.indexOf(state.status);
	const progress = ((currentIndex + 1) / STAGE_ORDER.length) * 100;

	return (
		<div className="flex flex-col items-center gap-5 py-8">
			{/* Progress bar */}
			<div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
				<div
					className="bg-indigo-600 h-full rounded-full transition-all duration-500 ease-out"
					style={{ width: `${progress}%` }}
				/>
			</div>

			{/* Stage label */}
			<p className="text-sm font-medium text-slate-700">
				{STAGE_LABELS[state.status]}
			</p>

			{/* Stage dots */}
			<div className="flex gap-2">
				{STAGE_ORDER.map((stage, i) => (
					<div
						key={stage}
						className={`w-2.5 h-2.5 rounded-full transition-colors ${
							i <= currentIndex ? "bg-indigo-600" : "bg-slate-200"
						} ${i === currentIndex ? "animate-pulse" : ""}`}
					/>
				))}
			</div>

			{/* Timer */}
			<p className="text-xs text-slate-400 tabular-nums">{elapsed}s elapsed</p>

			{/* Cancel */}
			<button
				type="button"
				onClick={onCancel}
				className="text-xs text-slate-400 hover:text-red-500 transition-colors"
			>
				Cancel
			</button>
		</div>
	);
}

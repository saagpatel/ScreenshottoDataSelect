import { useCallback, useEffect, useState } from "react";
import { getExtractionState, setExtractionState } from "../../lib/storage";
import type { ExtractionState } from "../../types";

interface UseExtractionReturn {
	state: ExtractionState;
	reset: () => Promise<void>;
}

export function useExtraction(): UseExtractionReturn {
	const [state, setState] = useState<ExtractionState>({ status: "idle" });

	useEffect(() => {
		// Load current state on mount
		getExtractionState().then(setState).catch(console.error);

		// Subscribe to storage changes for live updates
		const listener = (
			changes: Record<string, chrome.storage.StorageChange>,
		) => {
			if (changes["extraction.current"]) {
				setState(changes["extraction.current"].newValue as ExtractionState);
			}
		};

		chrome.storage.onChanged.addListener(listener);
		return () => chrome.storage.onChanged.removeListener(listener);
	}, []);

	const reset = useCallback(async () => {
		const idle: ExtractionState = { status: "idle" };
		await setExtractionState(idle);
		setState(idle);
	}, []);

	return { state, reset };
}

import { useCallback, useEffect, useState } from "react";
import { getSettings, type Settings, setSettings } from "../../lib/storage";

interface UseSettingsReturn {
	settings: Settings | null;
	loading: boolean;
	saving: boolean;
	save: (updates: Partial<Settings>) => Promise<void>;
}

export function useSettings(): UseSettingsReturn {
	const [settings, setLocal] = useState<Settings | null>(null);
	const [loading, setLoading] = useState(true);
	const [saving, setSaving] = useState(false);

	useEffect(() => {
		getSettings()
			.then(setLocal)
			.catch(console.error)
			.finally(() => setLoading(false));
	}, []);

	const save = useCallback(async (updates: Partial<Settings>) => {
		setSaving(true);
		try {
			await setSettings(updates);
			const fresh = await getSettings();
			setLocal(fresh);
		} catch (err) {
			console.error("Failed to save settings:", err);
			throw err;
		} finally {
			setSaving(false);
		}
	}, []);

	return { settings, loading, saving, save };
}

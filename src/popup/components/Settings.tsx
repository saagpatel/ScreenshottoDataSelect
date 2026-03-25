import { useCallback, useState } from "react";
import type { ModelId, OutputFormat } from "../../types";
import { useSettings } from "../hooks/useSettings";

export default function Settings() {
	const { settings, loading, saving, save } = useSettings();
	const [showKey, setShowKey] = useState(false);
	const [toast, setToast] = useState<string | null>(null);

	// Local draft state for the form
	const [draft, setDraft] = useState<{
		apiKey: string;
		model: ModelId;
		defaultFormat: OutputFormat;
		autoClipboard: boolean;
	} | null>(null);

	// Initialize draft from loaded settings
	const form =
		draft ??
		(settings
			? {
					apiKey: settings.apiKey ?? "",
					model: settings.model,
					defaultFormat: settings.defaultFormat,
					autoClipboard: settings.autoClipboard,
				}
			: null);

	const handleSave = useCallback(async () => {
		if (!form) return;
		try {
			await save({
				apiKey: form.apiKey || undefined,
				model: form.model,
				defaultFormat: form.defaultFormat,
				autoClipboard: form.autoClipboard,
			});
			setDraft(null);
			setToast("Settings saved");
			setTimeout(() => setToast(null), 2000);
		} catch {
			setToast("Failed to save");
			setTimeout(() => setToast(null), 2000);
		}
	}, [form, save]);

	if (loading || !form) {
		return (
			<div className="text-sm text-slate-400 text-center py-8">Loading...</div>
		);
	}

	const updateDraft = (updates: Partial<typeof form>) =>
		setDraft({ ...form, ...updates });

	return (
		<div className="flex flex-col gap-5">
			{/* API Key */}
			<fieldset className="flex flex-col gap-1.5">
				<label
					htmlFor="api-key"
					className="text-xs font-semibold text-slate-600 uppercase tracking-wide"
				>
					API Key
				</label>
				<div className="relative">
					<input
						id="api-key"
						type={showKey ? "text" : "password"}
						value={form.apiKey}
						onChange={(e) => updateDraft({ apiKey: e.target.value })}
						placeholder="sk-ant-..."
						className="w-full px-3 py-2 pr-10 text-sm border border-slate-300 rounded-lg
                       focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none
                       bg-white placeholder:text-slate-300"
					/>
					<button
						type="button"
						onClick={() => setShowKey(!showKey)}
						className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
						aria-label={showKey ? "Hide API key" : "Show API key"}
					>
						<svg
							className="w-4 h-4"
							fill="none"
							stroke="currentColor"
							viewBox="0 0 24 24"
						>
							{showKey ? (
								<path
									strokeLinecap="round"
									strokeLinejoin="round"
									strokeWidth={2}
									d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"
								/>
							) : (
								<>
									<path
										strokeLinecap="round"
										strokeLinejoin="round"
										strokeWidth={2}
										d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
									/>
									<path
										strokeLinecap="round"
										strokeLinejoin="round"
										strokeWidth={2}
										d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
									/>
								</>
							)}
						</svg>
					</button>
				</div>
			</fieldset>

			{/* Model */}
			<fieldset className="flex flex-col gap-1.5">
				<legend className="text-xs font-semibold text-slate-600 uppercase tracking-wide">
					Model
				</legend>
				<div className="flex gap-3">
					{(
						[
							["claude-haiku-4-5-20251001", "Haiku 4.5", "Fast, ~3s"],
							["claude-sonnet-4-5-20250514", "Sonnet 4.5", "Accurate, ~8s"],
						] as const
					).map(([id, label, desc]) => (
						<label
							key={id}
							className={`flex-1 flex flex-col items-center gap-0.5 p-3 rounded-lg border-2 cursor-pointer transition-colors
                ${
									form.model === id
										? "border-indigo-500 bg-indigo-50"
										: "border-slate-200 hover:border-slate-300 bg-white"
								}`}
						>
							<input
								type="radio"
								name="model"
								value={id}
								checked={form.model === id}
								onChange={() => updateDraft({ model: id })}
								className="sr-only"
							/>
							<span className="text-sm font-medium text-slate-700">
								{label}
							</span>
							<span className="text-xs text-slate-400">{desc}</span>
						</label>
					))}
				</div>
			</fieldset>

			{/* Default Format */}
			<fieldset className="flex flex-col gap-1.5">
				<label
					htmlFor="format"
					className="text-xs font-semibold text-slate-600 uppercase tracking-wide"
				>
					Default Format
				</label>
				<select
					id="format"
					value={form.defaultFormat}
					onChange={(e) =>
						updateDraft({ defaultFormat: e.target.value as OutputFormat })
					}
					className="px-3 py-2 text-sm border border-slate-300 rounded-lg
                     focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none
                     bg-white"
				>
					<option value="csv">CSV</option>
					<option value="json">JSON</option>
					<option value="tsv">TSV</option>
					<option value="markdown">Markdown</option>
				</select>
			</fieldset>

			{/* Auto Clipboard */}
			<label className="flex items-center gap-3 cursor-pointer">
				<input
					type="checkbox"
					checked={form.autoClipboard}
					onChange={(e) => updateDraft({ autoClipboard: e.target.checked })}
					className="w-4 h-4 rounded border-slate-300 text-indigo-600
                     focus:ring-2 focus:ring-indigo-500"
				/>
				<span className="text-sm text-slate-700">
					Auto-copy to clipboard after extraction
				</span>
			</label>

			{/* Save */}
			<button
				type="button"
				onClick={handleSave}
				disabled={saving}
				className="w-full py-2.5 bg-indigo-600 text-white font-semibold rounded-lg
                   hover:bg-indigo-700 active:bg-indigo-800 disabled:opacity-50
                   transition-colors min-h-[44px]"
			>
				{saving ? "Saving..." : "Save Settings"}
			</button>

			{/* Toast */}
			{toast && (
				<div className="text-center text-sm text-emerald-600 font-medium animate-pulse">
					{toast}
				</div>
			)}

			{/* Warning */}
			<p className="text-xs text-slate-400 leading-relaxed">
				Screenshots may contain sensitive data visible on screen. Only regions
				you select are sent to the Anthropic API. Your API key is stored locally
				and never shared.
			</p>
		</div>
	);
}

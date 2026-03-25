import { describe, expect, it } from "vitest";
import {
	get,
	getApiKey,
	getSettings,
	remove,
	set,
	setApiKey,
	setSettings,
} from "../src/lib/storage";

describe("storage wrapper", () => {
	describe("get/set/remove", () => {
		it("should store and retrieve a value", async () => {
			await set("settings.apiKey", "sk-ant-test-123");
			const result = await get("settings.apiKey");
			expect(result).toBe("sk-ant-test-123");
		});

		it("should return default for model when not set", async () => {
			const result = await get("settings.model");
			expect(result).toBe("claude-haiku-4-5-20251001");
		});

		it("should return default for autoClipboard when not set", async () => {
			const result = await get("settings.autoClipboard");
			expect(result).toBe(true);
		});

		it("should return undefined for apiKey when not set", async () => {
			const result = await get("settings.apiKey");
			expect(result).toBeUndefined();
		});

		it("should remove a value", async () => {
			await set("settings.apiKey", "sk-ant-test-123");
			await remove("settings.apiKey");
			const result = await get("settings.apiKey");
			expect(result).toBeUndefined();
		});
	});

	describe("convenience helpers", () => {
		it("getApiKey / setApiKey round-trip", async () => {
			await setApiKey("sk-ant-my-key");
			const key = await getApiKey();
			expect(key).toBe("sk-ant-my-key");
		});

		it("getSettings returns defaults when nothing saved", async () => {
			const settings = await getSettings();
			expect(settings).toEqual({
				apiKey: undefined,
				model: "claude-haiku-4-5-20251001",
				defaultFormat: "csv",
				autoClipboard: true,
				domFirst: true,
			});
		});

		it("setSettings persists partial updates", async () => {
			await setSettings({
				model: "claude-sonnet-4-5-20250514",
				autoClipboard: false,
			});
			const settings = await getSettings();
			expect(settings.model).toBe("claude-sonnet-4-5-20250514");
			expect(settings.autoClipboard).toBe(false);
			expect(settings.defaultFormat).toBe("csv"); // unchanged default
		});
	});
});

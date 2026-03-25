import { describe, expect, it } from "vitest";
import { isExtensionMessage } from "../src/lib/messages";

describe("isExtensionMessage", () => {
	it("accepts valid START_SELECTION", () => {
		expect(isExtensionMessage({ type: "START_SELECTION" })).toBe(true);
	});

	it("accepts valid REGION_SELECTED with payload", () => {
		expect(
			isExtensionMessage({
				type: "REGION_SELECTED",
				payload: { x: 0, y: 0, width: 100, height: 100, devicePixelRatio: 2 },
			}),
		).toBe(true);
	});

	it("accepts CROP_REQUEST", () => {
		expect(isExtensionMessage({ type: "CROP_REQUEST" })).toBe(true);
	});

	it("accepts CROP_RESULT", () => {
		expect(isExtensionMessage({ type: "CROP_RESULT" })).toBe(true);
	});

	it("rejects null", () => {
		expect(isExtensionMessage(null)).toBe(false);
	});

	it("rejects string", () => {
		expect(isExtensionMessage("START_SELECTION")).toBe(false);
	});

	it("rejects unknown type", () => {
		expect(isExtensionMessage({ type: "UNKNOWN" })).toBe(false);
	});

	it("rejects object without type", () => {
		expect(isExtensionMessage({ payload: {} })).toBe(false);
	});

	it("rejects non-string type", () => {
		expect(isExtensionMessage({ type: 42 })).toBe(false);
	});
});

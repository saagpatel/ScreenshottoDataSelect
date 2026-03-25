import { describe, expect, it } from "vitest";
import { calculateCost, formatCost } from "../src/lib/cost";

describe("calculateCost", () => {
	it("calculates Haiku cost correctly", () => {
		// 1000 input + 200 output at Haiku rates
		const cost = calculateCost("claude-haiku-4-5-20251001", 1000, 200);
		// (1000 * 0.8 + 200 * 4.0) / 1_000_000 = (800 + 800) / 1_000_000 = 0.0016
		expect(cost).toBeCloseTo(0.0016, 6);
	});

	it("calculates Sonnet cost correctly", () => {
		// 2000 input + 500 output at Sonnet rates
		const cost = calculateCost("claude-sonnet-4-5-20250514", 2000, 500);
		// (2000 * 3.0 + 500 * 15.0) / 1_000_000 = (6000 + 7500) / 1_000_000 = 0.0135
		expect(cost).toBeCloseTo(0.0135, 6);
	});

	it("returns 0 for 0 tokens", () => {
		expect(calculateCost("claude-haiku-4-5-20251001", 0, 0)).toBe(0);
	});
});

describe("formatCost", () => {
	it("formats sub-millicent as <$0.001", () => {
		expect(formatCost(0.0001)).toBe("<$0.001");
	});

	it("formats millicent range with 3 decimals", () => {
		expect(formatCost(0.005)).toBe("$0.005");
	});

	it("formats cent range with 2 decimals", () => {
		expect(formatCost(0.05)).toBe("$0.05");
	});

	it("formats dollar range with 2 decimals", () => {
		expect(formatCost(1.5)).toBe("$1.50");
	});
});

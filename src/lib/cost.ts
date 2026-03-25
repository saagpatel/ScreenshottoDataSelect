import type { ModelId } from "../types";

// Anthropic pricing per million tokens (USD)
const PRICING: Record<ModelId, { input: number; output: number }> = {
	"claude-haiku-4-5-20251001": { input: 0.8, output: 4.0 },
	"claude-sonnet-4-5-20250514": { input: 3.0, output: 15.0 },
};

export function calculateCost(
	model: ModelId,
	inputTokens: number,
	outputTokens: number,
): number {
	const price = PRICING[model];
	return (inputTokens * price.input + outputTokens * price.output) / 1_000_000;
}

export function formatCost(usd: number): string {
	if (usd < 0.001) return "<$0.001";
	if (usd < 0.01) return `$${usd.toFixed(3)}`;
	if (usd < 1) return `$${usd.toFixed(2)}`;
	return `$${usd.toFixed(2)}`;
}

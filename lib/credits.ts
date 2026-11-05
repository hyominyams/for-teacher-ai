// Integer nanodollars: 100 credits = $1. No per-request whole-credit rounding.
export const UNITS_PER_CREDIT = 10_000_000;
export const WELCOME_CREDITS = 30;
export const PRICE_VERSION = "openai-standard-2026-11-05";
export const CREDIT_OPERATIONS = { generate: "문장 생성", standard: "성취기준 보완", subject_plan: "평가계획 분석", polish: "학급 표현 다듬기" } as const;
export type CreditOperation = keyof typeof CREDIT_OPERATIONS;
export type BilledModel = "gpt-6-luna" | "gpt-5-nano";
export type TokenUsage = { input: number; output: number; cached: number; write30m: number; write12h: number };
export type Wallet = { balance_units: number; reserved_units: number; available_units: number; is_admin: boolean };

export function formatCredits(units: number | string, digits = 3) {
    return (Number(units) / UNITS_PER_CREDIT).toLocaleString("ko-KR", { minimumFractionDigits: 0, maximumFractionDigits: digits });
}
export function creditAmountToUnits(amount: unknown) {
    if (typeof amount !== "number" || !Number.isFinite(amount) || amount === 0 || Math.abs(amount) > 100_000) throw new Error("지급·회수할 크레딧은 0보다 크고 100,000 이하인 값으로 입력해주세요.");
    const units = Math.round(amount * UNITS_PER_CREDIT);
    if (!Number.isSafeInteger(units) || units === 0) throw new Error("크레딧 단위를 확인해주세요.");
    return units;
}
function count(value: unknown, optional = false): number {
    if (optional && (value === undefined || value === null)) return 0;
    if (typeof value !== "number" || !Number.isSafeInteger(value) || value < 0 || value > 5_000_000) throw new Error("INVALID_USAGE");
    return value;
}
export function normalizeTokenUsage(value: unknown, writeLifetime?: "30m" | "12h"): TokenUsage {
    if (!value || typeof value !== "object") throw new Error("INVALID_USAGE");
    const u = value as Record<string, unknown>;
    const details = (u.prompt_tokens_details ?? u.input_tokens_details ?? {}) as Record<string, unknown>;
    const writes = (details.cache_write_tokens_details ?? {}) as Record<string, unknown>;
    const input = count(u.prompt_tokens ?? u.input_tokens), output = count(u.completion_tokens ?? u.output_tokens);
    const cached = count(details.cached_tokens, true);
    const writeTotal = count(details.cache_write_tokens, true);
    let write30m = count(writes.ttl_30m_tokens, true), write12h = count(writes.ttl_12h_tokens, true);
    // Chat Completions can return only the total; the caller supplies its explicit TTL.
    if (writeTotal > 0 && details.cache_write_tokens_details === undefined && writeLifetime) {
        write30m = writeLifetime === "30m" ? writeTotal : 0;
        write12h = writeLifetime === "12h" ? writeTotal : 0;
    }
    if (writeTotal !== write30m + write12h || cached + writeTotal > input) throw new Error("INVALID_USAGE");
    // completion_tokens already includes reasoning tokens. Never add them twice.
    return { input, output, cached, write30m, write12h };
}
export function modelRates(model: BilledModel, inputTokens: number) {
    if (model === "gpt-5-nano") return { input: 50, cached: 5, output: 400, write30m: 0, write12h: 0 };
    if (model === "gpt-6-luna") return inputTokens > 272_000
        ? { input: 200, cached: 20, output: 750, write30m: 250, write12h: 500 }
        : { input: 100, cached: 10, output: 500, write30m: 125, write12h: 250 };
    throw new Error("UNPRICED_MODEL");
}
export function usageCostUnits(model: BilledModel, usage: TokenUsage) {
    for (const n of Object.values(usage)) count(n);
    const ordinary = usage.input - usage.cached - usage.write30m - usage.write12h;
    if (ordinary < 0 || (model === "gpt-5-nano" && (usage.write30m || usage.write12h))) throw new Error("INVALID_USAGE");
    const rates = modelRates(model, usage.input);
    return ordinary * rates.input + usage.cached * rates.cached + usage.write30m * rates.write30m + usage.write12h * rates.write12h + usage.output * rates.output;
}
export function reserveCostUnits(model: BilledModel, inputTokenCeiling: number, maxOutputTokens: number) {
    count(inputTokenCeiling); count(maxOutputTokens);
    const rates = modelRates(model, inputTokenCeiling);
    return Math.max(1, inputTokenCeiling * Math.max(rates.input, rates.write30m, rates.write12h) + maxOutputTokens * rates.output);
}

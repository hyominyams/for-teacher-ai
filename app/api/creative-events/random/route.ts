import { NextResponse } from "next/server";
import { CREATIVE_CATEGORIES } from "@/lib/constants/creative-events";

export const runtime = "nodejs";

const parseEvents = (value: string | null) => new Set(
    (value || "")
        .split(/[,，\n]/)
        .map(event => event.replace(/\s+/g, " ").trim())
        .filter(Boolean)
);

const clampCount = (value: string | null) => {
    const count = Number(value);
    if (!Number.isFinite(count)) return 3;
    return Math.min(Math.max(Math.floor(count), 1), 20);
};

const shuffle = <T,>(items: T[]) => {
    const next = [...items];
    for (let index = next.length - 1; index > 0; index -= 1) {
        const swapIndex = Math.floor(Math.random() * (index + 1));
        [next[index], next[swapIndex]] = [next[swapIndex], next[index]];
    }
    return next;
};

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const count = clampCount(searchParams.get("count"));
    const excludedEvents = parseEvents(searchParams.get("exclude"));
    const examples = Array.from(new Set(CREATIVE_CATEGORIES.flatMap(category => category.events)));
    const candidates = examples.filter(event => !excludedEvents.has(event));
    const source = candidates.length >= count ? candidates : examples;

    return NextResponse.json({
        events: shuffle(source).slice(0, count),
    });
}

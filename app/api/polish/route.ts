import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { parsePolishRequest } from "@/lib/class-polish";
import { reviewClassPolish } from "@/lib/server/class-polish";

export const runtime = "nodejs";
export const maxDuration = 90;

export async function POST(req: Request) {
    const token = req.headers.get("authorization")?.match(/^Bearer\s+(\S+)$/i)?.[1];
    if (!token) return NextResponse.json({ error: "로그인 후 학급 표현 다듬기를 이용해주세요." }, { status: 401 });
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    const apiKey = process.env.OPENAI_API_KEY;
    if (!url || !anonKey || !apiKey) return NextResponse.json({ error: "윤문 기능을 준비 중입니다. 잠시 후 다시 시도해주세요." }, { status: 503 });
    try {
        const auth = createClient(url, anonKey, { auth: { persistSession: false, autoRefreshToken: false } });
        const { data, error } = await auth.auth.getUser(token);
        if (error || !data.user) return NextResponse.json({ error: "로그인이 만료되었습니다. 다시 로그인해주세요." }, { status: 401 });
        if (Number(req.headers.get("content-length")) > 200000) return NextResponse.json({ error: "요청 크기가 너무 큽니다." }, { status: 413 });
        let input;
        try {
            const text = await req.text();
            if (Buffer.byteLength(text) > 200000) return NextResponse.json({ error: "요청 크기가 너무 큽니다." }, { status: 413 });
            input = parsePolishRequest(JSON.parse(text));
        } catch (error) {
            return NextResponse.json({ error: error instanceof SyntaxError ? "요청 데이터를 읽을 수 없습니다." : error instanceof Error ? error.message : "입력을 확인해주세요." }, { status: 400 });
        }
        const result = await reviewClassPolish(input.category, input.records, apiKey, req.signal);
        return NextResponse.json({ ...result, batchId: crypto.randomUUID() }, { headers: { "Cache-Control": "no-store" } });
    } catch (error) {
        // Never log student records, model response bodies, or credentials.
        const code = error && typeof error === "object" && "code" in error ? String(error.code) : "polish_failed";
        console.error("Class polish failed:", code);
        return NextResponse.json({ error: "윤문 검토를 완료하지 못했습니다. 원문은 변경되지 않았습니다. 잠시 후 다시 시도해주세요." }, { status: 502 });
    }
}

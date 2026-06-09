import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export async function GET(req: Request) {
    const token = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");

    if (!token) {
        return NextResponse.json({ error: "Missing authorization token" }, { status: 401 });
    }

    if (!supabaseUrl || !supabaseAnonKey) {
        return NextResponse.json({ error: "Supabase environment is not configured" }, { status: 500 });
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
        global: {
            headers: {
                Authorization: `Bearer ${token}`,
            },
        },
        auth: {
            persistSession: false,
            autoRefreshToken: false,
        },
    });

    const { data: userData, error: userError } = await supabase.auth.getUser(token);

    if (userError || !userData.user) {
        return NextResponse.json({ error: "Invalid authorization token" }, { status: 401 });
    }

    const { data, error } = await supabase
        .from("work_logs")
        .select("category,data,updated_at")
        .order("updated_at", { ascending: false });

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ logs: data || [] });
}

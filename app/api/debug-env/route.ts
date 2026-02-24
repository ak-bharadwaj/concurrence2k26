import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase-admin";

export async function GET() {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;

    try {
        const supabase = createAdminClient();
        const { data, error } = await supabase
            .from("admins")
            .select("id, username, role, active")
            .limit(10);

        return NextResponse.json({
            supabase_url: url,
            admins: data,
            error: error?.message || null
        });
    } catch (err: any) {
        return NextResponse.json({
            supabase_url: url,
            error: err.message
        });
    }
}

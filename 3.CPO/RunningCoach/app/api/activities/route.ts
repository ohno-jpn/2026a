import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  return createClient(url, key);
}

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const from = searchParams.get("from") ?? (() => {
    const d = new Date();
    d.setDate(d.getDate() - 90);
    return d.toISOString().slice(0, 10);
  })();
  const to = searchParams.get("to") ?? new Date().toISOString().slice(0, 10);
  const limit = Math.min(Number(searchParams.get("limit") ?? 100), 200);

  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("activities")
    .select(
      "id,date,title,activity_type,distance_km,duration_sec,avg_hr,max_hr,avg_pace_sec_per_km,training_stress_score,aerobic_te,avg_cadence,total_ascent,calories"
    )
    .gte("date", from)
    .lte("date", to)
    .order("date", { ascending: false })
    .limit(limit);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ activities: data ?? [] });
}

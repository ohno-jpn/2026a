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
    d.setDate(d.getDate() - 30);
    return d.toISOString().slice(0, 10);
  })();
  const to = searchParams.get("to") ?? new Date().toISOString().slice(0, 10);

  const supabase = getSupabase();

  // 期間内アクティビティの ID を取得
  const { data: acts, error: aErr } = await supabase
    .from("activities")
    .select("id,date,distance_km,duration_sec")
    .gte("date", from)
    .lte("date", to)
    .order("date", { ascending: true });

  if (aErr) return NextResponse.json({ error: aErr.message }, { status: 500 });

  const ids = (acts ?? []).map((a) => a.id);
  if (ids.length === 0) {
    return NextResponse.json({ zones_summary: [], per_activity: [], activities: [] });
  }

  // HR ゾーンデータを取得
  const { data: zones, error: zErr } = await supabase
    .from("hr_zones")
    .select("activity_id,zone,seconds,percentage")
    .in("activity_id", ids);

  if (zErr) return NextResponse.json({ error: zErr.message }, { status: 500 });

  // 期間合計のゾーン集計
  const totals = [1, 2, 3, 4, 5].map((z) => {
    const sec = (zones ?? [])
      .filter((r) => r.zone === z)
      .reduce((s, r) => s + r.seconds, 0);
    return { zone: z, total_seconds: sec, minutes: Math.round(sec / 60) };
  });
  const grand = totals.reduce((s, t) => s + t.total_seconds, 0);
  const zones_summary = totals.map((t) => ({
    ...t,
    percentage: grand > 0 ? Math.round((t.total_seconds / grand) * 10000) / 100 : 0,
  }));

  // アクティビティごとのゾーン内訳
  const per_activity = (acts ?? []).map((act) => {
    const actZones = [1, 2, 3, 4, 5].map((z) => {
      const r = (zones ?? []).find((x) => x.activity_id === act.id && x.zone === z);
      return { zone: z, seconds: r?.seconds ?? 0, percentage: r?.percentage ?? 0 };
    });
    const totalSec = actZones.reduce((s, z) => s + z.seconds, 0);
    return {
      activity_id: act.id,
      date: act.date,
      distance_km: act.distance_km,
      duration_sec: act.duration_sec,
      has_zone_data: totalSec > 0,
      zones: actZones,
    };
  });

  return NextResponse.json({ zones_summary, per_activity, activities: acts ?? [] });
}

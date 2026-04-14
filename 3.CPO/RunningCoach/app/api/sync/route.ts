import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { GarminConnect } from "garmin-connect";
import { existsSync } from "fs";
import { join } from "path";

const TOKEN_DIR = join(process.cwd(), ".garmin-tokens");

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  return createClient(url, key);
}

async function getGarminClient() {
  const client = new GarminConnect({ username: "", password: "" });
  if (existsSync(join(TOKEN_DIR, "oauth2_token.json"))) {
    client.loadTokenByFile(TOKEN_DIR);
  } else if (process.env.GARMIN_EMAIL && process.env.GARMIN_PASSWORD) {
    await client.login(process.env.GARMIN_EMAIL, process.env.GARMIN_PASSWORD);
  } else {
    throw new Error("Garmin 認証トークンが見つかりません。`npm run garmin-auth` を実行してください。");
  }
  return client;
}

async function fetchHrZones(garmin: GarminConnect, activityId: string) {
  try {
    const zones = await garmin.get(
      `https://connectapi.garmin.com/activity-service/activity/${activityId}/hrTimeInZones`
    ) as { zoneNumber: number; secsInZone?: number }[];
    if (Array.isArray(zones) && zones.length > 0) {
      return zones.map((z) => ({
        zone: z.zoneNumber,
        seconds: Math.round(z.secsInZone ?? 0),
      }));
    }
  } catch { /* 取得失敗は無視 */ }
  return null;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function upsertActivity(supabase: ReturnType<typeof getSupabase>, garmin: GarminConnect, raw: any) {
  const distanceKm = Number(raw.distance ?? 0) / 1000;
  const durationSec = Number(raw.duration ?? 0);
  const avgPaceSec = distanceKm > 0 ? Math.round(durationSec / distanceKm) : null;

  const row = {
    id: String(raw.activityId),
    date: (raw.startTimeLocal ?? raw.startTimeGMT ?? "").slice(0, 10),
    title: raw.activityName ?? "",
    activity_type: raw.activityType?.typeKey ?? "running",
    distance_km: Math.round(distanceKm * 1000) / 1000,
    duration_sec: Math.round(durationSec),
    calories: Math.round(Number(raw.calories ?? 0)),
    avg_hr: raw.averageHR ? Math.round(Number(raw.averageHR)) : null,
    max_hr: raw.maxHR ? Math.round(Number(raw.maxHR)) : null,
    aerobic_te: raw.aerobicTrainingEffect ? Number(raw.aerobicTrainingEffect) : null,
    avg_pace_sec_per_km: avgPaceSec,
    avg_cadence: raw.averageRunningCadenceInStepsPerMinute
      ? Math.round(Number(raw.averageRunningCadenceInStepsPerMinute)) : null,
    max_cadence: raw.maxRunningCadenceInStepsPerMinute
      ? Math.round(Number(raw.maxRunningCadenceInStepsPerMinute)) : null,
    avg_stride_length: raw.avgStrideLength ? Number(raw.avgStrideLength) : null,
    avg_vertical_oscillation: raw.avgVerticalOscillation ? Number(raw.avgVerticalOscillation) : null,
    avg_ground_contact_time: raw.avgGroundContactTime ? Math.round(Number(raw.avgGroundContactTime)) : null,
    avg_vertical_ratio: raw.avgVerticalRatio ? Number(raw.avgVerticalRatio) : null,
    avg_gct_balance: raw.avgGroundContactBalance ?? null,
    normalized_power: raw.normPower ? Math.round(Number(raw.normPower)) : null,
    avg_power: raw.avgPower ? Math.round(Number(raw.avgPower)) : null,
    max_power: raw.maxPower ? Math.round(Number(raw.maxPower)) : null,
    training_stress_score: raw.trainingStressScore ? Number(raw.trainingStressScore) : null,
    total_ascent: raw.elevationGain ? Number(raw.elevationGain) : null,
    total_descent: raw.elevationLoss ? Number(raw.elevationLoss) : null,
    min_temp: raw.minTemperature ? Number(raw.minTemperature) : null,
    max_temp: raw.maxTemperature ? Number(raw.maxTemperature) : null,
    steps: raw.steps ? Number(raw.steps) : null,
    raw_json: raw,
    synced_at: new Date().toISOString(),
  };

  const { error } = await supabase.from("activities").upsert(row, { onConflict: "id" });
  if (error) throw new Error(`activities upsert 失敗: ${error.message}`);

  const hrZonesData = await fetchHrZones(garmin, row.id);
  if (hrZonesData) {
    const totalSec = hrZonesData.reduce((s, z) => s + z.seconds, 0);
    const zoneRows = hrZonesData.map((z) => ({
      activity_id: row.id,
      zone: z.zone,
      seconds: z.seconds,
      percentage: totalSec > 0 ? Math.round((z.seconds / totalSec) * 10000) / 100 : 0,
    }));
    const { error: zErr } = await supabase
      .from("hr_zones")
      .upsert(zoneRows, { onConflict: "activity_id,zone" });
    if (zErr) throw new Error(`hr_zones upsert 失敗: ${zErr.message}`);
  }

  return { id: row.id, date: row.date, distance_km: row.distance_km, hasZone: !!hrZonesData };
}

export async function POST(req: NextRequest) {
  const { days = 30 } = await req.json().catch(() => ({})) as { days?: number };

  try {
    const garmin = await getGarminClient();
    const supabase = getSupabase();

    const rawList = await garmin.getActivities(0, 200) as Record<string, unknown>[];
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);

    const filtered = rawList.filter((a) => {
      const d = new Date((a.startTimeLocal ?? a.startTimeGMT ?? 0) as string);
      const type = String((a.activityType as Record<string, string>)?.typeKey ?? "").toLowerCase();
      return d >= cutoff && (type.includes("running") || Number(a.distance ?? 0) > 0);
    });

    const results: { id: string; date: string; distance_km: number; hasZone: boolean }[] = [];
    for (const raw of filtered) {
      const result = await upsertActivity(supabase, garmin, raw);
      results.push(result);
    }

    return NextResponse.json({
      synced: results.length,
      activities: results,
    });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "不明なエラー";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

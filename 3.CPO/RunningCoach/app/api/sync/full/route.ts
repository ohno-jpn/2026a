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
    await supabase.from("hr_zones").upsert(zoneRows, { onConflict: "activity_id,zone" });
  }
}

export async function GET() {
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const send = (data: object) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
      };

      try {
        send({ type: "connecting" });
        const garmin = await getGarminClient();
        const supabase = getSupabase();
        send({ type: "connected" });

        let offset = 0;
        const pageSize = 100;
        let totalSynced = 0;
        let totalSkipped = 0;
        let totalFetched = 0;

        while (true) {
          const rawList = await garmin.getActivities(offset, pageSize) as unknown as Record<string, unknown>[];
          if (!rawList || rawList.length === 0) break;

          totalFetched += rawList.length;

          // Supabase に既存のIDを確認
          const garminIds = rawList.map((a) => String(a.activityId));
          const { data: existing } = await supabase
            .from("activities")
            .select("id")
            .in("id", garminIds);
          const existingIds = new Set((existing ?? []).map((r: { id: string }) => r.id));

          const toSync = rawList.filter((a) => !existingIds.has(String(a.activityId)));
          totalSkipped += rawList.length - toSync.length;

          for (const raw of toSync) {
            await upsertActivity(supabase, garmin, raw);
            totalSynced++;
            send({ type: "progress", synced: totalSynced, skipped: totalSkipped, fetched: totalFetched });
          }

          // 新規がなくても進捗を通知
          if (toSync.length === 0) {
            send({ type: "progress", synced: totalSynced, skipped: totalSkipped, fetched: totalFetched });
          }

          // 最終ページ
          if (rawList.length < pageSize) break;
          offset += pageSize;

          // レート制限対策
          await new Promise((r) => setTimeout(r, 600));
        }

        send({ type: "done", synced: totalSynced, skipped: totalSkipped, fetched: totalFetched });
      } catch (e) {
        const message = e instanceof Error ? e.message : "不明なエラー";
        send({ type: "error", message });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      "Connection": "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}

#!/usr/bin/env node
/**
 * Garmin Connect MCP Server
 *
 * 提供ツール:
 *   - sync_activities   : Garmin から直近 N 日分のアクティビティを Supabase に保存
 *   - list_activities   : Supabase に保存済みのアクティビティを取得
 *   - get_hr_zones      : 指定期間の心拍ゾーン集計を取得
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { createClient } from "@supabase/supabase-js";
import { GarminConnect } from "garmin-connect";
import { createRequire } from "module";
import { existsSync, readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { z } from "zod";

const require = createRequire(import.meta.url);
const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = join(__dirname, "..");
const TOKEN_DIR = join(ROOT_DIR, ".garmin-tokens");

// ── .env.local 読み込み ───────────────────────────────────────
const envPath = join(ROOT_DIR, ".env.local");
if (existsSync(envPath)) {
  for (const line of readFileSync(envPath, "utf-8").split("\n")) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const eq = t.indexOf("=");
    if (eq > 0) {
      const k = t.slice(0, eq).trim();
      const v = t.slice(eq + 1).trim().replace(/^["']|["']$/g, "");
      if (!process.env[k]) process.env[k] = v;
    }
  }
}

// ── Supabase クライアント ─────────────────────────────────────
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

// ── Garmin Connect クライアント ───────────────────────────────
async function getGarminClient() {
  const client = new GarminConnect({ username: "", password: "" });
  if (existsSync(join(TOKEN_DIR, "oauth2_token.json"))) {
    client.loadTokenByFile(TOKEN_DIR);
  } else if (process.env.GARMIN_EMAIL && process.env.GARMIN_PASSWORD) {
    await client.login(process.env.GARMIN_EMAIL, process.env.GARMIN_PASSWORD);
  } else {
    throw new Error(
      "Garmin 認証トークンが見つかりません。`npm run garmin-auth` を実行してください。"
    );
  }
  return client;
}

// ── HR ゾーン計算 ─────────────────────────────────────────────
// Garmin の 5 ゾーン定義: Zone1〜Zone5 の秒数を raw_json から取得
// Garmin API の activityDetail に含まれる heartRateDTOs を使う
function calcHrZones(activityDetail, maxHR) {
  // Garmin API が返す heartRateZones フィールドを優先
  const zones = activityDetail?.heartRateZones;
  if (zones && Array.isArray(zones) && zones.length >= 5) {
    return zones.slice(0, 5).map((z, i) => ({
      zone: i + 1,
      seconds: Math.round((z.secsInZone ?? z.totalTime ?? 0)),
    }));
  }

  // フォールバック: timeInHrZone1〜5 フィールド
  const fields = [
    activityDetail?.timeInHrZone1,
    activityDetail?.timeInHrZone2,
    activityDetail?.timeInHrZone3,
    activityDetail?.timeInHrZone4,
    activityDetail?.timeInHrZone5,
  ];
  if (fields.some((v) => v != null)) {
    return fields.map((v, i) => ({
      zone: i + 1,
      seconds: Math.round(v ?? 0),
    }));
  }

  return null;
}

// ── アクティビティを Supabase に upsert ───────────────────────
async function upsertActivity(raw, detail) {
  const distanceKm = Number(raw.distance ?? 0) / 1000;
  const durationSec = Number(raw.duration ?? 0);
  const avgPaceSec =
    distanceKm > 0 ? Math.round(durationSec / distanceKm) : null;

  const row = {
    id: String(raw.activityId),
    date: (raw.startTimeLocal ?? raw.startTimeGMT ?? "").slice(0, 10),
    title: raw.activityName ?? "",
    activity_type: raw.activityType?.typeKey ?? "running",
    distance_km: Math.round(distanceKm * 1000) / 1000,
    duration_sec: Math.round(durationSec),
    calories: Number(raw.calories ?? 0),
    avg_hr: raw.averageHR ? Number(raw.averageHR) : null,
    max_hr: raw.maxHR ? Number(raw.maxHR) : null,
    aerobic_te: raw.aerobicTrainingEffect ? Number(raw.aerobicTrainingEffect) : null,
    avg_pace_sec_per_km: avgPaceSec,
    avg_cadence: raw.averageRunningCadenceInStepsPerMinute
      ? Number(raw.averageRunningCadenceInStepsPerMinute)
      : null,
    max_cadence: raw.maxRunningCadenceInStepsPerMinute
      ? Number(raw.maxRunningCadenceInStepsPerMinute)
      : null,
    avg_stride_length: raw.avgStrideLength ? Number(raw.avgStrideLength) : null,
    avg_vertical_oscillation: raw.avgVerticalOscillation
      ? Number(raw.avgVerticalOscillation)
      : null,
    avg_ground_contact_time: raw.avgGroundContactTime
      ? Number(raw.avgGroundContactTime)
      : null,
    avg_vertical_ratio: raw.avgVerticalRatio ? Number(raw.avgVerticalRatio) : null,
    normalized_power: raw.normPower ? Number(raw.normPower) : null,
    avg_power: raw.avgPower ? Number(raw.avgPower) : null,
    max_power: raw.maxPower ? Number(raw.maxPower) : null,
    training_stress_score: raw.trainingStressScore
      ? Number(raw.trainingStressScore)
      : null,
    total_ascent: raw.elevationGain ? Number(raw.elevationGain) : null,
    total_descent: raw.elevationLoss ? Number(raw.elevationLoss) : null,
    min_temp: raw.minTemperature ? Number(raw.minTemperature) : null,
    max_temp: raw.maxTemperature ? Number(raw.maxTemperature) : null,
    steps: raw.steps ? Number(raw.steps) : null,
    raw_json: raw,
    synced_at: new Date().toISOString(),
  };

  const { error } = await supabase.from("activities").upsert(row, {
    onConflict: "id",
  });
  if (error) throw new Error(`activities upsert 失敗: ${error.message}`);

  // HR ゾーンデータがあれば保存
  const hrZonesData = calcHrZones(detail, row.max_hr);
  if (hrZonesData) {
    const totalSec = hrZonesData.reduce((s, z) => s + z.seconds, 0);
    const zoneRows = hrZonesData.map((z) => ({
      activity_id: row.id,
      zone: z.zone,
      seconds: z.seconds,
      percentage:
        totalSec > 0
          ? Math.round((z.seconds / totalSec) * 10000) / 100
          : 0,
    }));
    const { error: zErr } = await supabase
      .from("hr_zones")
      .upsert(zoneRows, { onConflict: "activity_id,zone" });
    if (zErr) throw new Error(`hr_zones upsert 失敗: ${zErr.message}`);
  }

  return row;
}

// ── MCP サーバー構築 ──────────────────────────────────────────
const server = new McpServer({
  name: "garmin-runningcoach",
  version: "0.1.0",
});

// ── ツール: sync_activities ───────────────────────────────────
server.tool(
  "sync_activities",
  "Garmin Connect から直近のアクティビティを取得して Supabase に保存します",
  {
    days: z.number().int().min(1).max(365).default(30).describe(
      "取得する日数（デフォルト: 30日）"
    ),
    limit: z.number().int().min(1).max(200).default(50).describe(
      "最大取得件数（デフォルト: 50件）"
    ),
    with_hr_zones: z.boolean().default(true).describe(
      "心拍ゾーンデータも取得するか（デフォルト: true）"
    ),
  },
  async ({ days, limit, with_hr_zones }) => {
    const garmin = await getGarminClient();

    // アクティビティ一覧を取得
    const rawList = await garmin.getActivities(0, limit);
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);

    const filtered = rawList.filter((a) => {
      const d = new Date(a.startTimeLocal ?? a.startTimeGMT ?? 0);
      const type = String(a.activityType?.typeKey ?? "").toLowerCase();
      return d >= cutoff && (type.includes("running") || Number(a.distance ?? 0) > 0);
    });

    const results = [];
    for (const raw of filtered) {
      let detail = null;
      if (with_hr_zones) {
        try {
          detail = await garmin.getActivityDetails(raw);
        } catch {
          // 詳細取得失敗は無視してサマリーのみ保存
        }
      }
      const saved = await upsertActivity(raw, detail);
      results.push({
        id: saved.id,
        date: saved.date,
        title: saved.title,
        distance_km: saved.distance_km,
        avg_hr: saved.avg_hr,
      });
    }

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(
            {
              synced: results.length,
              period_days: days,
              activities: results,
            },
            null,
            2
          ),
        },
      ],
    };
  }
);

// ── ツール: list_activities ───────────────────────────────────
server.tool(
  "list_activities",
  "Supabase に保存済みのアクティビティ一覧を返します",
  {
    from: z.string().optional().describe("開始日 YYYY-MM-DD（省略: 30日前）"),
    to: z.string().optional().describe("終了日 YYYY-MM-DD（省略: 今日）"),
    limit: z.number().int().min(1).max(200).default(50),
  },
  async ({ from, to, limit }) => {
    const toDate = to ?? new Date().toISOString().slice(0, 10);
    const fromDate =
      from ??
      (() => {
        const d = new Date();
        d.setDate(d.getDate() - 30);
        return d.toISOString().slice(0, 10);
      })();

    const { data, error } = await supabase
      .from("activities")
      .select(
        "id,date,title,activity_type,distance_km,duration_sec,avg_hr,max_hr,avg_pace_sec_per_km,training_stress_score,aerobic_te"
      )
      .gte("date", fromDate)
      .lte("date", toDate)
      .order("date", { ascending: false })
      .limit(limit);

    if (error) throw new Error(error.message);
    return {
      content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
    };
  }
);

// ── ツール: get_hr_zones ──────────────────────────────────────
server.tool(
  "get_hr_zones",
  "指定期間の心拍ゾーン集計を Supabase から取得します",
  {
    from: z.string().optional().describe("開始日 YYYY-MM-DD（省略: 30日前）"),
    to: z.string().optional().describe("終了日 YYYY-MM-DD（省略: 今日）"),
  },
  async ({ from, to }) => {
    const toDate = to ?? new Date().toISOString().slice(0, 10);
    const fromDate =
      from ??
      (() => {
        const d = new Date();
        d.setDate(d.getDate() - 30);
        return d.toISOString().slice(0, 10);
      })();

    const { data: acts, error: aErr } = await supabase
      .from("activities")
      .select("id,date")
      .gte("date", fromDate)
      .lte("date", toDate);
    if (aErr) throw new Error(aErr.message);

    const ids = (acts ?? []).map((a) => a.id);
    if (ids.length === 0) {
      return {
        content: [{ type: "text", text: JSON.stringify({ zones: [], total_activities: 0 }) }],
      };
    }

    const { data: zones, error: zErr } = await supabase
      .from("hr_zones")
      .select("activity_id,zone,seconds,percentage")
      .in("activity_id", ids);
    if (zErr) throw new Error(zErr.message);

    // ゾーン別集計
    const totals = [1, 2, 3, 4, 5].map((z) => {
      const sec = (zones ?? [])
        .filter((r) => r.zone === z)
        .reduce((s, r) => s + r.seconds, 0);
      return { zone: z, total_seconds: sec };
    });
    const grandTotal = totals.reduce((s, t) => s + t.total_seconds, 0);
    const summary = totals.map((t) => ({
      ...t,
      percentage:
        grandTotal > 0
          ? Math.round((t.total_seconds / grandTotal) * 10000) / 100
          : 0,
      minutes: Math.round(t.total_seconds / 60),
    }));

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(
            {
              period: { from: fromDate, to: toDate },
              total_activities: ids.length,
              zones: summary,
              raw: zones,
            },
            null,
            2
          ),
        },
      ],
    };
  }
);

// ── 起動 ─────────────────────────────────────────────────────
const transport = new StdioServerTransport();
await server.connect(transport);

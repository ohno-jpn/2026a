import { NextRequest, NextResponse } from "next/server";
import { GarminConnect } from "garmin-connect";
import { existsSync } from "fs";
import { join } from "path";

const TOKEN_DIR = join(process.cwd(), ".garmin-tokens");

async function getGarminClient() {
  const client = new GarminConnect({ username: "", password: "" });
  if (existsSync(join(TOKEN_DIR, "oauth2_token.json"))) {
    client.loadTokenByFile(TOKEN_DIR);
  } else if (process.env.GARMIN_EMAIL && process.env.GARMIN_PASSWORD) {
    await client.login(process.env.GARMIN_EMAIL, process.env.GARMIN_PASSWORD);
  } else {
    throw new Error("Garmin 認証トークンが見つかりません");
  }
  return client;
}

// directWorkoutRpe: Garmin 内部は 10 刻み（10=1, 20=2, ..., 100=10）
// ÷10 で 1〜10 スケールに変換
function rpeToTen(rpe: number | null): number | null {
  if (rpe == null || rpe === 0) return null;
  return Math.round(rpe / 10);
}

// directWorkoutFeel: 0=未設定, 25=悪い, 50=普通, 75=良い, 100=最高（4段階）
const FEEL_MAP: Record<number, string> = {
  25:  "悪い",
  50:  "普通",
  75:  "良い",
  100: "最高",
};

function feelLabel(feel: number | null): string | null {
  if (feel == null || feel === 0) return null;
  return FEEL_MAP[feel] ?? null;
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    const garmin = await getGarminClient();
    const detail = await (garmin as GarminConnect & {
      getActivity: (a: { activityId: number }) => Promise<{
        summaryDTO?: { directWorkoutRpe?: number; directWorkoutFeel?: number };
        description?: string;
      }>;
    }).getActivity({ activityId: Number(id) });

    const summary = detail?.summaryDTO ?? {};
    const rawRpe = summary.directWorkoutRpe ?? null;
    const rawFeel = summary.directWorkoutFeel ?? null;

    return NextResponse.json({
      rpe: rpeToTen(rawRpe),          // 1〜10 変換済み
      rpe_raw: rawRpe,                // 生値
      feel: rawFeel,
      feel_label: feelLabel(rawFeel),
      description: detail?.description ?? null,
    });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "不明なエラー";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

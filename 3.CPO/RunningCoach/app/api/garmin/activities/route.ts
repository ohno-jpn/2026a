import { NextResponse } from "next/server";
import { GarminConnect } from "garmin-connect";
import path from "path";
import type { GarminActivity } from "@/lib/types";

const TOKEN_DIR = path.join(process.cwd(), ".garmin-tokens");

export async function GET() {
  try {
    const client = new GarminConnect({ username: "", password: "" });

    // トークンファイルが存在すれば読み込む（MFA対応の推奨パス）
    try {
      client.loadTokenByFile(TOKEN_DIR);
    } catch {
      // トークンファイルが存在しない場合はパスワード認証にフォールバック
      const email = process.env.GARMIN_EMAIL;
      const password = process.env.GARMIN_PASSWORD;
      if (!email || !password) {
        return NextResponse.json(
          {
            error:
              "Garmin認証トークンが見つかりません。ターミナルで `npm run garmin-auth` を実行してください。",
            setup_required: true,
          },
          { status: 401 }
        );
      }
      await client.login(email, password);
    }

    // 直近30件のアクティビティを取得
    const raw = await client.getActivities(0, 30);

    const activities: GarminActivity[] = (raw as unknown as Record<string, unknown>[])
      .filter((a) => {
        const type = String(
          (a.activityType as Record<string, unknown>)?.typeKey ?? ""
        ).toLowerCase();
        return type.includes("running") || Number(a.distance ?? 0) > 0;
      })
      .map((a) => {
        const distanceKm = Number(a.distance ?? 0) / 1000;
        const durationSec = Number(a.duration ?? 0);
        const h = Math.floor(durationSec / 3600);
        const m = Math.floor((durationSec % 3600) / 60);
        const s = Math.round(durationSec % 60);
        const timeStr = `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;

        const avgPaceSec = distanceKm > 0 ? durationSec / distanceKm : 0;
        const avgPaceStr =
          avgPaceSec > 0
            ? `${Math.floor(avgPaceSec / 60)}:${String(Math.round(avgPaceSec % 60)).padStart(2, "0")}`
            : undefined;

        return {
          activityType: String(
            (a.activityType as Record<string, unknown>)?.typeKey ?? "running"
          ),
          date: String(a.startTimeLocal ?? a.startTimeGMT ?? ""),
          title: String(a.activityName ?? ""),
          distanceKm: Math.round(distanceKm * 100) / 100,
          calories: Number(a.calories ?? 0),
          time: timeStr,
          movingTime: timeStr,
          elapsedTime: timeStr,
          avgHR: a.averageHR ? Number(a.averageHR) : undefined,
          maxHR: a.maxHR ? Number(a.maxHR) : undefined,
          aerobicTE: a.aerobicTrainingEffect
            ? Number(a.aerobicTrainingEffect)
            : undefined,
          avgPacePerKm: avgPaceStr,
          avgCadence: a.averageRunningCadenceInStepsPerMinute
            ? Number(a.averageRunningCadenceInStepsPerMinute)
            : undefined,
          maxCadence: a.maxRunningCadenceInStepsPerMinute
            ? Number(a.maxRunningCadenceInStepsPerMinute)
            : undefined,
          avgStrideLength: a.avgStrideLength
            ? Number(a.avgStrideLength)
            : undefined,
          avgVerticalOscillation: a.avgVerticalOscillation
            ? Number(a.avgVerticalOscillation)
            : undefined,
          avgGroundContactTime: a.avgGroundContactTime
            ? Number(a.avgGroundContactTime)
            : undefined,
          normalizedPower: a.normPower ? Number(a.normPower) : undefined,
          avgPower: a.avgPower ? Number(a.avgPower) : undefined,
          maxPower: a.maxPower ? Number(a.maxPower) : undefined,
          trainingStressScore: a.trainingStressScore
            ? Number(a.trainingStressScore)
            : undefined,
          totalAscent: a.elevationGain ? Number(a.elevationGain) : undefined,
          totalDescent: a.elevationLoss ? Number(a.elevationLoss) : undefined,
          minTemp: a.minTemperature ? Number(a.minTemperature) : undefined,
          maxTemp: a.maxTemperature ? Number(a.maxTemperature) : undefined,
          steps: a.steps ? Number(a.steps) : undefined,
          numberOfLaps: a.lapCount ? Number(a.lapCount) : undefined,
        } satisfies GarminActivity;
      });

    return NextResponse.json({ activities });
  } catch (err) {
    const message = err instanceof Error ? err.message : "不明なエラー";

    // トークン期限切れの可能性を検出
    const isTokenExpired =
      message.includes("401") ||
      message.includes("Unauthorized") ||
      message.includes("expired");

    if (isTokenExpired) {
      return NextResponse.json(
        {
          error:
            "Garmin認証トークンの有効期限が切れています。ターミナルで `npm run garmin-auth` を再実行してください。",
          setup_required: true,
        },
        { status: 401 }
      );
    }

    return NextResponse.json(
      { error: `Garmin Connect への接続に失敗しました: ${message}` },
      { status: 500 }
    );
  }
}

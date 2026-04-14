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
    throw new Error("Garmin 認証トークンが見つかりません。`npm run garmin-auth` を実行してください。");
  }
  return client;
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { rating, comment } = await req.json() as { rating: number; comment: string };

  if (!comment?.trim() && !rating) {
    return NextResponse.json({ error: "メモまたは評価が空です" }, { status: 400 });
  }

  try {
    const garmin = await getGarminClient();

    // 現在のアクティビティ情報を取得
    const activity = await garmin.getActivity({ activityId: id }) as {
      activityId: string;
      activityName: string;
      description: string | null;
    };

    // 追記するテキストを組み立て
    const ratingLabel = ["", "悪い", "やや悪い", "普通", "良い", "最高"][rating] ?? "";
    const lines: string[] = [];
    if (rating > 0) lines.push(`[評価] ${"★".repeat(rating)} ${ratingLabel}`);
    if (comment.trim()) lines.push(`[メモ] ${comment.trim()}`);
    const appendText = lines.join("\n");

    // 既存 description の末尾に追記
    const currentDesc = (activity.description ?? "").trimEnd();
    const newDesc = currentDesc
      ? `${currentDesc}\n\n---\n${appendText}`
      : appendText;

    // Garmin Connect に PUT
    await garmin.put(`${garmin.url.ACTIVITY}${id}`, {
      activityId: id,
      activityName: activity.activityName,
      description: newDesc,
    });

    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "不明なエラー";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

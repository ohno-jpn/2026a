#!/usr/bin/env node
/**
 * Garmin Connect 初回認証スクリプト（MFA対応）
 *
 * メールMFAを含む Garmin SSO ログインを対話式で実行し、
 * OAuth トークンを .garmin-tokens/ に保存します。
 *
 * 使い方:
 *   npm run garmin-auth
 *
 * トークンの有効期限が切れたら再実行してください。
 */

import { createRequire } from "module";
import { createInterface } from "readline";
import { createHmac } from "crypto";
import { mkdirSync, writeFileSync, existsSync, readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const require = createRequire(import.meta.url);
const axios = require("axios");
const qs = require("qs");
const OAuth = require("oauth-1.0a");

const __dirname = dirname(fileURLToPath(import.meta.url));
const TOKEN_DIR = join(__dirname, "..", ".garmin-tokens");

// .env.local を自動読み込み
const envPath = join(__dirname, "..", ".env.local");
if (existsSync(envPath)) {
  const envContent = readFileSync(envPath, "utf-8");
  for (const line of envContent.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq > 0) {
      const key = trimmed.slice(0, eq).trim();
      const val = trimmed.slice(eq + 1).trim();
      if (!process.env[key]) process.env[key] = val;
    }
  }
}

// ── URLs ──────────────────────────────────────────────────────────────────
const DOMAIN            = "garmin.com";
const SSO_ORIGIN        = `https://sso.${DOMAIN}`;
const SSO_EMBED         = `${SSO_ORIGIN}/sso/embed`;
const SIGNIN_URL        = `${SSO_ORIGIN}/sso/signin`;
const GC_MODERN         = `https://connect.${DOMAIN}/modern`;
const OAUTH_URL         = `https://connectapi.${DOMAIN}/oauth-service/oauth`;
const OAUTH_CONSUMER_URL = "https://thegarth.s3.amazonaws.com/oauth_consumer.json";

const UA_BROWSER = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/117.0.0.0 Safari/537.36";
const UA_MOBILE  = "com.garmin.android.apps.connectmobile";

// ── Regex ─────────────────────────────────────────────────────────────────
const CSRF_RE        = /name="_csrf"\s+value="(.+?)"/;
const TICKET_RE      = /ticket=([^"&\s]+)/;
const MFA_DETECT_RE  = /verifyMFA|mfa_code|Enter.*code|check.*email|確認コード/i;
const FORM_ACTION_RE = /<form[^>]+action="([^"]+)"/i;

// ── Simple cookie jar ─────────────────────────────────────────────────────
const jar = {};
function storeCookies(headers) {
  const raw = headers["set-cookie"];
  if (!raw) return;
  for (const c of Array.isArray(raw) ? raw : [raw]) {
    const eq = c.indexOf("=");
    const semi = c.indexOf(";");
    if (eq > 0) {
      jar[c.slice(0, eq).trim()] = c.slice(eq + 1, semi > eq ? semi : undefined).trim();
    }
  }
}
function cookieStr() {
  return Object.entries(jar).map(([k, v]) => `${k}=${v}`).join("; ");
}

// ── HTTP helpers ──────────────────────────────────────────────────────────
const http = axios.create({ maxRedirects: 5, validateStatus: () => true });

async function get(url, extra = {}) {
  const res = await http.get(url, {
    responseType: "text",
    headers: { "User-Agent": UA_BROWSER, Cookie: cookieStr(), ...extra },
  });
  storeCookies(res.headers);
  return res.data;
}

async function postRaw(url, body, extra = {}) {
  const res = await http.post(url, body, {
    responseType: "text",
    headers: { "User-Agent": UA_BROWSER, Cookie: cookieStr(), ...extra },
  });
  storeCookies(res.headers);
  return res;
}


// ── Prompt helper ─────────────────────────────────────────────────────────
function prompt(question) {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => rl.question(question, (a) => { rl.close(); resolve(a.trim()); }));
}

// ── Main ──────────────────────────────────────────────────────────────────
async function main() {
  console.log("=== Garmin Connect 認証セットアップ ===\n");

  const email    = process.env.GARMIN_EMAIL    || await prompt("Garmin メールアドレス: ");
  const password = process.env.GARMIN_PASSWORD || await prompt("Garmin パスワード: ");

  // Step 1: OAuth Consumer キーを取得
  console.log("\n[1/5] OAuth Consumer 情報を取得中...");
  const consumerRes = await axios.get(OAUTH_CONSUMER_URL);
  const consumer = { key: consumerRes.data.consumer_key, secret: consumerRes.data.consumer_secret };

  // Step 2: SSO セッション初期化 + CSRF トークン取得
  console.log("[2/5] Garmin SSO に接続中...");
  await get(`${SSO_EMBED}?${qs.stringify({ clientId: "GarminConnect", locale: "en", service: GC_MODERN })}`);

  const step2Html = await get(`${SIGNIN_URL}?${qs.stringify({
    id: "gauth-widget", embedWidget: true, locale: "en", gauthHost: SSO_EMBED,
  })}`);

  const csrfMatch = CSRF_RE.exec(step2Html);
  if (!csrfMatch) throw new Error("CSRFトークンが見つかりませんでした。ネットワーク接続を確認してください。");
  const csrf = csrfMatch[1];

  // Step 3: ログインフォーム送信
  console.log("[3/5] ログインフォームを送信中...");
  const signinQuery = qs.stringify({
    id: "gauth-widget", embedWidget: true, clientId: "GarminConnect",
    locale: "en", gauthHost: SSO_EMBED, service: SSO_EMBED,
    source: SSO_EMBED, redirectAfterAccountLoginUrl: SSO_EMBED,
    redirectAfterAccountCreationUrl: SSO_EMBED,
  });
  const step3Url = `${SIGNIN_URL}?${signinQuery}`;

  const step3Res = await postRaw(
    step3Url,
    qs.stringify({ username: email, password, embed: "true", _csrf: csrf }),
    { "Content-Type": "application/x-www-form-urlencoded", Origin: SSO_ORIGIN, Referer: SIGNIN_URL },
  );
  let html = step3Res.data;

  // 429 Rate Limit チェック
  if (step3Res.status === 429 || (typeof html === "string" && html.includes('"status-code":"429"'))) {
    throw new Error(
      "ログイン試行が多すぎます（429 Too Many Requests）。\n" +
      "  Garmin が一時的にアクセスをブロックしています。\n" +
      "  30〜60分待ってから再試行してください。"
    );
  }

  // Step 3b: MFA が必要な場合
  if (!TICKET_RE.test(html) && MFA_DETECT_RE.test(html)) {
    // コマンドライン引数 --mfa-code=XXXXXX でも指定可能
    const argCode = process.argv.find((a) => a.startsWith("--mfa-code="))?.split("=")[1];
    console.log("\n>>> MFA認証が必要です <<<");
    console.log("Garmin登録メールアドレスに届いた確認コード（6桁）を入力してください。");
    console.log("(または: npm run garmin-auth -- --mfa-code=XXXXXX)");
    const code = argCode || await prompt("MFAコード: ");

    const mfaCsrfMatch = CSRF_RE.exec(html);
    const mfaCsrf = mfaCsrfMatch ? mfaCsrfMatch[1] : csrf;

    // MFA送信URLは contextPath + /verifyMFA/loginEnterMfaCode + queryString
    const mfaUrl = `${SSO_ORIGIN}/sso/verifyMFA/loginEnterMfaCode?${signinQuery}`;

    // MFAページの内容をファイルに保存（デバッグ用）
    writeFileSync(join(__dirname, "..", ".garmin-mfa-debug.html"), html);
    console.log(`    → MFA送信URL: ${mfaUrl}`);
    console.log(`    → CSRF: ${mfaCsrf ? "取得済み" : "なし（元のCSRFを使用）"}`);

    console.log(`    → 送信Cookie数: ${Object.keys(jar).length} (${Object.keys(jar).join(", ")})`);
    console.log("[3b/5] MFAコードを送信中...");
    // フィールド名は mfa-code（ハイフン）、fromPage は setupEnterMfaCode
    const mfaRes = await postRaw(
      mfaUrl,
      qs.stringify({ "mfa-code": code, _csrf: mfaCsrf, embed: "true", fromPage: "setupEnterMfaCode" }),
      { "Content-Type": "application/x-www-form-urlencoded", Origin: SSO_ORIGIN, Referer: step3Url },
    );
    html = mfaRes.data;
    console.log(`    → MFAレスポンス HTTP ${mfaRes.status}`);

    // MFA後レスポンスもファイル保存
    writeFileSync(join(__dirname, "..", ".garmin-mfa-response.html"), html);
  }

  const ticketMatch = TICKET_RE.exec(html);
  if (!ticketMatch) {
    console.error("\n--- レスポンスの先頭800文字 (デバッグ用) ---");
    console.error(html.slice(0, 800));
    console.error("\n--- .garmin-mfa-response.html を確認してください ---");
    throw new Error("ログインに失敗しました。.garmin-mfa-response.html を確認して原因を調べてください。");
  }
  const ticket = ticketMatch[1];
  console.log("    → ログイン成功（チケット取得）");

  // Step 4: OAuth1 トークン取得
  console.log("[4/5] OAuth1 トークンを取得中...");
  const oauth = new OAuth({
    consumer,
    signature_method: "HMAC-SHA1",
    hash_function: (base, key) => createHmac("sha1", key).update(base).digest("base64"),
  });

  const oauth1Url = `${OAUTH_URL}/preauthorized?${qs.stringify({
    ticket, "login-url": SSO_EMBED, "accepts-mfa-tokens": true,
  })}`;
  const oauth1Headers = oauth.toHeader(oauth.authorize({ url: oauth1Url, method: "GET" }));
  const oauth1Raw = await get(oauth1Url, { ...oauth1Headers, "User-Agent": UA_MOBILE });
  const oauth1Token = qs.parse(oauth1Raw);
  if (!oauth1Token.oauth_token) throw new Error("OAuth1 トークンの取得に失敗しました");

  // Step 5: OAuth2 トークン取得（OAuth1 → OAuth2 交換）
  console.log("[5/5] OAuth2 トークンを取得中...");
  const tokenPair = { key: oauth1Token.oauth_token, secret: oauth1Token.oauth_token_secret };
  const exchangeBase = `${OAUTH_URL}/exchange/user/2.0`;
  const step5Auth = oauth.authorize({ url: exchangeBase, method: "POST", data: null }, tokenPair);
  const exchangeUrl = `${exchangeBase}?${qs.stringify(step5Auth)}`;

  const exchangeRes = await http.post(exchangeUrl, null, {
    headers: { Cookie: cookieStr(), "User-Agent": UA_MOBILE, "Content-Type": "application/x-www-form-urlencoded" },
  });
  const oauth2Token = exchangeRes.data;
  if (!oauth2Token.access_token) throw new Error("OAuth2 トークンの取得に失敗しました");

  // トークンに有効期限タイムスタンプを付与
  const now = Math.floor(Date.now() / 1000);
  oauth2Token.expires_at = now + oauth2Token.expires_in;
  oauth2Token.refresh_token_expires_at = now + (oauth2Token.refresh_token_expires_in ?? 7776000);

  // トークンをファイルに保存
  if (!existsSync(TOKEN_DIR)) mkdirSync(TOKEN_DIR, { recursive: true });
  writeFileSync(join(TOKEN_DIR, "oauth1_token.json"), JSON.stringify(oauth1Token, null, 2));
  writeFileSync(join(TOKEN_DIR, "oauth2_token.json"), JSON.stringify(oauth2Token, null, 2));

  console.log(`\n✓ 認証成功！ トークンを保存しました: ${TOKEN_DIR}/`);
  console.log("  Next.js アプリを再起動すると Garmin からの自動取得が使えます。");
  console.log(`  ※ アクセストークンの有効期限: ${oauth2Token.expires_in / 3600} 時間`);
  if (oauth2Token.refresh_token_expires_in) {
    console.log(`  ※ リフレッシュトークンの有効期限: ${Math.round(oauth2Token.refresh_token_expires_in / 86400)} 日`);
  }
}

main().catch((err) => {
  console.error("\nエラー:", err.message);
  process.exit(1);
});

/**
 * 信件連結（信箱驗證信）落地頁的規則。抽成純函式是為了能單獨測。
 *
 * 2026-10 三站（小時光書店／好日子／快樂手）合併成同一個 Supabase 專案，共用一組 Auth 信件模板。
 * 模板的連結長這樣：
 *
 *     {{ .RedirectTo }}?token_hash={{ .TokenHash }}&type=signup&next=/account
 *
 * `RedirectTo` 是我們呼叫 signUp 時傳的 emailRedirectTo——所以它**必須剛好是**
 * `<本站網域>/auth/confirm`、不能帶 query string（模板會直接接 `?`）。見 emailRedirectTo()。
 *
 * 為什麼走 token_hash＋verifyOtp 而不是 PKCE 的 ?code=：code_verifier 綁在發起註冊的那台瀏覽器，
 * 客人在手機信箱 App 裡點連結時那不是同一台瀏覽器，PKCE 會失敗；verifyOtp 哪一台瀏覽器都能開。
 */
import type { EmailOtpType } from "@supabase/supabase-js";

/** Supabase 認得的信件類型。認不得的一律當作壞連結，不要硬送給 verifyOtp。 */
const VALID_TYPES = new Set<EmailOtpType>([
  "signup",
  "invite",
  "magiclink",
  "recovery",
  "email_change",
  "email",
]);

export function parseOtpType(raw: string | null): EmailOtpType | null {
  return raw && VALID_TYPES.has(raw as EmailOtpType) ? (raw as EmailOtpType) : null;
}

/**
 * 驗證成功後要去的站內路徑。只接受以單一 `/` 開頭的站內路徑：
 * `//evil.com`、`/\evil.com`、`https://evil.com` 這種會被瀏覽器當成站外網址的一律退回 /account，
 * 否則這個頁面就變成一個 open redirect（拿我們的網域幫釣魚連結背書）。
 */
export function safeNext(raw: string | null): string {
  if (!raw || !raw.startsWith("/") || raw.startsWith("//") || raw.startsWith("/\\")) return "/account";
  return raw;
}

/** signUp 的 emailRedirectTo：剛好是 `<origin>/auth/confirm`，不帶任何 query string。 */
export function emailRedirectTo(origin: string): string {
  return `${origin.replace(/\/+$/, "")}/auth/confirm`;
}

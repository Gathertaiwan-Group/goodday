import { NextResponse, type NextRequest } from "next/server";

import { parseOtpType, safeNext } from "@/lib/auth/confirm-link";
import { createClient } from "@/lib/supabase/server";

/**
 * GET /auth/confirm — 信箱驗證信的落地頁（token_hash + verifyOtp）。規則見 lib/auth/confirm-link.ts。
 *
 * 成功：verifyOtp 會把 session cookie 寫好，直接導到 next（預設 /account）——客人點完信就是登入狀態。
 * 失敗（連結過期、已用過、被截斷）：導回登入頁並帶 ?link=expired，由登入頁說明「請重新登入或重寄」。
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const tokenHash = searchParams.get("token_hash");
  const type = parseOtpType(searchParams.get("type"));
  const next = safeNext(searchParams.get("next"));

  const expired = new URL("/login", origin);
  expired.searchParams.set("link", "expired");

  if (!tokenHash || !type) return NextResponse.redirect(expired);

  const supabase = await createClient();
  const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
  if (error) {
    // 只記 type 與訊息，不記 token_hash（那是一次性的登入憑證）
    console.error("[auth/confirm] verifyOtp 失敗", type, error.message);
    return NextResponse.redirect(expired);
  }

  return NextResponse.redirect(new URL(next, origin));
}

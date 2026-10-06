"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useTranslations } from "@/lib/i18n/context";
import { localeHref } from "@/lib/i18n/href";
import type { Messages } from "@/lib/i18n/messages";
import { emailRedirectTo } from "@/lib/auth/confirm-link";

export default function AuthForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { locale, messages } = useTranslations();
  // redirect 若來自 middleware 的未登入導轉,本身已經是帶 /en 前綴的完整路徑
  // (見 middleware.ts:login.searchParams.set("redirect", pathname));localeHref
  // 對已有 /en 前綴的路徑會原樣放行,不會疊加成 /en/en/...。
  const redirect = localeHref(searchParams.get("redirect") ?? "/account", locale);

  const [mode, setMode] = useState<"login" | "register">("login");
  const [form, setForm] = useState({ email: "", password: "", name: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  // /auth/confirm 驗證失敗會導回 /login?link=expired
  const [info, setInfo] = useState(
    searchParams.get("link") === "expired" ? messages.auth.linkExpired : "",
  );

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (loading) return;
    setError("");
    setInfo("");
    setLoading(true);
    const supabase = createClient();

    try {
      if (mode === "register") {
        if (form.password.length < 8) {
          throw new Error(messages.auth.errors.passwordTooShort);
        }
        const { data, error } = await supabase.auth.signUp({
          email: form.email,
          password: form.password,
          // 驗證信的連結＝這個網址＋?token_hash=…（三站共用一組信件模板，見 lib/auth/confirm-link.ts）。
          // 不帶的話 Supabase 會退回 site_url（小時光的網域），客人點信會跑到別的網站。
          options: { data: { name: form.name }, emailRedirectTo: emailRedirectTo(window.location.origin) },
        });
        if (error) throw new Error(mapAuthError(error.message, messages));
        if (data.session) {
          router.push(redirect);
          router.refresh();
        } else {
          setInfo(messages.auth.registerSuccess);
          setMode("login");
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email: form.email,
          password: form.password,
        });
        if (error) throw new Error(mapAuthError(error.message, messages));
        router.push(redirect);
        router.refresh();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : messages.auth.errors.generic);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="iv-card mt-6">
      <div className="mb-5 grid grid-cols-2 bg-panel p-1 text-sm font-medium">
        {(["login", "register"] as const).map((m) => (
          <button
            key={m}
            onClick={() => {
              setMode(m);
              setError("");
            }}
            className={`min-h-10 transition-colors ${
              mode === m ? "bg-ink-deep text-cream-text" : "text-ink-soft"
            }`}
          >
            {m === "login" ? messages.auth.loginTab : messages.auth.registerTab}
          </button>
        ))}
      </div>

      <form onSubmit={submit} className="space-y-4">
        {mode === "register" && (
          <div>
            <label className="iv-label" htmlFor="auth-name">{messages.auth.nameLabel}</label>
            <input
              id="auth-name"
              required
              className="iv-input"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          </div>
        )}
        <div>
          <label className="iv-label" htmlFor="auth-email">Email</label>
          <input
            id="auth-email"
            required
            type="email"
            autoComplete="email"
            className="iv-input"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
          />
        </div>
        <div>
          <label className="iv-label" htmlFor="auth-password">
            {messages.auth.passwordLabel}
            {mode === "register" && <span className="text-xs">{messages.auth.passwordHint}</span>}
          </label>
          <input
            id="auth-password"
            required
            type="password"
            autoComplete={mode === "login" ? "current-password" : "new-password"}
            className="iv-input"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
          />
        </div>

        {error && (
          <p className="rounded-lg bg-danger-soft p-3 text-sm text-danger">{error}</p>
        )}
        {info && <p className="rounded-lg bg-ok-soft p-3 text-sm text-ok">{info}</p>}

        <button type="submit" disabled={loading} className="iv-btn-primary w-full">
          {loading
            ? messages.auth.submitting
            : mode === "login"
              ? messages.auth.submitLogin
              : messages.auth.submitRegister}
        </button>
      </form>
    </div>
  );
}

function mapAuthError(message: string, messages: Messages) {
  if (/invalid login credentials/i.test(message)) return messages.auth.errors.invalidCredentials;
  if (/already registered/i.test(message)) return messages.auth.errors.alreadyRegistered;
  if (/email not confirmed/i.test(message)) return messages.auth.errors.emailNotConfirmed;
  if (/rate limit/i.test(message)) return messages.auth.errors.rateLimited;
  return message;
}

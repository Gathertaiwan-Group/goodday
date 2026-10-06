import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import { emailRedirectTo, parseOtpType, safeNext } from "../confirm-link";

describe("parseOtpType", () => {
  it("認得的類型原樣回傳", () => {
    for (const t of ["signup", "invite", "magiclink", "recovery", "email_change", "email"]) {
      expect(parseOtpType(t)).toBe(t);
    }
  });
  it("認不得或沒有的一律 null（不要硬送給 verifyOtp）", () => {
    expect(parseOtpType(null)).toBeNull();
    expect(parseOtpType("")).toBeNull();
    expect(parseOtpType("sms")).toBeNull();
    expect(parseOtpType("signup ")).toBeNull();
  });
});

describe("safeNext（防 open redirect）", () => {
  it("站內路徑原樣放行", () => {
    expect(safeNext("/account")).toBe("/account");
    expect(safeNext("/account/settings?tab=1")).toBe("/account/settings?tab=1");
  });
  it("會被瀏覽器當成站外的一律退回 /account", () => {
    for (const bad of ["//evil.com", "/\\evil.com", "https://evil.com", "evil.com", "javascript:alert(1)"]) {
      expect(safeNext(bad)).toBe("/account");
    }
  });
  it("沒有 next 時去 /account", () => {
    expect(safeNext(null)).toBe("/account");
    expect(safeNext("")).toBe("/account");
  });
});

describe("emailRedirectTo（三站共用信件模板的契約）", () => {
  // 模板是 {{ .RedirectTo }}?token_hash=…——RedirectTo 只要多帶一個 ? 或路徑不對，連結就壞了
  it("剛好是 <origin>/auth/confirm，不帶 query string", () => {
    expect(emailRedirectTo("https://interval-livid.vercel.app")).toBe(
      "https://interval-livid.vercel.app/auth/confirm",
    );
    expect(emailRedirectTo("http://localhost:3000/")).toBe("http://localhost:3000/auth/confirm");
    expect(emailRedirectTo("https://a.b")).not.toContain("?");
  });

  it("註冊表單真的有把它傳給 signUp（不傳會退回 site_url＝小時光的網域）", () => {
    const form = readFileSync(join(process.cwd(), "src/components/AuthForm.tsx"), "utf8");
    expect(form).toMatch(/emailRedirectTo:\s*emailRedirectTo\(window\.location\.origin\)/);
  });

  it("落地頁存在於 /auth/confirm", () => {
    const route = readFileSync(join(process.cwd(), "src/app/auth/confirm/route.ts"), "utf8");
    expect(route).toContain("verifyOtp");
    expect(route).toContain("safeNext");
  });
});

/**
 * 守門測試：每一支建立 Supabase client 的地方都必須帶 `db: { schema: DB_SCHEMA }`。
 *
 * 🔴 為什麼要靠測試而不是靠 code review：三站（小時光書店／好日子／快樂手）2026-09 合併成同一個
 *    Supabase 專案後都有 products／orders／profiles／ai_chat_logs 這些**同名表**。漏帶 schema 時
 *    PostgREST 不會報錯，會落到 `public`——也就是小時光的表。沒有錯誤訊息、沒有 500，
 *    只是讀到別人的資料，可能過很久才被發現。
 *
 * 這支測試用靜態掃描（不 import、不連線），所以新增一個漏帶 schema 的檔案會在 CI 就紅掉。
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import { DB_SCHEMA } from "../schema";

const SRC = join(process.cwd(), "src");
/** 這幾個套件的這些函式會建立 client；出現就必須看到 db:{schema}。 */
const FACTORY_CALLS = ["createBrowserClient(", "createServerClient(", "createSupabaseClient("];

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) return name === "__tests__" ? [] : walk(full);
    return /\.tsx?$/.test(name) ? [full] : [];
  });
}

describe("supabase client 的 schema", () => {
  it("DB_SCHEMA 是 gooddays（改這個值等於改全站讀寫的資料庫位置）", () => {
    expect(DB_SCHEMA).toBe("gooddays");
  });

  it("每一支建立 client 的呼叫都帶了 db: { schema: DB_SCHEMA }", () => {
    const offenders: string[] = [];

    for (const file of walk(SRC)) {
      const text = readFileSync(file, "utf8");
      const calls = FACTORY_CALLS.reduce(
        (n, needle) => n + text.split(needle).length - 1,
        0,
      );
      if (calls === 0) continue;
      const withSchema = text.split("db: { schema: DB_SCHEMA }").length - 1;
      if (withSchema < calls) {
        offenders.push(
          `${file.replace(SRC, "src")}：${calls} 處建立 client，只有 ${withSchema} 處帶了 schema`,
        );
      }
    }

    expect(offenders, offenders.join("\n")).toEqual([]);
  });

  it("掃描本身有抓到東西（防止 walk 或關鍵字寫錯導致測試永遠是綠的）", () => {
    const hits = walk(SRC).filter((f) =>
      FACTORY_CALLS.some((needle) => readFileSync(f, "utf8").includes(needle)),
    );
    // client.ts / server.ts / admin.ts / middleware.ts
    expect(hits.length).toBeGreaterThanOrEqual(4);
  });
});

/**
 * 這個站在共用資料庫裡的 schema 名。
 *
 * 三站（小時光書店／好日子／快樂手）2026-09 合併成同一個 Supabase 專案之後，
 * 好日子的表全部住在 `gooddays` schema，小時光住 `public`，快樂手住 `happyhands`。
 *
 * 🔴 為什麼寫死而不從 env 讀：三站都有 products／orders／profiles／ai_chat_logs 這些**同名表**，
 *    PostgREST 找不到指定的 schema 時不會報錯，會落到 `public`——也就是小時光的表。
 *    從 env 讀的話，env 漏設就等於靜默讀寫到別人的資料，而且測不出來。
 *
 * 🔴 每一支建立 supabase client 的地方都必須帶 `db: { schema: DB_SCHEMA }`，漏一支不會有任何錯誤訊息。
 *    `web/src/lib/supabase/__tests__/schema.test.ts` 會掃過原始碼把漏掉的抓出來。
 */
export const DB_SCHEMA = "gooddays";

import { afterAll, beforeAll, describe, it, expect } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { readFileSync } from "node:fs";
const db = new PGlite();
const first = "11111111-1111-4111-8111-111111111111",
  second = "22222222-2222-4222-8222-222222222222";
const payload = { profile: null, foods: [], favorites: [], weights: [] };
async function asUser(id: string) {
  await db.exec("reset role; set role authenticated;");
  await db.query("select set_config('request.jwt.claim.sub',$1,false)", [id]);
}
beforeAll(async () => {
  await db.exec(`create role anon; create role authenticated; create schema auth;
    create table auth.users(id uuid primary key,email text);
    create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
    grant usage on schema auth to authenticated,anon;
    insert into auth.users values('${first}','owner@example.com'),('${second}','friend@example.com');`);
  const sql = readFileSync(
    new URL("../supabase/schema.sql", import.meta.url),
    "utf8",
  );
  await db.exec(sql);
  await db.exec(sql);
}, 30000);
afterAll(async () => {
  await db.close();
});
describe("Supabase database policies and RPCs on PostgreSQL", () => {
  it("creates a versioned diary and rejects a stale write", async () => {
    await asUser(first);
    const saved = await db.query<{ save_diary: number }>(
      "select public.save_diary($1,$2::jsonb)",
      [0, JSON.stringify(payload)],
    );
    expect(Number(saved.rows[0].save_diary)).toBe(1);
    const stale = await db.query<{ save_diary: number }>(
      "select public.save_diary($1,$2::jsonb)",
      [0, JSON.stringify(payload)],
    );
    expect(Number(stale.rows[0].save_diary)).toBe(-1);
  });
  it("isolates diaries between accounts", async () => {
    await asUser(second);
    expect((await db.query("select * from public.diaries")).rows).toHaveLength(
      0,
    );
    await db.query("select public.save_diary($1,$2::jsonb)", [
      0,
      JSON.stringify(payload),
    ]);
    const own = await db.query<{ user_id: string }>(
      "select user_id from public.diaries",
    );
    expect(own.rows).toEqual([{ user_id: second }]);
  });
  it("prevents direct diary updates and self-assigned VIP", async () => {
    await asUser(first);
    await expect(
      db.exec(`update public.diaries set version=500`),
    ).rejects.toThrow(/permission denied/);
    await expect(
      db.query(
        "insert into public.memberships(user_id,tier) values($1,'vip')",
        [first],
      ),
    ).rejects.toThrow(/permission denied/);
  });
  it("enforces the free daily limit atomically", async () => {
    await asUser(first);
    for (let i = 0; i < 5; i++)
      expect(
        (
          await db.query<{ reserve_ai_request: boolean }>(
            "select public.reserve_ai_request()",
          )
        ).rows[0].reserve_ai_request,
      ).toBe(true);
    expect(
      (
        await db.query<{ reserve_ai_request: boolean }>(
          "select public.reserve_ai_request()",
        )
      ).rows[0].reserve_ai_request,
    ).toBe(false);
  });
  it("allows trusted VIP grants and respects expiry", async () => {
    await db.exec("reset role");
    await db.query(
      "insert into public.memberships(user_id,tier) values($1,'vip')",
      [first],
    );
    await asUser(first);
    expect(
      (
        await db.query<{ reserve_ai_request: boolean }>(
          "select public.reserve_ai_request()",
        )
      ).rows[0].reserve_ai_request,
    ).toBe(true);
    await db.exec("reset role");
    await db.query(
      "update public.memberships set expires_at=now()-interval '1 day' where user_id=$1",
      [first],
    );
    await asUser(first);
    expect(
      (
        await db.query<{ reserve_ai_request: boolean }>(
          "select public.reserve_ai_request()",
        )
      ).rows[0].reserve_ai_request,
    ).toBe(false);
  });

  it("restricts the access panel to explicitly appointed administrators", async () => {
    await asUser(second);
    expect(
      (
        await db.query<{ is_app_admin: boolean }>(
          "select public.is_app_admin()",
        )
      ).rows[0].is_app_admin,
    ).toBe(false);
    await expect(
      db.query(
        "select public.grant_member_access('friend@example.com','vip',null)",
      ),
    ).rejects.toThrow(/Admin required/);
    await db.exec("reset role");
    await db.query("insert into public.app_admins(user_id) values($1)", [
      first,
    ]);
    await asUser(first);
    expect(
      (
        await db.query<{ grant_member_access: boolean }>(
          "select public.grant_member_access('friend@example.com','vip',null)",
        )
      ).rows[0].grant_member_access,
    ).toBe(true);
    await asUser(second);
    expect(
      (await db.query<{ tier: string }>("select tier from public.memberships"))
        .rows,
    ).toEqual([{ tier: "vip" }]);
  });
  it("denies anonymous access", async () => {
    await db.exec("reset role; set role anon;");
    await expect(db.exec("select * from public.diaries")).rejects.toThrow(
      /permission denied/,
    );
    await expect(
      db.query("select public.save_diary($1,$2::jsonb)", [
        0,
        JSON.stringify(payload),
      ]),
    ).rejects.toThrow(/permission denied/);
  });
});

// @vitest-environment jsdom
import { act, cleanup, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, it, expect, vi } from "vitest";
import { emptyState, type NutritionState } from "../src/lib/nutrition";
import { useDiary } from "../src/lib/use-diary";

const mock = vi.hoisted(() => ({
  user: "alice" as string | null,
  callback: null as
    null | ((event: string, session: { user: { id: string } } | null) => void),
  rows: new Map<string, { payload: unknown; version: number }>(),
  fail: false,
  saves: [] as { id: string; payload: unknown; expected: number }[],
}));
vi.mock("../src/lib/supabase", () => ({
  browserSupabase: () => ({
    auth: {
      onAuthStateChange: (callback: typeof mock.callback) => {
        mock.callback = callback;
        queueMicrotask(() =>
          callback?.(
            "INITIAL_SESSION",
            mock.user ? { user: { id: mock.user } } : null,
          ),
        );
        return {
          data: {
            subscription: {
              unsubscribe: () => {
                mock.callback = null;
              },
            },
          },
        };
      },
    },
    from: () => ({
      select: () => ({
        eq: (_key: string, id: string) => ({
          maybeSingle: async () => ({
            data: mock.rows.get(id) || null,
            error: mock.fail ? new Error("offline") : null,
          }),
        }),
      }),
    }),
    rpc: async (
      _name: string,
      args: { expected_version: number; new_payload: unknown },
    ) => {
      if (mock.fail) return { data: null, error: new Error("offline") };
      const id = mock.user!,
        row = mock.rows.get(id),
        version = row?.version || 0;
      mock.saves.push({
        id,
        payload: args.new_payload,
        expected: args.expected_version,
      });
      if (args.expected_version !== version) return { data: -1, error: null };
      mock.rows.set(id, { payload: args.new_payload, version: version + 1 });
      return { data: version + 1, error: null };
    },
  }),
}));
const key = "lowcal:diary:v1";
const withWeight = (value: number): NutritionState => ({
  ...emptyState,
  weights: [{ date: "2026-10-30", value }],
});
beforeEach(() => {
  localStorage.clear();
  mock.rows.clear();
  mock.user = "alice";
  mock.callback = null;
  mock.fail = false;
  mock.saves = [];
});
afterEach(() => cleanup());
describe("cloud diary recovery", () => {
  it("does not overwrite a signed-in account with the anonymous diary", async () => {
    localStorage.setItem(key, JSON.stringify(withWeight(50)));
    mock.rows.set("alice", { payload: withWeight(70), version: 3 });
    const { result } = renderHook(() => useDiary());
    await waitFor(() => expect(result.current.status).toBe("synced"));
    expect(result.current.data.weights[0].value).toBe(70);
    expect(mock.saves).toHaveLength(0);
    expect(JSON.parse(localStorage.getItem(`${key}:alice`)!)).toEqual(
      withWeight(70),
    );
  });
  it("requires an explicit choice before importing a guest diary", async () => {
    localStorage.setItem(key, JSON.stringify(withWeight(50)));
    const { result } = renderHook(() => useDiary());
    await waitFor(() => expect(result.current.cloudChoice).toBe(true));
    expect(result.current.editable).toBe(false);
    expect(mock.saves).toHaveLength(0);
    await act(async () => result.current.chooseCloud(true));
    await waitFor(() => expect(result.current.status).toBe("synced"));
    expect(mock.rows.get("alice")?.payload).toEqual(withWeight(50));
  });
  it("recovers a local unsent change after reload when the cloud version matches", async () => {
    localStorage.setItem(`${key}:alice`, JSON.stringify(withWeight(71)));
    localStorage.setItem(
      `${key}:alice:meta`,
      JSON.stringify({ version: 3, dirty: true }),
    );
    mock.rows.set("alice", { payload: withWeight(70), version: 3 });
    const { result } = renderHook(() => useDiary());
    await waitFor(() => expect(mock.rows.get("alice")?.version).toBe(4), {
      timeout: 2500,
    });
    expect(result.current.data.weights[0].value).toBe(71);
    expect(mock.rows.get("alice")?.payload).toEqual(withWeight(71));
  });
  it("keeps unsent data for export and blocks writes on a version conflict", async () => {
    localStorage.setItem(`${key}:alice`, JSON.stringify(withWeight(71)));
    localStorage.setItem(
      `${key}:alice:meta`,
      JSON.stringify({ version: 3, dirty: true }),
    );
    mock.rows.set("alice", { payload: withWeight(72), version: 4 });
    const { result } = renderHook(() => useDiary());
    await waitFor(() => expect(result.current.status).toBe("conflict"));
    expect(result.current.editable).toBe(false);
    expect(result.current.data.weights[0].value).toBe(71);
    expect(mock.saves).toHaveLength(0);
    await act(async () => result.current.reload());
    await waitFor(() => expect(result.current.status).toBe("synced"));
    expect(result.current.data.weights[0].value).toBe(72);
  });
  it("never persists one user’s data into a second user’s cache", async () => {
    mock.rows.set("alice", { payload: withWeight(70), version: 1 });
    mock.rows.set("bob", { payload: withWeight(90), version: 1 });
    const { result } = renderHook(() => useDiary());
    await waitFor(() => expect(result.current.status).toBe("synced"));
    await act(async () => {
      mock.user = "bob";
      mock.callback?.("SIGNED_IN", { user: { id: "bob" } });
    });
    await waitFor(() => expect(result.current.data.weights[0]?.value).toBe(90));
    expect(JSON.parse(localStorage.getItem(`${key}:bob`)!)).toEqual(
      withWeight(90),
    );
    expect(mock.saves).toHaveLength(0);
  });
  it("does not allow writes after an initial failed cloud load", async () => {
    mock.fail = true;
    const { result } = renderHook(() => useDiary());
    await waitFor(() => expect(result.current.status).toBe("error"));
    expect(result.current.editable).toBe(false);
    expect(mock.saves).toHaveLength(0);
  });
});

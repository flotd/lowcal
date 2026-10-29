"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { browserSupabase } from "./supabase";
import { emptyState, stateSchema, type NutritionState } from "./nutrition";

const LOCAL_KEY = "lowcal:diary:v1";
function readLocal(key: string): NutritionState {
  try {
    const parsed = stateSchema.safeParse(
      JSON.parse(localStorage.getItem(key) || "null"),
    );
    return parsed.success ? parsed.data : emptyState;
  } catch {
    return emptyState;
  }
}
export function useDiary() {
  const [client] = useState(browserSupabase);
  const [data, setData] = useState<NutritionState>(emptyState);
  const [ready, setReady] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [cloudChoice, setCloudChoice] = useState(false);
  const [status, setStatus] = useState<
    "local" | "loading" | "synced" | "saving" | "error" | "conflict"
  >("loading");
  const [storageError, setStorageError] = useState(false);
  const [clearing, setClearing] = useState(false);
  const userRef = useRef<string | null>(null),
    version = useRef(0),
    desired = useRef<NutritionState | null>(null);
  const loadedUser = useRef<string | null>(null);
  const busy = useRef(false),
    lastSaved = useRef(""),
    anonymous = useRef(emptyState),
    generation = useRef(0);
  const flushRef = useRef<() => Promise<void>>(async () => {});
  const key = user ? `${LOCAL_KEY}:${user.id}` : LOCAL_KEY;

  useEffect(() => {
    anonymous.current = readLocal(LOCAL_KEY);
    setData(anonymous.current);
    setReady(true);
    setStatus("local");
    if (!client) return;
    const {
      data: { subscription },
    } = client.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });
    return () => subscription.unsubscribe();
  }, [client]);

  const loadCloud = useCallback(
    async (id: string, discardLocal = false) => {
      if (!client) return;
      const run = ++generation.current;
      setStatus("loading");
      setCloudChoice(false);
      desired.current = null;
      loadedUser.current = null;
      version.current = 0;
      lastSaved.current = "";
      const local = readLocal(`${LOCAL_KEY}:${id}`);
      let pending: { version: number; dirty: boolean } | null = null;
      try {
        const cached = JSON.parse(
          localStorage.getItem(`${LOCAL_KEY}:${id}:meta`) || "null",
        );
        if (
          typeof cached?.version === "number" &&
          typeof cached?.dirty === "boolean"
        )
          pending = cached;
      } catch {}
      setData(local);
      const { data: row, error } = await client
        .from("diaries")
        .select("payload,version")
        .eq("user_id", id)
        .maybeSingle();
      if (generation.current !== run || userRef.current !== id) return;
      if (error) {
        setStatus("error");
        return;
      }
      loadedUser.current = id;
      if (!row) {
        version.current = 0;
        lastSaved.current = "";
        setCloudChoice(true);
        setStatus("synced");
        return;
      }
      const parsed = stateSchema.safeParse(row.payload);
      if (!parsed.success) {
        loadedUser.current = null;
        setStatus("error");
        return;
      }
      version.current = row.version;
      lastSaved.current = JSON.stringify(parsed.data);
      if (
        !discardLocal &&
        pending?.dirty &&
        JSON.stringify(local) !== lastSaved.current
      ) {
        setData(local);
        setStatus(pending.version === row.version ? "synced" : "conflict");
        return;
      }
      setData(parsed.data);
      setStatus("synced");
    },
    [client],
  );

  useEffect(() => {
    const next = user?.id ?? null;
    if (userRef.current === next) return;
    userRef.current = next;
    desired.current = null;
    loadedUser.current = null;
    generation.current++;
    if (next) {
      void loadCloud(next);
    } else {
      setData(readLocal(LOCAL_KEY));
      setCloudChoice(false);
      lastSaved.current = "";
      setStatus("local");
    }
  }, [user?.id, loadCloud]);

  const flush = useCallback(async () => {
    if (!client || !userRef.current || busy.current) return;
    busy.current = true;
    const id = userRef.current,
      run = generation.current;
    try {
      while (
        desired.current &&
        userRef.current === id &&
        generation.current === run
      ) {
        const snapshot = desired.current;
        desired.current = null;
        const serialized = JSON.stringify(snapshot);
        if (serialized === lastSaved.current) continue;
        setStatus("saving");
        const { data: nextVersion, error } = await client.rpc("save_diary", {
          expected_version: version.current,
          new_payload: snapshot,
        });
        if (userRef.current !== id || generation.current !== run) return;
        if (error) {
          desired.current = desired.current ?? snapshot;
          setStatus("error");
          return;
        }
        if (nextVersion === -1) {
          desired.current = desired.current ?? snapshot;
          setStatus("conflict");
          return;
        }
        version.current = nextVersion;
        lastSaved.current = serialized;
        setStatus("synced");
      }
    } finally {
      busy.current = false;
      if (
        desired.current &&
        userRef.current &&
        (userRef.current !== id || generation.current !== run)
      )
        queueMicrotask(() => void flushRef.current());
    }
  }, [client]);
  useEffect(() => {
    flushRef.current = flush;
  }, [flush]);

  useEffect(() => {
    if (
      (user && loadedUser.current !== user.id) ||
      !ready ||
      status === "loading" ||
      cloudChoice ||
      (user && status === "local") ||
      (!user && status !== "local")
    )
      return;
    try {
      localStorage.setItem(key, JSON.stringify(data));
      if (user)
        localStorage.setItem(
          `${key}:meta`,
          JSON.stringify({
            version: version.current,
            dirty: JSON.stringify(data) !== lastSaved.current,
          }),
        );
      setStorageError(false);
    } catch {
      setStorageError(true);
    }
    if (!user) {
      anonymous.current = data;
      return;
    }
    if (status === "conflict" || status === "error") return;
    if (JSON.stringify(data) === lastSaved.current) return;
    desired.current = data;
    const timer = setTimeout(() => void flushRef.current(), 650);
    return () => clearTimeout(timer);
  }, [data, ready, key, user, cloudChoice, status]);

  const chooseCloud = (importLocal: boolean) => {
    const next = importLocal ? anonymous.current : emptyState;
    setData(next);
    setCloudChoice(false);
    desired.current = next;
    void flush();
  };
  const retry = () => {
    if (!user) return;
    // A failed initial load has no known server version; read before allowing writes.
    if (!lastSaved.current && !version.current) {
      void loadCloud(user.id);
      return;
    }
    desired.current = data;
    void flush();
  };
  const clear = async () => {
    if (!user) {
      setData(emptyState);
      return true;
    }
    if (!client || status !== "synced" || busy.current) return false;
    const id = user.id;
    busy.current = true;
    setClearing(true);
    desired.current = null;
    try {
      // Retain an empty versioned row so stale devices cannot resurrect deleted contents.
      const { data: next, error } = await client.rpc("save_diary", {
        expected_version: version.current,
        new_payload: emptyState,
      });
      if (userRef.current !== id) return false;
      if (error) {
        setStatus("error");
        return false;
      }
      if (next === -1) {
        setStatus("conflict");
        return false;
      }
      version.current = next;
      lastSaved.current = JSON.stringify(emptyState);
      desired.current = null;
      setData(emptyState);
      return true;
    } finally {
      busy.current = false;
      setClearing(false);
    }
  };
  return {
    data,
    setData,
    ready,
    user,
    client,
    status,
    storageError,
    cloudChoice,
    chooseCloud,
    retry,
    clear,
    reload: () => user && void loadCloud(user.id, true),
    editable:
      ready &&
      !clearing &&
      !cloudChoice &&
      (status === "local" || status === "synced" || status === "saving"),
  };
}

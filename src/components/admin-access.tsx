"use client";
import { useEffect, useState } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { Check, ShieldCheck } from "lucide-react";
import type { Locale } from "@/lib/i18n";
const copy = {
  ru: {
    title: "Управление доступом",
    description:
      "Выдавай Pro или полный VIP-доступ выбранным зарегистрированным пользователям. Оплата не требуется.",
    email: "Почта пользователя",
    tier: "Уровень доступа",
    expiry: "До даты (необязательно)",
    grant: "Сохранить доступ",
    done: "Доступ обновлён",
    missing: "Пользователь с такой почтой не найден.",
    error: "Не удалось обновить доступ.",
  },
  en: {
    title: "Manage access",
    description:
      "Give Pro or full VIP access to selected registered users. No payment required.",
    email: "User email",
    tier: "Access level",
    expiry: "Until (optional)",
    grant: "Save access",
    done: "Access updated",
    missing: "No registered user with that email.",
    error: "Could not update access.",
  },
  uz: {
    title: "Kirishni boshqarish",
    description:
      "Tanlangan ro‘yxatdan o‘tgan foydalanuvchilarga Pro yoki to‘liq VIP huquqini ber. To‘lov shart emas.",
    email: "Foydalanuvchi pochtasi",
    tier: "Kirish darajasi",
    expiry: "Muddat (ixtiyoriy)",
    grant: "Huquqni saqlash",
    done: "Huquq yangilandi",
    missing: "Bu pochta bilan foydalanuvchi topilmadi.",
    error: "Huquqni yangilab bo‘lmadi.",
  },
};
export function AdminAccess({
  client,
  userId,
  lang,
}: {
  client: SupabaseClient;
  userId: string;
  lang: Locale;
}) {
  const [admin, setAdmin] = useState(false),
    [email, setEmail] = useState(""),
    [tier, setTier] = useState("vip"),
    [expiry, setExpiry] = useState(""),
    [busy, setBusy] = useState(false),
    [message, setMessage] = useState("");
  const t = copy[lang];
  useEffect(() => {
    let live = true;
    setAdmin(false);
    void client.rpc("is_app_admin").then(({ data, error }) => {
      if (live) setAdmin(!error && data === true);
    });
    return () => {
      live = false;
    };
  }, [client, userId]);
  if (!admin) return null;
  return (
    <section className="card settings-card">
      <div className="settings-title">
        <span className="round-icon">
          <ShieldCheck size={22} />
        </span>
        <h2>{t.title}</h2>
      </div>
      <p className="muted">{t.description}</p>
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          setMessage("");
          try {
            const { data, error } = await client.rpc("grant_member_access", {
              target_email: email.trim(),
              access_tier: tier,
              expiry: expiry
                ? new Date(`${expiry}T23:59:59`).toISOString()
                : null,
            });
            setMessage(error ? t.error : data ? t.done : t.missing);
          } catch {
            setMessage(t.error);
          } finally {
            setBusy(false);
          }
        }}
      >
        <div className="form-grid">
          <label className="span-2">
            {t.email}
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </label>
          <label>
            {t.tier}
            <select value={tier} onChange={(e) => setTier(e.target.value)}>
              <option value="free">Free · 5 AI / day</option>
              <option value="pro">Pro · 100 AI / day</option>
              <option value="vip">VIP · 200 AI / day</option>
            </select>
          </label>
          <label>
            {t.expiry}
            <input
              type="date"
              value={expiry}
              onChange={(e) => setExpiry(e.target.value)}
            />
          </label>
        </div>
        <button className="button primary full-width" disabled={busy}>
          <Check size={17} />
          {t.grant}
        </button>
      </form>
      {message && (
        <p className="info-box" role="status">
          {message}
        </p>
      )}
    </section>
  );
}

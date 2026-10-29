"use client";

import { useState } from "react";
import {
  ArrowRight,
  Camera,
  ChartNoAxesCombined,
  Check,
  ChevronLeft,
  Leaf,
  ShieldCheck,
  Sparkles,
  Sprout,
} from "lucide-react";
import type { Locale, Translation } from "@/lib/i18n";
import type { Profile } from "@/lib/nutrition";
import { ProfileForm } from "./profile-form";
import { Dialog } from "./dialog";

const copy = {
  ru: {
    eyebrow: "Твой здоровый ритм начинается здесь",
    title: "Ты больше,",
    accent: "чем цифры.",
    description:
      "Питайся осознанно, замечай свой прогресс и находи баланс. Lowcal поможет заботиться о себе — по одному маленькому шагу.",
    start: "Найти свой баланс",
    skip: "Пока просто посмотреть",
    account: "Уже есть аккаунт? Войти",
    time: "Пара минут — и твой план готов",
    features: [
      "План под твою цель",
      "Еда по фото и паре слов",
      "Прогресс в твоём темпе",
    ],
    card: "Немного заботы. Каждый день.",
    cardText:
      "Твоя еда, твои привычки, твой путь. Без строгих запретов и гонки за идеалом.",
    privacy: "Ты управляешь своими данными",
    adults:
      "Для взрослых 18+. Оценки питания не заменяют консультацию специалиста.",
    illustration: "Твой баланс",
  },
  en: {
    eyebrow: "Your healthier rhythm starts here",
    title: "You are more",
    accent: "than numbers.",
    description:
      "Eat with awareness, notice your progress, and find your balance. Lowcal helps you care for yourself, one little step at a time.",
    start: "Find my balance",
    skip: "Just take a look for now",
    account: "Already have an account? Sign in",
    time: "A couple of minutes to make it yours",
    features: [
      "A plan for your goal",
      "Food from a photo or a few words",
      "Progress at your own pace",
    ],
    card: "A little care. Every day.",
    cardText:
      "Your food, your habits, your journey. No strict rules or race for perfection.",
    privacy: "You are in control of your data",
    adults:
      "For adults 18+. Nutrition estimates do not replace professional advice.",
    illustration: "Your balance",
  },
  uz: {
    eyebrow: "Sog‘lom ritming shu yerdan boshlanadi",
    title: "Sen raqamlardan",
    accent: "ko‘ra ko‘proqsan.",
    description:
      "Ongli ovqatlan, natijangni kuzat va muvozanatni top. Lowcal kichik qadamlar bilan o‘zingga g‘amxo‘rlik qilishga yordam beradi.",
    start: "Muvozanatimni topish",
    skip: "Hozircha ko‘rib chiqish",
    account: "Akkaunting bormi? Kirish",
    time: "Bir necha daqiqada shaxsiy rejang tayyor",
    features: [
      "Maqsadingga mos reja",
      "Surat yoki bir necha so‘z bilan ovqat",
      "O‘z tezligingda natija",
    ],
    card: "Har kuni ozgina g‘amxo‘rlik.",
    cardText:
      "Sening ovqating, odatlaring va yo‘ling. Qat’iy taqiqlar va mukammallik ortidan quvishsiz.",
    privacy: "Ma’lumotlaringni o‘zing boshqarasan",
    adults:
      "18 yoshdan kattalar uchun. Oziqlanish taxminlari mutaxassis maslahatini almashtirmaydi.",
    illustration: "Sening muvozanating",
  },
};

export function WelcomeScreen({
  lang,
  onLanguage,
  t,
  onFinish,
  onSkip,
  onAccount,
  editable,
}: {
  lang: Locale;
  onLanguage: (lang: Locale) => void;
  t: Translation;
  onFinish: (profile: Profile) => void;
  onSkip: () => void;
  onAccount: () => void;
  editable: boolean;
}) {
  const [started, setStarted] = useState(false);
  const [legal, setLegal] = useState<"privacy" | "terms" | null>(null);
  const c = copy[lang];
  return (
    <div className="welcome-screen">
      <header className="welcome-header">
        <a className="brand" href="/" aria-label="Lowcal">
          <span className="brand-mark">
            <Sprout size={27} />
          </span>
          lowcal<span className="brand-dot">.</span>
        </a>
        <div className="welcome-languages" role="group" aria-label={t.language}>
          {(["ru", "uz", "en"] as const).map((l) => (
            <button
              key={l}
              onClick={() => onLanguage(l)}
              className={lang === l ? "active" : ""}
              aria-pressed={lang === l}
            >
              {l.toUpperCase()}
            </button>
          ))}
        </div>
      </header>
      <main className={`welcome-main ${started ? "with-plan" : ""}`}>
        <section className="welcome-copy">
          {started ? (
            <>
              <button className="text-button" onClick={() => setStarted(false)}>
                <ChevronLeft size={16} />
                {t.back}
              </button>
              <h1 className="welcome-plan-title">{t.aboutYou}</h1>
              <p className="welcome-plan-description">{t.planText}</p>
              <ProfileForm initial={null} t={t} onSave={onFinish} />
            </>
          ) : (
            <>
              <p className="eyebrow">
                <span />
                {c.eyebrow}
              </p>
              <h1>
                {c.title}
                <br />
                <em>{c.accent}</em>
              </h1>
              <p className="welcome-description">{c.description}</p>
              <div className="welcome-feature-list">
                {c.features.map((feature, i) => {
                  const Icon = [Leaf, Camera, ChartNoAxesCombined][i];
                  return (
                    <div key={feature}>
                      <span>
                        <Icon size={19} />
                      </span>
                      {feature}
                    </div>
                  );
                })}
              </div>
              <button
                className="button primary welcome-start"
                disabled={!editable}
                onClick={() => setStarted(true)}
              >
                {c.start}
                <ArrowRight size={19} />
              </button>
              <p className="welcome-time">
                <Check size={14} />
                {c.time}
              </p>
              <button className="welcome-skip" onClick={onSkip}>
                {c.skip}
                <ArrowRight size={14} />
              </button>
              <button className="welcome-account" onClick={onAccount}>
                {c.account}
              </button>
            </>
          )}
        </section>
        <aside className="welcome-art">
          <div className="welcome-orbit orbit-one" />
          <div className="welcome-orbit orbit-two" />
          <div className="welcome-floating float-top">
            <span>🥑</span>
            <Leaf size={17} />
          </div>
          <div className="welcome-balance-card">
            <span className="welcome-mini-logo">
              <Sprout size={18} /> lowcal
            </span>
            <div className="welcome-art-ring">
              <div>
                <Sprout size={37} />
                <span>{c.illustration}</span>
                <HeartMark />
              </div>
            </div>
            <div className="welcome-art-macros">
              <span />
              <span />
              <span />
            </div>
            <div className="welcome-art-card-caption">
              <Sparkles size={16} />
              {t.tagline}
            </div>
          </div>
          <div className="welcome-floating float-bottom">
            <span className="welcome-tick">
              <Check size={21} />
            </span>
            <Sprout size={20} />
          </div>
          <div className="welcome-art-copy">
            <h2>{c.card}</h2>
            <p>{c.cardText}</p>
          </div>
        </aside>
      </main>
      <footer className="welcome-footer">
        <div>
          <ShieldCheck size={16} />
          {c.privacy}
        </div>
        <p>{c.adults}</p>
        <div>
          <button onClick={() => setLegal("privacy")}>{t.privacy}</button>
          <span>·</span>
          <button onClick={() => setLegal("terms")}>{t.terms}</button>
        </div>
      </footer>
      {legal && (
        <Dialog
          title={t[legal]}
          closeLabel={t.close}
          onClose={() => setLegal(null)}
        >
          <div className="legal-copy">
            <ShieldCheck size={35} />
            <p>{legal === "privacy" ? t.privacyText : t.termsText}</p>
          </div>
        </Dialog>
      )}
    </div>
  );
}

function HeartMark() {
  return (
    <svg
      width="21"
      height="18"
      viewBox="0 0 24 22"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="m12 20-8.5-8.5a5.5 5.5 0 0 1 7.8-7.8l.7.7.7-.7a5.5 5.5 0 0 1 7.8 7.8L12 20Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
    </svg>
  );
}

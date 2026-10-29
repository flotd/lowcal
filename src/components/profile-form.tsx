"use client";
import { useState } from "react";
import {
  ArrowRight,
  Check,
  Leaf,
  TrendingDown,
  TrendingUp,
  Minus,
  Info,
} from "lucide-react";
import {
  defaultProfile,
  profileSchema,
  targets,
  type Profile,
} from "@/lib/nutrition";
import type { Translation } from "@/lib/i18n";
export function ProfileForm({
  initial,
  t,
  onSave,
}: {
  initial: Profile | null;
  t: Translation;
  onSave: (p: Profile) => void;
}) {
  const [p, setP] = useState<Profile>(initial ?? defaultProfile),
    [step, setStep] = useState(0),
    [error, setError] = useState("");
  const update = <K extends keyof Profile>(key: K, value: Profile[K]) =>
    setP((old) => ({ ...old, [key]: value }));
  const plan = targets(p);
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (step < 2) {
          setStep(step + 1);
          return;
        }
        const result = profileSchema.safeParse({ ...p, name: p.name.trim() });
        if (!result.success) {
          setError(t.validation);
          return;
        }
        onSave(result.data);
      }}
    >
      <div className="onboard-progress">
        {[0, 1, 2].map((s) => (
          <span key={s} className={step >= s ? "active" : ""} />
        ))}
        <small>
          {t.step} {step + 1}/3
        </small>
      </div>
      <div className="dialog-intro">
        <span className="round-icon">
          <Leaf size={24} />
        </span>
        <h3>{[t.goalIntro, t.bodyIntro, t.preferencesIntro][step]}</h3>
      </div>
      {step === 0 && (
        <div className="goal-options">
          {(["lose", "maintain", "gain"] as const).map((goal, i) => {
            const Icon = [TrendingDown, Minus, TrendingUp][i];
            return (
              <button
                key={goal}
                type="button"
                className={`goal-option ${p.goal === goal ? "selected" : ""}`}
                onClick={() => update("goal", goal)}
              >
                <Icon size={25} />
                <span>{t[goal]}</span>
                {p.goal === goal && <Check size={20} />}
              </button>
            );
          })}
        </div>
      )}
      {step === 1 && (
        <div className="form-grid">
          <label className="span-2">
            {t.name}
            <input
              autoComplete="given-name"
              required
              maxLength={60}
              value={p.name}
              placeholder={t.namePlaceholder}
              onChange={(e) => update("name", e.target.value)}
            />
          </label>
          <label>
            {t.sex}
            <select
              value={p.sex}
              onChange={(e) => update("sex", e.target.value as Profile["sex"])}
            >
              <option value="female">{t.female}</option>
              <option value="male">{t.male}</option>
            </select>
          </label>
          <label>
            {t.age}
            <input
              type="number"
              min="18"
              max="90"
              required
              value={p.age || ""}
              onChange={(e) => update("age", Number(e.target.value))}
            />
          </label>
          <label>
            {t.height}
            <input
              type="number"
              min="120"
              max="230"
              step="0.1"
              required
              value={p.height || ""}
              onChange={(e) => update("height", Number(e.target.value))}
            />
          </label>
          <label>
            {t.weight}
            <input
              type="number"
              min="35"
              max="250"
              step="0.1"
              required
              value={p.weight || ""}
              onChange={(e) => update("weight", Number(e.target.value))}
            />
          </label>
        </div>
      )}
      {step === 2 && (
        <div className="form-grid">
          <label className="span-2">
            {t.activity}
            <select
              value={p.activity}
              onChange={(e) => update("activity", Number(e.target.value))}
            >
              {[t.sedentary, t.light, t.moderate, t.active].map((text, i) => (
                <option key={text} value={[1.2, 1.375, 1.55, 1.725][i]}>
                  {text}
                </option>
              ))}
            </select>
          </label>
          <label className="span-2">
            {t.allergies}
            <input
              maxLength={500}
              value={p.allergies}
              placeholder={t.allergiesPlaceholder}
              onChange={(e) => update("allergies", e.target.value)}
            />
          </label>
          <label className="span-2">
            {t.manualTarget}
            <input
              type="number"
              min="1200"
              max="6000"
              value={p.manualCalories ?? ""}
              placeholder={String(plan.calories)}
              onChange={(e) =>
                update(
                  "manualCalories",
                  e.target.value ? Number(e.target.value) : null,
                )
              }
            />
          </label>
          <div className="plan-preview span-2">
            <span>{t.target}</span>
            <strong>
              {plan.calories.toLocaleString()} <small>{t.kcal}</small>
            </strong>
            <div>
              {t.protein} {plan.protein}
              {t.g} · {t.fat} {plan.fat}
              {t.g} · {t.carbs} {plan.carbs}
              {t.g}
            </div>
          </div>
          <p className="fine-print span-2">
            <Info size={16} />
            {t.formulaNote}
          </p>
        </div>
      )}
      {error && (
        <p className="error-text" role="alert">
          {error}
        </p>
      )}
      <div className="dialog-actions">
        {step > 0 && (
          <button
            className="button secondary"
            type="button"
            onClick={() => {
              setStep(step - 1);
              setError("");
            }}
          >
            {t.back}
          </button>
        )}
        <button className="button primary" type="submit">
          {step === 2 ? t.start : t.continue}
          <ArrowRight size={17} />
        </button>
      </div>
    </form>
  );
}

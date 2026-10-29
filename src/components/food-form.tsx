"use client";
import { useEffect, useRef, useState } from "react";
import {
  Camera,
  Check,
  ChevronLeft,
  Heart,
  LoaderCircle,
  Mic,
  Plus,
  Search,
  Sparkles,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { foodSchema, localDate, scaleFood, type Food } from "@/lib/nutrition";
import { catalog, fromCatalog } from "@/lib/catalog";
import type { Locale, Translation } from "@/lib/i18n";

type SpeechRecognitionLike = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start: () => void;
  stop: () => void;
  onresult:
    | ((event: {
        results: {
          [index: number]: { [index: number]: { transcript: string } };
        };
      }) => void)
    | null;
  onend: (() => void) | null;
  onerror: (() => void) | null;
};
export function FoodForm({
  t,
  lang,
  date,
  meal,
  initial,
  mode = "search",
  signedIn,
  onSave,
  onDelete,
  onFavorite,
  favoriteNames = [],
}: {
  t: Translation;
  lang: Locale;
  date: string;
  meal: Food["meal"];
  initial?: Food;
  mode?: "search" | "ai" | "manual";
  signedIn: boolean;
  onSave: (foods: Food[]) => void;
  onDelete?: (id: string) => void;
  onFavorite?: (f: Food) => void;
  favoriteNames?: string[];
}) {
  const [tab, setTab] = useState(mode),
    [query, setQuery] = useState(""),
    [text, setText] = useState("");
  const [foods, setFoods] = useState<Food[]>(initial ? [initial] : []),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const [image, setImage] = useState<{
      data: string;
      mime: string;
      url: string;
    } | null>(null),
    [consent, setConsent] = useState(false),
    [listening, setListening] = useState(false);
  const anchors = useRef(new Map<string, Food>());
  const recognition = useRef<SpeechRecognitionLike | null>(null),
    abort = useRef<AbortController | null>(null);
  useEffect(
    () => () => {
      recognition.current?.stop();
      abort.current?.abort();
    },
    [],
  );
  const blank = (): Food => ({
    id: crypto.randomUUID(),
    name: "",
    grams: 100,
    calories: 0,
    protein: 0,
    fat: 0,
    carbs: 0,
    emoji: "🍽️",
    meal,
    date,
    note: "",
    estimated: false,
  });
  const changeTab = (next: typeof tab) => {
    setTab(next);
    setError("");
    if (next === "manual") setFoods([blank()]);
  };
  const analyze = async () => {
    if (!signedIn) {
      setError(t.signInFirst);
      return;
    }
    setBusy(true);
    setError("");
    abort.current = new AbortController();
    try {
      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: abort.current.signal,
        body: JSON.stringify({
          text,
          locale: lang,
          consent,
          image: image ? { data: image.data, mime: image.mime } : undefined,
        }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || t.aiError);
      const result = body.foods.map((f: Partial<Food>) =>
        foodSchema.parse({
          ...f,
          id: crypto.randomUUID(),
          emoji: "🍽️",
          meal,
          date,
          estimated: true,
        }),
      );
      if (!result.length) throw new Error(t.aiError);
      setFoods(result);
    } catch (e) {
      if (e instanceof Error && e.name !== "AbortError")
        setError(e.message || t.aiError);
    } finally {
      setBusy(false);
    }
  };
  const upload = async (file?: File) => {
    if (!file) return;
    if (
      !["image/jpeg", "image/png", "image/webp"].includes(file.type) ||
      file.size > 4 * 1024 * 1024
    ) {
      setError(t.uploadHint);
      return;
    }
    const data = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = reject;
      reader.readAsDataURL(file);
    }).catch(() => null);
    if (!data) {
      setError(t.aiError);
      return;
    }
    setImage({ data: data.split(",")[1], mime: file.type, url: data });
    setError("");
  };
  const voice = () => {
    if (listening) {
      recognition.current?.stop();
      return;
    }
    const win = window as unknown as {
      SpeechRecognition?: new () => SpeechRecognitionLike;
      webkitSpeechRecognition?: new () => SpeechRecognitionLike;
    };
    const Constructor = win.SpeechRecognition || win.webkitSpeechRecognition;
    if (!Constructor) {
      setError(t.voiceUnsupported);
      return;
    }
    const r = new Constructor();
    recognition.current = r;
    r.lang = { ru: "ru-RU", en: "en-US", uz: "uz-UZ" }[lang];
    r.continuous = false;
    r.interimResults = false;
    r.onresult = (e) =>
      setText((old) => (old + " " + e.results[0][0].transcript).trim());
    r.onend = () => setListening(false);
    r.onerror = () => {
      setListening(false);
      setError(t.voiceUnsupported);
    };
    try {
      r.start();
      setListening(true);
    } catch {
      setError(t.voiceUnsupported);
    }
  };
  const filtered = catalog.filter(
    (item) =>
      query.trim().length < 3 ||
      Object.values(item.names).some((n) =>
        n.toLowerCase().includes(query.trim().toLowerCase()),
      ),
  );
  if (foods.length)
    return (
      <form
        onSubmit={(e) => {
          e.preventDefault();
          const parsed = foods.map((f) =>
            foodSchema.safeParse({ ...f, name: f.name.trim() }),
          );
          if (parsed.some((f) => !f.success)) {
            setError(t.validation);
            return;
          }
          onSave(parsed.map((f) => f.data!));
        }}
      >
        {!initial && (
          <button
            type="button"
            className="text-button back-link"
            onClick={() => {
              setFoods([]);
              setError("");
            }}
          >
            <ChevronLeft size={16} />
            {t.back}
          </button>
        )}
        <p className="muted">{t.review}</p>
        {foods.map((f, index) => (
          <div className="food-editor" key={f.id}>
            <div className="editor-heading">
              <span className="food-emoji">{f.emoji}</span>
              <strong>
                {foods.length > 1
                  ? `${index + 1} / ${foods.length}`
                  : t.nutrition}
              </strong>
              {onFavorite && (
                <button
                  type="button"
                  aria-label={
                    favoriteNames.includes(f.name) ? t.unfavorite : t.favorite
                  }
                  className={`icon-button ${favoriteNames.includes(f.name) ? "favorited" : ""}`}
                  onClick={() => onFavorite(f)}
                >
                  <Heart
                    size={20}
                    fill={
                      favoriteNames.includes(f.name) ? "currentColor" : "none"
                    }
                  />
                </button>
              )}
            </div>
            <div className="form-grid">
              <label className="span-2">
                {t.foodName}
                <input
                  required
                  maxLength={160}
                  value={f.name}
                  onChange={(e) =>
                    setFoods((old) =>
                      old.map((v, i) =>
                        i === index ? { ...v, name: e.target.value } : v,
                      ),
                    )
                  }
                />
              </label>
              <label>
                {t.portion}
                <input
                  type="number"
                  required
                  min="1"
                  max="5000"
                  step="0.1"
                  value={f.grams || ""}
                  onChange={(e) => {
                    const grams = Number(e.target.value);
                    if (!anchors.current.has(f.id) && f.grams > 0)
                      anchors.current.set(f.id, f);
                    const anchor = anchors.current.get(f.id);
                    setFoods((old) =>
                      old.map((v, i) =>
                        i === index
                          ? grams > 0 && anchor
                            ? scaleFood(anchor, grams)
                            : { ...v, grams }
                          : v,
                      ),
                    );
                  }}
                />
              </label>
              <label>
                {t.calories}
                <input
                  type="number"
                  required
                  min="0"
                  max="10000"
                  step="0.1"
                  value={f.calories}
                  onChange={(e) => {
                    anchors.current.delete(f.id);
                    setFoods((old) =>
                      old.map((v, i) =>
                        i === index
                          ? { ...v, calories: Number(e.target.value) }
                          : v,
                      ),
                    );
                  }}
                />
              </label>
              <p className="fine-print span-2">{t.portionHint}</p>
              <div className="macro-inputs span-2">
                {(["protein", "fat", "carbs"] as const).map((key) => (
                  <label key={key}>
                    {t[key]}, {t.g}
                    <input
                      type="number"
                      required
                      min="0"
                      max={key === "carbs" ? 2000 : 1000}
                      step="0.1"
                      value={f[key]}
                      onChange={(e) => {
                        anchors.current.delete(f.id);
                        setFoods((old) =>
                          old.map((v, i) =>
                            i === index
                              ? { ...v, [key]: Number(e.target.value) }
                              : v,
                          ),
                        );
                      }}
                    />
                  </label>
                ))}
              </div>
              <label>
                {t.meal}
                <select
                  value={f.meal}
                  onChange={(e) =>
                    setFoods((old) =>
                      old.map((v, i) =>
                        i === index
                          ? { ...v, meal: e.target.value as Food["meal"] }
                          : v,
                      ),
                    )
                  }
                >
                  {(["breakfast", "lunch", "dinner", "snack"] as const).map(
                    (m) => (
                      <option key={m} value={m}>
                        {t[m]}
                      </option>
                    ),
                  )}
                </select>
              </label>
              <label>
                {t.date}
                <input
                  type="date"
                  required
                  value={f.date}
                  onChange={(e) =>
                    setFoods((old) =>
                      old.map((v, i) =>
                        i === index ? { ...v, date: e.target.value } : v,
                      ),
                    )
                  }
                />
              </label>
              <label className="span-2">
                {t.note}
                <textarea
                  rows={2}
                  maxLength={1000}
                  value={f.note}
                  onChange={(e) =>
                    setFoods((old) =>
                      old.map((v, i) =>
                        i === index ? { ...v, note: e.target.value } : v,
                      ),
                    )
                  }
                />
              </label>
            </div>
          </div>
        ))}
        {foods.some((f) => f.estimated) && (
          <p className="info-box">
            <Sparkles size={18} />
            {t.estimateNote}
          </p>
        )}
        {error && (
          <p className="error-text" role="alert">
            {error}
          </p>
        )}
        <div className="dialog-actions">
          {initial && onDelete && (
            <button
              type="button"
              className="button danger-quiet"
              onClick={() => onDelete(initial.id)}
            >
              <Trash2 size={17} />
              {t.remove}
            </button>
          )}
          {tab === "ai" && !initial && (
            <button
              type="button"
              className="button secondary"
              onClick={() => setFoods([])}
            >
              {t.retry}
            </button>
          )}
          <button className="button primary" type="submit">
            <Check size={17} />
            {t.save}
          </button>
        </div>
      </form>
    );
  return (
    <div>
      <p className="muted">{t.entrySubtitle}</p>
      <div className="tabs">
        {(["search", "ai", "manual"] as const).map((key) => (
          <button
            key={key}
            className={tab === key ? "active" : ""}
            onClick={() => changeTab(key)}
          >
            {key === "search" ? (
              <Search size={16} />
            ) : key === "ai" ? (
              <Sparkles size={16} />
            ) : (
              <Plus size={16} />
            )}{" "}
            {t[key]}
          </button>
        ))}
      </div>
      {tab === "search" && (
        <>
          <div className="search-input">
            <Search size={19} />
            <input
              aria-label={t.search}
              placeholder={t.searchPlaceholder}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              autoFocus
            />
          </div>
          <p className="fine-print">{t.searchHint}</p>
          <div className="catalog-list">
            {filtered.map((item) => (
              <button
                className="catalog-row"
                key={item.names.en}
                onClick={() => setFoods([fromCatalog(item, lang, date, meal)])}
              >
                <span className="food-emoji">{item.emoji}</span>
                <span>
                  <strong>{item.names[lang]}</strong>
                  <small>
                    100 {t.g} · {item.calories} {t.kcal}
                  </small>
                </span>
                <Plus size={18} />
              </button>
            ))}
            {!filtered.length && <p className="empty-text">{t.noResults}</p>}
          </div>
        </>
      )}
      {tab === "ai" && (
        <>
          <div className="ai-label">
            <Sparkles size={16} />
            {t.aiReady}
          </div>
          <label>
            {t.describe}
            <textarea
              rows={4}
              maxLength={2000}
              placeholder={t.describePlaceholder}
              value={text}
              onChange={(e) => setText(e.target.value)}
            />
          </label>
          <div className="capture-options">
            <label className="upload-button">
              <Camera size={20} />
              {t.upload}
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={(e) => {
                  void upload(e.target.files?.[0]);
                  e.target.value = "";
                }}
              />
            </label>
            <button
              className={`button secondary ${listening ? "listening" : ""}`}
              onClick={voice}
            >
              <Mic size={18} />
              {listening ? t.listening : t.voice}
            </button>
          </div>
          <small className="muted">{t.uploadHint}</small>
          {image && (
            <div className="image-preview">
              {/* User-selected data URL, never a remote image. */}
              <img src={image.url} alt={t.photo} />
              <button
                className="icon-button"
                aria-label={t.remove}
                onClick={() => setImage(null)}
              >
                <X size={17} />
              </button>
            </div>
          )}
          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={consent}
              onChange={(e) => setConsent(e.target.checked)}
            />
            <span>{t.aiConsent}</span>
          </label>
          {!signedIn && <p className="info-box">{t.aiUnavailable}</p>}
          <button
            className="button primary full-width"
            disabled={
              busy ||
              !consent ||
              (!image && text.trim().length < 3) ||
              !signedIn
            }
            onClick={() => void analyze()}
          >
            {busy ? (
              <LoaderCircle size={18} className="spin" />
            ) : (
              <Sparkles size={18} />
            )}{" "}
            {busy ? t.analyzing : t.analyze}
          </button>
        </>
      )}
      {error && (
        <p className="error-text" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

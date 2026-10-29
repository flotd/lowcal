"use client";
import { useEffect, useRef, useState } from "react";
import {
  ArrowDownToLine,
  ArrowRight,
  Bell,
  BookOpen,
  Camera,
  Check,
  ChevronLeft,
  ChevronRight,
  CircleHelp,
  Cloud,
  Coffee,
  Flame,
  Heart,
  Leaf,
  LogOut,
  Menu,
  Moon,
  Plus,
  Settings,
  ShieldCheck,
  Sparkles,
  Sprout,
  Sun,
  TrendingUp,
  Utensils,
  Wheat,
  X,
} from "lucide-react";
import { translations, intlLocale, type Locale } from "@/lib/i18n";
import {
  emptyState,
  exportCsv,
  localDate,
  targets,
  totals,
  type Food,
  type Profile,
} from "@/lib/nutrition";
import { catalog, fromCatalog } from "@/lib/catalog";
import { useDiary } from "@/lib/use-diary";
import { Dialog } from "./dialog";
import { ProfileForm } from "./profile-form";
import { FoodForm } from "./food-form";
import { AdminAccess } from "./admin-access";
import { WelcomeScreen } from "./welcome-screen";

type Page = "diary" | "progress" | "favorites" | "settings";
type Modal = "profile" | "food" | "privacy" | "terms" | "pro" | "weight" | null;
const meals = ["breakfast", "lunch", "dinner", "snack"] as const;
const mealIcons = {
  breakfast: Coffee,
  lunch: Sun,
  dinner: Moon,
  snack: Utensils,
};

export function LowcalApp() {
  const diary = useDiary();
  const { data, setData } = diary;
  const [lang, setLang] = useState<Locale>("ru"),
    [theme, setTheme] = useState<"light" | "dark">("light");
  const [page, setPage] = useState<Page>("diary"),
    [modal, setModal] = useState<Modal>(null),
    [menu, setMenu] = useState(false);
  const [date, setDate] = useState(localDate()),
    [selectedMeal, setSelectedMeal] = useState<Food["meal"]>("breakfast");
  const [foodMode, setFoodMode] = useState<"search" | "ai" | "manual">(
      "search",
    ),
    [editing, setEditing] = useState<Food | undefined>();
  const [welcomeDone, setWelcomeDone] = useState(false);
  const [forceWelcome, setForceWelcome] = useState(false);
  const [quickFood, setQuickFood] = useState<Food | undefined>();
  const [toast, setToast] = useState(""),
    [email, setEmail] = useState(""),
    [authBusy, setAuthBusy] = useState(false),
    [authMessage, setAuthMessage] = useState("");
  const [weight, setWeight] = useState(""),
    [weightDate, setWeightDate] = useState(localDate()),
    [reminders, setReminders] = useState(false);
  const notificationTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const t = translations[lang],
    locale = intlLocale[lang];
  const plan = targets(data.profile),
    dailyFoods = data.foods.filter((f) => f.date === date),
    sum = totals(dailyFoods);
  const balance = plan.calories - sum.calories,
    percent = Math.min(100, Math.max(0, (sum.calories / plan.calories) * 100));
  const today = localDate();
  useEffect(() => {
    try {
      setWelcomeDone(localStorage.getItem("lowcal:welcome:v1") === "done");
      const l = localStorage.getItem("lowcal:language");
      if (l === "en" || l === "uz" || l === "ru") setLang(l);
      if (localStorage.getItem("lowcal:theme") === "dark") setTheme("dark");
    } catch {}
    if (new URLSearchParams(window.location.search).get("welcome") === "1")
      setForceWelcome(true);
    if (new URLSearchParams(window.location.search).has("auth_error"))
      setAuthMessage(translations.ru.authUnavailable);
  }, []);
  useEffect(() => {
    document.documentElement.lang = lang;
    try {
      localStorage.setItem("lowcal:language", lang);
    } catch {}
  }, [lang]);
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    try {
      localStorage.setItem("lowcal:theme", theme);
    } catch {}
  }, [theme]);
  useEffect(() => {
    if (!toast) return;
    const timeout = setTimeout(() => setToast(""), 3800);
    return () => clearTimeout(timeout);
  }, [toast]);
  useEffect(
    () => () => {
      if (notificationTimer.current) clearInterval(notificationTimer.current);
    },
    [],
  );
  const changePage = (next: Page) => {
    setPage(next);
    setMenu(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };
  const openFood = (
    meal: Food["meal"] = "breakfast",
    mode: "search" | "ai" | "manual" = "search",
    food?: Food,
  ) => {
    if (!diary.editable) return;
    setQuickFood(undefined);
    setSelectedMeal(meal);
    setFoodMode(mode);
    setEditing(food);
    setModal("food");
  };
  const dismissWelcome = () => {
    setWelcomeDone(true);
    setForceWelcome(false);
    try {
      localStorage.setItem("lowcal:welcome:v1", "done");
    } catch {}
    const url = new URL(window.location.href);
    url.searchParams.delete("welcome");
    window.history.replaceState(null, "", url.pathname + url.search + url.hash);
  };
  const saveFoods = (foods: Food[]) => {
    if (!diary.editable) return;
    setData((old) => ({
      ...old,
      foods: editing
        ? old.foods.map((f) => (f.id === editing.id ? foods[0] : f))
        : [...old.foods, ...foods],
    }));
    if (foods[0]) setDate(foods[0].date);
    setModal(null);
    setQuickFood(undefined);
    setToast(editing ? t.saved : t.added);
  };
  const saveProfile = (profile: Profile) => {
    if (!diary.editable) return;
    setData((old) => ({
      ...old,
      profile,
      weights: old.weights.length
        ? old.weights
        : [{ date: today, value: profile.weight }],
    }));
    setModal(null);
    setToast(t.saved);
  };
  const toggleFavorite = (f: Food) => {
    if (!diary.editable) return;
    const exists = data.favorites.some((x) => x.name === f.name);
    setData((old) => ({
      ...old,
      favorites: exists
        ? old.favorites.filter((x) => x.name !== f.name)
        : [...old.favorites, { ...f, id: crypto.randomUUID() }],
    }));
    setToast(exists ? t.favoriteRemoved : t.favoriteAdded);
  };
  const shiftDate = (direction: number) => {
    const d = new Date(`${date}T12:00:00`);
    d.setDate(d.getDate() + direction);
    setDate(localDate(d));
  };
  const lastDays = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(`${date}T12:00:00`);
    d.setDate(d.getDate() - 6 + i);
    return {
      date: localDate(d),
      label: d.toLocaleDateString(locale, { weekday: "short" }),
      value: totals(data.foods.filter((f) => f.date === localDate(d))).calories,
    };
  });
  const weekStart = new Date(`${date}T12:00:00`);
  weekStart.setDate(weekStart.getDate() - ((weekStart.getDay() + 6) % 7));
  const week = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + i);
    const key = localDate(d);
    return {
      date: key,
      label: d.toLocaleDateString(locale, { weekday: "short" }),
      day: d.getDate(),
      logged: data.foods.some((f) => f.date === key),
    };
  });
  const download = () => {
    const blob = new Blob([exportCsv(data.foods)], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `lowcal-${today}.csv`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  const signIn = async (provider: "google" | "email") => {
    if (!diary.client) {
      setAuthMessage(t.authUnavailable);
      return;
    }
    setAuthBusy(true);
    setAuthMessage("");
    try {
      const redirectTo = `${window.location.origin}/auth/callback`;
      const result =
        provider === "google"
          ? await diary.client.auth.signInWithOAuth({
              provider: "google",
              options: { redirectTo },
            })
          : await diary.client.auth.signInWithOtp({
              email: email.trim(),
              options: { emailRedirectTo: redirectTo },
            });
      if (result.error) throw result.error;
      if (provider === "email") setAuthMessage(t.emailSent);
    } catch {
      setAuthMessage(t.authUnavailable);
    } finally {
      setAuthBusy(false);
    }
  };
  const enableReminders = async () => {
    if (reminders) {
      if (notificationTimer.current) clearInterval(notificationTimer.current);
      setReminders(false);
      return;
    }
    if (!("Notification" in window)) {
      setToast(t.notificationsDenied);
      return;
    }
    const permission = await Notification.requestPermission();
    if (permission !== "granted") {
      setToast(t.notificationsDenied);
      return;
    }
    setReminders(true);
    notificationTimer.current = setInterval(
      () => {
        if (Notification.permission === "granted")
          new Notification(t.notificationTitle, {
            body: t.notificationBody,
            icon: "/icon.svg",
          });
      },
      3 * 60 * 60 * 1000,
    );
    setToast(t.saved);
  };
  const navItems: { id: Page; icon: typeof BookOpen }[] = [
    { id: "diary", icon: BookOpen },
    { id: "progress", icon: TrendingUp },
    { id: "favorites", icon: Heart },
    { id: "settings", icon: Settings },
  ];
  const statusLabel =
    diary.status === "saving" ? t.syncing : diary.user ? t.synced : t.localMode;

  if (!diary.ready)
    return (
      <main className="loading-shell" aria-label="Lowcal" aria-busy="true">
        <span className="brand-mark">
          <Sprout size={29} />
        </span>
        <span className="loading-bar" />
      </main>
    );
  if (
    forceWelcome ||
    (!welcomeDone &&
      !data.profile &&
      !data.foods.length &&
      !data.weights.length &&
      !data.favorites.length)
  ) {
    return (
      <WelcomeScreen
        lang={lang}
        onLanguage={setLang}
        t={t}
        editable={diary.editable}
        onFinish={(profile) => {
          if (!diary.editable) return;
          saveProfile(profile);
          dismissWelcome();
        }}
        onSkip={dismissWelcome}
        onAccount={() => {
          dismissWelcome();
          changePage("settings");
        }}
      />
    );
  }
  return (
    <div className="app-shell">
      {menu && (
        <button
          className="sidebar-scrim"
          aria-label={t.close}
          onClick={() => setMenu(false)}
        />
      )}
      <aside className={`sidebar ${menu ? "is-open" : ""}`}>
        <a className="brand" href="/" aria-label="Lowcal">
          <span className="brand-mark">
            <Sprout size={27} />
          </span>
          lowcal<span className="brand-dot">.</span>
        </a>
        <p className="brand-tagline">{t.tagline}</p>
        <div className="nav-caption">{t.wellbeing}</div>
        <nav aria-label={t.nutrition}>
          {navItems.map(({ id, icon: Icon }) => (
            <button
              key={id}
              className={`nav-item ${page === id ? "active" : ""}`}
              onClick={() => changePage(id)}
            >
              <Icon size={20} />
              <span>{t[id]}</span>
              {page === id && <span className="nav-dot" />}
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="pro-card">
            <div className="pro-spark">
              <Sparkles size={22} />
              <span>LOWCAL PRO</span>
            </div>
            <h3>{t.pro}</h3>
            <p>{t.proText}</p>
            <button onClick={() => setModal("pro")}>
              {t.comingSoon}
              <ArrowRight size={16} />
            </button>
          </div>
          <button
            className="sidebar-profile"
            onClick={() => changePage("settings")}
          >
            <span className="avatar">
              {(data.profile?.name || "L").slice(0, 1).toUpperCase()}
            </span>
            <span>
              <strong>{data.profile?.name || t.friend}</strong>
              <small>{diary.user ? t.connected : t.localMode}</small>
            </span>
            <Settings size={17} />
          </button>
        </div>
      </aside>
      <div className="main-shell">
        <header className="topbar">
          <div className="breadcrumb">
            <button
              className="icon-button mobile-menu"
              aria-label="Menu"
              onClick={() => setMenu(!menu)}
            >
              <Menu size={22} />
            </button>
            <span>{t.nutrition}</span>
            <ChevronRight size={14} />
            <strong>{t[page]}</strong>
          </div>
          <div className="topbar-actions">
            <span className="connection">
              <span className={`status-dot ${diary.user ? "cloud" : ""}`} />
              {statusLabel}
            </span>
            <select
              aria-label={t.language}
              className="language-select"
              disabled={!diary.ready}
              value={lang}
              onChange={(e) => setLang(e.target.value as Locale)}
            >
              <option value="ru">RU</option>
              <option value="uz">UZ</option>
              <option value="en">EN</option>
            </select>
            <button
              className="icon-button theme-toggle"
              aria-label={theme === "light" ? t.darkTheme : t.lightTheme}
              onClick={() => setTheme(theme === "light" ? "dark" : "light")}
            >
              {theme === "light" ? <Moon size={19} /> : <Sun size={19} />}
            </button>
            <button
              className="avatar small"
              aria-label={t.account}
              onClick={() => changePage("settings")}
            >
              {(data.profile?.name || "L").slice(0, 1).toUpperCase()}
            </button>
          </div>
        </header>
        <main className="main-content" id="main-content">
          {(diary.status === "error" || diary.status === "conflict") && (
            <div className="banner warning" role="alert">
              <Cloud size={20} />
              <span>
                {diary.status === "conflict" ? t.syncConflict : t.syncError}
              </span>
              <button
                className="text-button"
                onClick={
                  diary.status === "conflict" ? diary.reload : diary.retry
                }
              >
                {diary.status === "conflict" ? t.reloadCloud : t.retrySync}
              </button>
            </div>
          )}
          {diary.storageError && (
            <div className="banner warning" role="alert">
              {lang === "ru"
                ? "Браузер не смог сохранить дневник. Экспортируй записи, прежде чем закрыть страницу."
                : lang === "uz"
                  ? "Brauzer kundalikni saqlay olmadi. Sahifani yopishdan oldin eksport qil."
                  : "Your browser could not save this diary. Export your entries before closing this page."}
              <button className="text-button" onClick={download}>
                {t.export}
              </button>
            </div>
          )}
          {diary.cloudChoice && (
            <div className="banner cloud-choice">
              <Cloud size={22} />
              <span>{t.cloudEmpty}</span>
              <div>
                <button
                  className="button secondary"
                  onClick={() => diary.chooseCloud(false)}
                >
                  {t.startEmpty}
                </button>
                <button
                  className="button primary"
                  onClick={() => diary.chooseCloud(true)}
                >
                  {t.importLocal}
                </button>
              </div>
            </div>
          )}
          {page === "diary" && (
            <>
              <section className="page-heading">
                <div>
                  <p className="eyebrow">
                    <span />
                    {new Date(`${date}T12:00:00`).toLocaleDateString(locale, {
                      weekday: "long",
                      day: "numeric",
                      month: "long",
                    })}
                  </p>
                  <h1>
                    {t.greeting}
                    <br className="mobile-break" />{" "}
                    <em>
                      {data.profile?.name || t.friend}
                      <span className="greeting-dot">.</span>
                    </em>
                  </h1>
                  <p className="page-subtitle">{t.subtitle}</p>
                </div>
                <button
                  className="button primary add-main"
                  disabled={!diary.editable}
                  onClick={() => openFood()}
                >
                  <Plus size={19} />
                  {t.addFood}
                </button>
              </section>
              <div className="dashboard-grid">
                <div className="dashboard-primary">
                  <section className="balance-card card">
                    <div className="section-topline">
                      <h2>{t.dailyBalance}</h2>
                      <span className="pill">
                        <Leaf size={13} />
                        {data.profile ? t[data.profile.goal] : t.estimated}
                      </span>
                    </div>
                    <div className="balance-body">
                      <div
                        className="calorie-ring"
                        style={
                          { "--progress": `${percent}%` } as React.CSSProperties
                        }
                      >
                        <div>
                          <Flame size={21} />
                          <strong>
                            {Math.abs(Math.round(balance)).toLocaleString(
                              locale,
                            )}
                          </strong>
                          <span>{balance >= 0 ? t.remaining : t.over}</span>
                        </div>
                      </div>
                      <div className="balance-details">
                        <div className="calorie-summary">
                          <div>
                            <span className="legend-dot green" />
                            {t.eaten}
                            <strong>
                              {Math.round(sum.calories).toLocaleString(locale)}{" "}
                              <small>{t.kcal}</small>
                            </strong>
                          </div>
                          <div>
                            <span className="legend-dot neutral" />
                            {t.target}
                            <strong>
                              {plan.calories.toLocaleString(locale)}{" "}
                              <small>{t.kcal}</small>
                            </strong>
                          </div>
                        </div>
                        <div className="macro-grid">
                          {(["protein", "fat", "carbs"] as const).map(
                            (key, i) => (
                              <div className={`macro macro-${i}`} key={key}>
                                <span>{t[key]}</span>
                                <strong>
                                  {Math.round(sum[key])}
                                  <small>
                                    {" "}
                                    / {plan[key]} {t.g}
                                  </small>
                                </strong>
                                <div className="macro-track">
                                  <span
                                    style={{
                                      width: `${Math.min(100, (sum[key] / plan[key]) * 100)}%`,
                                    }}
                                  />
                                </div>
                              </div>
                            ),
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="balance-footer">
                      <span>
                        <ShieldCheck size={15} />
                        {data.profile
                          ? t.planText
                          : t.formulaNote.split(".")[0]}
                      </span>
                      <button
                        className="text-button"
                        disabled={!diary.editable}
                        onClick={() => setModal("profile")}
                      >
                        {data.profile ? t.editProfile : t.setup}
                        <ArrowRight size={14} />
                      </button>
                    </div>
                  </section>
                  <section className="meal-section">
                    <div className="section-heading">
                      <h2>
                        {t.meals}
                        <span className="count">{dailyFoods.length}</span>
                      </h2>
                      <div className="date-control">
                        <button
                          className="icon-button"
                          aria-label={t.back}
                          onClick={() => shiftDate(-1)}
                        >
                          <ChevronLeft size={17} />
                        </button>
                        <label>
                          <span>
                            {date === today
                              ? t.today
                              : new Date(`${date}T12:00:00`).toLocaleDateString(
                                  locale,
                                  { day: "numeric", month: "short" },
                                )}
                          </span>
                          <input
                            aria-label={t.date}
                            type="date"
                            value={date}
                            onChange={(e) =>
                              e.target.value && setDate(e.target.value)
                            }
                          />
                        </label>
                        <button
                          className="icon-button"
                          aria-label={t.continue}
                          onClick={() => shiftDate(1)}
                        >
                          <ChevronRight size={17} />
                        </button>
                      </div>
                    </div>
                    <div className="meal-list">
                      {meals.map((meal, i) => {
                        const foods = dailyFoods.filter((f) => f.meal === meal),
                          Icon = mealIcons[meal];
                        return (
                          <article
                            className={`meal-card card meal-${i}`}
                            key={meal}
                          >
                            <div className="meal-header">
                              <span className="meal-icon">
                                <Icon size={20} />
                              </span>
                              <h3>{t[meal]}</h3>
                              <span className="meal-calories">
                                {Math.round(totals(foods).calories)}{" "}
                                <small>{t.kcal}</small>
                              </span>
                              <button
                                className="icon-button meal-add"
                                disabled={!diary.editable}
                                aria-label={`${t.add}: ${t[meal]}`}
                                onClick={() => openFood(meal)}
                              >
                                <Plus size={19} />
                              </button>
                            </div>
                            {foods.length ? (
                              <div className="food-rows">
                                {foods.map((f) => (
                                  <button
                                    key={f.id}
                                    className="food-row"
                                    disabled={!diary.editable}
                                    onClick={() => openFood(meal, "manual", f)}
                                  >
                                    <span className="food-emoji">
                                      {f.emoji}
                                    </span>
                                    <span className="food-row-info">
                                      <strong>{f.name}</strong>
                                      <small>
                                        {f.grams} {t.g}
                                        {f.estimated ? ` · ${t.estimated}` : ""}
                                      </small>
                                    </span>
                                    <span className="food-row-value">
                                      {Math.round(f.calories)}
                                      <small>{t.kcal}</small>
                                    </span>
                                    <ChevronRight size={16} />
                                  </button>
                                ))}
                              </div>
                            ) : (
                              <button
                                className="empty-meal"
                                disabled={!diary.editable}
                                onClick={() => openFood(meal)}
                              >
                                <span className="empty-dash" />
                                <span>{t.emptyMeal}</span>
                                <span>{t.add}</span>
                              </button>
                            )}
                          </article>
                        );
                      })}
                    </div>
                  </section>
                </div>
                <aside className="dashboard-aside">
                  <section className="photo-card">
                    <div className="photo-card-decoration">
                      <SaladIllustration />
                    </div>
                    <span className="eyebrow light">
                      <Sparkles size={14} /> LOWCAL AI
                    </span>
                    <h2>
                      {lang === "ru" ? (
                        <>
                          Твоя еда.
                          <br />
                          Один снимок.
                        </>
                      ) : lang === "uz" ? (
                        <>
                          Ovqating.
                          <br />
                          Birgina surat.
                        </>
                      ) : (
                        <>
                          Your meal.
                          <br />
                          One little snap.
                        </>
                      )}
                    </h2>
                    <p>{t.entrySubtitle}</p>
                    <button
                      className="button photo-button"
                      disabled={!diary.editable}
                      onClick={() => openFood("lunch", "ai")}
                    >
                      <Camera size={18} />
                      {t.upload}
                      <ArrowRight size={16} />
                    </button>
                    <span className="photo-footnote">{t.review}</span>
                  </section>
                  <section className="week-card card">
                    <div className="section-topline">
                      <h3>{t.weekly}</h3>
                      <span className="mini-sprout">
                        <Sprout size={20} />
                      </span>
                    </div>
                    <div className="week-days">
                      {week.map((d) => (
                        <button
                          key={d.date}
                          aria-label={d.date}
                          onClick={() => setDate(d.date)}
                          className={`${d.date === date ? "selected" : ""} ${d.logged ? "logged" : ""}`}
                        >
                          <span>{d.label.replace(".", "")}</span>
                          <strong>
                            {d.logged ? <Check size={16} /> : d.day}
                          </strong>
                          <i />
                        </button>
                      ))}
                    </div>
                    <p>
                      <strong>{week.filter((d) => d.logged).length} / 7</strong>{" "}
                      {t.loggedDays}
                    </p>
                    <small>{t.weeklySub}</small>
                  </section>
                  <section className="companion-card">
                    <div className="companion-title">
                      <span>
                        <Sparkles size={18} />
                      </span>
                      <h3>{t.companion}</h3>
                    </div>
                    <p>
                      {!dailyFoods.length
                        ? t.companionText
                        : balance < 0
                          ? t.companionOver
                          : t.companionGood}
                    </p>
                    <span className="companion-sign">
                      with a little care, lowcal ♡
                    </span>
                  </section>
                </aside>
              </div>
              {!data.profile && (
                <section className="welcome-banner">
                  <span className="welcome-icon">
                    <Sprout size={37} />
                  </span>
                  <div>
                    <h3>{t.discover}</h3>
                    <p>{t.discoverText}</p>
                  </div>
                  <button
                    className="button secondary"
                    disabled={!diary.editable}
                    onClick={() => setModal("profile")}
                  >
                    {t.setup}
                    <ArrowRight size={17} />
                  </button>
                </section>
              )}
              <section className="quick-section">
                <div className="section-heading">
                  <h2>{t.search}</h2>
                  <button
                    className="text-button"
                    onClick={() => changePage("favorites")}
                  >
                    {t.favorites}
                    <ArrowRight size={15} />
                  </button>
                </div>
                <div className="quick-foods">
                  {catalog.slice(0, 4).map((item) => (
                    <button
                      className="quick-food card"
                      key={item.names.en}
                      disabled={!diary.editable}
                      onClick={() => {
                        setEditing(undefined);
                        setQuickFood(fromCatalog(item, lang, date, "snack"));
                        setSelectedMeal("snack");
                        setModal("food");
                      }}
                    >
                      <span className="food-emoji">{item.emoji}</span>
                      <span>
                        <strong>{item.names[lang]}</strong>
                        <small>
                          100 {t.g} · {item.calories} {t.kcal}
                        </small>
                      </span>
                      <Plus size={17} />
                    </button>
                  ))}
                </div>
              </section>
            </>
          )}
          {page === "progress" && (
            <>
              <section className="page-heading">
                <div>
                  <p className="eyebrow">
                    <span />
                    {t.wellbeing}
                  </p>
                  <h1>{t.progressTitle}</h1>
                  <p className="page-subtitle">{t.progressText}</p>
                </div>
                <button
                  className="button primary"
                  disabled={!diary.editable}
                  onClick={() => {
                    setWeight(String(data.profile?.weight || ""));
                    setWeightDate(today);
                    setModal("weight");
                  }}
                >
                  <Plus size={18} />
                  {t.logWeight}
                </button>
              </section>
              <div className="stats-grid">
                <div className="stat-card card">
                  <span>{t.average}</span>
                  <strong>
                    {Math.round(
                      lastDays.reduce((a, d) => a + d.value, 0) / 7,
                    ).toLocaleString(locale)}{" "}
                    <small>{t.kcal}</small>
                  </strong>
                </div>
                <div className="stat-card card">
                  <span>{t.entries}</span>
                  <strong>{data.foods.length}</strong>
                </div>
                <div className="stat-card card">
                  <span>{t.loggedDays}</span>
                  <strong>{new Set(data.foods.map((f) => f.date)).size}</strong>
                </div>
              </div>
              <div className="progress-grid">
                <section className="card chart-card">
                  <div className="section-heading">
                    <h2>{t.foodHistory}</h2>
                    <span className="pill">{t.kcal}</span>
                  </div>
                  <div
                    className="bar-chart"
                    role="img"
                    aria-label={lastDays
                      .map((d) => `${d.date}: ${d.value} ${t.kcal}`)
                      .join(", ")}
                  >
                    {lastDays.map((d) => (
                      <div key={d.date}>
                        <span>{Math.round(d.value) || "—"}</span>
                        <div className="bar-track">
                          <i
                            style={{
                              height: `${d.value ? Math.max(3, (d.value / Math.max(plan.calories, ...lastDays.map((x) => x.value))) * 100) : 0}%`,
                            }}
                          />
                        </div>
                        <small>{d.label}</small>
                      </div>
                    ))}
                  </div>
                </section>
                <section className="card chart-card">
                  <h2>{t.weightTrend}</h2>
                  {data.weights.length ? (
                    <WeightChart weights={data.weights} locale={locale} />
                  ) : (
                    <div className="chart-empty">
                      <TrendingUp size={40} />
                      <p>{t.notEnoughData}</p>
                    </div>
                  )}
                  <div className="weight-list">
                    {[...data.weights]
                      .sort((a, b) => b.date.localeCompare(a.date))
                      .slice(0, 5)
                      .map((w) => (
                        <div key={w.date}>
                          <span>
                            {new Date(`${w.date}T12:00:00`).toLocaleDateString(
                              locale,
                              { day: "numeric", month: "short" },
                            )}
                          </span>
                          <strong>{w.value} kg</strong>
                          <button
                            className="icon-button"
                            disabled={!diary.editable}
                            aria-label={`${t.remove}: ${w.date}`}
                            onClick={() =>
                              setData((old) => ({
                                ...old,
                                weights: old.weights.filter(
                                  (x) => x.date !== w.date,
                                ),
                              }))
                            }
                          >
                            <X size={14} />
                          </button>
                        </div>
                      ))}
                  </div>
                </section>
              </div>
            </>
          )}
          {page === "favorites" && (
            <>
              <section className="page-heading">
                <div>
                  <p className="eyebrow">
                    <Heart size={14} />
                    {t.favorites}
                  </p>
                  <h1>{t.favoritesTitle}</h1>
                  <p className="page-subtitle">{t.favoritesText}</p>
                </div>
                <button
                  className="button primary"
                  disabled={!diary.editable}
                  onClick={() => openFood()}
                >
                  <Plus size={18} />
                  {t.addFood}
                </button>
              </section>
              {data.favorites.length ? (
                <div className="favorite-grid">
                  {data.favorites.map((f) => (
                    <article className="card favorite-card" key={f.id}>
                      <span className="food-emoji large">{f.emoji}</span>
                      <button
                        className="icon-button favorite-remove"
                        disabled={!diary.editable}
                        aria-label={t.unfavorite}
                        onClick={() => toggleFavorite(f)}
                      >
                        <Heart size={19} fill="currentColor" />
                      </button>
                      <h3>{f.name}</h3>
                      <p>
                        {f.grams} {t.g} · {Math.round(f.calories)} {t.kcal}
                      </p>
                      <button
                        className="button secondary full-width"
                        disabled={!diary.editable}
                        onClick={() => {
                          setEditing(undefined);
                          setSelectedMeal("breakfast");
                          setFoodMode("manual");
                          setQuickFood({
                            ...f,
                            id: crypto.randomUUID(),
                            date,
                            meal: "breakfast",
                          });
                          setModal("food");
                        }}
                      >
                        <Plus size={16} />
                        {t.add}
                      </button>
                    </article>
                  ))}
                </div>
              ) : (
                <div className="empty-state card">
                  <Heart size={44} />
                  <h2>{t.noFavorites}</h2>
                  <p>{t.favoritesText}</p>
                  <button
                    className="button primary"
                    disabled={!diary.editable}
                    onClick={() => openFood()}
                  >
                    {t.addFood}
                    <Plus size={17} />
                  </button>
                </div>
              )}
            </>
          )}
          {page === "settings" && (
            <>
              <section className="page-heading">
                <div>
                  <p className="eyebrow">
                    <span />
                    {t.settings}
                  </p>
                  <h1>{t.appearance}</h1>
                  <p className="page-subtitle">{t.tagline}</p>
                </div>
              </section>
              <div className="settings-grid">
                <section className="card settings-card">
                  <div className="settings-title">
                    <span className="round-icon">
                      <Cloud size={22} />
                    </span>
                    <div>
                      <h2>{t.account}</h2>
                      <p>{t.accountText}</p>
                    </div>
                  </div>
                  {diary.user ? (
                    <>
                      <p className="account-email">{diary.user.email}</p>
                      <button
                        className="button secondary"
                        disabled={diary.status === "saving"}
                        onClick={async () => {
                          const result = await diary.client?.auth.signOut();
                          if (result?.error) setAuthMessage(t.syncError);
                          else setAuthMessage("");
                        }}
                      >
                        <LogOut size={17} />
                        {t.signOut}
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        className="button secondary full-width google-button"
                        disabled={authBusy || !diary.client}
                        onClick={() => void signIn("google")}
                      >
                        <span className="google-g">G</span>
                        {t.google}
                      </button>
                      <div className="divider">
                        <span>email</span>
                      </div>
                      <form
                        onSubmit={(e) => {
                          e.preventDefault();
                          void signIn("email");
                        }}
                      >
                        <label>
                          {t.email}
                          <input
                            type="email"
                            autoComplete="email"
                            required
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="you@example.com"
                          />
                        </label>
                        <button
                          className="button primary full-width"
                          disabled={authBusy || !diary.client}
                        >
                          {t.sendLink}
                          <ArrowRight size={16} />
                        </button>
                      </form>
                      {!diary.client && (
                        <p className="info-box">{t.authUnavailable}</p>
                      )}
                    </>
                  )}
                  {authMessage && (
                    <p className="info-box" role="status">
                      {authMessage}
                    </p>
                  )}
                  <p className="fine-print">
                    <ShieldCheck size={14} />
                    {t.localNotice}
                  </p>
                </section>
                <section className="card settings-card">
                  <div className="settings-title">
                    <span className="round-icon">
                      <Settings size={22} />
                    </span>
                    <h2>{t.appearance}</h2>
                  </div>
                  <label>
                    {t.language}
                    <select
                      value={lang}
                      onChange={(e) => setLang(e.target.value as Locale)}
                    >
                      <option value="ru">Русский</option>
                      <option value="uz">O‘zbekcha</option>
                      <option value="en">English</option>
                    </select>
                  </label>
                  <label>{t.theme}</label>
                  <div className="theme-options">
                    <button
                      className={theme === "light" ? "selected" : ""}
                      onClick={() => setTheme("light")}
                    >
                      <Sun size={19} />
                      {t.lightTheme}
                    </button>
                    <button
                      className={theme === "dark" ? "selected" : ""}
                      onClick={() => setTheme("dark")}
                    >
                      <Moon size={19} />
                      {t.darkTheme}
                    </button>
                  </div>
                  <div className="settings-separator" />
                  <h3>{t.notifications}</h3>
                  <p className="muted">{t.notifyText}</p>
                  <button
                    className="button secondary"
                    onClick={() => void enableReminders()}
                  >
                    <Bell size={16} />
                    {reminders ? t.connected : t.enable}
                    {reminders && <Check size={15} />}
                  </button>
                </section>
                <section className="card settings-card">
                  <div className="settings-title">
                    <span className="round-icon">
                      <Leaf size={22} />
                    </span>
                    <div>
                      <h2>{t.plan}</h2>
                      <p>{t.planText}</p>
                    </div>
                  </div>
                  <div className="settings-plan">
                    <strong>{plan.calories.toLocaleString(locale)}</strong>
                    <span>
                      {t.kcal} / {t.today.toLowerCase()}
                    </span>
                  </div>
                  <button
                    className="button secondary"
                    disabled={!diary.editable}
                    onClick={() => setModal("profile")}
                  >
                    {t.editProfile}
                    <ArrowRight size={16} />
                  </button>
                  <p className="fine-print">{t.formulaNote}</p>
                  {data.profile?.allergies && (
                    <div className="info-box">
                      {data.profile.allergies}
                      <br />
                      {t.allergyNotice}
                    </div>
                  )}
                </section>
                <section className="card settings-card">
                  <div className="settings-title">
                    <span className="round-icon">
                      <ShieldCheck size={22} />
                    </span>
                    <h2>{t.data}</h2>
                  </div>
                  <button
                    className="button secondary full-width"
                    onClick={download}
                  >
                    <ArrowDownToLine size={17} />
                    {t.export}
                  </button>
                  <button
                    className="button danger-quiet full-width"
                    disabled={!diary.editable}
                    onClick={async () => {
                      if (window.confirm(t.clearConfirm)) {
                        if (await diary.clear()) setToast(t.deleted);
                      }
                    }}
                  >
                    {diary.user ? t.clearCloud : t.clear}
                  </button>
                  <div className="settings-separator" />
                  <button
                    className="legal-row"
                    onClick={() => setModal("privacy")}
                  >
                    {t.privacy}
                    <ChevronRight size={16} />
                  </button>
                  <button
                    className="legal-row"
                    onClick={() => setModal("terms")}
                  >
                    {t.terms}
                    <ChevronRight size={16} />
                  </button>
                  <p className="fine-print">{t.noPaid}</p>
                </section>
                {diary.user && diary.client && (
                  <AdminAccess
                    key={diary.user.id}
                    client={diary.client}
                    userId={diary.user.id}
                    lang={lang}
                  />
                )}
              </div>
            </>
          )}
          <footer className="footer">
            <span>
              <Sprout size={16} /> lowcal{" "}
              <span className="footer-motto">— {t.tagline}</span>
            </span>
            <div>
              <button onClick={() => setModal("privacy")}>{t.privacy}</button>
              <span>·</span>
              <button onClick={() => setModal("terms")}>{t.terms}</button>
              <span className="footer-version">v0.1</span>
            </div>
          </footer>
        </main>
      </div>
      <nav className="mobile-nav" aria-label={t.nutrition}>
        {navItems.map(({ id, icon: Icon }) => (
          <button
            key={id}
            className={page === id ? "active" : ""}
            onClick={() => changePage(id)}
          >
            <Icon size={21} />
            <span>{t[id]}</span>
          </button>
        ))}
      </nav>
      {toast && (
        <div className="toast" role="status">
          <span>
            <Check size={15} />
          </span>
          {toast}
        </div>
      )}
      {modal === "profile" && (
        <Dialog
          title={t.aboutYou}
          closeLabel={t.close}
          onClose={() => setModal(null)}
        >
          <ProfileForm initial={data.profile} t={t} onSave={saveProfile} />
        </Dialog>
      )}
      {modal === "food" && (
        <Dialog
          title={editing ? t.edit : t.newFood}
          closeLabel={t.close}
          onClose={() => {
            setModal(null);
            setQuickFood(undefined);
          }}
        >
          <FoodForm
            key={editing?.id || quickFood?.id || "new"}
            t={t}
            lang={lang}
            date={date}
            meal={selectedMeal}
            initial={editing || quickFood}
            mode={foodMode}
            signedIn={!!diary.user}
            onSave={saveFoods}
            onDelete={
              editing
                ? (id) => {
                    if (!diary.editable) return;
                    setData((old) => ({
                      ...old,
                      foods: old.foods.filter((f) => f.id !== id),
                    }));
                    setModal(null);
                    setToast(t.deleted);
                  }
                : undefined
            }
            onFavorite={toggleFavorite}
            favoriteNames={data.favorites.map((f) => f.name)}
          />
        </Dialog>
      )}
      {(modal === "privacy" || modal === "terms") && (
        <Dialog
          title={t[modal]}
          closeLabel={t.close}
          onClose={() => setModal(null)}
        >
          <div className="legal-copy">
            <ShieldCheck size={35} />
            <p>{modal === "privacy" ? t.privacyText : t.termsText}</p>
          </div>
        </Dialog>
      )}
      {modal === "pro" && (
        <Dialog
          title={t.pro}
          closeLabel={t.close}
          onClose={() => setModal(null)}
        >
          <div className="legal-copy">
            <Sparkles size={38} />
            <p>{t.noPaid}</p>
            <p>{t.aiUnavailable}</p>
            <button
              className="button primary"
              onClick={() => {
                setModal(null);
                changePage("settings");
              }}
            >
              {t.account}
              <ArrowRight size={16} />
            </button>
          </div>
        </Dialog>
      )}
      {modal === "weight" && (
        <Dialog
          title={t.logWeight}
          closeLabel={t.close}
          onClose={() => setModal(null)}
        >
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!diary.editable) return;
              const value = Number(weight);
              if (
                value < 35 ||
                value > 250 ||
                !Number.isFinite(value) ||
                !/^\d{4}-\d{2}-\d{2}$/.test(weightDate)
              )
                return;
              setData((old) => ({
                ...old,
                weights: [
                  ...old.weights.filter((w) => w.date !== weightDate),
                  { date: weightDate, value },
                ],
              }));
              setModal(null);
              setToast(t.saved);
            }}
          >
            <div className="form-grid">
              <label>
                {t.weight}
                <input
                  type="number"
                  min="35"
                  max="250"
                  step="0.1"
                  required
                  value={weight}
                  onChange={(e) => setWeight(e.target.value)}
                  autoFocus
                />
              </label>
              <label>
                {t.date}
                <input
                  type="date"
                  required
                  max={today}
                  value={weightDate}
                  onChange={(e) => setWeightDate(e.target.value)}
                />
              </label>
            </div>
            <div className="dialog-actions">
              <button className="button primary" type="submit">
                <Check size={17} />
                {t.save}
              </button>
            </div>
          </form>
        </Dialog>
      )}
    </div>
  );
}

function WeightChart({
  weights,
  locale,
}: {
  weights: { date: string; value: number }[];
  locale: string;
}) {
  const sorted = [...weights]
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(-30),
    values = sorted.map((w) => w.value);
  const min = Math.min(...values) - 1,
    max = Math.max(...values) + 1;
  const x = (i: number) =>
    sorted.length === 1 ? 160 : 20 + (i / (sorted.length - 1)) * 280;
  const y = (v: number) => 120 - ((v - min) / (max - min)) * 95;
  const points = sorted.map((w, i) => `${x(i)},${y(w.value)}`).join(" ");
  return (
    <div className="weight-chart">
      <div className="weight-current">
        <strong>
          {sorted.at(-1)?.value}
          <small> kg</small>
        </strong>
        <span>
          {new Date(`${sorted.at(-1)?.date}T12:00:00`).toLocaleDateString(
            locale,
            { day: "numeric", month: "short" },
          )}
        </span>
      </div>
      <svg
        viewBox="0 0 320 145"
        role="img"
        aria-label={sorted.map((w) => `${w.date}: ${w.value} kg`).join(", ")}
      >
        <defs>
          <linearGradient id="weight-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#91b59a" stopOpacity=".3" />
            <stop offset="100%" stopColor="#91b59a" stopOpacity="0" />
          </linearGradient>
        </defs>
        {[30, 75, 120].map((y) => (
          <line
            key={y}
            x1="15"
            y1={y}
            x2="305"
            y2={y}
            stroke="currentColor"
            opacity=".08"
          />
        ))}
        <polygon
          points={`${x(0)},135 ${points} ${x(sorted.length - 1)},135`}
          fill="url(#weight-fill)"
        />
        <polyline
          points={points}
          fill="none"
          stroke="#658b70"
          strokeWidth="3"
          strokeLinejoin="round"
        />
        {sorted.map((w, i) => (
          <circle key={w.date} cx={x(i)} cy={y(w.value)} r="4" fill="#658b70">
            <title>
              {w.date}: {w.value} kg
            </title>
          </circle>
        ))}
      </svg>
    </div>
  );
}
function SaladIllustration() {
  return (
    <svg viewBox="0 0 250 230" fill="none" aria-hidden="true">
      <ellipse cx="132" cy="205" rx="95" ry="13" fill="#152f25" opacity=".14" />
      <path d="M32 123h204c-4 55-39 85-102 85S37 178 32 123Z" fill="#e9e8d5" />
      <path
        d="M32 123h204c-2 21-9 37-20 50-47 15-110 8-169-6-7-12-12-26-15-44Z"
        fill="#fcf9e8"
      />
      <ellipse cx="134" cy="123" rx="102" ry="37" fill="#d6d8bc" />
      <ellipse cx="134" cy="120" rx="93" ry="30" fill="#728c4e" />
      <path
        d="M52 113c-25-27 3-59 24-32-7-41 39-47 40-10 18-38 49-12 28 16 43-16 58 19 22 35-24 23-88 21-114-9Z"
        fill="#a8c68a"
      />
      <path
        d="M110 119c-11-39 23-58 36-29 9-39 49-22 38 9 31-11 49 17 21 33-17 17-74 8-95-13Z"
        fill="#547b46"
      />
      <path
        d="M159 69c-11 5-20 21-24 40m-62-7 32 21"
        stroke="#d1e3ac"
        strokeWidth="3"
        strokeLinecap="round"
      />
      <circle cx="86" cy="124" r="21" fill="#eaa17c" />
      <circle cx="86" cy="124" r="16" fill="#d97657" />
      <path d="m85 110 2 28m-15-17 27 7" stroke="#eeb08d" strokeWidth="2" />
      <circle cx="190" cy="118" r="16" fill="#dc825e" />
      <path
        d="M120 105c11-26 32-32 46-19 15 15 11 41-18 49-22 6-40-9-28-30Z"
        fill="#d9df9e"
      />
      <path
        d="M129 109c7-17 20-22 29-14 8 8 6 25-12 30-13 4-23-5-17-16Z"
        fill="#a8bd72"
      />
      <ellipse
        cx="146"
        cy="110"
        rx="9"
        ry="12"
        transform="rotate(30 146 110)"
        fill="#a18457"
      />
      <rect
        x="62"
        y="91"
        width="19"
        height="18"
        rx="4"
        transform="rotate(-15 62 91)"
        fill="#f5deb4"
      />
      <rect
        x="168"
        y="132"
        width="19"
        height="18"
        rx="4"
        transform="rotate(19 168 132)"
        fill="#f5deb4"
      />
      <rect
        x="104"
        y="135"
        width="16"
        height="16"
        rx="3"
        transform="rotate(10 104 135)"
        fill="#f7e6ca"
      />
      <path
        d="m205 79 19-27m-5 37 19-9m-40-9 3-22"
        stroke="#bdd39d"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      <path
        d="m44 68-9-11m2 22-14-3"
        stroke="#e7c7a2"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

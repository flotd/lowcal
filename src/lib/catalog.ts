import type { Food } from "./nutrition";
export type CatalogItem = {
  names: { ru: string; en: string; uz: string };
  emoji: string;
  calories: number;
  protein: number;
  fat: number;
  carbs: number;
};
// Approximate values per 100 g. Recipes, brands and cooking methods vary.
export const catalog: CatalogItem[] = [
  {
    names: { ru: "Овсяная каша", en: "Oatmeal", uz: "Suli bo‘tqasi" },
    emoji: "🥣",
    calories: 71,
    protein: 2.5,
    fat: 1.5,
    carbs: 12,
  },
  {
    names: { ru: "Яйцо варёное", en: "Boiled egg", uz: "Qaynatilgan tuxum" },
    emoji: "🥚",
    calories: 155,
    protein: 12.6,
    fat: 10.6,
    carbs: 1.1,
  },
  {
    names: { ru: "Куриная грудка", en: "Chicken breast", uz: "Tovuq ko‘kragi" },
    emoji: "🍗",
    calories: 165,
    protein: 31,
    fat: 3.6,
    carbs: 0,
  },
  {
    names: { ru: "Рис варёный", en: "Cooked rice", uz: "Pishirilgan guruch" },
    emoji: "🍚",
    calories: 130,
    protein: 2.7,
    fat: 0.3,
    carbs: 28,
  },
  {
    names: { ru: "Авокадо", en: "Avocado", uz: "Avokado" },
    emoji: "🥑",
    calories: 160,
    protein: 2,
    fat: 14.7,
    carbs: 8.5,
  },
  {
    names: { ru: "Банан", en: "Banana", uz: "Banan" },
    emoji: "🍌",
    calories: 89,
    protein: 1.1,
    fat: 0.3,
    carbs: 22.8,
  },
  {
    names: { ru: "Яблоко", en: "Apple", uz: "Olma" },
    emoji: "🍎",
    calories: 52,
    protein: 0.3,
    fat: 0.2,
    carbs: 13.8,
  },
  {
    names: { ru: "Греческий йогурт", en: "Greek yogurt", uz: "Yunon yogurti" },
    emoji: "🥛",
    calories: 73,
    protein: 10,
    fat: 2,
    carbs: 3.9,
  },
  {
    names: {
      ru: "Лосось запечённый",
      en: "Baked salmon",
      uz: "Pishirilgan losos",
    },
    emoji: "🐟",
    calories: 206,
    protein: 22,
    fat: 12,
    carbs: 0,
  },
  {
    names: {
      ru: "Гречка варёная",
      en: "Cooked buckwheat",
      uz: "Pishirilgan grechka",
    },
    emoji: "🥣",
    calories: 92,
    protein: 3.4,
    fat: 0.6,
    carbs: 19.9,
  },
  {
    names: {
      ru: "Плов (примерный состав)",
      en: "Plov (estimated recipe)",
      uz: "Osh (taxminiy retsept)",
    },
    emoji: "🍛",
    calories: 210,
    protein: 7,
    fat: 10,
    carbs: 23,
  },
  {
    names: { ru: "Помидор", en: "Tomato", uz: "Pomidor" },
    emoji: "🍅",
    calories: 18,
    protein: 0.9,
    fat: 0.2,
    carbs: 3.9,
  },
];
export function fromCatalog(
  item: CatalogItem,
  lang: "ru" | "en" | "uz",
  date: string,
  meal: Food["meal"],
): Food {
  return {
    id: crypto.randomUUID(),
    name: item.names[lang],
    emoji: item.emoji,
    grams: 100,
    calories: item.calories,
    protein: item.protein,
    fat: item.fat,
    carbs: item.carbs,
    date,
    meal,
    note: "",
    estimated: true,
  };
}

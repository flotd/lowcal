import { z } from "zod";

export const foodSchema = z.object({
  id: z.string().min(1).max(100),
  name: z.string().min(1).max(160),
  grams: z.number().min(1).max(5000),
  calories: z.number().min(0).max(10000),
  protein: z.number().min(0).max(1000),
  fat: z.number().min(0).max(1000),
  carbs: z.number().min(0).max(2000),
  emoji: z.string().max(12).default("🍽️"),
  meal: z.enum(["breakfast", "lunch", "dinner", "snack"]),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  note: z.string().max(1000).default(""),
  estimated: z.boolean().default(false),
});
export type Food = z.infer<typeof foodSchema>;
export const profileSchema = z.object({
  name: z.string().min(1).max(60),
  sex: z.enum(["female", "male"]),
  age: z.number().min(18).max(90),
  height: z.number().min(120).max(230),
  weight: z.number().min(35).max(250),
  activity: z.number().refine((v) => [1.2, 1.375, 1.55, 1.725].includes(v)),
  goal: z.enum(["lose", "maintain", "gain"]),
  allergies: z.string().max(500),
  manualCalories: z.number().min(1200).max(6000).nullable(),
});
export type Profile = z.infer<typeof profileSchema>;
export const stateSchema = z.object({
  profile: profileSchema.nullable(),
  foods: z.array(foodSchema).max(10000),
  favorites: z.array(foodSchema).max(300),
  weights: z
    .array(
      z.object({
        date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
        value: z.number().min(35).max(250),
      }),
    )
    .max(3000),
});
export type NutritionState = z.infer<typeof stateSchema>;
export const emptyState: NutritionState = {
  profile: null,
  foods: [],
  favorites: [],
  weights: [],
};
export const defaultProfile: Profile = {
  name: "",
  sex: "female",
  age: 25,
  height: 165,
  weight: 65,
  activity: 1.375,
  goal: "maintain",
  allergies: "",
  manualCalories: null,
};

export function targets(p: Profile | null) {
  if (!p)
    return {
      calories: 2000,
      protein: 100,
      fat: 67,
      carbs: 250,
      bmr: 0,
      maintenance: 0,
    };
  const bmr =
    10 * p.weight + 6.25 * p.height - 5 * p.age + (p.sex === "male" ? 5 : -161);
  const maintenance = bmr * p.activity;
  const calories = Math.round(
    p.manualCalories ??
      Math.max(
        p.sex === "male" ? 1500 : 1200,
        maintenance * (p.goal === "lose" ? 0.85 : p.goal === "gain" ? 1.1 : 1),
      ),
  );
  const protein = Math.round(
    Math.min(
      p.weight * (p.goal === "maintain" ? 1.4 : 1.6),
      (calories * 0.3) / 4,
    ),
  );
  const fat = Math.round((calories * 0.3) / 9);
  return {
    calories,
    protein,
    fat,
    carbs: Math.round((calories - protein * 4 - fat * 9) / 4),
    bmr: Math.round(bmr),
    maintenance: Math.round(maintenance),
  };
}
export function totals(foods: Food[]) {
  return foods.reduce(
    (a, f) => ({
      calories: a.calories + f.calories,
      protein: a.protein + f.protein,
      fat: a.fat + f.fat,
      carbs: a.carbs + f.carbs,
    }),
    { calories: 0, protein: 0, fat: 0, carbs: 0 },
  );
}
export function localDate(d = new Date()) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
export function scaleFood(food: Food, grams: number): Food {
  const ratio = grams / food.grams;
  return {
    ...food,
    grams,
    calories: Math.round(food.calories * ratio),
    protein: Math.round(food.protein * ratio * 10) / 10,
    fat: Math.round(food.fat * ratio * 10) / 10,
    carbs: Math.round(food.carbs * ratio * 10) / 10,
  };
}
export function exportCsv(foods: Food[]) {
  const cell = (s: string | number) =>
    `"${String(s)
      .replace(/^[=+@\-\t\r]/, "'$&")
      .replaceAll('"', '""')}"`;
  return (
    "\uFEFF" +
    [
      [
        "date",
        "meal",
        "food",
        "grams",
        "kcal",
        "protein_g",
        "fat_g",
        "carbs_g",
        "estimated",
      ],
      ...foods.map((f) => [
        f.date,
        f.meal,
        f.name,
        f.grams,
        f.calories,
        f.protein,
        f.fat,
        f.carbs,
        f.estimated ? "yes" : "no",
      ]),
    ]
      .map((row) => row.map(cell).join(","))
      .join("\r\n")
  );
}

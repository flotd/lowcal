import { describe, it, expect } from "vitest";
import {
  defaultProfile,
  targets,
  totals,
  scaleFood,
  foodSchema,
  profileSchema,
  exportCsv,
  localDate,
} from "../src/lib/nutrition";

const food = foodSchema.parse({
  id: "a",
  name: "Rice",
  grams: 100,
  calories: 130,
  protein: 2.7,
  fat: 0.3,
  carbs: 28,
  emoji: "🍚",
  meal: "lunch",
  date: "2026-10-30",
});
describe("nutrition planning", () => {
  it("uses Mifflin–St Jeor and activity for maintenance", () => {
    const result = targets({
      ...defaultProfile,
      name: "A",
      sex: "male",
      age: 30,
      height: 180,
      weight: 80,
      activity: 1.55,
    });
    expect(result.bmr).toBe(1780);
    expect(result.maintenance).toBe(2759);
    expect(result.calories).toBe(2759);
    expect(
      Math.abs(
        result.protein * 4 +
          result.fat * 9 +
          result.carbs * 4 -
          result.calories,
      ),
    ).toBeLessThanOrEqual(3);
  });
  it("applies a moderate deficit and floors low estimates", () => {
    expect(targets({ ...defaultProfile, goal: "lose" }).calories).toBe(1631);
    expect(
      targets({
        ...defaultProfile,
        sex: "male",
        age: 80,
        height: 120,
        weight: 35,
        activity: 1.2,
        goal: "lose",
      }).calories,
    ).toBe(1500);
    expect(
      targets({
        ...defaultProfile,
        age: 80,
        height: 120,
        weight: 35,
        activity: 1.2,
        goal: "lose",
      }).calories,
    ).toBe(1200);
  });
  it("honors an explicit target", () =>
    expect(targets({ ...defaultProfile, manualCalories: 2200 }).calories).toBe(
      2200,
    ));
  it("rejects minors and invalid measurements", () => {
    expect(
      profileSchema.safeParse({ ...defaultProfile, name: "A", age: 17 })
        .success,
    ).toBe(false);
    expect(
      profileSchema.safeParse({ ...defaultProfile, name: "A", activity: 99 })
        .success,
    ).toBe(false);
    expect(
      profileSchema.safeParse({
        ...defaultProfile,
        name: "A",
        manualCalories: 800,
      }).success,
    ).toBe(false);
  });
});
describe("food journal", () => {
  it("scales the entire portion rather than double-counting per-100 g values", () => {
    const scaled = scaleFood(food, 250);
    expect(scaled.calories).toBe(325);
    expect(scaled.carbs).toBe(70);
    expect(scaled.protein).toBe(6.8);
    expect(totals([food, scaled]).calories).toBe(455);
  });
  it("rejects negative and absurd model output", () => {
    expect(foodSchema.safeParse({ ...food, calories: -1 }).success).toBe(false);
    expect(foodSchema.safeParse({ ...food, grams: 9000 }).success).toBe(false);
  });
  it("exports quotes, newlines and neutralizes spreadsheet formulas", () => {
    const csv = exportCsv([{ ...food, name: '=HYPERLINK("x")\nhello' }]);
    expect(csv).toContain('"\'=HYPERLINK(""x"")\nhello"');
    expect(csv).toContain('"130"');
    expect(csv.startsWith("\uFEFF")).toBe(true);
  });
  it("uses the local calendar day", () =>
    expect(localDate(new Date(2026, 9, 30, 23, 45))).toBe("2026-10-30"));
});

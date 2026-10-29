import { test, expect } from "@playwright/test";

test("personal plan, portion editing, persistence and favorites", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "Ты больше,чем цифры.",
  );
  await page
    .getByRole("button", { name: "Найти свой баланс", exact: true })
    .click();
  let dialog = page.locator(".welcome-copy");
  await dialog.getByRole("button", { name: "Снизить вес" }).click();
  await dialog.getByRole("button", { name: "Далее" }).click();
  await dialog.getByLabel("Как тебя называть?").fill("Зарина");
  await dialog.getByLabel("Возраст", { exact: true }).fill("28");
  await dialog.getByLabel("Рост, см").fill("168");
  await dialog.getByLabel("Вес, кг").fill("68");
  await dialog.getByRole("button", { name: "Далее" }).click();
  await dialog.getByRole("button", { name: "Найти мой баланс" }).click();
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Зарина");
  await page
    .getByRole("button", { name: "Добавить: Завтрак", exact: true })
    .click();
  dialog = page.getByRole("dialog");
  await dialog.getByRole("textbox", { name: "Поиск", exact: true }).fill("овс");
  await dialog.getByRole("button", { name: /Овсяная каша/ }).click();
  // A multi-keystroke edit must scale from the original portion, without rounding drift.
  await dialog.getByLabel("Порция, г").fill("250");
  await expect(dialog.getByLabel("Калории", { exact: true })).toHaveValue(
    "178",
  );
  await expect(dialog.getByLabel("Белки, г")).toHaveValue("6.3");
  await dialog
    .getByRole("button", { name: "В избранное", exact: true })
    .click();
  await dialog.getByRole("button", { name: "Сохранить", exact: true }).click();
  await expect(
    page.getByRole("button", { name: /Овсяная каша 250 г/ }),
  ).toBeVisible();
  await page.reload();
  await expect(
    page.getByRole("button", { name: /Овсяная каша 250 г/ }),
  ).toBeVisible();
  await page.getByRole("button", { name: /Овсяная каша 250 г/ }).click();
  await page.getByRole("dialog").getByLabel("Порция, г").fill("100");
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Сохранить", exact: true })
    .click();
  await expect(
    page
      .locator(".food-rows")
      .getByRole("button", { name: /Овсяная каша 100 г/ }),
  ).toBeVisible();
  await page
    .getByRole("navigation")
    .filter({ visible: true })
    .getByRole("button", { name: "Избранное", exact: true })
    .first()
    .click();
  await expect(
    page.getByRole("heading", { name: "Овсяная каша", exact: true }),
  ).toBeVisible();
  await page.screenshot({
    path: `test-results/favorites-${test.info().project.name}.png`,
    fullPage: true,
  });
});

test("three languages, dark theme, manual recipe, export and deletion", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Пока просто посмотреть" }).click();
  await expect(
    page.getByRole("button", { name: "Добавить еду", exact: true }),
  ).toBeEnabled();
  await page.locator(".topbar").getByLabel("Язык").selectOption("en");
  await expect(
    page.getByRole("heading", { name: "Your daily balance" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Dark", exact: true }).click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await page.locator(".topbar").getByLabel("Language").selectOption("uz");
  await expect(
    page.getByRole("heading", { name: "Bugungi muvozanating" }),
  ).toBeVisible();
  await page.locator(".topbar").getByLabel("Til").selectOption("ru");
  await page.getByRole("button", { name: "Добавить еду", exact: true }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByRole("button", { name: "Вручную", exact: true }).click();
  await dialog.getByLabel("Название еды").fill("Домашний салат");
  await dialog.getByLabel("Калории", { exact: true }).fill("320");
  await dialog.getByLabel("Белки, г").fill("12");
  await dialog.getByLabel("Жиры, г").fill("20");
  await dialog.getByLabel("Углеводы, г").fill("23");
  await dialog.getByRole("button", { name: "Сохранить", exact: true }).click();
  await expect(
    page.getByRole("button", { name: /Домашний салат/ }),
  ).toBeVisible();
  await page
    .getByRole("navigation")
    .filter({ visible: true })
    .getByRole("button", { name: "Настройки", exact: true })
    .first()
    .click();
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Экспорт дневника · CSV" }).click();
  expect((await download).suggestedFilename()).toMatch(/^lowcal-.*\.csv$/);
  page.once("dialog", (d) => d.accept());
  await page
    .getByRole("button", { name: "Очистить дневник на устройстве" })
    .click();
  await page
    .getByRole("navigation")
    .filter({ visible: true })
    .getByRole("button", { name: "Дневник питания", exact: true })
    .first()
    .click();
  await expect(
    page.getByRole("button", { name: /Домашний салат/ }),
  ).toHaveCount(0);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
});

test("photo flow is honest without a configured account; layout has no overflow", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  await page.getByRole("button", { name: "Пока просто посмотреть" }).click();
  await expect(
    page.getByRole("button", { name: "Добавить еду", exact: true }),
  ).toBeEnabled();
  await page
    .getByRole("button", { name: "Добавить фото", exact: true })
    .click();
  const dialog = page.getByRole("dialog");
  await expect(
    dialog.getByText("Для ИИ нужны аккаунт и настройка сервера.", {
      exact: false,
    }),
  ).toBeVisible();
  await expect(
    dialog.getByRole("button", { name: "Разобрать приём пищи" }),
  ).toBeDisabled();
  await page.keyboard.press("Escape");
  await expect(dialog).toHaveCount(0);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: `test-results/diary-${test.info().project.name}.png`,
    fullPage: true,
  });
  expect(errors).toEqual([]);
});

test("analysis endpoint rejects cross-origin and validates inputs", async ({
  request,
}) => {
  const origin = "http://127.0.0.1:3000";
  expect(
    (
      await request.post("/api/analyze", {
        headers: { origin: "https://other.example" },
        data: { text: "eggs", locale: "en", consent: true },
      })
    ).status(),
  ).toBe(403);
  expect(
    (
      await request.post("/api/analyze", {
        headers: { origin },
        data: { text: "eggs", locale: "en", consent: false },
      })
    ).status(),
  ).toBe(400);
  const response = await request.post("/api/analyze", {
    headers: { origin },
    data: { text: "2 eggs", locale: "en", consent: true },
  });
  expect(response.status()).toBe(503);
  expect((await response.json()).error).toContain("not connected");
});

test("welcome languages, explicit skip, persistence and replay", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toContainText(
    "Ты больше",
  );
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await page.getByRole("button", { name: "EN", exact: true }).click();
  await expect(page.getByRole("heading", { level: 1 })).toContainText(
    "You are more",
  );
  await page.getByRole("button", { name: "UZ", exact: true }).click();
  await expect(page.getByRole("heading", { level: 1 })).toContainText(
    "Sen raqamlardan",
  );
  await page.getByRole("button", { name: "RU", exact: true }).click();
  await page.screenshot({
    path: `test-results/welcome-${test.info().project.name}.png`,
    fullPage: true,
  });
  await page
    .getByRole("button", { name: "Конфиденциальность", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "Пока просто посмотреть" }).click();
  await expect(
    page.getByRole("heading", { name: "Твой баланс на сегодня" }),
  ).toBeVisible();
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Твой баланс на сегодня" }),
  ).toBeVisible();
  await page.goto("/?welcome=1");
  await expect(page.getByRole("heading", { level: 1 })).toContainText(
    "Ты больше",
  );
  await page.getByRole("button", { name: "Уже есть аккаунт? Войти" }).click();
  await expect(
    page.getByRole("heading", { name: "Твой аккаунт", exact: true }),
  ).toBeVisible();
});

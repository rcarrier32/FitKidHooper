import { test, expect } from "@playwright/test";
import {
  seedAthleteStorage,
  TINY_AVATAR_DATA_URL,
  supabaseAuthStorageKey,
} from "./helpers/athleteStorage.js";
import { mockSignedInAthlete } from "./helpers/mockSupabase.js";

function attachRuntimeGuards(page) {
  page.on("pageerror", (error) => {
    throw new Error(`Uncaught page error: ${error.message}`);
  });
  page.on("console", (msg) => {
    if (msg.type() === "error" && /ReferenceError|TypeError/.test(msg.text())) {
      throw new Error(`Console error: ${msg.text()}`);
    }
  });
}

const nav = (page) => page.locator("div").filter({ has: page.getByRole("button", { name: "☀️ Today" }) }).last();

async function expectAppBooted(page) {
  await expect(page.getByText("Couldn't start the app")).toHaveCount(0, { timeout: 20_000 });
  await expect(nav(page).getByRole("button", { name: "☀️ Today" })).toBeVisible({ timeout: 20_000 });
}

async function openMeSettings(page) {
  await nav(page).getByRole("button", { name: "⭐ Me" }).click();
  await expect(page.getByRole("heading", { name: "⭐ Me" })).toBeVisible();
  await page.getByRole("button", { name: "⚙ Settings" }).click();
  await expect(page.getByText("Customize Your App")).toBeVisible();
  await expect(page.getByText("Athlete Profile")).toBeVisible();
}

test.describe("FKH pre-deploy smoke", () => {
  test.beforeEach(({ page }) => {
    attachRuntimeGuards(page);
  });

  test("guest athlete boot renders Today home", async ({ page }) => {
    await seedAthleteStorage(page);
    await page.goto("/");
    await expectAppBooted(page);
    await expect(page.locator("#fkh-boot-shell")).toBeHidden();
  });

  test("signed-in boot with squad notifications renders nav badge", async ({ page }) => {
    test.skip(!supabaseAuthStorageKey(), "VITE_SUPABASE_URL must match the built bundle");

    await seedAthleteStorage(page);
    await mockSignedInAthlete(page);
    await page.goto("/");

    await expectAppBooted(page);
    await nav(page).getByRole("button", { name: "👥 Squad" }).click();
    await expect(page.getByText("Couldn't start the app")).toHaveCount(0);
    await expect(nav(page).getByRole("button", { name: "👥 Squad" })).toBeVisible();
  });

  test("Me settings opens with stored profile photo", async ({ page }) => {
    await seedAthleteStorage(page, { "fkh-avatar": TINY_AVATAR_DATA_URL });
    await page.goto("/");
    await expectAppBooted(page);
    await openMeSettings(page);
    await expect(page.getByRole("button", { name: "📷 Choose Photo" })).toBeVisible();
    await expect(page.getByText("Profile changes save automatically")).toBeVisible();
    await expect(page.getByPlaceholder("First name")).toHaveValue("Braylen");
  });

  test("core tabs render without boot crash", async ({ page }) => {
    await seedAthleteStorage(page);
    await page.goto("/");
    await expectAppBooted(page);

    for (const tab of ["📋 Programs", "🏆 Challenges", "🏀 Shots", "⭐ Me"]) {
      await nav(page).getByRole("button", { name: tab }).click();
      await expect(page.getByText("Couldn't start the app")).toHaveCount(0);
    }
  });
});

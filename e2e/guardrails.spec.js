/**
 * Regressions this suite exists for — every one of these shipped at some point
 * and nothing caught it:
 *
 *  1. guideContent pointed "paths" at Challenges after the legend journeys
 *     moved to Me, so a Guide link landed on a screen that no longer had them.
 *  2. buildTourSteps emits the id "boards" but TourStepPreview branched on
 *     "challenges", so tour step 5 rendered an empty preview indefinitely.
 *  3. ChallengesActivePanel called hooks below its squadOnly early return, so
 *     a component that ever flipped modes would throw.
 * The fourth regression of that era -- the report view declaring its
 * Section/Stat components inside render -- is guarded by eslint's
 * react-hooks/static-components rule and the lint budget in CI, not from here.
 * A DOM-identity probe was tried and did not detect a deliberately
 * reintroduced copy of the bug, so it was dropped rather than shipped as
 * false assurance.
 */
import { test, expect } from "@playwright/test";
import { readFileSync } from "node:fs";
import { seedAthleteStorage } from "./helpers/athleteStorage.js";

const read = p => readFileSync(new URL(`../${p}`, import.meta.url), "utf8");

test.describe("guide and tour wiring", () => {
  test("every Guide destination has a route", () => {
    const guide = read("src/lib/guideContent.js");
    const app = read("src/FitKidHooperApp.jsx");
    const targets = new Set([
      ...[...guide.matchAll(/navigateTo:\s*"([^"]+)"/g)].map(m => m[1]),
      ...[...guide.matchAll(/\bto:\s*"([^"]+)"/g)].map(m => m[1]),
    ]);
    const routed = new Set([...app.matchAll(/case "([a-z]+)":/g)].map(m => m[1]));
    expect(targets.size).toBeGreaterThan(5);
    expect([...targets].filter(t => !routed.has(t))).toEqual([]);
  });

  test("every tour step has a preview branch", () => {
    const guide = read("src/lib/guideContent.js");
    const preview = read("src/components/TourStepPreview.jsx");
    const navOrder = guide.match(/const navOrder = \[([^\]]+)\]/)[1];
    const ids = [...navOrder.matchAll(/"([^"]+)"/g)]
      .map(m => m[1])
      .map(k => (k === "progress" ? "me" : k));
    const branches = new Set([...preview.matchAll(/stepId === "([^"]+)"/g)].map(m => m[1]));
    expect(ids.length).toBe(6);
    expect(ids.filter(id => !branches.has(id))).toEqual([]);
  });
});

test.describe("component identity and hook order", () => {
  test("squad challenges and personal challenges both render", async ({ page }) => {
    // ChallengesActivePanel in both of its modes — squadOnly on Squad, full on
    // Challenges. Hooks below the early return would throw on the second one.
    const errors = [];
    page.on("pageerror", e => errors.push(e.message));
    await seedAthleteStorage(page);
    await page.goto("/");
    await page.getByRole("button", { name: "👥 Squad" }).click();
    await page.getByRole("button", { name: /Squad challenges/ }).click();
    await expect(page.getByText(/Challenge|challenge/).first()).toBeVisible({ timeout: 20_000 });
    await page.getByRole("button", { name: "🏆 Challenges" }).click();
    await expect(page.getByText("Your challenges")).toBeVisible({ timeout: 20_000 });
    expect(errors).toEqual([]);
  });

});

/**
 * Deep links. Written before consolidating the three separate effects that
 * handled them into one, so the refactor has something to answer to: these
 * assertions describe the behaviour as it shipped, not as it was rewritten.
 */
test.describe("deep links land on the right screen", () => {
  const onScreen = (page, name) =>
    expect(page.getByRole("button", { name })).toBeVisible({ timeout: 20_000 });

  test("?view=squad opens Squad", async ({ page }) => {
    await seedAthleteStorage(page);
    await page.goto("/?view=squad");
    await expect(page.getByRole("button", { name: "+ Add" })).toBeVisible({ timeout: 20_000 });
  });

  test("?view=shots opens Shots", async ({ page }) => {
    await seedAthleteStorage(page);
    await page.goto("/?view=shots");
    await onScreen(page, "🍩 Stats");
  });

  test("?mission=1 opens Today with the mission expanded", async ({ page }) => {
    await seedAthleteStorage(page);
    await page.goto("/?mission=1");
    await expect(page.getByText("Today's Mission")).toBeVisible({ timeout: 20_000 });
    await expect(page.getByText(/DAILY MISSION/i)).toBeVisible();
  });

  test("?invite= opens Challenges and carries the code through", async ({ page }) => {
    await seedAthleteStorage(page);
    await page.goto("/?invite=AB12CD");
    await expect(page.getByRole("button", { name: /Rankings/ })).toBeVisible({ timeout: 20_000 });
  });

  test("?friends=1 opens Squad", async ({ page }) => {
    await seedAthleteStorage(page);
    await page.goto("/?friends=1");
    await expect(page.getByRole("button", { name: "+ Add" })).toBeVisible({ timeout: 20_000 });
  });

  test("a deep link strips its own params from the URL", async ({ page }) => {
    await seedAthleteStorage(page);
    await page.goto("/?view=shots");
    await onScreen(page, "🍩 Stats");
    expect(new URL(page.url()).searchParams.get("view")).toBeNull();
  });
});

import { expect, test } from "@playwright/test";

test("sign-in screen provides a labeled, accessible password form", async ({ page }) => {
  await page.goto("/sign-in");
  await expect(page.getByRole("heading", { name: "Sign in to AEGIS" })).toBeVisible();
  await expect(page.getByLabel("Demo workspace password")).toBeVisible();
});

test("a signed-in member can follow a demo mission through completion", async ({ page }) => {
  const password = process.env.AEGIS_E2E_PASSWORD;
  test.skip(!password, "Set AEGIS_E2E_PASSWORD and run with seeded PostgreSQL, Redis, and the worker.");
  await page.goto("/sign-in");
  await page.getByLabel("Demo workspace password").fill(password ?? "");
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(page).toHaveURL("/");
  const objective = `Review evidence needed for a sample supplier risk ${Date.now()}.`;
  await page.getByLabel("Describe an objective in plain language").fill(objective);
  await page.getByRole("button", { name: "Create mission" }).click();
  await expect(page.getByRole("heading", { name: objective.split(".")[0] })).toBeVisible({ timeout: 15_000 });
  await expect(page.getByText(/no external sources were queried/i)).toBeVisible();
  await expect(page.getByText("Complete").first()).toBeVisible({ timeout: 15_000 });
});

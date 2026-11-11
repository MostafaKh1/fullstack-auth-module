import { expect, type Page, test } from "@playwright/test";

// The database is real and not reset, so every run needs fresh addresses.
const runId = Date.now().toString(36);
const password = "Correct-horse-9!";

function newUser(label: string) {
  return { email: `${label}-${runId}@example.com`, name: `E2E ${label}`, password };
}

async function signUp(page: Page, user: { email: string; name: string; password: string }) {
  await page.goto("/?auth=sign-up");
  await page.getByLabel("Email").fill(user.email);
  await page.getByLabel("Name").fill(user.name);
  await page.getByLabel("Password").fill(user.password);
  await page.getByRole("button", { name: "Sign up" }).click();
}

async function expectApplicationPage(page: Page, name: string) {
  await expect(page.getByRole("heading", { name: "Welcome to the application." })).toBeVisible();
  await expect(page.getByText(`Signed in as ${name}`)).toBeVisible();
}

test("Sign up, reload, Sign out, Sign in", async ({ page }) => {
  const user = newUser("journey");

  await signUp(page, user);
  await expectApplicationPage(page, user.name);

  await page.reload();
  await expectApplicationPage(page, user.name);

  await page.getByRole("button", { name: "Sign out" }).click();
  await expect(page.getByRole("heading", { name: "Sign in" })).toBeVisible();
  await expect(page).toHaveURL(/auth=sign-in/);

  await page.getByLabel("Email").fill(user.email);
  await page.getByLabel("Password").fill(user.password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expectApplicationPage(page, user.name);
});

test("Sign in with a wrong password shows the generic message", async ({ page, browser }) => {
  const user = newUser("wrong-password");

  // A separate context, so the page under test has no Session cookie.
  const setup = await browser.newContext();
  await signUp(await setup.newPage(), user);
  await expectApplicationPage(setup.pages()[0] as Page, user.name);
  await setup.close();

  await page.goto("/?auth=sign-in");
  await page.getByLabel("Email").fill(user.email);
  await page.getByLabel("Password").fill("Wrong-password-1!");
  await page.getByRole("button", { name: "Sign in" }).click();

  await expect(page.getByText("Invalid email or password")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Sign in" })).toBeVisible();
});

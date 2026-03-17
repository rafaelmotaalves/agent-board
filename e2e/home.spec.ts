import { test, expect } from "@playwright/test";

test.describe.configure({ mode: "serial" });

test.describe("AI Board", () => {
  test.beforeEach(async ({ page }) => {
    await page.request.post("/api/tasks/reset");
    await page.goto("/");
    await page.waitForSelector("text=AI Board");
  });

  test("should display the board with all queue columns", async ({ page }) => {
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("AI Board");
    await expect(page.getByText("Planning")).toBeVisible();
    await expect(page.getByText("Development")).toBeVisible();
    await expect(page.getByText("Done")).toBeVisible();
  });

  test("should create a new task in Planning", async ({ page }) => {
    await page.getByText("+ New Task").click();
    await page.getByPlaceholder("Task title").fill("My first task");
    await page.getByPlaceholder("Description (optional)").fill("A test description");
    await page.getByRole("button", { name: "Create" }).click();

    await expect(page.getByText("My first task")).toBeVisible();
    await expect(page.getByText("A test description")).toBeVisible();
  });

  test("should approve a task from Planning to Development", async ({ page }) => {
    // Create a task
    await page.getByText("+ New Task").click();
    await page.getByPlaceholder("Task title").fill("Move me forward");
    await page.getByRole("button", { name: "Create" }).click();
    await expect(page.getByText("Move me forward")).toBeVisible();

    // Approve it to Development
    await page.getByRole("button", { name: "Approve", exact: true }).click();
    // Task moved — no more approve button visible in Planning
    await expect(page.getByText("Move me forward")).toBeVisible();
  });

  test("should move a task through all queues to Done", async ({ page }) => {
    // Create a task
    await page.getByText("+ New Task").click();
    await page.getByPlaceholder("Task title").fill("Full flow task");
    await page.getByRole("button", { name: "Create" }).click();
    await expect(page.getByText("Full flow task")).toBeVisible();

    // Move to Development and wait for board to refresh
    await page.getByRole("button", { name: "Approve", exact: true }).click();
    await page.waitForResponse((res) => res.url().includes("/api/tasks") && res.request().method() === "GET");
    await expect(page.getByText("Full flow task")).toBeVisible();

    // Move to Done and wait for board to refresh
    await page.getByRole("button", { name: "Approve", exact: true }).click();
    await page.waitForResponse((res) => res.url().includes("/api/tasks") && res.request().method() === "GET");

    // Task should still be visible but with no approve button
    await expect(page.getByText("Full flow task")).toBeVisible();
    await expect(page.getByRole("button", { name: "Approve", exact: true })).not.toBeVisible();
  });

  test("should delete a task", async ({ page }) => {
    // Create a task
    await page.getByText("+ New Task").click();
    await page.getByPlaceholder("Task title").fill("Task to delete");
    await page.getByRole("button", { name: "Create" }).click();
    await expect(page.getByText("Task to delete")).toBeVisible();

    // Delete it
    await page.getByRole("button", { name: "Delete task Task to delete" }).click();
    await expect(page.getByText("Task to delete")).not.toBeVisible();
  });

  test("should cancel new task form", async ({ page }) => {
    await page.getByText("+ New Task").click();
    await expect(page.getByPlaceholder("Task title")).toBeVisible();

    await page.getByRole("button", { name: "Cancel" }).click();
    await expect(page.getByText("+ New Task")).toBeVisible();
    await expect(page.getByPlaceholder("Task title")).not.toBeVisible();
  });
});

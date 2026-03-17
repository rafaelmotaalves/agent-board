import { test, expect } from "@playwright/test";

test.describe("Task Detail Timer", () => {
  test.beforeEach(async ({ page }) => {
    await page.request.post("/api/tasks/reset");
    await page.goto("/");
    await page.waitForSelector("text=AgentBoard");
  });

  test("should display time since last update in task detail modal", async ({ page }) => {
    // Create a task
    const planningColumn = page.locator("section").filter({ hasText: "Planning" });
    await planningColumn.getByText("+ New Task").click();
    await planningColumn.getByPlaceholder("Task title").fill("Timer test task");
    await planningColumn.getByRole("button", { name: "Create" }).click();
    await expect(page.getByText("Timer test task")).toBeVisible();

    // Open the task detail modal by clicking the task card
    await page.getByText("Timer test task").click();

    // Verify the timer is visible with "ago" suffix
    const timer = page.getByTestId("time-since-update");
    await expect(timer).toBeVisible();
    await expect(timer).toContainText("ago");
  });
});

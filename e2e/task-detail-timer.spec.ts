import { test, expect } from "@playwright/test";

let agentId: number;

test.describe("Task Detail Timer", () => {
  test.beforeEach(async ({ page }) => {
    await page.request.post("/api/tasks/reset");
    // Ensure a test agent exists (create or reuse)
    const agentRes = await page.request.post("/api/agents", {
      data: { name: "test-agent", port: 9001 },
    });
    if (agentRes.ok()) {
      agentId = (await agentRes.json()).id;
    } else {
      const list = await (await page.request.get("/api/agents")).json();
      agentId = list[0].id;
    }
    await page.goto("/");
    await page.waitForSelector("text=AgentBoard");
  });

  test("should display time since last update in task detail modal", async ({ page }) => {
    // Create a task
    const planningColumn = page.locator("section").filter({ hasText: "Planning" });
    await planningColumn.getByText("+ New Task").click();
    await planningColumn.getByPlaceholder("Task title").fill("Timer test task");
    await planningColumn.locator("select").selectOption({ value: String(agentId) });
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

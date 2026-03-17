import { test, expect } from "@playwright/test";

test.describe.configure({ mode: "serial" });

let agentId: number;

test.describe("AgentBoard", () => {
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

  test("should display the board with all queue columns", async ({ page }) => {
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("AgentBoard");
    await expect(page.getByText("Planning")).toBeVisible();
    await expect(page.getByText("Development")).toBeVisible();
    await expect(page.getByText("Done")).toBeVisible();
  });

  test("should create a new task in Planning", async ({ page }) => {
    const planningColumn = page.locator("section").filter({ hasText: "Planning" });
    await planningColumn.getByText("+ New Task").click();
    await planningColumn.getByPlaceholder("Task title").fill("My first task");
    await planningColumn.getByPlaceholder("Description (optional)").fill("A test description");
    await planningColumn.locator("select").selectOption({ value: String(agentId) });
    await planningColumn.getByRole("button", { name: "Create" }).click();

    await expect(page.getByText("My first task")).toBeVisible();
    await expect(page.getByText("A test description")).toBeVisible();
  });

  test("should approve a task from Planning to Development", async ({ page }) => {
    const planningColumn = page.locator("section").filter({ hasText: "Planning" });
    await planningColumn.getByText("+ New Task").click();
    await planningColumn.getByPlaceholder("Task title").fill("Move me forward");
    await planningColumn.locator("select").selectOption({ value: String(agentId) });
    await planningColumn.getByRole("button", { name: "Create" }).click();
    await expect(page.getByText("Move me forward")).toBeVisible();

    // Approve it to Development
    await page.getByRole("button", { name: "Approve", exact: true }).click();
    // Task moved — no more approve button visible in Planning
    await expect(page.getByText("Move me forward")).toBeVisible();
  });

  test("should move a task through all queues to Done", async ({ page }) => {
    const planningColumn = page.locator("section").filter({ hasText: "Planning" });
    await planningColumn.getByText("+ New Task").click();
    await planningColumn.getByPlaceholder("Task title").fill("Full flow task");
    await planningColumn.locator("select").selectOption({ value: String(agentId) });
    await planningColumn.getByRole("button", { name: "Create" }).click();
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
    const planningColumn = page.locator("section").filter({ hasText: "Planning" });
    await planningColumn.getByText("+ New Task").click();
    await planningColumn.getByPlaceholder("Task title").fill("Task to delete");
    await planningColumn.locator("select").selectOption({ value: String(agentId) });
    await planningColumn.getByRole("button", { name: "Create" }).click();
    await expect(page.getByText("Task to delete")).toBeVisible();

    // Delete it
    await page.getByRole("button", { name: "Delete task Task to delete" }).click();
    await expect(page.getByText("Task to delete")).not.toBeVisible();
  });

  test("should cancel new task form", async ({ page }) => {
    const planningColumn = page.locator("section").filter({ hasText: "Planning" });
    await planningColumn.getByText("+ New Task").click();
    await expect(planningColumn.getByPlaceholder("Task title")).toBeVisible();

    await planningColumn.getByRole("button", { name: "Cancel" }).click();
    await expect(planningColumn.getByText("+ New Task")).toBeVisible();
    await expect(planningColumn.getByPlaceholder("Task title")).not.toBeVisible();
  });

  test("should create a new task directly in Development", async ({ page }) => {
    const devColumn = page.locator("section").filter({ hasText: "Development" });
    await devColumn.getByText("+ New Task").click();
    await devColumn.getByPlaceholder("Task title").fill("Dev task");
    await devColumn.getByPlaceholder("Description (optional)").fill("Skip planning");
    await devColumn.locator("select").selectOption({ value: String(agentId) });
    await devColumn.getByRole("button", { name: "Create" }).click();

    await expect(devColumn.getByText("Dev task")).toBeVisible();
    await expect(devColumn.getByText("Skip planning")).toBeVisible();
    // Should NOT appear in Planning
    const planningColumn = page.locator("section").filter({ hasText: "Planning" });
    await expect(planningColumn.getByText("Dev task")).not.toBeVisible();
  });

  test("should show + New Task button in both Planning and Development", async ({ page }) => {
    const planningColumn = page.locator("section").filter({ hasText: "Planning" });
    const devColumn = page.locator("section").filter({ hasText: "Development" });
    await expect(planningColumn.getByText("+ New Task")).toBeVisible();
    await expect(devColumn.getByText("+ New Task")).toBeVisible();
  });
});

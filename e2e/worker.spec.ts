import { test, expect } from "@playwright/test";

test.describe("Worker background processing", () => {
  let agentId: number;

  test.beforeEach(async ({ request }) => {
    await request.post("/api/tasks/reset");
    // Ensure a test agent exists (create or reuse)
    const agentRes = await request.post("/api/agents", {
      data: { name: "test-agent", port: 9001 },
    });
    if (agentRes.ok()) {
      agentId = (await agentRes.json()).id;
    } else {
      const list = await (await request.get("/api/agents")).json();
      agentId = list[0].id;
    }
  });

  test("worker automatically processes a planning task to done", async ({ request }) => {
    const createRes = await request.post("/api/tasks", {
      data: { title: "Worker test task", agent_id: agentId },
    });
    const task = await createRes.json();
    expect(task.state).toBe("pending");

    // Worker auto-starts with the app — poll until task is done (up to 15s)
    let done = false;
    for (let i = 0; i < 15; i++) {
      await new Promise((r) => setTimeout(r, 1000));
      const res = await request.get("/api/tasks");
      const tasks = await res.json();
      const updated = tasks.find((t: { id: number }) => t.id === task.id);
      if (updated?.state === "done") {
        done = true;
        break;
      }
    }
    expect(done).toBe(true);
  });

  test("worker processes planning and development tasks concurrently", async ({ request }) => {
    // Create a planning task
    const planRes = await request.post("/api/tasks", {
      data: { title: "Plan task", agent_id: agentId },
    });
    const planTask = await planRes.json();

    // Create a development task (move through planning first)
    const devRes = await request.post("/api/tasks", {
      data: { title: "Dev task", agent_id: agentId },
    });
    const devTask = await devRes.json();
    await request.patch(`/api/tasks/${devTask.id}`, {
      data: { state: "done" },
    });
    await request.patch(`/api/tasks/${devTask.id}`, {
      data: { status: "development" },
    });

    // Poll until both tasks are done (up to 15s)
    let planDone = false;
    let devDone = false;
    for (let i = 0; i < 15; i++) {
      await new Promise((r) => setTimeout(r, 1000));
      const res = await request.get("/api/tasks");
      const tasks = await res.json();
      const plan = tasks.find((t: { id: number }) => t.id === planTask.id);
      const dev = tasks.find((t: { id: number }) => t.id === devTask.id);
      if (plan?.state === "done") planDone = true;
      if (dev?.state === "done") devDone = true;
      if (planDone && devDone) break;
    }
    expect(planDone).toBe(true);
    expect(devDone).toBe(true);
  });
});

import { describe, it, expect, afterEach } from "@jest/globals";
import { render, screen, cleanup } from "@testing-library/react";
import BoardColumn from "../Board/BoardColumn";
import type { Task, Agent } from "@/lib/types";
import type { Queue } from "@/lib/queues";
import { SLUG_PLANNING, SLUG_DONE } from "@/lib/queues";

function makeTask(overrides: Partial<Task> = {}): Task {
  return {
    id: 1,
    title: "Task one",
    description: "",
    agent_id: 1,
    status: SLUG_PLANNING,
    state: "pending",
    failure_reason: null,
    completed_at: null,
    active_time_ms: 0,
    active_since: null,
    archived_at: null,
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
    ...overrides,
  };
}

function makeAgent(id: number, name: string): Agent {
  return {
    id,
    name,
    port: 8080,
    type: "copilot_cli_sdk",
    command: null,
    folder: "/tmp",
    options: {},
    created_at: "2026-01-01T00:00:00Z",
  };
}

const planningQueue: Queue = { slug: SLUG_PLANNING, label: "Planning", order: 0 };
const doneQueue: Queue = { slug: SLUG_DONE, label: "Done", order: 2 };

afterEach(cleanup);

describe("BoardColumn", () => {
  it("renders the queue label", () => {
    render(
      <BoardColumn
        queue={planningQueue}
        tasks={[]}
        agents={[]}
        onDelete={() => {}}
        onClick={() => {}}
      />,
    );
    expect(screen.getByText("Planning")).toBeTruthy();
  });

  it("displays the task count", () => {
    const tasks = [makeTask({ id: 1 }), makeTask({ id: 2, title: "Task two" })];
    render(
      <BoardColumn
        queue={planningQueue}
        tasks={tasks}
        agents={[]}
        onDelete={() => {}}
        onClick={() => {}}
      />,
    );
    expect(screen.getByText("2")).toBeTruthy();
  });

  it("renders task cards for each task", () => {
    const tasks = [
      makeTask({ id: 1, title: "First task" }),
      makeTask({ id: 2, title: "Second task" }),
    ];
    render(
      <BoardColumn
        queue={planningQueue}
        tasks={tasks}
        agents={[]}
        onDelete={() => {}}
        onClick={() => {}}
      />,
    );
    expect(screen.getByText("First task")).toBeTruthy();
    expect(screen.getByText("Second task")).toBeTruthy();
  });

  it("shows review count when tasks are ready for review", () => {
    const tasks = [
      makeTask({ id: 1, state: "done" }),
      makeTask({ id: 2, state: "done" }),
      makeTask({ id: 3, state: "pending" }),
    ];
    render(
      <BoardColumn
        queue={planningQueue}
        tasks={tasks}
        agents={[]}
        onDelete={() => {}}
        onClick={() => {}}
      />,
    );
    expect(screen.getByText("2 to review")).toBeTruthy();
  });

  it("renders NewTaskForm when onCreateTask is provided", () => {
    render(
      <BoardColumn
        queue={planningQueue}
        tasks={[]}
        agents={[makeAgent(1, "Agent")]}
        onDelete={() => {}}
        onClick={() => {}}
        onCreateTask={async () => {}}
      />,
    );
    expect(screen.getByText("+ New Task")).toBeTruthy();
  });

  it("does not render NewTaskForm when onCreateTask is not provided", () => {
    render(
      <BoardColumn
        queue={planningQueue}
        tasks={[]}
        agents={[]}
        onDelete={() => {}}
        onClick={() => {}}
      />,
    );
    expect(screen.queryByText("+ New Task")).toBeNull();
  });

  it("shows Archive all button in done queue with non-archived tasks", () => {
    render(
      <BoardColumn
        queue={doneQueue}
        tasks={[makeTask({ id: 1 })]}
        agents={[]}
        onDelete={() => {}}
        onClick={() => {}}
        onArchiveAll={() => {}}
      />,
    );
    expect(screen.getByText("Archive all")).toBeTruthy();
  });

  it("does not show Archive all when all tasks are archived", () => {
    render(
      <BoardColumn
        queue={doneQueue}
        tasks={[makeTask({ id: 1, archived_at: "2026-01-02T00:00:00Z" })]}
        agents={[]}
        onDelete={() => {}}
        onClick={() => {}}
        onArchiveAll={() => {}}
      />,
    );
    expect(screen.queryByText("Archive all")).toBeNull();
  });
});

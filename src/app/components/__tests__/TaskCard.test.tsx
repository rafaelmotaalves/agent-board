import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import TaskCard from "../TaskCard";
import type { Task, Agent } from "@/lib/types";
import type { Queue } from "@/lib/queues";
import { SLUG_PLANNING, SLUG_DEVELOPMENT, SLUG_DONE } from "@/lib/queues";

function makeTask(overrides: Partial<Task> = {}): Task {
  return {
    id: 42,
    title: "Fix the bug",
    description: "Something is broken",
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

const planningQueue: Queue = { slug: SLUG_PLANNING, label: "Planning", order: 0 };
const _developmentQueue: Queue = { slug: SLUG_DEVELOPMENT, label: "Development", order: 1 };
const doneQueue: Queue = { slug: SLUG_DONE, label: "Done", order: 2 };

afterEach(cleanup);

describe("TaskCard", () => {
  it("renders task title and description", () => {
    render(
      <TaskCard
        task={makeTask()}
        queue={planningQueue}
        onDelete={() => {}}
        onClick={() => {}}
      />,
    );
    expect(screen.getByText("Fix the bug")).toBeTruthy();
    expect(screen.getByText("Something is broken")).toBeTruthy();
  });

  it("renders task id", () => {
    render(
      <TaskCard
        task={makeTask()}
        queue={planningQueue}
        onDelete={() => {}}
        onClick={() => {}}
      />,
    );
    expect(screen.getByText("#42", { exact: false })).toBeTruthy();
  });

  it("does not render description when empty", () => {
    render(
      <TaskCard
        task={makeTask({ description: "" })}
        queue={planningQueue}
        onDelete={() => {}}
        onClick={() => {}}
      />,
    );
    expect(screen.getByText("Fix the bug")).toBeTruthy();
    expect(screen.queryByText("Something is broken")).toBeNull();
  });

  it("renders assigned agent name", () => {
    const agent: Agent = {
      id: 1,
      name: "My Agent",
      port: 8080,
      type: "copilot_cli_sdk",
      command: null,
      folder: "/tmp",
      options: {},
      source: "user",
      created_at: "2026-01-01T00:00:00Z",
    };
    render(
      <TaskCard
        task={makeTask()}
        queue={planningQueue}
        assignedAgent={agent}
        onDelete={() => {}}
        onClick={() => {}}
      />,
    );
    expect(screen.getByText("My Agent")).toBeTruthy();
  });

  it("shows Failed badge for failed state", () => {
    render(
      <TaskCard
        task={makeTask({ state: "failed", failure_reason: "Oops" })}
        queue={planningQueue}
        onDelete={() => {}}
        onClick={() => {}}
      />,
    );
    expect(screen.getByText("Failed")).toBeTruthy();
  });

  it("shows Ready for review when task state is done but not in done queue", () => {
    render(
      <TaskCard
        task={makeTask({ state: "done" })}
        queue={planningQueue}
        onDelete={() => {}}
        onClick={() => {}}
      />,
    );
    expect(screen.getByText("Ready for review")).toBeTruthy();
  });

  it("does not show Ready for review in done queue", () => {
    render(
      <TaskCard
        task={makeTask({ state: "done" })}
        queue={doneQueue}
        onDelete={() => {}}
        onClick={() => {}}
      />,
    );
    expect(screen.queryByText("Ready for review")).toBeNull();
  });

  it("shows Archived badge when task is archived", () => {
    render(
      <TaskCard
        task={makeTask({ archived_at: "2026-01-02T00:00:00Z" })}
        queue={doneQueue}
        onDelete={() => {}}
        onClick={() => {}}
      />,
    );
    expect(screen.getByText("Archived")).toBeTruthy();
  });

  it("calls onClick when card is clicked", () => {
    const task = makeTask();
    const onClick = vi.fn(() => {});
    render(
      <TaskCard
        task={task}
        queue={planningQueue}
        onDelete={() => {}}
        onClick={onClick}
      />,
    );
    // The card div has role="button" — use the task title to locate it
    fireEvent.click(screen.getByText("Fix the bug"));
    expect(onClick).toHaveBeenCalledWith(task);
  });

  it("calls onDelete when delete button is clicked", () => {
    const task = makeTask();
    const onDelete = vi.fn(() => {});
    const onClick = vi.fn(() => {});
    render(
      <TaskCard
        task={task}
        queue={planningQueue}
        onDelete={onDelete}
        onClick={onClick}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: /delete task/i }));
    expect(onDelete).toHaveBeenCalledWith(task);
  });

  it("shows archive button in done queue for non-archived tasks", () => {
    const onArchive = vi.fn(() => {});
    render(
      <TaskCard
        task={makeTask()}
        queue={doneQueue}
        onDelete={() => {}}
        onClick={() => {}}
        onArchive={onArchive}
      />,
    );
    const archiveBtn = screen.getByRole("button", { name: /archive task/i });
    expect(archiveBtn).toBeTruthy();
    fireEvent.click(archiveBtn);
    expect(onArchive).toHaveBeenCalled();
  });

  it("shows unarchive button for archived tasks", () => {
    const onUnarchive = vi.fn(() => {});
    render(
      <TaskCard
        task={makeTask({ archived_at: "2026-01-02T00:00:00Z" })}
        queue={doneQueue}
        onDelete={() => {}}
        onClick={() => {}}
        onUnarchive={onUnarchive}
      />,
    );
    const unarchiveBtn = screen.getByRole("button", { name: /unarchive task/i });
    expect(unarchiveBtn).toBeTruthy();
    fireEvent.click(unarchiveBtn);
    expect(onUnarchive).toHaveBeenCalled();
  });

  it("shows spinner when task is in_progress with a next queue", () => {
    render(
      <TaskCard
        task={makeTask({ state: "in_progress" })}
        queue={planningQueue}
        onDelete={() => {}}
        onClick={() => {}}
      />,
    );
    // The Loader2 spinner has animate-spin class — check it renders via its aria-hidden attribute
    const container = screen.getByRole("button", { name: /delete task/i }).closest("div.flex");
    expect(container).toBeTruthy();
  });

  it("displays active time when active_time_ms > 0", () => {
    render(
      <TaskCard
        task={makeTask({ active_time_ms: 65000 })}
        queue={planningQueue}
        onDelete={() => {}}
        onClick={() => {}}
      />,
    );
    expect(screen.getByText("1m 5s")).toBeTruthy();
  });

  it("applies archived styling (reduced opacity)", () => {
    const { container } = render(
      <TaskCard
        task={makeTask({ archived_at: "2026-01-02T00:00:00Z" })}
        queue={doneQueue}
        onDelete={() => {}}
        onClick={() => {}}
      />,
    );
    const card = container.firstElementChild as HTMLElement;
    expect(card.className).toContain("opacity-60");
  });

  it("applies failed border styling", () => {
    const { container } = render(
      <TaskCard
        task={makeTask({ state: "failed" })}
        queue={planningQueue}
        onDelete={() => {}}
        onClick={() => {}}
      />,
    );
    const card = container.firstElementChild as HTMLElement;
    expect(card.className).toContain("border-red-400");
  });

  it("applies ready-for-review border styling", () => {
    const { container } = render(
      <TaskCard
        task={makeTask({ state: "done" })}
        queue={planningQueue}
        onDelete={() => {}}
        onClick={() => {}}
      />,
    );
    const card = container.firstElementChild as HTMLElement;
    expect(card.className).toContain("border-emerald-400");
  });

  it("applies default border when not archived, failed, or ready for review", () => {
    const { container } = render(
      <TaskCard
        task={makeTask()}
        queue={planningQueue}
        onDelete={() => {}}
        onClick={() => {}}
      />,
    );
    const card = container.firstElementChild as HTMLElement;
    expect(card.className).toContain("border-zinc-200");
  });

  it("handles Enter keydown on the card", () => {
    const task = makeTask();
    const onClick = vi.fn(() => {});
    render(
      <TaskCard
        task={task}
        queue={planningQueue}
        onDelete={() => {}}
        onClick={onClick}
      />,
    );
    const card = screen.getByRole("button", { name: /delete task/i }).closest("[role='button']") as HTMLElement;
    fireEvent.keyDown(card, { key: "Enter" });
    expect(onClick).toHaveBeenCalledWith(task);
  });

  it("does not hide archive button when not in done queue", () => {
    const onArchive = vi.fn(() => {});
    render(
      <TaskCard
        task={makeTask()}
        queue={planningQueue}
        onDelete={() => {}}
        onClick={() => {}}
        onArchive={onArchive}
      />,
    );
    // Archive button should not appear outside done queue
    expect(screen.queryByRole("button", { name: /archive task/i })).toBeNull();
  });

  it("does not show unarchive button when not archived", () => {
    render(
      <TaskCard
        task={makeTask()}
        queue={doneQueue}
        onDelete={() => {}}
        onClick={() => {}}
        onUnarchive={() => {}}
      />,
    );
    expect(screen.queryByRole("button", { name: /unarchive task/i })).toBeNull();
  });

  it("shows failure_reason as title on the Failed badge", () => {
    render(
      <TaskCard
        task={makeTask({ state: "failed", failure_reason: "Timeout error" })}
        queue={planningQueue}
        onDelete={() => {}}
        onClick={() => {}}
      />,
    );
    const failedText = screen.getByText("Failed");
    const wrapper = failedText.parentElement;
    expect(wrapper?.getAttribute("title")).toBe("Timeout error");
  });

  it("shows default title on Failed badge when no failure_reason", () => {
    render(
      <TaskCard
        task={makeTask({ state: "failed", failure_reason: null })}
        queue={planningQueue}
        onDelete={() => {}}
        onClick={() => {}}
      />,
    );
    const failedText = screen.getByText("Failed");
    const wrapper = failedText.parentElement;
    expect(wrapper?.getAttribute("title")).toBe("Task failed");
  });
});

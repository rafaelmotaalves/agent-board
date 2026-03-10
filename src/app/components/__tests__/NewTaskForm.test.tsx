import { describe, it, expect, mock, afterEach } from "bun:test";
import { render, screen, fireEvent, waitFor, cleanup } from "@testing-library/react";
import NewTaskForm from "../NewTaskForm";
import type { Agent } from "@/lib/types";

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

const agents: Agent[] = [makeAgent(1, "Agent Alpha"), makeAgent(2, "Agent Beta")];

afterEach(cleanup);

describe("NewTaskForm", () => {
  it('renders the "+ New Task" button when closed', () => {
    render(<NewTaskForm agents={agents} onSubmit={async () => {}} />);
    expect(screen.getByText("+ New Task")).toBeTruthy();
  });

  it("opens the form when button is clicked", () => {
    render(<NewTaskForm agents={agents} onSubmit={async () => {}} />);
    fireEvent.click(screen.getByText("+ New Task"));
    expect(screen.getByPlaceholderText("Task title")).toBeTruthy();
    expect(screen.getByPlaceholderText("Description (optional)")).toBeTruthy();
  });

  it("renders agent options in select", () => {
    render(<NewTaskForm agents={agents} onSubmit={async () => {}} />);
    fireEvent.click(screen.getByText("+ New Task"));
    expect(screen.getByText("Agent Alpha")).toBeTruthy();
    expect(screen.getByText("Agent Beta")).toBeTruthy();
  });

  it("closes the form when Cancel is clicked", () => {
    render(<NewTaskForm agents={agents} onSubmit={async () => {}} />);
    fireEvent.click(screen.getByText("+ New Task"));
    expect(screen.getByPlaceholderText("Task title")).toBeTruthy();
    fireEvent.click(screen.getByText("Cancel"));
    expect(screen.getByText("+ New Task")).toBeTruthy();
  });

  it("disables Create button when title is empty", () => {
    render(<NewTaskForm agents={agents} onSubmit={async () => {}} />);
    fireEvent.click(screen.getByText("+ New Task"));
    const createBtn = screen.getByText("Create");
    expect(createBtn.hasAttribute("disabled")).toBe(true);
  });

  it("calls onSubmit with form values", async () => {
    const onSubmit = mock(async () => {});
    render(<NewTaskForm agents={agents} onSubmit={onSubmit} />);

    fireEvent.click(screen.getByText("+ New Task"));
    fireEvent.change(screen.getByPlaceholderText("Task title"), {
      target: { value: "My task" },
    });
    fireEvent.change(screen.getByPlaceholderText("Description (optional)"), {
      target: { value: "Details here" },
    });
    fireEvent.submit(screen.getByPlaceholderText("Task title").closest("form")!);

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith("My task", "Details here", 1);
    });
  });

  it("resets form after successful submission", async () => {
    const onSubmit = mock(async () => {});
    render(<NewTaskForm agents={agents} onSubmit={onSubmit} />);

    fireEvent.click(screen.getByText("+ New Task"));
    fireEvent.change(screen.getByPlaceholderText("Task title"), {
      target: { value: "My task" },
    });
    fireEvent.submit(screen.getByPlaceholderText("Task title").closest("form")!);

    await waitFor(() => {
      expect(screen.getByText("+ New Task")).toBeTruthy();
    });
  });
});

import { describe, it, expect, mock, afterEach } from "bun:test";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import AgentCard from "../AgentList/AgentCard";
import type { Agent } from "@/lib/types";

function makeAgent(overrides: Partial<Agent> = {}): Agent {
  return {
    id: 1,
    name: "Test Agent",
    port: 8080,
    type: "copilot_cli_sdk",
    command: null,
    folder: "/home/user/project",
    options: {},
    source: "user",
    created_at: "2026-01-01T00:00:00Z",
    ...overrides,
  };
}

describe("AgentCard", () => {
  afterEach(cleanup);

  it("renders agent name", () => {
    render(<AgentCard agent={makeAgent()} onDelete={() => {}} />);
    expect(screen.getByText("Test Agent")).toBeTruthy();
  });

  it("renders port for copilot_cli_sdk agents", () => {
    render(<AgentCard agent={makeAgent({ port: 3000 })} onDelete={() => {}} />);
    expect(screen.getByText(":3000", { exact: false })).toBeTruthy();
  });

  it("renders command for acp agents", () => {
    render(
      <AgentCard
        agent={makeAgent({ type: "acp", command: "npx my-agent", port: null })}
        onDelete={() => {}}
      />,
    );
    expect(screen.getByText("npx my-agent", { exact: false })).toBeTruthy();
  });

  it("renders the type label", () => {
    render(<AgentCard agent={makeAgent()} onDelete={() => {}} />);
    expect(screen.getByText("Copilot CLI")).toBeTruthy();
  });

  it("renders Agent Communication Protocol (ACP) label for acp type", () => {
    render(
      <AgentCard
        agent={makeAgent({ type: "acp", command: "cmd", port: null })}
        onDelete={() => {}}
      />,
    );
    expect(screen.getByText("Agent Communication Protocol (ACP)")).toBeTruthy();
  });

  it("renders parallel badge when parallel_planning is enabled", () => {
    render(
      <AgentCard
        agent={makeAgent({ options: { parallel_planning: true } })}
        onDelete={() => {}}
      />,
    );
    expect(screen.getByText("parallel")).toBeTruthy();
  });

  it("does not render parallel badge by default", () => {
    render(<AgentCard agent={makeAgent()} onDelete={() => {}} />);
    expect(screen.queryByText("parallel")).toBeNull();
  });

  it("renders the folder path", () => {
    render(
      <AgentCard agent={makeAgent({ folder: "/my/project" })} onDelete={() => {}} />,
    );
    expect(screen.getByText("📁 /my/project")).toBeTruthy();
  });

  it("calls onDelete when delete button is clicked", () => {
    const agent = makeAgent();
    const onDelete = mock(() => {});
    render(<AgentCard agent={agent} onDelete={onDelete} />);
    fireEvent.click(screen.getByRole("button", { name: /delete agent/i }));
    expect(onDelete).toHaveBeenCalledWith(agent);
  });

  it("shows config badge for config-sourced agents", () => {
    render(<AgentCard agent={makeAgent({ source: "config" })} onDelete={() => {}} />);
    expect(screen.getByText("config")).toBeTruthy();
  });

  it("hides delete and edit buttons for config-sourced agents", () => {
    const onDelete = mock(() => {});
    const onEdit = mock(() => {});
    render(<AgentCard agent={makeAgent({ source: "config" })} onDelete={onDelete} onEdit={onEdit} />);
    expect(screen.queryByRole("button", { name: /delete agent/i })).toBeNull();
    expect(screen.queryByRole("button", { name: /edit agent/i })).toBeNull();
  });

  it("shows edit button for user-sourced agents when onEdit is provided", () => {
    const onEdit = mock(() => {});
    render(<AgentCard agent={makeAgent()} onDelete={() => {}} onEdit={onEdit} />);
    expect(screen.getByRole("button", { name: /edit agent/i })).toBeTruthy();
  });

  it("calls onEdit when edit button is clicked", () => {
    const agent = makeAgent();
    const onEdit = mock(() => {});
    render(<AgentCard agent={agent} onDelete={() => {}} onEdit={onEdit} />);
    fireEvent.click(screen.getByRole("button", { name: /edit agent/i }));
    expect(onEdit).toHaveBeenCalledWith(agent);
  });
});

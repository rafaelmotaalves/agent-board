import { describe, it, expect, afterEach, jest } from "@jest/globals";
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
    expect(screen.getByText("Copilot CLI SDK")).toBeTruthy();
  });

  it("renders ACP Agent label for acp type", () => {
    render(
      <AgentCard
        agent={makeAgent({ type: "acp", command: "cmd", port: null })}
        onDelete={() => {}}
      />,
    );
    expect(screen.getByText("ACP Agent")).toBeTruthy();
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
    const onDelete = jest.fn();
    render(<AgentCard agent={agent} onDelete={onDelete} />);
    fireEvent.click(screen.getByRole("button", { name: /delete agent/i }));
    expect(onDelete).toHaveBeenCalledWith(agent);
  });
});

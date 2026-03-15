import { describe, it, expect, mock, afterEach } from "bun:test";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import BoardHeader from "../Board/BoardHeader";
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
    source: "user",
    created_at: "2026-01-01T00:00:00Z",
  };
}

afterEach(cleanup);

describe("BoardHeader", () => {
  const defaults = {
    agents: [] as Agent[],
    showAgents: false,
    onToggleAgents: () => {},
    showArchived: false,
    onToggleArchived: () => {},
    notificationsEnabled: false,
    onToggleNotifications: () => {},
  };

  it("renders the app title", () => {
    render(<BoardHeader {...defaults} />);
    expect(screen.getByText("AgentBoard")).toBeTruthy();
  });

  it("displays agent count when agents exist", () => {
    render(
      <BoardHeader
        {...defaults}
        agents={[makeAgent(1, "A"), makeAgent(2, "B")]}
      />,
    );
    expect(screen.getByText("Agents (2)")).toBeTruthy();
  });

  it('displays "Agents" without count when no agents', () => {
    render(<BoardHeader {...defaults} />);
    expect(screen.getByText("Agents")).toBeTruthy();
  });

  it("calls onToggleAgents when Agents button is clicked", () => {
    const onToggleAgents = mock(() => {});
    render(<BoardHeader {...defaults} onToggleAgents={onToggleAgents} />);
    fireEvent.click(screen.getByText("Agents"));
    expect(onToggleAgents).toHaveBeenCalledTimes(1);
  });

  it('shows "Show archived" when showArchived is false', () => {
    render(<BoardHeader {...defaults} showArchived={false} />);
    expect(screen.getByText("Show archived")).toBeTruthy();
  });

  it('shows "Hide archived" when showArchived is true', () => {
    render(<BoardHeader {...defaults} showArchived={true} />);
    expect(screen.getByText("Hide archived")).toBeTruthy();
  });

  it("calls onToggleArchived when archive button is clicked", () => {
    const onToggleArchived = mock(() => {});
    render(<BoardHeader {...defaults} onToggleArchived={onToggleArchived} />);
    fireEvent.click(screen.getByText("Show archived"));
    expect(onToggleArchived).toHaveBeenCalledTimes(1);
  });

  it('shows "Notifications off" when disabled', () => {
    render(<BoardHeader {...defaults} notificationsEnabled={false} />);
    expect(screen.getByText("Notifications off")).toBeTruthy();
  });

  it('shows "Notifications on" when enabled', () => {
    render(<BoardHeader {...defaults} notificationsEnabled={true} />);
    expect(screen.getByText("Notifications on")).toBeTruthy();
  });

  it("calls onToggleNotifications when notification button is clicked", () => {
    const onToggleNotifications = mock(() => {});
    render(
      <BoardHeader {...defaults} onToggleNotifications={onToggleNotifications} />,
    );
    fireEvent.click(screen.getByText("Notifications off"));
    expect(onToggleNotifications).toHaveBeenCalledTimes(1);
  });
});

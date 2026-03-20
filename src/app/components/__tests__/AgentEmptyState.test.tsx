import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import AgentEmptyState from "../AgentList/AgentEmptyState";

describe("AgentEmptyState", () => {
  it("renders the empty state message", () => {
    render(<AgentEmptyState />);
    expect(screen.getByText("No agents yet")).toBeTruthy();
  });
});

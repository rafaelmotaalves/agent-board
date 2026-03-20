import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import LoadingSpinner from "../Board/LoadingSpinner";

describe("LoadingSpinner", () => {
  it("renders a loading message", () => {
    render(<LoadingSpinner />);
    expect(screen.getByText("Loading board...")).toBeTruthy();
  });
});

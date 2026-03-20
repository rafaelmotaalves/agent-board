import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import ToggleSwitch from "../ToggleSwitch";

describe("ToggleSwitch", () => {
  afterEach(cleanup);

  it("renders with aria-checked false when unchecked", () => {
    render(<ToggleSwitch checked={false} onChange={() => {}} />);
    const button = screen.getByRole("switch");
    expect(button.getAttribute("aria-checked")).toBe("false");
  });

  it("renders with aria-checked true when checked", () => {
    render(<ToggleSwitch checked={true} onChange={() => {}} />);
    const button = screen.getByRole("switch");
    expect(button.getAttribute("aria-checked")).toBe("true");
  });

  it("calls onChange with toggled value on click", () => {
    const onChange = vi.fn(() => {});
    render(<ToggleSwitch checked={false} onChange={onChange} />);
    fireEvent.click(screen.getByRole("switch"));
    expect(onChange).toHaveBeenCalledWith(true);
  });

  it("calls onChange with false when checked and clicked", () => {
    const onChange = vi.fn(() => {});
    render(<ToggleSwitch checked={true} onChange={onChange} />);
    fireEvent.click(screen.getByRole("switch"));
    expect(onChange).toHaveBeenCalledWith(false);
  });

  it("renders with aria-label when label prop is provided", () => {
    render(<ToggleSwitch checked={false} onChange={() => {}} label="Toggle me" />);
    const button = screen.getByRole("switch");
    expect(button.getAttribute("aria-label")).toBe("Toggle me");
  });

  it("is disabled when disabled prop is true", () => {
    const onChange = vi.fn(() => {});
    render(<ToggleSwitch checked={false} onChange={onChange} disabled />);
    const button = screen.getByRole("switch");
    expect(button.hasAttribute("disabled")).toBe(true);
    fireEvent.click(button);
    expect(onChange).not.toHaveBeenCalled();
  });
});

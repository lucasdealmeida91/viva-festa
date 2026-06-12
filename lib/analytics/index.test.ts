import { beforeEach, describe, expect, it, vi } from "vitest";
import posthog from "posthog-js";
import { capture, identify } from "./index";

vi.mock("posthog-js", () => ({
  default: {
    capture: vi.fn(),
    identify: vi.fn(),
    group: vi.fn(),
    reset: vi.fn(),
  },
}));

describe("capture", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("sends allowlisted properties", () => {
    capture("checkin_marked", { via: "search" });
    expect(posthog.capture).toHaveBeenCalledWith("checkin_marked", {
      via: "search",
    });
  });

  it("drops properties outside the allowlist (NF-4)", () => {
    capture("checkin_marked", {
      via: "walkin",
      guest_name: "Maria",
      phone: "11 99999-9999",
    });
    expect(posthog.capture).toHaveBeenCalledWith("checkin_marked", {
      via: "walkin",
    });
  });

  it("sends no properties for events with an empty allowlist", () => {
    capture("trial_warning_shown", { anything: "x" });
    expect(posthog.capture).toHaveBeenCalledWith("trial_warning_shown", {});
  });
});

describe("identify", () => {
  it("passes role only", () => {
    identify("user-1", "manager");
    expect(posthog.identify).toHaveBeenCalledWith("user-1", {
      role: "manager",
    });
  });
});

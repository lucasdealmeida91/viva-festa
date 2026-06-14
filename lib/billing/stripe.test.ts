import { describe, expect, it } from "vitest";
import { mapStripeStatus } from "./status";

describe("mapStripeStatus (RN-11)", () => {
  it("mapeia os status comuns", () => {
    expect(mapStripeStatus("active")).toBe("active");
    expect(mapStripeStatus("trialing")).toBe("trialing");
    expect(mapStripeStatus("past_due")).toBe("past_due");
    expect(mapStripeStatus("canceled")).toBe("canceled");
  });

  it("unpaid/incomplete viram modo leitura (RN-11.3)", () => {
    expect(mapStripeStatus("unpaid")).toBe("read_only");
    expect(mapStripeStatus("incomplete")).toBe("read_only");
    expect(mapStripeStatus("incomplete_expired")).toBe("read_only");
  });
});

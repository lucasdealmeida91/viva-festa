import { describe, expect, it } from "vitest";
import { computeSubscription } from "./subscription";

const today = "2026-06-14";

describe("computeSubscription (RN-11)", () => {
  it("ativa: escreve, sem aviso", () => {
    const v = computeSubscription({ status: "active", trialEndsAt: null, today });
    expect(v.mode).toBe("active");
    expect(v.writable).toBe(true);
    expect(v.message).toBeNull();
  });

  it("trial com folga: escreve, sem banner", () => {
    const v = computeSubscription({
      status: "trialing", trialEndsAt: "2026-06-25", today,
    });
    expect(v.mode).toBe("trial");
    expect(v.daysLeft).toBe(11);
    expect(v.message).toBeNull();
  });

  it("trial faltando 3 dias: aviso persistente (RN-11.1)", () => {
    const v = computeSubscription({
      status: "trialing", trialEndsAt: "2026-06-16", today,
    });
    expect(v.mode).toBe("trial_ending");
    expect(v.writable).toBe(true);
    expect(v.message).toMatch(/2 dias/);
  });

  it("trial expirado: modo leitura (RN-11.2)", () => {
    const v = computeSubscription({
      status: "trialing", trialEndsAt: "2026-06-10", today,
    });
    expect(v.mode).toBe("read_only");
    expect(v.writable).toBe(false);
  });

  it("read_only e blocked não escrevem", () => {
    expect(computeSubscription({ status: "read_only", trialEndsAt: null, today }).writable).toBe(false);
    expect(computeSubscription({ status: "blocked", trialEndsAt: null, today }).writable).toBe(false);
  });

  it("past_due ainda escreve mas avisa", () => {
    const v = computeSubscription({ status: "past_due", trialEndsAt: null, today });
    expect(v.writable).toBe(true);
    expect(v.message).toMatch(/pendente/i);
  });
});

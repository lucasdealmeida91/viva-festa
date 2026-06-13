import { describe, expect, it, vi } from "vitest";
import { retryWithBackoff } from "./retry";

const noSleep = () => Promise.resolve();

describe("retryWithBackoff (RN-7.6)", () => {
  it("sucede de primeira sem retry", async () => {
    const fn = vi.fn().mockResolvedValue({ error: null });
    const result = await retryWithBackoff(fn, { sleepFn: noSleep });
    expect(result).toEqual({ ok: true });
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("falha transitória e depois sucede (oscilação de rede)", async () => {
    const fn = vi
      .fn()
      .mockResolvedValueOnce({ error: new Error("offline") })
      .mockResolvedValueOnce({ error: new Error("offline") })
      .mockResolvedValueOnce({ error: null });
    const result = await retryWithBackoff(fn, { sleepFn: noSleep });
    expect(result).toEqual({ ok: true });
    expect(fn).toHaveBeenCalledTimes(3);
  });

  it("desiste após esgotar as tentativas", async () => {
    const fn = vi.fn().mockResolvedValue({ error: new Error("down") });
    const result = await retryWithBackoff(fn, {
      maxAttempts: 4,
      sleepFn: noSleep,
    });
    expect(result).toEqual({ ok: false });
    expect(fn).toHaveBeenCalledTimes(4);
  });
});

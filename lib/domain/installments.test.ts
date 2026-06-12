import { describe, expect, it } from "vitest";
import { addMonthsClamped, suggestInstallments } from "./installments";

const sum = (plan: { amountCents: number }[]) =>
  plan.reduce((acc, i) => acc + i.amountCents, 0);

describe("suggestInstallments (RN-9.1)", () => {
  it("entrada na confirmação + mensais iguais até a festa", () => {
    const plan = suggestInstallments({
      totalCents: 550000,
      downPaymentCents: 100000,
      confirmationDate: "2026-06-12",
      partyDate: "2026-12-05",
    });

    expect(plan[0]).toEqual({
      kind: "down_payment",
      dueDate: "2026-06-12",
      amountCents: 100000,
    });
    expect(plan.filter((i) => i.kind === "regular")).toHaveLength(6);
    expect(sum(plan)).toBe(550000); // a soma SEMPRE fecha exata
  });

  it("divisão com resto: última parcela absorve a diferença", () => {
    const plan = suggestInstallments({
      totalCents: 100001,
      downPaymentCents: 0,
      confirmationDate: "2026-06-12",
      partyDate: "2026-09-12",
    });
    expect(plan).toHaveLength(3);
    expect(plan.map((i) => i.amountCents)).toEqual([33333, 33333, 33335]);
    expect(sum(plan)).toBe(100001);
  });

  it("festa no mês seguinte: parcela única", () => {
    const plan = suggestInstallments({
      totalCents: 350000,
      downPaymentCents: 0,
      confirmationDate: "2026-06-12",
      partyDate: "2026-07-01",
    });
    expect(plan).toHaveLength(1);
    expect(plan[0].dueDate <= "2026-07-01").toBe(true);
  });

  it("sem entrada: nenhuma linha down_payment", () => {
    const plan = suggestInstallments({
      totalCents: 100000,
      downPaymentCents: 0,
      confirmationDate: "2026-06-12",
      partyDate: "2026-08-12",
    });
    expect(plan.every((i) => i.kind === "regular")).toBe(true);
  });

  it("gestor sobrescreve o número de parcelas", () => {
    const plan = suggestInstallments({
      totalCents: 120000,
      downPaymentCents: 0,
      confirmationDate: "2026-06-12",
      partyDate: "2027-06-12",
      installmentCount: 3,
    });
    expect(plan).toHaveLength(3);
    expect(plan.map((i) => i.amountCents)).toEqual([40000, 40000, 40000]);
  });

  it("entrada igual ao total: só a entrada", () => {
    const plan = suggestInstallments({
      totalCents: 50000,
      downPaymentCents: 50000,
      confirmationDate: "2026-06-12",
      partyDate: "2026-12-05",
    });
    expect(plan).toHaveLength(1);
    expect(plan[0].kind).toBe("down_payment");
  });
});

describe("addMonthsClamped", () => {
  it("clampa o dia em meses curtos e vira o ano", () => {
    expect(addMonthsClamped("2026-01-31", 1)).toBe("2026-02-28");
    expect(addMonthsClamped("2026-12-15", 1)).toBe("2027-01-15");
  });
});

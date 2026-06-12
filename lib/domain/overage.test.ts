import { describe, expect, it } from "vitest";
import { classify, countByCategory, type AgeRules } from "./classify";
import { computeOverage } from "./overage";

/** Regras do exemplo de referência do PRD (RN-4). */
const rules: AgeRules = { exemptAge: 8, adultAge: 13 };
const capacity = {
  adultCapacity: 50,
  childCapacity: 30,
  extraAdultPriceCents: 9000,
  extraChildPriceCents: 5500,
};

describe("classify (RN-4.1)", () => {
  it("classifica pelos cortes de idade", () => {
    expect(classify(3, rules).classification).toBe("exempt");
    expect(classify(10, rules).classification).toBe("child");
    expect(classify(30, rules).classification).toBe("adult");
  });

  it("idade exatamente no corte: isenção usa <, adulto usa ≥", () => {
    expect(classify(8, rules).classification).toBe("child");
    expect(classify(13, rules).classification).toBe("adult");
  });

  it("sem idade conta como adulto e é sinalizado (RN-4.3)", () => {
    expect(classify(null, rules)).toEqual({
      classification: "adult",
      needsReview: true,
    });
    expect(classify(undefined, rules).needsReview).toBe(true);
  });

  it("isenção 0: ninguém é isento (RN-4.2)", () => {
    const allCount: AgeRules = { exemptAge: 0, adultAge: 13 };
    expect(classify(0, allCount).classification).toBe("child");
    expect(classify(1, allCount).classification).toBe("child");
  });
});

describe("computeOverage (RN-8.2) — caso canônico do produto ⭐", () => {
  it("exemplo de referência do PRD retorna exatamente R$ 360", () => {
    // Presentes: 54 com 13+, 28 com 8–12, 9 com menos de 8
    const present = { adults: 54, children: 28, exempt: 9 };
    const result = computeOverage(present, capacity);

    expect(result.overageAdults).toBe(4); // 54 − 50
    expect(result.overageChildren).toBe(0); // 28 ≤ 30
    expect(result.adultsCents).toBe(36000); // 4 × R$ 90
    expect(result.childrenCents).toBe(0);
    expect(result.totalCents).toBe(36000); // R$ 360,00
  });

  it("caso canônico de ponta a ponta: idades → classificação → excedente", () => {
    const ages = [
      ...Array.from({ length: 54 }, (_, i) => 13 + (i % 50)), // adultos
      ...Array.from({ length: 28 }, (_, i) => 8 + (i % 5)), // crianças
      ...Array.from({ length: 9 }, (_, i) => i % 8), // isentos
    ];
    const present = countByCategory(ages, rules);
    expect(present).toEqual({ adults: 54, children: 28, exempt: 9 });
    expect(computeOverage(present, capacity).totalCents).toBe(36000);
  });

  it("sem compensação entre categorias (RN-8.2)", () => {
    // 5 adultos a mais, 10 crianças a menos: cobra os 5 adultos mesmo assim
    const present = { adults: 55, children: 20, exempt: 0 };
    const result = computeOverage(present, capacity);
    expect(result.overageAdults).toBe(5);
    expect(result.totalCents).toBe(45000);
  });

  it("isentos nunca geram cobrança, em qualquer quantidade (RN-4.4)", () => {
    const present = { adults: 10, children: 10, exempt: 500 };
    expect(computeOverage(present, capacity).totalCents).toBe(0);
  });

  it("dentro da capacidade: excedente zero", () => {
    const present = { adults: 50, children: 30, exempt: 3 };
    expect(computeOverage(present, capacity).totalCents).toBe(0);
  });
});

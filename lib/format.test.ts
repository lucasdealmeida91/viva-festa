import { describe, expect, it } from "vitest";
import { formatCurrencyBRL, parseDecimalToCents } from "./format";

describe("parseDecimalToCents", () => {
  it("aceita ponto decimal e vírgula decimal", () => {
    expect(parseDecimalToCents("5500.00")).toBe(550000);
    expect(parseDecimalToCents("5500,00")).toBe(550000);
    expect(parseDecimalToCents("90")).toBe(9000);
  });

  it("aceita milhar com ponto quando a vírgula é o decimal", () => {
    expect(parseDecimalToCents("5.500,50")).toBe(550050);
  });

  it("entrada inválida vira NaN", () => {
    expect(parseDecimalToCents("abc")).toBeNaN();
  });
});

describe("formatCurrencyBRL", () => {
  it("formata centavos em BRL", () => {
    expect(formatCurrencyBRL(550000)).toMatch(/R\$\s?5\.500,00/);
  });
});

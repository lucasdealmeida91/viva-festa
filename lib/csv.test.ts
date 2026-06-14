import { describe, expect, it } from "vitest";
import { toCsv } from "./csv";

describe("toCsv", () => {
  it("gera cabeçalho + linhas", () => {
    expect(toCsv(["a", "b"], [[1, "x"], [2, "y"]])).toBe("a,b\n1,x\n2,y");
  });

  it("escapa vírgula, aspas e quebra de linha", () => {
    expect(toCsv(["nome"], [['Souza, "Zé"']])).toBe(
      'nome\n"Souza, ""Zé"""',
    );
    expect(toCsv(["obs"], [["linha1\nlinha2"]])).toBe('obs\n"linha1\nlinha2"');
  });

  it("trata null/undefined como vazio", () => {
    expect(toCsv(["a", "b"], [[null, undefined]])).toBe("a,b\n,");
  });
});

import { describe, expect, it } from "vitest";
import { slugify } from "./slug";

describe("slugify (RN-1.4)", () => {
  it("removes accents and lowercases", () => {
    expect(slugify("Buffet Alegria")).toBe("buffet-alegria");
    expect(slugify("Festança & Cia")).toBe("festanca-cia");
    expect(slugify("São João")).toBe("sao-joao");
  });

  it("collapses separators and trims hyphens", () => {
    expect(slugify("  Buffet   do --- Zé  ")).toBe("buffet-do-ze");
  });

  it("returns empty string for unusable input", () => {
    expect(slugify("!!!")).toBe("");
  });
});

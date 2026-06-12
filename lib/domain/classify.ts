/**
 * RN-4.1 — Age classification, the heart of the product.
 * Pure function: no database, no framework. Rules come frozen from the
 * party (RN-4.5), never live from the package.
 */

export type AgeRules = {
  /** idade < exemptAge → isento. Pode ser 0: todo mundo conta (RN-4.2). */
  exemptAge: number;
  /** idade ≥ adultAge → adulto. Obrigatória; exemptAge < adultAge (RN-4.2). */
  adultAge: number;
};

export type Classification = "exempt" | "child" | "adult";

export type ClassificationResult = {
  classification: Classification;
  /** RN-4.3: sem idade conta como adulto e é sinalizado para revisão. */
  needsReview: boolean;
};

export function classify(
  age: number | null | undefined,
  rules: AgeRules,
): ClassificationResult {
  if (age === null || age === undefined) {
    return { classification: "adult", needsReview: true };
  }
  if (age < rules.exemptAge) {
    return { classification: "exempt", needsReview: false };
  }
  if (age < rules.adultAge) {
    return { classification: "child", needsReview: false };
  }
  return { classification: "adult", needsReview: false };
}

export type CategoryCounts = {
  adults: number;
  children: number;
  exempt: number;
};

/** Totaliza uma lista de idades por categoria (RN-5.5, RN-7.5). */
export function countByCategory(
  ages: Array<number | null | undefined>,
  rules: AgeRules,
): CategoryCounts {
  const counts: CategoryCounts = { adults: 0, children: 0, exempt: 0 };
  for (const age of ages) {
    const { classification } = classify(age, rules);
    if (classification === "adult") counts.adults += 1;
    else if (classification === "child") counts.children += 1;
    else counts.exempt += 1;
  }
  return counts;
}

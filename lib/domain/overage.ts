/**
 * RN-8.2 — Overage (excedente) calculation. Pure function.
 * No compensation between categories; exempt guests never charge (RN-4.4).
 * The result is a charging RECOMMENDATION (RN-8.4): the manager confirms,
 * adjusts or waives it elsewhere.
 */
import type { CategoryCounts } from "./classify";

export type CapacityRules = {
  adultCapacity: number;
  childCapacity: number;
  extraAdultPriceCents: number;
  extraChildPriceCents: number;
};

export type OverageResult = {
  overageAdults: number;
  overageChildren: number;
  adultsCents: number;
  childrenCents: number;
  totalCents: number;
};

export function computeOverage(
  present: CategoryCounts,
  rules: CapacityRules,
): OverageResult {
  const overageAdults = Math.max(0, present.adults - rules.adultCapacity);
  const overageChildren = Math.max(0, present.children - rules.childCapacity);
  const adultsCents = overageAdults * rules.extraAdultPriceCents;
  const childrenCents = overageChildren * rules.extraChildPriceCents;

  return {
    overageAdults,
    overageChildren,
    adultsCents,
    childrenCents,
    totalCents: adultsCents + childrenCents,
  };
}

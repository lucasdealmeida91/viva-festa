import posthog from "posthog-js";
import { EVENTS, type EventName } from "./events";

/**
 * The only sanctioned path to PostHog (docs/06-observabilidade.md).
 * Client-side only; server-side capture will be added when a milestone
 * needs it, behind this same allowlist.
 */
export function capture(
  event: EventName,
  props: Record<string, unknown> = {},
) {
  if (typeof window === "undefined") return;

  const allowed: readonly string[] = EVENTS[event];
  const filtered = Object.fromEntries(
    Object.entries(props).filter(([key]) => allowed.includes(key)),
  );

  posthog.capture(event, filtered);
}

/** Identify the logged-in user. Role only — never name or email (NF-4). */
export function identify(userId: string, role?: "manager" | "receptionist") {
  if (typeof window === "undefined") return;
  posthog.identify(userId, role ? { role } : undefined);
}

/** All product metrics are per tenant (PRD §8): group every session. */
export function groupTenant(tenantId: string) {
  if (typeof window === "undefined") return;
  posthog.group("tenant", tenantId);
}

export function reset() {
  if (typeof window === "undefined") return;
  posthog.reset();
}

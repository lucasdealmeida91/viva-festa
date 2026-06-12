/**
 * Event property allowlist (docs/06-observabilidade.md §2).
 *
 * NF-4: PII (names, phones, emails, individual ages) never reaches PostHog.
 * Adding a property here requires a PR review against that rule.
 */
export const EVENTS = {
  tenant_created: ["plan"],
  onboarding_completed: ["shifts_count", "packages_count"],
  party_created: ["status"],
  party_confirmed: ["guests_expected"],
  invite_published: ["list_mode"],
  rsvp_submitted: ["response", "companions_count"],
  checkin_marked: ["via"],
  party_completed: ["guests_present", "overage_total_cents"],
  overage_decided: ["decision", "amount_cents"],
  rebooking_alert_actioned: ["action"],
  trial_warning_shown: [],
  subscription_started: ["plan"],
  subscription_canceled: ["plan"],
  csv_exported: ["entity"],
} as const satisfies Record<string, readonly string[]>;

export type EventName = keyof typeof EVENTS;

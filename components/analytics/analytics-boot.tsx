"use client";

import { useEffect, useRef } from "react";
import { capture, groupTenant, identify } from "@/lib/analytics";
import type { EventName } from "@/lib/analytics/events";

type AnalyticsBootProps = {
  userId: string;
  role: "manager" | "receptionist";
  tenantId: string;
  /** Evento único a disparar nesta carga (ex.: tenant_created pós-onboarding). */
  fire?: EventName;
};

/** Identifica o usuário e agrupa a sessão por tenant (PRD §8). Render nulo. */
export function AnalyticsBoot({
  userId,
  role,
  tenantId,
  fire,
}: AnalyticsBootProps) {
  const fired = useRef(false);

  useEffect(() => {
    if (fired.current) return;
    fired.current = true;
    identify(userId, role);
    groupTenant(tenantId);
    if (fire) capture(fire);
  }, [userId, role, tenantId, fire]);

  return null;
}

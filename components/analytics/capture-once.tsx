"use client";

import { useEffect, useRef } from "react";
import { capture } from "@/lib/analytics";
import type { EventName } from "@/lib/analytics/events";

/** Dispara um evento uma única vez na montagem. Render nulo. */
export function CaptureOnce({
  event,
  props,
}: {
  event: EventName;
  props?: Record<string, unknown>;
}) {
  const fired = useRef(false);

  useEffect(() => {
    if (fired.current) return;
    fired.current = true;
    capture(event, props);
  }, [event, props]);

  return null;
}

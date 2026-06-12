import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.VERCEL_ENV ?? process.env.NODE_ENV,
  tracesSampleRate: 0.1,
  // NF-4: PII never leaves Postgres — keep only opaque ids on events.
  sendDefaultPii: false,
  beforeSend(event) {
    if (event.user) {
      event.user = { id: event.user.id };
    }
    return event;
  },
});

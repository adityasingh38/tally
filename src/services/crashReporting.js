// src/services/crashReporting.js
// Crash/error reporting via Sentry. No-op until SENTRY_DSN is set (via
// EAS env / .env) — sign up at sentry.io, create a React Native project,
// and set SENTRY_DSN to the project's DSN to turn this on.
import * as Sentry from '@sentry/react-native';

const DSN = process.env.SENTRY_DSN || '';

export function initCrashReporting() {
  if (!DSN) return;
  Sentry.init({
    dsn: DSN,
    tracesSampleRate: 0.2,
    enableAutoSessionTracking: true,
  });
}

export function reportError(error, context) {
  if (!DSN) {
    if (__DEV__) console.warn('[crashReporting] SENTRY_DSN not set, error not reported:', error, context);
    return;
  }
  Sentry.captureException(error, context ? { extra: context } : undefined);
}

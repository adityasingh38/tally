# Tally — Deploy & Ops Runbook

Project ref: `gjrmpiauvreudygyvdhx`

## One-time backend setup

1. **Schema** — Supabase → SQL Editor → run all of [supabase/schema.sql](supabase/schema.sql).
   Idempotent; safe to re-run after schema changes.
2. **Auth** — Authentication → Providers → Email: enabled. For testing, disable
   "Confirm email".
3. **Secret** — `supabase secrets set ANTHROPIC_API_KEY=sk-ant-...`
4. **Functions** — deploy both:
   ```
   supabase functions deploy anthropic-proxy
   supabase functions deploy delete-account
   ```

## Build (EAS, cloud)

```
eas build -p android --profile preview
```
- Produces an installable APK (internal distribution).
- Supabase URL + anon key come from `env` in [eas.json](eas.json) (public, RLS-protected).
- `ANTHROPIC_API_KEY` is NOT in the build — it's server-side only.
- If it fails downloading Gradle (HTTP 504 from services.gradle.org): infra
  flake, just retry.

## Client env (local `expo start`)

`.env` (gitignored) needs `SUPABASE_URL`, `SUPABASE_ANON_KEY`. Anthropic key not
needed client-side.

## Pending deploy steps (for the latest commits)

- [ ] Deploy `delete-account` function (new).
- [ ] Re-deploy `anthropic-proxy` (now rate-limited; needs `api_usage` table +
      `increment_api_usage` — run schema first or AI calls return 500).
- [ ] **After** the new (raw-SMS-free) APK is installed and verified, drop the
      old column:
      ```sql
      alter table transactions drop column if exists raw_sms;
      ```
      Order matters: an old APK still inserts `raw_sms`; dropping the column
      first breaks its sync.

## Test checklist (real Android phone with bank SMS)

1. Sign up → reaches onboarding (not stuck).
2. Grant SMS → import count N > 0.
3. Dashboard/Transactions populated; merchant names clean.
4. Tap a transaction → change category → persists.
5. Insights → AI "Quick wins" load (proxy + rate limit).
6. Settings → Export CSV → share sheet opens.
7. Settings → Delete account → data gone, signed out.

## Payments (RevenueCat)

Premium is gated by a RevenueCat entitlement named `premium`.

- **No key set:** Pro is unlocked in dev and in any build with `FORCE_PREMIUM=1`
  (preview profile sets this for testing). Real releases (production) keep Pro
  **locked** so it's never given away by accident.
- **To enable real purchases:**
  1. RevenueCat dashboard → create project → add the Android app (Play package
     `com.tally`).
  2. Create products in Play Console (monthly ₹199, annual ₹1499, plus a
     one-time lifetime product) and import them into a RevenueCat Offering as
     Monthly / Annual / Lifetime duration packages (the app reads
     `offerings.monthly` / `.annual` / `.lifetime`).
  3. Create an entitlement with identifier **`Tally Pro`** and attach the
     products. (Must match `FREEMIUM.ENTITLEMENT_ID` in
     `src/constants/index.js` exactly.)
  4. Set the **public SDK key**: add `REVENUECAT_API_KEY` to the production `env`
     in [eas.json](eas.json) (or via `eas env`), then rebuild. Confirm the key
     shown in the RevenueCat "Install the SDK" screen isn't a `test_`-prefixed
     placeholder before using it in production.
  5. Remove `FORCE_PREMIUM` from any profile you want to actually charge in.

## Known limitations

- **Android only.** iOS cannot read SMS (Apple).
- **SMS capture (live + background)** is built but unverified — needs a
  bank-linked Android device to confirm.

## Play Store prep (before public release)

- [ ] Host [PRIVACY.md](PRIVACY.md) at a public URL; link in listing + in-app.
- [ ] Complete the Play Console **Permissions Declaration** for SMS (core
      functionality justification — strict review).
- [ ] Generate a real upload keystore (production profile builds an AAB).
- [ ] Set RevenueCat key + configure products.
- [ ] Store listing: screenshots, description, data-safety form.

# Tally — Deploy & Ops Runbook

Project ref: `gjrmpiauvreudygyvdhx` (Supabase dashboard name: Focal)

## One-time backend setup

1. **Schema** — for a fresh project, run [supabase/schema.sql](supabase/schema.sql).
   For an existing project, apply the pending files in `supabase/migrations/`
   in order. Do not run the base schema and its migrations on the same project.
2. **Auth** — Authentication → Providers → Email: enabled. For testing, disable
   "Confirm email".
3. **Secrets** — set `ANTHROPIC_API_KEY` and `REVENUECAT_SECRET_API_KEY`
   as Supabase Edge Function secrets. The latter is a RevenueCat **secret**
   API key, used by `anthropic-proxy` to verify the signed-in user's Pro
   entitlement. Never place it in the app or EAS environment.
4. **Functions** — deploy all three:
   ```
   supabase functions deploy anthropic-proxy
   supabase functions deploy account-profile
   supabase functions deploy delete-account
   ```

## Build (EAS, cloud)

```
eas build -p android --profile preview
```
- Produces an installable APK (internal distribution).
- Supabase URL + anon key come from `env` in [eas.json](eas.json) (public, RLS-protected).
- `ANTHROPIC_API_KEY` and `REVENUECAT_SECRET_API_KEY` are server-side only.
- If it fails downloading Gradle (HTTP 504 from services.gradle.org): infra
  flake, just retry.

## Client env (local `expo start`)

`.env` (gitignored) needs `SUPABASE_URL`, `SUPABASE_ANON_KEY`. Anthropic key not
needed client-side.

## Backend rollout status (2026-11-15)

- [x] Apply `20261115135928_account_grouping.sql`,
      `20261115135940_free_ai_categorization.sql`, and
      `20261115135947_categorization_retry.sql` to the Focal project.
- [x] Deploy `anthropic-proxy` (version 5). Interactive AI is tiered at 10 calls/day for free and
      50/day for Pro; alert categorisation has a separate 100-call daily abuse
      cap for everyone. Purchase plans require server-verified Pro. Without the
      RevenueCat secret, everyone receives the free interactive quota and
      purchase plans remain locked.
- [x] Deploy `account-profile` (version 1) for the account-label feature. Its one-account
      free limit is enforced in the database; additional labels require a
      server-verified `Tally Pro` entitlement.
- [ ] Replace the invalid `ANTHROPIC_API_KEY` server secret and rerun
      `node scripts/smoke_categorization.mjs --live`. The 2026-11-15
      authenticated test reached Anthropic but received `invalid x-api-key`;
      its disposable account was deleted. Google AI Pro consumer membership
      does not supply a Gemini API key. Changing providers also requires an
      Edge Function and privacy-copy update.
- [ ] Confirm `REVENUECAT_SECRET_API_KEY` with a Pro entitlement test.
- [ ] Run the private category accuracy study on a real Android device; the
      workspace has no connected Android device or completed worksheet.
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
8. Settings → Account labels → add bank + last four; matching alerts show the
   label in Transactions and the account filter narrows the list.
9. Verify a second label requires Pro, free alert categorisation does not use
   the 10/50 interactive AI quota, purchase plans require Pro, and receipt
   sharing opens only for Pro.
10. Disconnect the phone or block the AI function during capture: the row must
    show `category pending`, then resolve or request review after reconnecting.

## Payments (RevenueCat)

Premium is gated by a RevenueCat entitlement named `Tally Pro`.

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
  5. Create a RevenueCat **secret API key** and set it only as the Supabase
     `REVENUECAT_SECRET_API_KEY` Edge Function secret. The app signs RevenueCat
     in with the Supabase user ID; the function checks that ID against the
     `Tally Pro` entitlement before applying the higher AI quota.
  6. Remove `FORCE_PREMIUM` from any profile you want to actually charge in.

## Known limitations

- **Android only.** iOS cannot read SMS (Apple).
- **SMS capture (live + background)** is built but unverified — needs a
  bank-linked Android device to confirm.
- **Account grouping** only labels alerts that include a masked last four.
  It cannot retrieve transactions by card number, and old rows without that
  identifier remain ungrouped.

## Play Store prep (before public release)

- [ ] Host [PRIVACY.md](PRIVACY.md) at a public URL; link in listing + in-app.
- [ ] Complete the Play Console **Permissions Declaration** for SMS (core
      functionality justification — strict review).
- [ ] Generate a real upload keystore (production profile builds an AAB).
- [ ] Set RevenueCat key + configure products.
- [ ] Store listing: screenshots, description, data-safety form.

# Account Aggregator (RBI AA) integration — plan

Not implemented. Written up now so it's ready to wire in once you have a real
TSP (Technical Service Provider) account — everything below needs credentials
you don't have yet, so none of it can be built as code today.

## Why this exists

SMS-read and notification-listener capture (both already built — see
[PLAY_SMS_DECLARATION.md](PLAY_SMS_DECLARATION.md)) are inherently fragile:
they depend on exact SMS/notification text formats per bank, break silently
when a bank changes its template, and SMS-read specifically carries real
Play Store rejection risk. Account Aggregator is the RBI-regulated,
consent-based alternative: the user explicitly consents, and your app pulls
structured transaction data directly from their bank via a licensed
intermediary — no text parsing, no permission risk, no format drift.

This is the "serious version" path, not a launch blocker.

## How AA actually works (for context)

1. Tally (as a **Financial Information User**, FIU) requests a TSP to create
   a **consent artefact** — scope (which accounts, what data, how long).
2. User approves the consent in their AA app (e.g. the bank's own AA layer,
   or a dedicated app like OneMoney/Finvu) — never inside Tally itself.
3. Once approved, Tally requests data **through the TSP**, which fetches it
   from the user's **Financial Information Provider** (their bank) and
   returns it as structured JSON (encrypted, TSP never sees plaintext).
4. Consent can be revoked by the user at any time from their AA app.

Tally never talks to the bank directly — everything routes through the TSP.

## Choosing a TSP

| Provider | Notes |
|---|---|
| **Setu** | Most startup-friendly onboarding, good docs, used by many Indian fintech apps. Reasonable starting point. |
| **Finvu** | One of the original RBI-licensed AAs, mature. |
| **OneMoney** | Also mature, widely integrated. |
| **Anumati** | Newer, smaller ecosystem. |

Recommendation when ready: start with **Setu's sandbox** — fastest to get a
working proof of concept, and their docs are the most startup-oriented.

## What you need before any code can be written

- [ ] Register Tally as a **Financial Information User (FIU)** with the
      chosen TSP (business KYC, use-case declaration — this is the part
      that actually takes time, not the coding).
- [ ] Sandbox API credentials (client ID/secret, or certificate-based auth
      depending on provider).
- [ ] A legal entity, not just an individual developer account (most TSPs
      require this for FIU registration — worth confirming with Setu
      directly, since requirements shift).

## Integration shape (once credentials exist)

New Supabase edge function, e.g. `aa-proxy` (mirrors the existing
`anthropic-proxy` pattern — TSP credentials stay server-side, never in the
app):

1. `POST /aa-proxy/consent` — app calls this to kick off a consent request;
   edge function calls the TSP's consent API, returns a redirect/deep-link
   URL for the user's AA app.
2. App opens that URL (via `Linking`), user approves in their AA app,
   returns to Tally via a redirect deep link (`tally://aa-callback`).
3. `POST /aa-proxy/fetch` — once consent is active, edge function requests
   transaction data from the TSP, normalizes it into the same shape
   `smsParser.js` already produces (`{ amount, type, merchant, txn_date,
   source }`), and the existing `categoriser.js` → `insertTransactionIfNew`
   pipeline handles it unchanged from there.
4. New `api_usage`-style table (or reuse it) to track consent status per
   user — `aa_consents (user_id, tsp_consent_id, status, fi_ids, expires_at)`.

The parse → categorise → dedup → insert pipeline built for SMS/notifications
does **not** need to change — AA just becomes a third capture source
alongside SMS and notification-listener, all converging on the same
`insert_transaction_if_new` RPC.

## Effort estimate (once FIU registration is done)

- Edge function + consent flow: ~1–2 days
- Redirect/deep-link handling in-app: ~half a day
- Data normalization + testing against sandbox: ~1–2 days

The registration/KYC step with the TSP is almost certainly the long pole,
not the code.

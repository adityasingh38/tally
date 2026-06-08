# Tally — Privacy Policy

_Last updated: 2026-06-08_

Tally ("we", "the app") helps you track personal finances by automatically
reading bank transaction SMS on your Android device. This policy explains what
we collect, why, and your choices. We do not sell your data. Ever.

## SMS permission — why we need it

Tally requests `READ_SMS` and `RECEIVE_SMS`. This is core to the app's only
purpose: detecting your bank/financial transaction messages so we can log spends
automatically instead of you typing them in.

- We read SMS **solely** to identify and parse financial transaction messages
  (debits, credits, UPI, card payments) from banks and wallets.
- We ignore and never process personal/non-financial messages.
- We do **not** read SMS for advertising, profiling, or any purpose unrelated to
  transaction tracking.

## What we store

On our servers (Supabase, an EU/US-hosted Postgres database), per transaction:

- Amount, type (debit/credit), merchant name, spend category, transaction date
- The sender ID of the bank SMS (e.g. "HDFCBK")
- Your account email address (for sign-in)

**We do not store the raw text of your SMS messages.** SMS bodies are processed
only in-memory on your device and at categorisation time, then discarded.

## What we send to third parties

- **Anthropic (Claude API):** to categorise a transaction we couldn't classify
  by rules, we send a short snippet (merchant name + up to ~100 characters of the
  message) to Anthropic via our secure server. This is transient and used only to
  return a category. We never send your full message history, contacts, or
  identity. See Anthropic's privacy terms.
- **Supabase:** stores your account and transaction data described above.
- **RevenueCat:** processes subscription purchases (if you upgrade). It does not
  receive your transaction data.

We share data with no one else, and we do not sell or rent your data.

## Data retention & control

- Your data persists until you delete it or your account.
- You can export your transactions (CSV) from Settings.
- To delete your account and all associated data, contact us (below). Account
  data is removed via cascading delete.

## Security

- All network traffic uses HTTPS/TLS.
- Database access is protected by per-user Row Level Security — you can only ever
  access your own data.
- Our AI provider key is held server-side and is never present in the app.

## On-device processing

Reading and parsing of SMS happens on your device. Only the parsed,
structured transaction fields listed above leave your device.

## Children

Tally is not directed at children under 13 and we do not knowingly collect their
data.

## Changes

We may update this policy; the "Last updated" date will change. Material changes
will be surfaced in-app.

## Contact

Questions or deletion requests: **<your-support-email@example.com>**

---

> NOTE FOR THE DEVELOPER (remove before publishing):
> - Replace the contact email and confirm Supabase hosting region.
> - Host this policy at a public URL and link it in the Play Store listing and
>   in-app Settings (Google requires a reachable URL for SMS-permission apps).
> - Google Play SMS permission access requires a Permissions Declaration Form +
>   demonstrating SMS is core functionality; this app qualifies, but review is
>   strict.

# Privacy Policy — Tally

**Effective date:** 9 June 2026
**Last updated:** 9 June 2026

Tally ("Tally", "we", "us") is a personal expense-tracking app that reads your
bank transaction SMS to automatically log your spending and show you insights.
This policy explains what we collect, why, how we handle it, and your rights.

---

## 1. Who we are
Tally is operated by **Aditya Singh**, an individual developer based in India.
Contact: **adityasuper38@gmail.com**.

## 2. What we collect

**a) Account data**
- Email address and authentication credentials (handled by our auth provider,
  Supabase). Used to create and secure your account.

**b) Transaction data derived from SMS**
- Tally reads SMS **only** from known bank/UPI sender IDs (and messages that
  clearly look like bank transaction alerts). From those it extracts:
  transaction **amount**, **type** (debit/credit), **merchant name**, the last
  characters of the merchant identifier, **date/time**, and the **sender ID**.
- **The raw text of your SMS is parsed on your device and is NOT uploaded or
  stored on our servers.** Only the extracted transaction fields above are
  stored.
- Non-bank, personal SMS are ignored beyond a sender/keyword check and are never
  read in full, uploaded, or stored.

**c) App data you provide**
- Budgets and monthly limits, your stated money goal, category corrections, and
  display preferences. Preferences and your goal are stored locally on the
  device; budgets and categorised transactions are stored in your account.

**d) Subscription data**
- If you purchase Tally Pro, subscription status is managed by our payments
  provider (RevenueCat / the app store). We do not receive or store your card
  details.

We do **not** collect contacts, photos, precise location, or call logs.

## 3. How we use your data
- To automatically log and categorise your transactions.
- To show spending insights, budgets, and alerts.
- To generate AI-assisted categorisation and spending commentary (see §4).
- To operate your account, provide support, and prevent abuse.

We do **not** sell your personal data, and we do **not** use it for third-party
advertising.

## 4. AI processing
To categorise transactions and generate spending insights, limited transaction
context (such as the merchant name and transaction text) is sent to our AI
provider, **Anthropic**, via its API. This data is processed to return a
category or insight and is not used by us to build advertising profiles. See
Anthropic's privacy terms for their handling of API data.

## 5. Permissions we request (Android)
- **SMS (READ_SMS / RECEIVE_SMS)** — to read bank transaction SMS and
  auto-log spending. This is the app's core function. SMS bodies are parsed
  on-device; raw content is not stored on our servers. You may decline and use
  the app with manual entry instead.
- **Notifications** — to send budget alerts and your weekly summary.

## 6. Where your data is stored
- Account and transaction records are stored with **Supabase** (managed
  PostgreSQL). Data is transmitted over encrypted connections (HTTPS/TLS).
- Some data (preferences, goal, the vendor/queue and crypto material if
  applicable) is stored locally on your device.

## 7. Data sharing
We share data only with the service providers needed to run Tally:
- **Supabase** — database and authentication.
- **Anthropic** — AI categorisation/insights (limited transaction context).
- **RevenueCat / app stores** — subscription management.
- Legal authorities, only where required by applicable law.

We do not sell or rent your data to anyone.

## 8. Data retention
- We keep your transaction data until you delete it or close your account.
- Free accounts display a limited history window; older data may not be shown
  but is removed on account deletion.
- On account deletion (Settings → Delete account), your account and associated
  transaction data are permanently removed.

## 9. Your rights
You can:
- **Access** your data in the app.
- **Correct** transaction categories.
- **Delete** your account and all associated data at any time (Settings →
  Delete account), or by contacting us.

Where the **Digital Personal Data Protection Act, 2023 (India)** or other
applicable laws grant additional rights (access, correction, erasure,
grievance redressal), we honour them. Contact **adityasuper38@gmail.com** for
any request; we respond within the timeframe required by law.

## 10. Security
We use encrypted transport, scoped access controls, and on-device parsing of
SMS to minimise the data that leaves your phone. No system is perfectly secure;
we cannot guarantee absolute security but work to protect your data.

## 11. Children
Tally is a financial tool intended for users **18 and older**. We do not
knowingly collect data from children.

## 12. Changes to this policy
We may update this policy. Material changes will be notified in-app or by email,
and the "Last updated" date above will change.

## 13. Contact
Questions or requests: **adityasuper38@gmail.com**
Grievance Officer (India DPDP): **Aditya Singh, adityasuper38@gmail.com**

# Privacy Policy — Tally

**Effective date:** 9 June 2026
**Last updated:** 15 November 2026

Tally ("Tally", "we", "us") is a personal expense-tracking app that reads bank
SMS and supported bank/UPI app notifications, with your permission, to log
transactions and show you insights.
This policy explains what we collect, why, how we handle it, and your rights.

---

## 1. Who we are
Tally is operated by **Aditya Singh**, an individual developer based in India.
Contact: **adityasuper38@gmail.com**.

## 2. What we collect

**a) Account data**
- Email address and authentication credentials (handled by our auth provider,
  Supabase). Used to create and secure your account.

**b) Transaction data derived from alerts**
- If you grant SMS access, Tally checks SMS sender IDs and message content for
  bank transaction alerts. If you grant notification access, Android grants
  access to notifications, but Tally's listener processes alerts only from its
  supported bank/UPI app list. From matching alerts it extracts:
  transaction **amount**, **type** (debit/credit), **merchant name**, the last
  characters of the merchant identifier, **date/time**, and the **sender ID**.
  When an alert contains a masked account or card identifier, Tally also saves
  the bank name and its **last four digits** for account grouping.
- Full raw alert bodies are not stored as transaction records. For alerts that
  cannot be categorised by local rules, Tally sends the merchant and up to 100
  characters of alert text through our Supabase Edge Function to Anthropic.
  This short excerpt can contain information present in the alert, such as
  masked account details. Do not grant access if you do not want this processing.
- Alerts that do not match the bank/transaction filters are ignored by Tally.

**c) App data you provide**
- Budgets and monthly limits, your stated money goal, category corrections,
  account labels (bank name, last four digits and nickname), and display
  preferences. Preferences and your goal are stored locally on the device;
  account labels, budgets and categorised transactions are stored in your account.

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
To categorise ambiguous alerts, the merchant and up to 100 characters of alert
text are sent to **Anthropic** via our Supabase Edge Function. AI commentary may
also send category totals, spending totals, income you entered, and a question
you ask Tally. If you request a purchase plan, we also send the item, price and
timeframe you enter. Purchase plans are displayed in the app and are not saved
to your account. We do not use this data to build advertising profiles. See
Anthropic's privacy terms for its handling of API data.

## 5. Permissions we request (Android)
- **SMS (READ_SMS / RECEIVE_SMS)** — to read bank transaction SMS and
  auto-log spending, including importing past alerts. You may decline and use
  notification capture or manual entry instead.
- **Notification access** — to capture transaction notifications from supported
  bank/UPI apps. Android grants broad notification access; Tally's listener
  filters by app package. You can decline and use SMS or manual entry instead.
- **Post notifications** — to send budget alerts and spending summaries.

## 6. Where your data is stored
- Account and transaction records are stored with **Supabase** (managed
  PostgreSQL). Data is transmitted over encrypted connections (HTTPS/TLS).
- Preferences and some pending transactions are stored locally on your device.

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
alerts to minimise the data that leaves your phone. No system is perfectly secure;
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

# Google Play SMS permission review — Tally

Checked 15 November 2026 against [Google Play's SMS and Call Log permissions guidance](https://support.google.com/googleplay/android-developer/answer/10208820).

Google Play lists **SMS-based money management** (including apps that track and manage budgets) as an eligible exception for `READ_SMS` and `RECEIVE_SMS`. This is **subject to Google Play review and approval**; eligibility is not approval. The app must declare these permissions in Play Console, make the use central and prominent in its listing, and meet the user data and disclosure requirements. Recheck the policy before submission.

## Current implementation

- `app.json` declares `READ_SMS` and `RECEIVE_SMS`.
- Onboarding requests `READ_SMS` for historical import. The native SMS receiver handles new messages.
- Users can choose notification access or manual entry instead. The notification listener only forwards alerts from its bank/UPI app allowlist; it cannot backfill old notifications and it will miss transactions when those apps do not post an alert.
- An unrecognised transaction may send its merchant and up to 100 characters of alert text to the `anthropic-proxy` Edge Function and Anthropic for categorisation. Transaction fields, including sender/source, are stored in Supabase. Raw alert bodies are not stored in the transactions table.

## Play Console declaration draft

**Permissions:** `android.permission.READ_SMS`, `android.permission.RECEIVE_SMS`.

**Use case:** Select **SMS-based money management** if offered in the current declaration form. Verify the actual options in Play Console at submission time.

**Core function:** Tally identifies bank transaction alerts, extracts amount, direction, merchant and date, and shows spending and budget progress without manual entry.

**Why access is needed:** `READ_SMS` imports past transaction alerts; `RECEIVE_SMS` captures new alerts. Tally filters messages by bank sender or transaction markers before parsing. It does not use SMS for advertising. Explain the limited AI snippet transfer in the prominent disclosure and privacy policy.

**Evidence to prepare:** A device recording of onboarding, the permission choice, a transaction alert appearing in the feed, the notification/manual alternatives, and account deletion. Use real Play Console requirements for the final submission.

## Release gate

1. Complete the capture accuracy study in [CAPTURE_VALIDATION.md](CAPTURE_VALIDATION.md), including SMS and notification paths.
2. Review the final manifest, in-app disclosure, store listing, privacy policy, and Play Console Data safety answers together.
3. Submit the SMS permissions declaration for review. Keep the notification path available; Play review may require changes.

Google's current guidance is the source of truth for the policy decision. This file is an implementation checklist, not a prediction of review outcome.

# Capture accuracy study

This is the release test for Tally's automatic capture claims. Use a development build on real Android phones. Keep raw SMS and notification text out of this repository; the worksheet records only transaction fields and timing. Use your own transactions or get explicit consent from each tester.

## Prepare

1. Copy `capture_validation_template.csv` outside the repository and give each transaction a unique `case_id`.
2. Record the expected amount, debit/credit direction, merchant, category, event time, and whether an SMS, app notification, or both arrived. Use the bank/UPI transaction record as the source of truth and choose the category before looking at Tally's result. Write timestamps in ISO 8601 form with a timezone offset, such as `2026-11-15T10:00:00+05:30`.
3. Record the number of matching Tally entries and the displayed fields, including the observed category and whether its status is `done`, `pending`, or `review`. Use `observed_count=0` for a miss. Add a row with blank expected fields for each unexpected Tally entry. For pending categories, record `category_resolved_at` after a later check.
4. Record the time the entry first appears in Tally. Avoid copying full alert text, account numbers, or names of other people into this file.

## Test matrix

- At least two Android devices and several banks/UPI apps represented in the native allowlist.
- SMS only, notification only, both channels, and manual entry.
- Foreground, background, app killed, device restarted, and temporarily offline. After restoring connectivity, confirm pending categories resolve or ask for review.
- Permission granted, denied, and revoked; app notifications disabled; bank app notifications disabled.
- Debit, credit, refund, reversal, failed payment, OTP, recurring charge, and two identical amounts close together.
- Historical SMS import followed by a second import to check duplicate handling.

Capture at least 200 verified events before claiming broad coverage. Report results by source and bank/app; a strong overall number can hide one broken integration. Treat these as proposed release gates, not proof that every bank works: at least 98% of eligible alerts captured, no false transactions from OTP/failed alerts, no duplicate entries from dual-channel capture, and no wrong amount or direction. For categorisation, review category agreement, `other`, pending, and review rates by category and bank/app. A release candidate should have no permanently pending categories and no silent category errors. Inspect every failure and rerun its case after a fix.

Run `python scripts/score_capture.py path/to/filled.csv` to summarize misses, duplicates, field and category errors, pending/review cases, and latency. The scorer does not infer whether a bank sent an alert; the tester must mark eligibility in the worksheet. `eligible=no` rows are reported separately and excluded from capture recall. Category accuracy uses captured rows with an expected category; pending and review rows count as unresolved, not correct.

## Known limitations to verify

- Notification capture requires the bank/UPI app to post a matching alert; it cannot import notification history.
- Android can restrict background service starts. A listener failure may be a permanent miss, so test app-killed and battery-restricted states on devices.
- The SMS parser is format-dependent. Its unit tests use examples and cannot establish real-world coverage.
- Current CSV export contains dates but no exact capture timestamp, so measure `visible_at` during the device test.

Do not publish “every spend,” “every major bank,” or a capture percentage until this study supports it. Keep the completed worksheet private because transaction data is sensitive.

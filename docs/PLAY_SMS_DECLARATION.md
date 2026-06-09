# Google Play — SMS Permissions Declaration (Tally)

> ⚠️ **READ THIS FIRST — be realistic about the outcome.**
>
> Google Play's **SMS & Call Log Permissions policy** only allows `READ_SMS` /
> `RECEIVE_SMS` for a **short, fixed list of approved use cases** (default SMS
> handler, backup/restore, sync, etc.). **"Reading bank SMS to track expenses"
> is NOT on that approved list.** Google removed the financial-SMS exception
> years ago — this is exactly why Walnut, MoneyView and similar India expense
> apps **stopped reading SMS** and moved to other methods.
>
> So: you can submit the declaration below, but expect a **high chance of
> rejection**. Do not bet the launch timeline on it. The two real paths are in
> the "If rejected" section — and you should start the Notification-Listener
> migration **in parallel**, not after a rejection.

---

## The form fields (what Google asks, and your answers)

**1. Which permissions does your app request?**
> `android.permission.READ_SMS`, `android.permission.RECEIVE_SMS`

**2. Is this permission part of your app's core functionality?**
> Yes. Tally's core feature is automatically logging the user's bank/UPI
> transactions by reading transactional SMS, so the user never types entries
> manually.

**3. Selected use case (Google dropdown)**
> There is no exact match. The closest selectable category is typically
> "**Financial management / transaction tracking**" if shown, otherwise
> "Other." This mismatch is the core risk — Google's allowed list does not
> formally include this case.

**4. Why your app needs this permission (justification)**
> Tally reads only transactional SMS from known bank/UPI sender IDs to extract
> transaction details (amount, debit/credit, merchant, date) and present the
> user a real-time view of their spending. Without SMS access the app cannot
> deliver its core value — automatic, zero-effort expense tracking. The raw SMS
> body is parsed **on-device**; only the extracted transaction fields are stored.
> Personal (non-bank) SMS are filtered out and never read beyond a sender/keyword
> check.

**5. Alternatives considered**
> - Manual entry — defeats the product's entire purpose (zero-effort tracking).
> - Notification listener — under active evaluation as the primary path (see below).
> - Account Aggregator (RBI AA) — the sanctioned long-term path; integration planned.

**6. Demo video (required)**
> Record a <2-min screen capture: onboarding → grant SMS → a bank SMS arrives →
> the transaction auto-appears in the feed. Host unlisted on YouTube, link it.

---

## If rejected (plan for this — it's the likely outcome)

**Path A — Notification Listener (fastest, recommended).**
Use `BIND_NOTIFICATION_LISTENER_SERVICE` to read **bank app / SMS notifications**
instead of the SMS inbox. Same data (amount, merchant), **no SMS-policy review**,
allowed on Play. Trade-offs: the user must keep bank notifications on, and you
only catch transactions while notifications fire (no historical backfill).
This is what most India expense apps migrated to. **Start this now, in parallel.**

**Path B — Account Aggregator (RBI AA).**
The regulator-sanctioned, consent-based way to pull bank transaction data
(via Finvu / OneMoney / Anumati etc.). Cleanest and most scalable, but a heavier
integration + a partnership. The right end-state if Tally goes serious.

**Path C — User-forwarded SMS.**
User forwards bank SMS to an in-app inbox / number. Clunky, but policy-safe and
needs no special permission.

---

## Recommendation
1. Submit the declaration above **and** begin the **Notification Listener**
   migration immediately — treat A as the real plan, the declaration as a long shot.
2. Keep the on-device parsing model (`smsParser`) — it ports almost unchanged to
   notification text.
3. Plan the **Account Aggregator** path for the serious version.

*The SMS read path is a launch risk, not a certainty. Don't let it block the
internal beta — that can run on a dev build without Play review.*

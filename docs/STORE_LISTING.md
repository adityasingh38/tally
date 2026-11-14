# Google Play Store Listing · Tally

Voice: lowercase, deadpan, snarky. Matches landing page (`landing/index.html`)
and in-app copy (Paywall perks: FULL / AI++ / RECEIPT / BANKS / WIDGET).

Capture method is described by outcome ("auto-logs the moment it happens"),
not by permission mechanism, avoiding over-committing the listing to SMS
specifically, since notification-listener is the safer primary path (see
[PLAY_SMS_DECLARATION.md](PLAY_SMS_DECLARATION.md)).

---

## App name (30 char max)
Tally · track the damage

## Short description (80 char max)
auto-logs every spend, roasts you for it. zero manual entry.

## Full description (4000 char max)

you know it's bad. tally just makes it official.

tally watches your bank and UPI apps and logs every transaction the second
it happens: no typing, no receipts, no "I'll add it later" that never
happens. debit, credit, doesn't matter. if money moved, tally saw it.

**what it does**
- auto-logs transactions in real time, straight from your bank/UPI apps
- sorts everything into categories automatically (food, transport,
  shopping, the works)
- an AI that actually tells you the truth about your spending, not a
  cheerful chart pretending everything's fine
- budgets with alerts before you blow past them, not after
- clean, shareable spend receipts
- export your full history to CSV whenever you want it
- works with every major Indian bank and UPI app

**tally pro**
- full history, not just the last 30 days
- unlimited AI roasts and weekly summaries
- unlimited linked accounts
- home-screen widget for your live broke-streak

**your data, straight**
tally never reads or stores your messages: only the transaction details
(amount, merchant, date) get pulled out and saved. nothing else. we don't
sell your data, ever. full breakdown in the privacy policy, linked below.

built by one person who also hates checking their bank balance. track the
damage. financially feral.

## Data safety form (reference answers)

- **Financial info collected**: transaction amount, type, merchant, category,
  date. Not sold. Shared only with Anthropic (AI categorisation, transient),
  Supabase (storage), RevenueCat (subscription status).
- **Personal info collected**: email (account/auth only).
- **Data NOT collected**: contacts, precise location, call logs, raw message
  content, photos.
- **Encryption in transit**: yes (HTTPS/TLS).
- **User can request deletion**: yes — Settings → Delete account (in-app,
  no separate request needed), full cascade delete.
- **Privacy policy URL**: https://adityasingh38.github.io/tally/PRIVACY_POLICY.html

## Graphics & Screenshots (Generated)
- **Feature graphic (1024×500)**: [docs/screenshots/feature_graphic.png](screenshots/feature_graphic.png)
- **Play Store showcase slides (1080×2280)**:
  - Slide 1: [docs/screenshots/store/store_01_dashboard.png](screenshots/store/store_01_dashboard.png)
  - Slide 2: [docs/screenshots/store/store_02_feed.png](screenshots/store/store_02_feed.png)
  - Slide 3: [docs/screenshots/store/store_03_insights.png](screenshots/store/store_03_insights.png)
  - Slide 4: [docs/screenshots/store/store_04_budgets.png](screenshots/store/store_04_budgets.png)
  - Slide 5: [docs/screenshots/store/store_05_pro.png](screenshots/store/store_05_pro.png)
  - Slide 6: [docs/screenshots/store/store_06_settings.png](screenshots/store/store_06_settings.png)
- **Raw device screenshots (1080×2400)**: located in [docs/screenshots/raw/](screenshots/raw/)
- **App icon**: exists at `assets/icon.png` / `assets/adaptive-icon.png`

## Play Console Setup Checklist
- [x] Screenshots & feature graphic generated
- [ ] Category: Finance
- [ ] Content rating questionnaire (Play Console, in-app process)
- [ ] Upload AAB (via EAS build production profile)

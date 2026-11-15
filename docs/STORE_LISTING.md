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
logs supported bank alerts, roasts your spending. Less manual entry.

## Full description (4000 char max)

you know it's bad. Tally just makes it official.

tally can read supported bank SMS and bank/UPI app notifications, then turn
transaction alerts into a spending feed. You can also add or correct entries
yourself. Capture depends on your permissions and the alerts your bank sends.

**what it does**
- captures supported transaction alerts from bank SMS and bank/UPI apps
- sorts everything into categories automatically (food, transport,
  shopping, the works)
- an AI that actually tells you the truth about your spending, not a
  cheerful chart pretending everything's fine
- budgets with alerts before you blow past them, not after
- a monthly damage receipt in the insights screen
- group captured transactions by bank name and last four digits when alerts include them
- export your full history to CSV whenever you want it
- supports alerts from selected Indian banks and UPI apps

**tally pro**
- full history, not just the last 30 days
- purchase plans for things you want to buy, with monthly savings targets
- 50 interactive AI requests per day instead of 10 on free; alert categorisation is free
- share your monthly damage receipt
- group more than one account's captured transactions (one label on free)
- home-screen widget for your live broke-streak

**your data, straight**
with your permission, tally reads bank SMS or supported app notifications
to identify transactions. It stores transaction details, not full alerts.
Account grouping uses bank names and last four digits, not full card numbers;
it does not connect directly to your bank.
For an alert that needs AI categorisation, its merchant and up to 100
characters of text may be sent to our AI provider. We don't sell your data.
Full breakdown in the privacy policy, linked below.

built by one person who also hates checking their bank balance. Track the
damage. Financially feral.

## Data safety form (reference answers)

- **Financial info collected**: transaction amount, type, merchant, category,
  date. Not sold. Shared only with Anthropic (AI categorisation, transient),
  Supabase (storage), RevenueCat (subscription status).
- **Personal info collected**: email (account/auth only).
- **Data NOT stored as transaction records**: full raw SMS or notification
  bodies. Limited alert text may be sent for AI categorisation.
- **Encryption in transit**: yes (HTTPS/TLS).
- **User can request deletion**: yes — Settings → Delete account (in-app,
  no separate request needed), full cascade delete.
- **Privacy policy URL**: https://adityasingh38.github.io/tally/PRIVACY_POLICY.html

## Graphics & Screenshots (Generated; review before publishing)

The Pro slide currently describes benefits that are not implemented as paid
features. Regenerate it from the live paywall before submission. Check every
other slide against the release build and the capture validation results.
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

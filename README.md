# Tally · track the damage.

<p align="center">
  <img src="docs/screenshots/feature_graphic.png" alt="Tally Feature Graphic" width="100%" />
</p>

**Automatic expense tracking from your bank SMS & notifications.** Tally reads transaction alerts in the background, turns them into clean, categorized expenses with an unapologetic AI, and keeps your raw messages 100% private.

<p align="center">
  <img src="docs/screenshots/store/store_01_dashboard.png" width="30%" alt="Dashboard" />
  <img src="docs/screenshots/store/store_02_feed.png" width="30%" alt="Feed" />
  <img src="docs/screenshots/store/store_03_insights.png" width="30%" alt="AI Insights" />
</p>
<p align="center">
  <img src="docs/screenshots/store/store_04_budgets.png" width="30%" alt="Budgets" />
  <img src="docs/screenshots/store/store_05_pro.png" width="30%" alt="Tally Pro" />
  <img src="docs/screenshots/store/store_06_settings.png" width="30%" alt="Settings & Privacy" />
</p>

---

## What it does
- **Zero-effort tracking**: captures bank and UPI transaction alerts in the background (Android Notification Listener & Headless JS) and parses them into structured expenses, so you never log a transaction by hand.
- **AI categorization & roast**: an AI that tells you the truth about your spending habits, not a cheerful chart pretending everything is fine.
- **Privacy-first**: raw SMS/notifications aren't persisted; local on-device extraction, and in-app cascade account deletion.
- **Budgets vs Reality ("Delusions")**: set monthly limits per category and track your daily burn rate to payday.
- **Premium tier**: entitlement-based Pro (RevenueCat) with unlimited history, weekly roasts, and home-screen broke-streak widget.
- **Coming-soon landing**: Supabase-backed waitlist at `landing/`.

## Stack
React Native (Expo SDK 56) · Supabase (Postgres) · server-side AI parsing (Anthropic) · RevenueCat · EAS Build

## Getting started
```bash
npm install
cp .env.example .env
npx expo start
```
> Background capture uses native modules, so run a **development build** (EAS) (not Expo Go).

See [PRIVACY.md](PRIVACY.md), [DEPLOY.md](DEPLOY.md), and [docs/STORE_LISTING.md](docs/STORE_LISTING.md) for details.

## Status
In active development · prepping for Google Play Store release.

---
<sub>Confirm the exact run/build scripts in `package.json` / `eas.json` before publishing.</sub>

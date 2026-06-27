# Tally

**Automatic expense tracking from your bank SMS.** Tally reads transaction SMS in the background, turns them into clean, categorized expenses with AI, and keeps your raw messages private.

## What it does
- **Zero-effort tracking** — captures bank/transaction SMS in the background (Android Headless JS) and parses them into structured expenses, so you never log a transaction by hand.
- **AI categorization** — parsing and categorization run server-side (your AI key never ships inside the app).
- **Privacy-first** — raw SMS aren't persisted; in-app account deletion is supported.
- **Premium tier** — entitlement-based Pro (no accidental free Pro in production).
- **Coming-soon landing** — Supabase-backed waitlist.

## Stack
React Native (Expo) · Supabase (Postgres) · server-side AI parsing · EAS Build · entitlement-based payments

## Getting started
```bash
npm install
cp .env.example .env
npx expo start
```
> Background SMS capture uses native modules, so run a **development build** (EAS) — not Expo Go.

See `PRIVACY.md` and `DEPLOY.md` for the privacy model and release process.

## Status
In active development · prepping for Play Store release.

---
<sub>Confirm the exact run/build scripts in `package.json` / `eas.json` before publishing.</sub>

# Tally coming-soon page

Self-contained landing page (`index.html`) — Tally brand, email waitlist.
No build step. Open it in a browser to preview.

## 1. Create the waitlist table (one-time)

The form posts emails to a Supabase `waitlist` table. Run this in the Supabase
SQL editor (Dashboard → SQL):

```sql
create table if not exists public.waitlist (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  created_at timestamptz default now()
);

alter table public.waitlist enable row level security;

-- Allow anonymous (public) sign-ups, but nothing else.
create policy "anon can join waitlist"
  on public.waitlist for insert to anon with check (true);
```

Duplicate emails return HTTP 409 — the page treats that as "already on the list."
To read signups: Dashboard → Table editor → `waitlist` (or `select * from waitlist order by created_at desc;`).

## 2. Host it (pick one — all free)

- **GitHub Pages:** push `landing/` to a repo, Settings → Pages → deploy from
  `/landing`. Or copy `index.html` to a `gh-pages` branch root.
- **Netlify / Vercel:** drag-drop the `landing/` folder, or point at the repo
  with publish dir `landing`.
- **Cloudflare Pages:** same — build command none, output dir `landing`.

## 3. Before going public

- Replace the `instagram` / `x / twitter` footer links with real URLs.
- Add `privacy.html` (render `docs/PRIVACY_POLICY.md` to HTML) so the footer
  `privacy` link resolves.
- The Supabase anon key in `index.html` is a **public client credential** — safe
  to ship. The waitlist RLS policy above is what keeps it write-only for anon.

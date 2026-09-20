# Sweet Delights — production app

This is the Sweet Delights cake site rebuilt as a standalone Next.js + Supabase
application. It has **zero runtime dependency on Claude** — no `claude.use()`,
no `db.doc()`, no `/_blob/`, no hardcoded PIN. Once deployed, it runs entirely
on your own Vercel + Supabase accounts.

## What changed from the Claude artifact

| Old (Claude artifact)            | New (this project)                                   |
|-----------------------------------|-------------------------------------------------------|
| `claude.use("db")`                | Supabase Postgres tables (`settings`, `styles`, `menu_items`) |
| `db.doc("sd/menu").get()/.set()`  | `supabase.from("menu_items").select()/.insert()/.update()/.delete()` |
| `claude.use("assets")`            | Supabase Storage bucket `cake-images`                 |
| `/_blob/<id>` image URLs          | Public Supabase Storage URLs stored in `image_url`     |
| `const ADMIN_PIN = "2026"`        | Supabase Auth (real email/password login) + Row Level Security |
| Single `index.html` file          | Next.js App Router project (`app/`, `components/`, `lib/`) |

The visual design, copy, layout, and WhatsApp-ordering behavior are unchanged.

## Architecture at a glance

```
Public visitor  →  Browser  →  Supabase (read-only, via RLS)
Admin (signed in) → Browser  →  Supabase (read + write, via RLS)
```

Every database and storage call in this app goes **directly from the browser
to Supabase** using the public "anon" key. There are no custom Vercel API
routes doing database work, and there is no service-role key anywhere in this
project. Security comes from **Row Level Security (RLS) policies**, not from
hiding a key or a route:

- Anyone (anon or signed in) can **read** `settings`, `styles`, `menu_items`,
  and photos in the `cake-images` bucket — that's what the public landing
  page needs.
- Only a **signed-in Supabase Auth user** can insert/update/delete rows or
  upload/delete photos.
- `middleware.ts` additionally redirects anyone without a session away from
  `/admin/dashboard` at the network edge, before the page even renders. This
  is a UX convenience — RLS is what actually enforces the rule.

There is no public sign-up form anywhere in this app, so "signed-in user" in
practice means "an account you created for yourself" (see below).

## 1. Create the Supabase project

1. Go to [supabase.com](https://supabase.com) → New Project.
2. Once it's created, go to **Project Settings → API** and copy:
   - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
   - **anon public key** → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
3. Copy `.env.example` to `.env.local` and fill in those two values.

## 2. Run the database schema

1. In the Supabase dashboard, open **SQL Editor → New query**.
2. Paste the entire contents of `supabase/schema.sql` and run it.

This single script:
- Creates the `settings`, `styles`, `menu_items` tables with `updated_at` triggers.
- Enables Row Level Security and creates the read/write policies described above.
- Creates the `cake-images` storage bucket (public read) with matching storage policies.
- Seeds the same default settings, styles, and menu items the original site shipped with.

If you'd rather create the bucket by hand: **Storage → New bucket → name it
`cake-images` → toggle "Public bucket" on** — then just skip the `insert into
storage.buckets` line in the SQL script.

## 3. Disable public sign-ups (important)

This app has no sign-up page, but Supabase's Auth API can still accept
sign-ups unless you turn that off:

**Authentication → Providers → Email → turn off "Allow new users to sign up"**
(wording may vary slightly by Supabase version — look for the sign-up toggle).

This guarantees the only way to become an "authenticated" user (and therefore
an admin) is an account you create yourself, next.

## 4. Create your first admin account

**Authentication → Users → Add user → Create new user.**
Enter an email and password for yourself (or your aunt). That's it — there is
no separate "admin" role table; any account that can sign in can manage the
site, exactly like the old PIN did, except it's now a real login instead of a
number baked into the page.

Want more than one admin, or a stricter multi-role system later? Add a
`profiles` table with an `is_admin` boolean and reference it in the RLS
policies' `using`/`with check` clauses instead of just `to authenticated`.
Not necessary for a single-admin bakery site, so it's left out here.

## 5. Run locally

```bash
npm install
npm run dev
```

Visit `http://localhost:3000` for the public site and
`http://localhost:3000/admin` to log in.

## 6. Deploy to Vercel

1. Push this project to a new GitHub repository.
2. In Vercel: **Add New… → Project → Import** your repository.
3. Under **Environment Variables**, add:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
4. Deploy.
5. Open the deployed URL — that's the public site.
6. Open `/admin` — log in with the account you created in step 4.
7. Any change you save in the dashboard is a real database write; refreshing
   the page, or opening the site from a different device, will show it.

## Migrating your own real menu

The SQL seed data matches the original placeholder menu (Chocolate Truffle,
Vanilla Bean Buttercream, etc.). Once deployed, don't edit the database by
hand — just log into `/admin` and use **Add Item / Edit / Delete** like
normal. The database becomes the one source of truth from that point on; the
seed data is only there so the site isn't empty on day one.

## Project structure

```
app/
  layout.tsx              — root layout, fonts, global CSS
  page.tsx                — public landing page
  globals.css             — all styling (ported from the original design)
  admin/
    page.tsx              — admin login (Supabase Auth)
    dashboard/
      page.tsx             — admin dashboard (settings, styles, menu CRUD)
components/
  PublicSite.tsx           — the entire public page (hero, menu, footer, etc.)
  icons.tsx                — inline SVG icons
  admin/
    ItemFormModal.tsx      — add/edit menu item + photo upload
    AddStyleModal.tsx      — add a design style
    ConfirmModal.tsx       — generic confirm/info dialog
lib/
  types.ts                 — shared TypeScript types
  constants.ts              — category labels, bucket name
  supabaseClient.ts         — browser Supabase client (anon key only)
  supabaseServer.ts         — server-side Supabase client (Server Components)
  storagePath.ts            — helpers for image URL ↔ storage path, slugify
middleware.ts                — redirects unauthenticated visitors away from /admin/dashboard
supabase/
  schema.sql                — full schema + RLS + storage + seed data
```

## Final audit

- [x] Landing page works — reads `settings`/`styles`/`menu_items` from Supabase
- [x] `/admin` works — real login page
- [x] Authentication works — Supabase Auth `signInWithPassword`
- [x] Menu loads from database
- [x] Settings load from database
- [x] Styles load from database
- [x] Add cake works — insert into `menu_items`
- [x] Edit cake works — update `menu_items`
- [x] Delete cake works — delete from `menu_items` + best-effort storage cleanup
- [x] Availability toggle works
- [x] Add style works
- [x] Delete style works — blocked with a clear message if a cake still uses it (FK `on delete restrict`)
- [x] Settings update works — `upsert` on the single settings row
- [x] Image upload works — Supabase Storage `cake-images` bucket
- [x] Image deletion works — old file removed on replace/remove/delete
- [x] WhatsApp ordering works — number now comes from `settings.whatsapp`
- [x] Data survives page refresh — real Postgres storage, not memory
- [x] Data survives deployment — Supabase is external to Vercel's build
- [x] Public users cannot perform admin operations — RLS restricts writes to `authenticated`
- [x] No hardcoded admin PIN
- [x] No Claude DB dependency
- [x] No Claude asset dependency
- [x] No `/_blob` dependency
- [x] No secrets exposed to client — only the public anon key is used, ever
- [x] Vercel deployment works — standard Next.js project, no special config needed

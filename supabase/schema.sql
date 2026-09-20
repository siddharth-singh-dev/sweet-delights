-- =====================================================================
-- Sweet Delights — Supabase schema, RLS policies, storage, and seed data
-- Run this whole file once in: Supabase Dashboard → SQL Editor → New query
-- =====================================================================

create extension if not exists "pgcrypto"; -- for gen_random_uuid()

-- ---------------------------------------------------------------------
-- updated_at trigger helper
-- ---------------------------------------------------------------------
create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- ---------------------------------------------------------------------
-- settings (single row, id is always 1)
-- ---------------------------------------------------------------------
create table if not exists settings (
  id          smallint primary key default 1 check (id = 1),
  whatsapp    text not null default '919999999999',
  address     text not null default '',
  hours       text not null default '',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

drop trigger if exists trg_settings_updated_at on settings;
create trigger trg_settings_updated_at
  before update on settings
  for each row execute function set_updated_at();

-- ---------------------------------------------------------------------
-- styles
-- ---------------------------------------------------------------------
create table if not exists styles (
  id          uuid primary key default gen_random_uuid(),
  key         text not null unique,
  label       text not null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

drop trigger if exists trg_styles_updated_at on styles;
create trigger trg_styles_updated_at
  before update on styles
  for each row execute function set_updated_at();

-- ---------------------------------------------------------------------
-- menu_items
-- style_id uses "on delete restrict" so the database itself refuses to
-- delete a style that's still in use — the app catches that error and
-- shows "can't delete this style" instead of silently breaking items.
-- ---------------------------------------------------------------------
create table if not exists menu_items (
  id          uuid primary key default gen_random_uuid(),
  category    text not null check (category in ('birthday','wedding','custom','everyday')),
  style_id    uuid not null references styles(id) on delete restrict,
  name        text not null,
  kicker      text not null default '',
  price       text not null,
  available   boolean not null default true,
  image_url   text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

drop trigger if exists trg_menu_items_updated_at on menu_items;
create trigger trg_menu_items_updated_at
  before update on menu_items
  for each row execute function set_updated_at();

create index if not exists idx_menu_items_category on menu_items(category);
create index if not exists idx_menu_items_style on menu_items(style_id);

-- =====================================================================
-- ROW LEVEL SECURITY
-- Public visitors (anon) can only ever READ. Only a signed-in
-- Supabase Auth user (authenticated) can write. There is no public
-- sign-up form in this app, and email sign-ups should be disabled in
-- Supabase Auth settings, so "authenticated" effectively means "an
-- account you created for your admin(s)".
-- =====================================================================

alter table settings   enable row level security;
alter table styles     enable row level security;
alter table menu_items enable row level security;

-- settings
drop policy if exists "settings_public_read" on settings;
create policy "settings_public_read" on settings
  for select using (true);

drop policy if exists "settings_admin_write" on settings;
create policy "settings_admin_write" on settings
  for insert to authenticated with check (true);

drop policy if exists "settings_admin_update" on settings;
create policy "settings_admin_update" on settings
  for update to authenticated using (true) with check (true);

-- styles
drop policy if exists "styles_public_read" on styles;
create policy "styles_public_read" on styles
  for select using (true);

drop policy if exists "styles_admin_insert" on styles;
create policy "styles_admin_insert" on styles
  for insert to authenticated with check (true);

drop policy if exists "styles_admin_update" on styles;
create policy "styles_admin_update" on styles
  for update to authenticated using (true) with check (true);

drop policy if exists "styles_admin_delete" on styles;
create policy "styles_admin_delete" on styles
  for delete to authenticated using (true);

-- menu_items
drop policy if exists "menu_items_public_read" on menu_items;
create policy "menu_items_public_read" on menu_items
  for select using (true);

drop policy if exists "menu_items_admin_insert" on menu_items;
create policy "menu_items_admin_insert" on menu_items
  for insert to authenticated with check (true);

drop policy if exists "menu_items_admin_update" on menu_items;
create policy "menu_items_admin_update" on menu_items
  for update to authenticated using (true) with check (true);

drop policy if exists "menu_items_admin_delete" on menu_items;
create policy "menu_items_admin_delete" on menu_items
  for delete to authenticated using (true);

-- =====================================================================
-- STORAGE: cake-images bucket + policies
-- Public read (so the landing page can show photos), writes restricted
-- to signed-in admins.
-- =====================================================================

insert into storage.buckets (id, name, public)
values ('cake-images', 'cake-images', true)
on conflict (id) do nothing;

drop policy if exists "cake_images_public_read" on storage.objects;
create policy "cake_images_public_read" on storage.objects
  for select using (bucket_id = 'cake-images');

drop policy if exists "cake_images_admin_insert" on storage.objects;
create policy "cake_images_admin_insert" on storage.objects
  for insert to authenticated with check (bucket_id = 'cake-images');

drop policy if exists "cake_images_admin_update" on storage.objects;
create policy "cake_images_admin_update" on storage.objects
  for update to authenticated using (bucket_id = 'cake-images');

drop policy if exists "cake_images_admin_delete" on storage.objects;
create policy "cake_images_admin_delete" on storage.objects
  for delete to authenticated using (bucket_id = 'cake-images');

-- =====================================================================
-- SEED DATA — the same defaults the original site shipped with
-- =====================================================================

insert into settings (id, whatsapp, address, hours)
values (1, '919999999999', 'Pi 1&2, Greater Noida, Uttar Pradesh', 'Orders open daily, 10am–7pm')
on conflict (id) do nothing;

insert into styles (key, label) values
  ('buttercream', 'Buttercream Florals'),
  ('drip',        'Drip & Ganache'),
  ('fondant',     'Fondant Sculpted'),
  ('naked',       'Semi-Naked Rustic'),
  ('minimalist',  'Minimalist Elegant'),
  ('photo',       'Photo Print')
on conflict (key) do nothing;

-- menu_items seed, looked up by style key via a CTE so we don't have to
-- hardcode UUIDs
with s as (select id, key from styles)
insert into menu_items (category, style_id, name, kicker, price, available)
select * from (
  values
    ('birthday', (select id from s where key = 'drip'),        'Chocolate Truffle',           'Serves 8–10',  'From ₹1,400', true),
    ('birthday', (select id from s where key = 'buttercream'), 'Vanilla Bean Buttercream',     'Serves 8–10',  'From ₹1,200', true),
    ('birthday', (select id from s where key = 'minimalist'),  'Red Velvet Dream',             'Serves 8–10',  'From ₹1,500', true),
    ('wedding',  (select id from s where key = 'buttercream'), 'Two-Tier Ivory Rose',          'Serves 40–50', 'From ₹6,500', true),
    ('wedding',  (select id from s where key = 'naked'),       'Naked Cake, Fresh Florals',    'Serves 30–40', 'From ₹5,000', true),
    ('wedding',  (select id from s where key = 'fondant'),     'Classic Fondant Elegance',     'Serves 50–60', 'From ₹8,000', true),
    ('custom',   (select id from s where key = 'fondant'),     'Character & Theme Cakes',      'Kids'' Parties','From ₹1,800', true),
    ('custom',   (select id from s where key = 'photo'),       'Photo Print Cakes',            'Personalised', 'From ₹1,300', true),
    ('custom',   (select id from s where key = 'minimalist'),  'Number & Letter Cakes',        'Trending',     'From ₹2,200', true),
    ('everyday', (select id from s where key = 'buttercream'), 'Assorted Cupcakes',            'Box of 6',     '₹450',        true),
    ('everyday', (select id from s where key = 'drip'),        'Brownies & Bites',             'Box of 9',     '₹400',        true),
    ('everyday', (select id from s where key = 'naked'),       'Jar Cakes',                    'Set of 4',     '₹600',        true)
) as v(category, style_id, name, kicker, price, available)
where not exists (select 1 from menu_items limit 1);

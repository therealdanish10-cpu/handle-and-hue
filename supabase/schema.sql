-- ============================================================================
-- HANDLE & HUE — Supabase Database Schema, Storage, RLS & Seed Data
-- Run this script in the Supabase SQL Editor (https://supabase.com/dashboard)
-- ============================================================================

-- Enable pgcrypto for gen_random_uuid() if not already enabled
create extension if not exists "pgcrypto";

-- ============================================================================
-- 1. AUTOMATIC updated_at TRIGGER FUNCTION
-- ============================================================================
create or replace function public.handle_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ============================================================================
-- 2. PRODUCTS TABLE
-- ============================================================================
create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  name text not null,
  category text not null,
  price integer not null check (price >= 0),
  sale_price integer check (sale_price is null or (sale_price >= 0 and sale_price < price)),
  description text not null default '',
  colors jsonb not null default '[]'::jsonb,
  images jsonb not null default '[]'::jsonb,
  dimensions text not null default '',
  in_stock boolean not null default true,
  is_new boolean not null default false,
  is_bestseller boolean not null default false,
  is_featured boolean not null default false,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists trg_products_updated_at on public.products;
create trigger trg_products_updated_at
before update on public.products
for each row
execute function public.handle_updated_at();

create index if not exists idx_products_category on public.products (category);
create index if not exists idx_products_sort_order on public.products (sort_order asc, created_at desc);

-- ============================================================================
-- 3. SETTINGS TABLE (Single Row)
-- ============================================================================
create table if not exists public.settings (
  id integer primary key default 1 check (id = 1),
  whatsapp_number text not null default '923469377256',
  shipping_fee integer not null default 250 check (shipping_fee >= 0),
  free_shipping_threshold integer not null default 10000 check (free_shipping_threshold >= 0),
  announcement_text text not null default 'Free Nationwide Delivery Across Pakistan Over Rs. 10,000 • Welcome Privilege Code: HUE10',
  updated_at timestamptz not null default now()
);

drop trigger if exists trg_settings_updated_at on public.settings;
create trigger trg_settings_updated_at
before update on public.settings
for each row
execute function public.handle_updated_at();

-- ============================================================================
-- 4. ROW LEVEL SECURITY (RLS) POLICIES FOR TABLES
-- ============================================================================
alter table public.products enable row level security;
alter table public.settings enable row level security;

-- Products policies: anyone can SELECT; only authenticated users can INSERT, UPDATE, DELETE
drop policy if exists "Public can read products" on public.products;
create policy "Public can read products"
  on public.products
  for select
  to anon, authenticated
  using (true);

drop policy if exists "Authenticated users can insert products" on public.products;
create policy "Authenticated users can insert products"
  on public.products
  for insert
  to authenticated
  with check (auth.role() = 'authenticated');

drop policy if exists "Authenticated users can update products" on public.products;
create policy "Authenticated users can update products"
  on public.products
  for update
  to authenticated
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

drop policy if exists "Authenticated users can delete products" on public.products;
create policy "Authenticated users can delete products"
  on public.products
  for delete
  to authenticated
  using (auth.role() = 'authenticated');

-- Settings policies: anyone can SELECT; only authenticated users can INSERT, UPDATE, DELETE
drop policy if exists "Public can read settings" on public.settings;
create policy "Public can read settings"
  on public.settings
  for select
  to anon, authenticated
  using (true);

drop policy if exists "Authenticated users can insert settings" on public.settings;
create policy "Authenticated users can insert settings"
  on public.settings
  for insert
  to authenticated
  with check (auth.role() = 'authenticated');

drop policy if exists "Authenticated users can update settings" on public.settings;
create policy "Authenticated users can update settings"
  on public.settings
  for update
  to authenticated
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

drop policy if exists "Authenticated users can delete settings" on public.settings;
create policy "Authenticated users can delete settings"
  on public.settings
  for delete
  to authenticated
  using (auth.role() = 'authenticated');

-- ============================================================================
-- 5. STORAGE BUCKET (product-images) & STORAGE RLS POLICIES
-- ============================================================================
insert into storage.buckets (id, name, public)
values ('product-images', 'product-images', true)
on conflict (id) do update set public = true;

drop policy if exists "Public read access for product-images" on storage.objects;
create policy "Public read access for product-images"
  on storage.objects
  for select
  to anon, authenticated
  using (bucket_id = 'product-images');

drop policy if exists "Authenticated users can upload product-images" on storage.objects;
create policy "Authenticated users can upload product-images"
  on storage.objects
  for insert
  to authenticated
  with check (bucket_id = 'product-images' and auth.role() = 'authenticated');

drop policy if exists "Authenticated users can update product-images" on storage.objects;
create policy "Authenticated users can update product-images"
  on storage.objects
  for update
  to authenticated
  using (bucket_id = 'product-images' and auth.role() = 'authenticated')
  with check (bucket_id = 'product-images' and auth.role() = 'authenticated');

drop policy if exists "Authenticated users can delete product-images" on storage.objects;
create policy "Authenticated users can delete product-images"
  on storage.objects
  for delete
  to authenticated
  using (bucket_id = 'product-images' and auth.role() = 'authenticated');

-- ============================================================================
-- 6. SEED DATA: SETTINGS ROW
-- ============================================================================
insert into public.settings (
  id,
  whatsapp_number,
  shipping_fee,
  free_shipping_threshold,
  announcement_text
)
values (
  1,
  '923469377256',
  250,
  10000,
  'Free Nationwide Delivery Across Pakistan Over Rs. 10,000 • Welcome Privilege Code: HUE10'
)
on conflict (id) do update set
  whatsapp_number = excluded.whatsapp_number,
  shipping_fee = excluded.shipping_fee,
  free_shipping_threshold = excluded.free_shipping_threshold,
  announcement_text = excluded.announcement_text;

-- ============================================================================
-- 7. SEED DATA: 14 SAMPLE PRODUCTS (Converted from js/products.js)
--    Note: For discounted items, `price` holds the regular PKR price and
--    `sale_price` holds the promotional PKR price (`sale_price < price`).
-- ============================================================================
insert into public.products (
  slug,
  name,
  category,
  price,
  sale_price,
  description,
  colors,
  images,
  dimensions,
  in_stock,
  is_new,
  is_bestseller,
  is_featured,
  sort_order
)
values
  (
    'aurelia-tote',
    'The Aurelia Structured Tote',
    'Totes',
    17500,
    15500,
    'Our signature silhouette. The Aurelia Structured Tote balances architectural winged gussets with hand-rolled tubular handles and a belted champagne gold turn-lock. Designed to transition effortlessly from morning office meetings to evening dinners.',
    '[{"name":"Blush Pink","hex":"#F4D9D0"},{"name":"Warm Ivory","hex":"#FAF6F0"},{"name":"Deep Charcoal","hex":"#2B2B2B"},{"name":"Champagne Gold","hex":"#C9A66B"}]'::jsonb,
    '["assets/images/products/aurelia-tote-primary.svg","assets/images/products/aurelia-tote-hover.svg","assets/images/products/aurelia-tote-detail.svg","assets/images/products/aurelia-tote-lifestyle.svg"]'::jsonb,
    '36 × 28 × 15 cm (14.2" × 11" × 5.9")',
    true,
    false,
    true,
    true,
    1
  ),
  (
    'seraphine-handbag',
    'The Séraphine Arch Handbag',
    'Handbags',
    12500,
    null,
    'Inspired by classical gallery arches, The Séraphine features a sweeping dome silhouette crowned with a rigid sculptural handle and signature champagne gold medallion clasp.',
    '[{"name":"Warm Ivory","hex":"#FAF6F0"},{"name":"Blush Pink","hex":"#F4D9D0"},{"name":"Sage Mist","hex":"#C5CEBE"}]'::jsonb,
    '["assets/images/products/seraphine-handbag-primary.svg","assets/images/products/seraphine-handbag-hover.svg","assets/images/products/seraphine-handbag-detail.svg","assets/images/products/seraphine-handbag-lifestyle.svg"]'::jsonb,
    '26 × 21 × 10 cm (10.2" × 8.3" × 3.9")',
    true,
    true,
    true,
    true,
    2
  ),
  (
    'celeste-crossbody',
    'The Céleste Pleated Crossbody',
    'Crossbody',
    7800,
    null,
    'Featherlight and poetic, The Céleste is crafted from butter-soft pleated leather that catches the light at every angle — ideal for both daytime styling and festive evenings.',
    '[{"name":"Champagne Gold","hex":"#C9A66B"},{"name":"Blush Pink","hex":"#F4D9D0"},{"name":"Deep Charcoal","hex":"#2B2B2B"}]'::jsonb,
    '["assets/images/products/celeste-crossbody-primary.svg","assets/images/products/celeste-crossbody-hover.svg","assets/images/products/celeste-crossbody-detail.svg","assets/images/products/celeste-crossbody-lifestyle.svg"]'::jsonb,
    '24 × 16 × 8 cm (9.4" × 6.3" × 3.1")',
    true,
    true,
    false,
    true,
    3
  ),
  (
    'lumiere-clutch',
    'The Lumière Evening Clutch',
    'Clutches',
    6200,
    5200,
    'Tailored geometry meets festive romance. The Lumière Clutch secures with an elongated champagne gold bar that doubles as a tactile jewelry accent for weddings and formal soirées.',
    '[{"name":"Blush Pink","hex":"#F4D9D0"},{"name":"Champagne Gold","hex":"#C9A66B"},{"name":"Warm Ivory","hex":"#FAF6F0"}]'::jsonb,
    '["assets/images/products/lumiere-clutch-primary.svg","assets/images/products/lumiere-clutch-hover.svg","assets/images/products/lumiere-clutch-detail.svg","assets/images/products/lumiere-clutch-lifestyle.svg"]'::jsonb,
    '25 × 14 × 5 cm (9.8" × 5.5" × 2.0")',
    true,
    true,
    false,
    true,
    4
  ),
  (
    'valerie-backpack',
    'The Valérie City Backpack',
    'Backpacks',
    14000,
    12800,
    'Refined utility for university, work, and travel. The Valérie replaces casual nylon with clean architectural leatherwork, a rolled top handle, and convertible straps.',
    '[{"name":"Deep Charcoal","hex":"#2B2B2B"},{"name":"Warm Ivory","hex":"#FAF6F0"},{"name":"Terracotta","hex":"#C98A74"}]'::jsonb,
    '["assets/images/products/valerie-backpack-primary.svg","assets/images/products/valerie-backpack-hover.svg","assets/images/products/valerie-backpack-detail.svg","assets/images/products/valerie-backpack-lifestyle.svg"]'::jsonb,
    '33 × 27 × 14 cm (13" × 10.6" × 5.5")',
    true,
    false,
    true,
    false,
    5
  ),
  (
    'solene-tote',
    'The Solène East-West Tote',
    'Totes',
    13800,
    null,
    'With its contemporary horizontal proportion and twin belted straps, The Solène brings effortless poise to both eastern and western silhouettes.',
    '[{"name":"Warm Ivory","hex":"#FAF6F0"},{"name":"Terracotta","hex":"#C98A74"},{"name":"Blush Pink","hex":"#F4D9D0"}]'::jsonb,
    '["assets/images/products/solene-tote-primary.svg","assets/images/products/solene-tote-hover.svg","assets/images/products/solene-tote-detail.svg","assets/images/products/solene-tote-lifestyle.svg"]'::jsonb,
    '39 × 22 × 13 cm (15.3" × 8.7" × 5.1")',
    true,
    true,
    false,
    false,
    6
  ),
  (
    'camille-handbag',
    'The Camille Top-Handle Satchel',
    'Handbags',
    16000,
    14200,
    'Timeless heirloom proportions in our calming Sage Mist hue. The Camille opens to three gusseted compartments that keep every essential in serene order.',
    '[{"name":"Sage Mist","hex":"#C5CEBE"},{"name":"Blush Pink","hex":"#F4D9D0"},{"name":"Warm Ivory","hex":"#FAF6F0"},{"name":"Deep Charcoal","hex":"#2B2B2B"}]'::jsonb,
    '["assets/images/products/camille-handbag-primary.svg","assets/images/products/camille-handbag-hover.svg","assets/images/products/camille-handbag-detail.svg","assets/images/products/camille-handbag-lifestyle.svg"]'::jsonb,
    '28 × 22 × 12 cm (11" × 8.7" × 4.7")',
    true,
    false,
    true,
    true,
    7
  ),
  (
    'elodie-crossbody',
    'The Élodie Saddle Crossbody',
    'Crossbody',
    10200,
    8900,
    'A celebration of equestrian heritage softened for the modern wardrobe. The Élodie’s organic curve and warm Terracotta hue add instant richness to lawn, linen, and winter knits alike.',
    '[{"name":"Terracotta","hex":"#C98A74"},{"name":"Warm Ivory","hex":"#FAF6F0"},{"name":"Deep Charcoal","hex":"#2B2B2B"}]'::jsonb,
    '["assets/images/products/elodie-crossbody-primary.svg","assets/images/products/elodie-crossbody-hover.svg","assets/images/products/elodie-crossbody-detail.svg","assets/images/products/elodie-crossbody-lifestyle.svg"]'::jsonb,
    '23 × 19 × 7.5 cm (9.1" × 7.5" × 3.0")',
    true,
    false,
    true,
    false,
    8
  ),
  (
    'margaux-handbag',
    'The Margaux Knot Mini Handbag',
    'Handbags',
    9800,
    null,
    'Intimate and tactile, The Margaux wraps a soft crescent silhouette in our romantic Dusty Mauve tone, finished with artisan knotted cuffs.',
    '[{"name":"Dusty Mauve","hex":"#D4B5B8"},{"name":"Blush Pink","hex":"#F4D9D0"},{"name":"Champagne Gold","hex":"#C9A66B"}]'::jsonb,
    '["assets/images/products/margaux-handbag-primary.svg","assets/images/products/margaux-handbag-hover.svg","assets/images/products/margaux-handbag-detail.svg","assets/images/products/margaux-handbag-lifestyle.svg"]'::jsonb,
    '24 × 20 × 9 cm (9.4" × 7.9" × 3.5")',
    true,
    true,
    false,
    false,
    9
  ),
  (
    'vivienne-clutch',
    'The Vivienne Box Clutch',
    'Clutches',
    7500,
    6800,
    'An heirloom-worthy festive jewel. The Vivienne Box Clutch pairs a structured champagne gold frame with twin spherical kiss-lock clasps.',
    '[{"name":"Champagne Gold","hex":"#C9A66B"},{"name":"Deep Charcoal","hex":"#2B2B2B"},{"name":"Warm Ivory","hex":"#FAF6F0"}]'::jsonb,
    '["assets/images/products/vivienne-clutch-primary.svg","assets/images/products/vivienne-clutch-hover.svg","assets/images/products/vivienne-clutch-detail.svg","assets/images/products/vivienne-clutch-lifestyle.svg"]'::jsonb,
    '20 × 12 × 5.5 cm (7.9" × 4.7" × 2.2")',
    true,
    false,
    true,
    false,
    10
  ),
  (
    'noemie-backpack',
    'The Noémie Convertible Backpack',
    'Backpacks',
    10500,
    null,
    'Designed for spontaneous days, The Noémie transforms from a relaxed shoulder bag into a hands-free backpack with a single fluid pull of its straps.',
    '[{"name":"Blush Pink","hex":"#F4D9D0"},{"name":"Warm Ivory","hex":"#FAF6F0"},{"name":"Sage Mist","hex":"#C5CEBE"}]'::jsonb,
    '["assets/images/products/noemie-backpack-primary.svg","assets/images/products/noemie-backpack-hover.svg","assets/images/products/noemie-backpack-detail.svg","assets/images/products/noemie-backpack-lifestyle.svg"]'::jsonb,
    '30 × 25 × 13 cm (11.8" × 9.8" × 5.1")',
    true,
    true,
    false,
    false,
    11
  ),
  (
    'colette-crossbody',
    'The Colette Bucket Crossbody',
    'Crossbody',
    6500,
    null,
    'Clean cylindrical lines meet a whisper of interior blush suede. The Colette cinches smoothly through a sculpted champagne gold collar.',
    '[{"name":"Warm Ivory","hex":"#FAF6F0"},{"name":"Blush Pink","hex":"#F4D9D0"},{"name":"Dusty Mauve","hex":"#D4B5B8"}]'::jsonb,
    '["assets/images/products/colette-crossbody-primary.svg","assets/images/products/colette-crossbody-hover.svg","assets/images/products/colette-crossbody-detail.svg","assets/images/products/colette-crossbody-lifestyle.svg"]'::jsonb,
    '22 × 25 × 14 cm (8.7" × 9.8" × 5.5")',
    true,
    false,
    false,
    false,
    12
  ),
  (
    'delphine-tote',
    'The Delphine Atelier Work Tote',
    'Totes',
    17500,
    null,
    'Commanding yet unmistakably feminine. The Delphine features a vertical architectural front panel and a blush-lined interior with a dedicated padded laptop suite.',
    '[{"name":"Deep Charcoal","hex":"#2B2B2B"},{"name":"Warm Ivory","hex":"#FAF6F0"},{"name":"Blush Pink","hex":"#F4D9D0"}]'::jsonb,
    '["assets/images/products/delphine-tote-primary.svg","assets/images/products/delphine-tote-hover.svg","assets/images/products/delphine-tote-detail.svg","assets/images/products/delphine-tote-lifestyle.svg"]'::jsonb,
    '40 × 30 × 16 cm (15.7" × 11.8" × 6.3")',
    true,
    false,
    true,
    true,
    13
  ),
  (
    'giselle-clutch',
    'The Giselle Pearl Frame Clutch',
    'Clutches',
    5200,
    4500,
    'Romantic drapery captured in leather. The Giselle is crowned with twin mother-of-pearl cabochons set in brushed champagne gold.',
    '[{"name":"Warm Ivory","hex":"#FAF6F0"},{"name":"Blush Pink","hex":"#F4D9D0"},{"name":"Champagne Gold","hex":"#C9A66B"}]'::jsonb,
    '["assets/images/products/giselle-clutch-primary.svg","assets/images/products/giselle-clutch-hover.svg","assets/images/products/giselle-clutch-detail.svg","assets/images/products/giselle-clutch-lifestyle.svg"]'::jsonb,
    '23 × 15 × 7 cm (9.1" × 5.9" × 2.8")',
    true,
    true,
    false,
    false,
    14
  )
on conflict (slug) do update set
  name = excluded.name,
  category = excluded.category,
  price = excluded.price,
  sale_price = excluded.sale_price,
  description = excluded.description,
  colors = excluded.colors,
  images = excluded.images,
  dimensions = excluded.dimensions,
  in_stock = excluded.in_stock,
  is_new = excluded.is_new,
  is_bestseller = excluded.is_bestseller,
  is_featured = excluded.is_featured,
  sort_order = excluded.sort_order;

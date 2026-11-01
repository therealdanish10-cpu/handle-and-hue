-- ============================================================================
-- HANDLE & HUE — Moderated Customer Reviews Schema, RLS, Rate Limit & Summary
-- Run this script in the Supabase SQL Editor AFTER running supabase/schema.sql
-- ============================================================================

-- ============================================================================
-- 1. REVIEWS TABLE
--    Note: Does NOT collect email or phone number from reviewers for privacy.
-- ============================================================================
create table if not exists public.reviews (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  reviewer_name text not null check (char_length(btrim(reviewer_name)) between 2 and 60),
  reviewer_city text check (reviewer_city is null or char_length(btrim(reviewer_city)) <= 60),
  rating integer not null check (rating between 1 and 5),
  title text check (title is null or char_length(btrim(title)) <= 100),
  comment text not null check (char_length(btrim(comment)) between 10 and 1000),
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  show_on_homepage boolean not null default false,
  created_at timestamptz not null default now()
);

-- Indexes for fast product lookups and admin moderation sorting
create index if not exists idx_reviews_product_status
  on public.reviews (product_id, status);

create index if not exists idx_reviews_created_at
  on public.reviews (created_at desc);

create index if not exists idx_reviews_homepage
  on public.reviews (status, show_on_homepage);

-- ============================================================================
-- 2. DATABASE-LEVEL RATE LIMIT TRIGGER
--    Rejects a new review if 5 or more reviews were inserted in the last
--    10 minutes across the entire reviews table to blunt spam floods.
-- ============================================================================
create or replace function public.enforce_review_rate_limit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  recent_count integer;
begin
  -- Skip rate limit for authenticated admins if needed, or enforce globally on insert
  select count(*)
    into recent_count
    from public.reviews
   where created_at >= (now() - interval '10 minutes');

  if recent_count >= 5 then
    raise exception 'Rate limit exceeded: Too many reviews submitted recently. Please wait a few minutes and try again.'
      using errcode = 'P0001';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_reviews_rate_limit on public.reviews;
create trigger trg_reviews_rate_limit
before insert on public.reviews
for each row
execute function public.enforce_review_rate_limit();

-- ============================================================================
-- 3. ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================
alter table public.reviews enable row level security;

-- Policy A: Anyone (anon) can SELECT only approved reviews
drop policy if exists "Public can read approved reviews" on public.reviews;
create policy "Public can read approved reviews"
  on public.reviews
  for select
  to anon
  using (status = 'approved');

-- Policy B: Authenticated users (admins) can SELECT all reviews (pending, approved, rejected)
drop policy if exists "Authenticated users can read all reviews" on public.reviews;
create policy "Authenticated users can read all reviews"
  on public.reviews
  for select
  to authenticated
  using (auth.role() = 'authenticated');

-- Policy C: Anyone (anon or authenticated) can INSERT a review ONLY if
--           status = 'pending' and show_on_homepage = false (prevents self-approval)
drop policy if exists "Public can submit pending reviews" on public.reviews;
create policy "Public can submit pending reviews"
  on public.reviews
  for insert
  to anon, authenticated
  with check (
    status = 'pending'
    and show_on_homepage = false
    and rating between 1 and 5
    and char_length(btrim(reviewer_name)) between 2 and 60
    and (reviewer_city is null or char_length(btrim(reviewer_city)) <= 60)
    and (title is null or char_length(btrim(title)) <= 100)
    and char_length(btrim(comment)) between 10 and 1000
  );

-- Policy D: Only authenticated users (admins) can UPDATE reviews
drop policy if exists "Authenticated users can update reviews" on public.reviews;
create policy "Authenticated users can update reviews"
  on public.reviews
  for update
  to authenticated
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

-- Policy E: Only authenticated users (admins) can DELETE reviews
drop policy if exists "Authenticated users can delete reviews" on public.reviews;
create policy "Authenticated users can delete reviews"
  on public.reviews
  for delete
  to authenticated
  using (auth.role() = 'authenticated');

-- ============================================================================
-- 4. RATING SUMMARY VIEW (Readable by anon and authenticated)
--    Returns product_id, slug, average_rating (rounded to 1 decimal), and
--    review_count for products that have at least 1 approved review.
-- ============================================================================
create or replace view public.product_rating_summary
with (security_invoker = true)
as
select
  r.product_id,
  p.slug,
  round(avg(r.rating)::numeric, 1) as average_rating,
  count(r.id)::integer as review_count
from public.reviews r
join public.products p on p.id = r.product_id
where r.status = 'approved'
group by r.product_id, p.slug;

grant select on public.product_rating_summary to anon, authenticated;

-- ============================================================================
-- 5. INITIAL SEED REVIEWS (Optional — runs only if public.reviews is empty)
-- ============================================================================
do $$
declare
  v_aurelia_id uuid;
  v_seraphine_id uuid;
  v_lumiere_id uuid;
begin
  if not exists (select 1 from public.reviews limit 1) then
    select id into v_aurelia_id from public.products where slug = 'aurelia-tote' limit 1;
    select id into v_seraphine_id from public.products where slug = 'seraphine-handbag' limit 1;
    select id into v_lumiere_id from public.products where slug = 'lumiere-clutch' limit 1;

    if v_aurelia_id is not null then
      insert into public.reviews (
        product_id, reviewer_name, reviewer_city, rating, title, comment, status, show_on_homepage
      ) values (
        v_aurelia_id,
        'Ayesha Siddiqui',
        'Lahore',
        5,
        'Elevated my entire work wardrobe',
        'The Aurelia Tote in Blush Pink has completely elevated my work wardrobe. The leather feels like silk, the champagne gold turn-lock is jewelry-grade, and it fits my 14-inch laptop without losing its sculptural shape.',
        'approved',
        true
      );
    end if;

    if v_seraphine_id is not null then
      insert into public.reviews (
        product_id, reviewer_name, reviewer_city, rating, title, comment, status, show_on_homepage
      ) values (
        v_seraphine_id,
        'Zoya Khan',
        'Karachi',
        5,
        'Feels like opening a treasure',
        'Unboxing my Séraphine Arch Handbag felt like opening a treasure from a private boutique. Warm Ivory pairs effortlessly with both my formal eastern wear and everyday tailored outfits.',
        'approved',
        true
      );
    end if;

    if v_lumiere_id is not null then
      insert into public.reviews (
        product_id, reviewer_name, reviewer_city, rating, title, comment, status, show_on_homepage
      ) values (
        v_lumiere_id,
        'Mahnoor Tariq',
        'Islamabad',
        5,
        'Compliments all evening',
        'I carried The Lumière Clutch to a family wedding and received compliments all evening. Delivery to Islamabad took just 3 days with Cash on Delivery and gorgeous dust-bag packaging.',
        'approved',
        true
      );
    end if;
  end if;
end;
$$;

-- ============================================================================
-- 7. MARK REVIEWS SCHEMA AS INITIALIZED IN PUBLIC.SETTINGS
--    Allows the static frontend to detect whether `supabase/reviews.sql`
--    has been executed without triggering HTTP 404 requests beforehand.
-- ============================================================================
alter table if exists public.settings
  add column if not exists reviews_enabled boolean not null default true;

update public.settings
set reviews_enabled = true
where id = 1;


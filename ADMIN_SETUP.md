# Handle & Hue — Supabase Admin & Database Setup Guide

Follow these five steps to activate your Supabase database, customer reviews moderation system, storage bucket, Row Level Security (RLS), and private administrator console.

---

## 1. Run `supabase/schema.sql` in the Supabase SQL Editor

1. Open your Supabase project dashboard (`https://izisiezivwpwswrxcvnd.supabase.co`).
2. In the left sidebar, click **SQL Editor** &rarr; **New query**.
3. Copy the entire contents of [`supabase/schema.sql`](supabase/schema.sql) and paste it into the SQL Editor.
4. Click **Run** (or press `Ctrl + Enter` / `Cmd + Enter`).
   - This creates the `public.products` and `public.settings` tables, creates the `product-images` public storage bucket, enables **Row Level Security (RLS)** so only authenticated admins can create/edit/delete data, and seeds the 14 Handle & Hue products plus your store settings (`whatsapp_number = 923469377256`, `shipping_fee = 250`, `free_shipping_threshold = 10000`).

---

## 2. Run `supabase/reviews.sql` in the Supabase SQL Editor

1. In the Supabase **SQL Editor**, click **New query**.
2. Copy the entire contents of [`supabase/reviews.sql`](supabase/reviews.sql) and paste it into the SQL Editor.
3. Click **Run** (or press `Ctrl + Enter` / `Cmd + Enter`).
   - This creates the `public.reviews` table (referencing `public.products`), the `(product_id, status)` index, the `public.product_rating_summary` view, the database-level spam rate-limit trigger (`enforce_review_rate_limit` — maximum 5 submissions per 10 minutes across the table), and strict **Row Level Security (RLS)** policies (`anon` can only `SELECT` approved reviews and `INSERT` pending reviews with `show_on_homepage = false`; only `authenticated` admins can read all rows, approve/reject, toggle homepage display, or delete reviews).

---

## 3. Create Your Admin User in Supabase Auth

1. In the Supabase dashboard left sidebar, go to **Authentication** &rarr; **Users**.
2. Click **Add user** &rarr; **Create new user**.
3. Enter your administrator **Email** and a strong **Password**.
4. Ensure **Auto Confirm User** is checked, then click **Create user**.

---

## 4. Disable Public Sign-Ups

To ensure no outside visitors can register an account and gain `authenticated` write permissions:

1. In the Supabase dashboard left sidebar, go to **Authentication** &rarr; **Sign In / Providers** (or **Authentication** &rarr; **Settings**).
2. Under **User Signups**, turn **OFF** **Allow new users to sign up**.
3. Click **Save**.

---

## 5. Deploy to Vercel & Use the Admin Panel

1. Push the repository to GitHub/GitLab or deploy directly with the Vercel CLI (`vercel --prod`). No build step or server runtime is required; Vercel serves the static files directly.
2. Visit `/admin/` on your deployed domain (or `http://localhost:8080/admin/` locally) and sign in with the administrator email and password created in Step 3.
3. Use the **Reviews** tab in `/admin/` (which displays a badge with the count of pending reviews) to **Approve**, **Reject**, **Delete**, or toggle **Show on Homepage** for customer reviews.
4. If `supabase/schema.sql` or `supabase/reviews.sql` has not been run yet, the public storefront and admin panel fail gracefully without console errors or broken layouts.

# Handle & Hue — Supabase Admin & Database Setup Guide

Follow these four steps to activate your Supabase database, storage bucket, Row Level Security (RLS), and private administrator console.

---

## 1. Run `supabase/schema.sql` in the Supabase SQL Editor

1. Open your Supabase project dashboard (`https://izisiezivwpwswrxcvnd.supabase.co`).
2. In the left sidebar, click **SQL Editor** &rarr; **New query**.
3. Copy the entire contents of [`supabase/schema.sql`](supabase/schema.sql) and paste it into the SQL Editor.
4. Click **Run** (or press `Ctrl + Enter` / `Cmd + Enter`).
   - This creates the `public.products` and `public.settings` tables, creates the `product-images` public storage bucket, enables **Row Level Security (RLS)** so only authenticated admins can create/edit/delete data, and seeds the 14 Handle & Hue products plus your store settings (`whatsapp_number = 923469377256`, `shipping_fee = 250`, `free_shipping_threshold = 10000`).

---

## 2. Create Your Admin User in Supabase Auth

1. In the Supabase dashboard left sidebar, go to **Authentication** &rarr; **Users**.
2. Click **Add user** &rarr; **Create new user**.
3. Enter your administrator **Email** and a strong **Password**.
4. Ensure **Auto Confirm User** is checked, then click **Create user**.

---

## 3. Disable Public Sign-Ups

To ensure no outside visitors can register an account and gain `authenticated` write permissions:

1. In the Supabase dashboard left sidebar, go to **Authentication** &rarr; **Sign In / Providers** (or **Authentication** &rarr; **Settings**).
2. Under **User Signups**, turn **OFF** **Allow new users to sign up**.
3. Click **Save**.

---

## 4. Deploy to Vercel & Use the Admin Panel

1. Push the repository to GitHub/GitLab or deploy directly with the Vercel CLI (`vercel --prod`). No build step or server runtime is required; Vercel serves the static files directly.
2. Visit `/admin/` on your deployed domain (or `http://localhost:8080/admin/` locally) and sign in with the administrator email and password created in Step 2.
3. If the database tables have not been created yet, the public storefront automatically falls back to the static catalog in `js/products.js` so the customer experience never breaks.

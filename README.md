# open: notes & to-dos

A no-login notes and to-do app. Type, press Enter, and it's saved to Supabase.
Changes sync live to every open tab and device through Supabase Realtime.

**Stack:** React 19 + Vite · plain CSS (design tokens, glass UI, dark/light) · Supabase (Postgres + Realtime) · Netlify

## Features

- **Quick add.** Pick To-Do or Note, type, press Enter. Notes take an optional body (Ctrl+Enter saves).
- **Three views.** *All* is one chronological stream. *To-Do* shows a progress bar and puts open tasks first. *Notes* is a masonry board.
- **Organise.** Live search across titles and content. Filter by status, priority and category. Pin items to the top. Six colour tags.
- **Edit in place.** Double-click an item, or use the pencil. Enter saves, Esc cancels.
- **Undo delete.** Deleting shows a toast with Undo. Undo restores the same item with its original date.
- **Realtime.** The header pill shows *Live* when the realtime connection is up. Changes from other devices appear without a refresh.
- **Keyboard.** <kbd>n</kbd> focuses quick add and <kbd>/</kbd> focuses search.

## 1. Create the database (one time)

Open the Supabase SQL editor for the project, paste
[`supabase/migrations/001_create_items.sql`](supabase/migrations/001_create_items.sql), and press **Run**.
You can run the script more than once safely. It does the following:

- creates the `items` table (shared by notes and to-dos), an `updated_at` trigger and indexes
- enables Row Level Security with a public read/write policy (the app has no login)
- adds the table to the `supabase_realtime` publication

If the table is missing, the app shows a setup screen with **Copy SQL** and **Open SQL editor** buttons.

## 2. Run locally

```bash
npm install
cp .env.example .env.local   # then fill in your Supabase URL and publishable key
npm run dev
```

## 3. Deploy to Netlify

Connect this repo to a new Netlify site. `netlify.toml` already sets the build command (`npm run build`),
the publish directory (`dist`), Node 22, the SPA redirect and the Supabase client variables.
No dashboard configuration is needed.

## Security note

The app has no accounts, so the RLS policy lets **anyone with the site URL read, edit and delete every item**.
Don't store anything private in it. To lock it down, add Supabase Auth and replace the public policy with one
scoped to `auth.uid()`.

## Project structure

```
src/
  lib/supabase.js        Supabase client, CRUD helpers, realtime subscription
  hooks/useItems.js      data hook: initial load, realtime merge, optimistic writes
  components/            Header, QuickAddBar, FilterBar, ItemCard, ItemOptions, Toasts, SetupScreen
  App.jsx                views, filtering, sorting, shortcuts
  index.css              design tokens and all styling
supabase/migrations/     database schema
netlify.toml             build + deploy config
```

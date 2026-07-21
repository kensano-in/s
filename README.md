# Verlyn — Next-Gen Social Platform

<p align="center">
  <img src="https://img.shields.io/badge/Next.js-15-black?style=for-the-badge&logo=next.js" />
  <img src="https://img.shields.io/badge/TypeScript-5-3178C6?style=for-the-badge&logo=typescript" />
  <img src="https://img.shields.io/badge/Tailwind_CSS-3-38BDF8?style=for-the-badge&logo=tailwind-css" />
  <img src="https://img.shields.io/badge/Zustand-5-orange?style=for-the-badge" />
  <img src="https://img.shields.io/badge/Supabase-PostgreSQL-3ECF8E?style=for-the-badge&logo=supabase" />
</p>

> **Verlyn** is a unified social ecosystem that merges the best of Instagram, Telegram, X, Discord, and Reddit into a single sleek, secure, and real-time platform. Built on *Kinetic Minimalism* — every pixel intentional, every interaction deliberate.

---

## ✨ Features

| Feature | Description |
|---|---|
| 🏠 **Feed** | Algorithmic & following feed with story reels, post cards, like/save/share |
| 💬 **Messages** | Real-time DMs with permission gating, typing indicators, audio feedback |
| 🏘️ **Communities** | Reddit-style spaces with boost levels, tags, karma gates |
| 🔍 **Explore** | Live search across people + hashtag discovery |
| 📈 **Trending** | Engagement-ranked posts (last 48h) with real hashtag extraction |
| 🎮 **Fun Zone** | Mini-game hub with live player counts and categories |
| 👤 **Profile** | Karma tracking, follower stats, DB-verified private post gating |
| ⚙️ **Settings** | 4 premium themes, privacy controls, notification toggles, session info |

---

## 🎨 Design System — 4 Themes

| Theme | Background | Accent |
|---|---|---|
| **Midnight** (default) | `#0D0D1A` | `#6C63FF` Violet |
| **AMOLED** | `#000000` | `#6C63FF` Violet |
| **Frost** | `#0A0F1E` | `#4A90E2` Blue |
| **Light** | `#F5F5FF` | `#6C63FF` Violet |

All themes switch at runtime via `data-theme` attribute — zero page reload.

---

## 🚀 Getting Started

### Prerequisites
- **Node.js 20+** → [nodejs.org](https://nodejs.org)
- **Supabase project** → [supabase.com](https://supabase.com)

### Run Locally

```bash
# 1. Clone the repo
git clone https://github.com/kensano-in/s.git
cd s

# 2. Install dependencies
npm install

# 3. Copy env file and fill in your Supabase keys
cp apps/web/.env.example apps/web/.env.local

# 4. Start dev server
npm run dev
```

Open **http://localhost:3000** 🎉

### Required Environment Variables

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

---

## 🗂️ Project Structure

```
apps/web/src/
├── app/
│   ├── globals.css        ← Full design system (4 themes, CSS custom properties)
│   ├── login/             ← Auth pages (Supabase Auth)
│   └── (main)/            ← Authenticated app shell
│       ├── feed/          ← 🏠 Feed + infinite scroll
│       ├── messages/      ← 💬 Real-time DMs
│       ├── communities/   ← 🏘️ Communities
│       ├── explore/       ← 🔍 Explore + live search
│       ├── trending/      ← 📈 Trending
│       ├── funzone/       ← 🎮 Fun Zone
│       ├── profile/       ← 👤 Own profile
│       ├── profile/[username]/ ← 👤 Public profiles
│       ├── notifications/ ← 🔔 Notification center
│       └── settings/      ← ⚙️ Settings
├── components/
│   ├── layout/            ← Sidebar, Topbar, RightPanel, NotifPanel, AuthProvider
│   └── features/          ← PostCard, CreatePost, CommandPalette, etc.
└── lib/
    ├── types.ts           ← All TypeScript interfaces
    ├── store.ts           ← Zustand global state (persisted)
    └── supabase/          ← Client + server Supabase helpers
```

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| **Framework** | Next.js 15 (App Router) |
| **Language** | TypeScript 5 |
| **Styling** | Tailwind CSS v3 + CSS Custom Properties |
| **State** | Zustand 5 with persist middleware |
| **Animations** | Framer Motion |
| **Icons** | Lucide React |
| **Database** | Supabase (PostgreSQL) |
| **Auth** | Supabase Auth (email/password + OAuth) |
| **Real-time** | Supabase Realtime (WebSocket channels) |
| **Storage** | Supabase Storage (media uploads) |

---

## 🗄️ Database RPCs (required)

Run these in your Supabase SQL Editor:

```sql
-- Atomic comment count increment
CREATE OR REPLACE FUNCTION increment_comment_count(p_post_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE posts SET comment_count = comment_count + 1 WHERE id = p_post_id;
END;
$$ LANGUAGE plpgsql;

-- Atomic follow/unfollow with bilateral counter updates
CREATE OR REPLACE FUNCTION toggle_follow(
  p_follower UUID, p_following UUID, p_is_following BOOLEAN
) RETURNS VOID AS $$
BEGIN
  IF p_is_following THEN
    INSERT INTO follows (follower_id, following_id) VALUES (p_follower, p_following) ON CONFLICT DO NOTHING;
    UPDATE users SET follower_count = follower_count + 1 WHERE id = p_following;
    UPDATE users SET following_count = following_count + 1 WHERE id = p_follower;
  ELSE
    DELETE FROM follows WHERE follower_id = p_follower AND following_id = p_following;
    UPDATE users SET follower_count = GREATEST(0, follower_count - 1) WHERE id = p_following;
    UPDATE users SET following_count = GREATEST(0, following_count - 1) WHERE id = p_follower;
  END IF;
END;
$$ LANGUAGE plpgsql;
```

---

## 📬 Contact / Support

| Platform | Handle |
|---|---|
| Instagram | [@shinichiro.2](https://instagram.com/shinichiro.2) |
| Telegram | [@shinichirofr](https://t.me/shinichirofr) |
| X (Twitter) | [@Shinichirofr](https://x.com/Shinichirofr) |
| WhatsApp | [+1 709 700 7361](https://wa.me/17097007361) |
| Email | [support.verlyn@proton.me](mailto:support.verlyn@proton.me) |

---

## 📄 License

MIT © Verlyn (verlyn.in)

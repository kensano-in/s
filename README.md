# Verlyn — Next-Gen Social Platform

<p align="center">
  <img src="https://img.shields.io/badge/Next.js-15-black?style=for-the-badge&logo=next.js" />
  <img src="https://img.shields.io/badge/TypeScript-5-3178C6?style=for-the-badge&logo=typescript" />
  <img src="https://img.shields.io/badge/Tailwind_CSS-4-38BDF8?style=for-the-badge&logo=tailwind-css" />
  <img src="https://img.shields.io/badge/Zustand-5-orange?style=for-the-badge" />
  <img src="https://img.shields.io/badge/Prisma-PostgreSQL-2D3748?style=for-the-badge&logo=prisma" />
</p>

> **Verlyn** is a unified social ecosystem that merges the best of Instagram, Telegram, X, Discord, and Reddit into a single sleek, secure, and real-time platform. Built on *Kinetic Minimalism* — every pixel intentional, every interaction deliberate.

---

## ✨ Features

| Feature | Description |
|---|---|
| 🏠 **Feed** | Algorithmic & Following feed with story reels, post cards, like/save/share |
| 💬 **Messages** | E2EE encrypted DMs & group chats (Signal Protocol ready) |
| 🏘️ **Communities** | Reddit-style spaces with boost levels, tags, karma gates |
| 🔍 **Explore** | Global live search across people, posts, and communities |
| 📈 **Trending** | Real-time hashtag rankings with growth metrics |
| 🎮 **Fun Zone** | Mini-game hub with live player counts and categories |
| 👤 **Profile** | Karma tracking, follower stats, tabbed content grid |
| ⚙️ **Settings** | 4 premium themes, E2EE toggles, 2FA, notification control |

---

## 🎨 Design System — 4 Themes

| Theme | Background | Accent |
|---|---|---|
| **Midnight** (default) | `#0D0D1A` | `#6C63FF` Violet |
| **OLED Dark** | `#000000` | `#6C63FF` Violet |
| **Corporate** | `#0A0F1E` | `#4A90E2` Blue |
| **Minimal Light** | `#F5F5FF` | `#6C63FF` Violet |

All themes switch at runtime via `data-theme` — zero page reload.

---

## 🚀 Getting Started

### Prerequisites
- **Node.js 20+** → [nodejs.org](https://nodejs.org)
- **PostgreSQL** (for Prisma/DB — optional for frontend dev)

### Run Locally

```bash
# 1. Clone the repo
git clone https://github.com/kensano-in/s.git
cd s/verlyn/verlyn

# 2. Install dependencies
npm install

# 3. Copy env file and fill in your keys
cp .env.example .env.local

# 4. Start dev server
npm run dev
```

Open **http://localhost:3000** 🎉

---

## 🗂️ Project Structure

```
verlyn/verlyn/
├── prisma/schema.prisma       ← PostgreSQL schema (15 models)
└── src/
    ├── app/
    │   ├── globals.css        ← Full design system (4 themes)
    │   └── (main)/            ← Authenticated app shell
    │       ├── page.tsx       ← 🏠 Feed
    │       ├── messages/      ← 💬 E2EE Chat
    │       ├── communities/   ← 🏘️ Communities
    │       ├── explore/       ← 🔍 Explore
    │       ├── trending/      ← 📈 Trending
    │       ├── funzone/       ← 🎮 Fun Zone
    │       ├── profile/       ← 👤 Profile
    │       └── settings/      ← ⚙️ Settings
    ├── components/
    │   ├── layout/            ← Sidebar, Topbar, RightPanel, NotifPanel
    │   └── features/feed/     ← StoryReel, PostCard, CreatePost
    └── lib/
        ├── types.ts           ← All TypeScript interfaces
        ├── mockData.ts        ← Prototype data
        └── store.ts           ← Zustand global state
```

---

## 🛠️ Tech Stack

- **Frontend:** Next.js 15 (App Router), TypeScript, Tailwind CSS v4
- **State:** Zustand 5 with persist middleware
- **Animations:** Framer Motion
- **Icons:** Lucide React
- **Database:** PostgreSQL via Prisma ORM
- **Auth:** NextAuth (Phase 2)
- **Real-time:** WebSocket + Redis Pub/Sub (Phase 2)
- **E2EE:** Signal Protocol / libsignal-ts (Phase 2)

---

## 📬 Contact / Support

| Platform | Handle |
|---|---|
| Instagram | [@shinichiro.2](https://instagram.com/shinichiro.2) |
| Telegram | [@shinichirofr](https://t.me/shinichirofr) |
| X (Twitter) | [@Shinichirofr](https://x.com/Shinichirofr) |
| WhatsApp | [+1 709 700 7361](https://wa.me/17097007361) |
| Email | [shinichiro.in@proton.me](mailto:shinichiro.in@proton.me) |

---

## 📄 License

MIT © Verlyn (verlyn.in)

# Verlyn Chat Rebuild: Implementation Plan

## Goal
Transform the Verlyn messaging platform from a prototype into a high-performance, mobile-first, futuristic "Obsidian" application.

## 🎨 Design Philosophy: Futuristic Obsidian
- **Color Palette**: `#050505` (Background), `#6366f1` (Indigo Neon), `#a855f7` (Violet).
- **Aesthetic**: Glassmorphism, kinetic minimalism, and neon micro-animations.
- **Layout**: strictly mobile-first with hidden sidebars on small screens.

## 🛠️ Component Strategy
- **ChatHeader**: Functional 3-dot menu with presence indicators.
- **Message List**: Grouped by date, asymmetric bubbles, seen status ticks.
- **Chat Input**: Floating glass container with Emoji, File, Camera, and Voice support.

## 📡 Real-time & Persistence
- **Supabase Realtime**: Postgres change listeners for message status.
- **Supabase Presence**: Live online/away tracking.
- **Optimistic UI**: Instant local updates with background sync.

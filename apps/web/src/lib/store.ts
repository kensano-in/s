import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Theme, Notification, User } from '@/lib/types';
import { MOCK_NOTIFICATIONS, MOCK_CONVERSATIONS } from '@/lib/mockData';
import { dispatchProfileSync } from '@/lib/sync-engine';

interface AppState {
  // Theme
  theme: Theme;
  setTheme: (theme: Theme) => void;

  // Sidebar
  sidebarCollapsed: boolean;
  toggleSidebar: () => void;

  // Active page
  activePage: string;
  setActivePage: (page: string) => void;

  // Notifications
  notifications: Notification[];
  unreadNotifCount: number;
  markNotifRead: (id: string) => void;
  markAllNotifsRead: () => void;

  // Conversations
  conversations: any[];
  activeConversationId: string | null;
  setActiveConversation: (id: string | null) => void;
  messages: Record<string, any[]>;

  // Real-time (mock)
  onlineUsers: string[];

  // Search
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  isSearchOpen: boolean;
  setSearchOpen: (v: boolean) => void;

  // Profile Engine — Local-First Sync
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  currentUser: any | null;
  syncStatus: 'idle' | 'syncing' | 'error';
  setSyncStatus: (s: 'idle' | 'syncing' | 'error') => void;
  updateProfile: (updates: Partial<any>) => void;

  // Visual Sovereignty Theme & Wallpaper Engine (Phase 6)
  uiThemeVariant: 'midnight' | 'amoled' | 'frost' | 'light';
  setUIThemeVariant: (variant: 'midnight' | 'amoled' | 'frost' | 'light') => void;
  chatWallpaperUrl: string | null;
  setChatWallpaperUrl: (url: string | null) => void;
  chatWallpaperBlur: number; // 0 to 20px
  setChatWallpaperBlur: (val: number) => void;
  chatWallpaperDim: number;  // 0.0 to 1.0
  setChatWallpaperDim: (val: number) => void;
  customThemeManifest: Record<string, string> | null;
  setCustomThemeManifest: (manifest: Record<string, string> | null) => void;

  // Notification panel
  isNotifPanelOpen: boolean;
  setNotifPanelOpen: (v: boolean) => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      theme: 'midnight',
      setTheme: (theme) => {
        set({ theme });
        // Apply theme attribute to document
        if (typeof document !== 'undefined') {
          document.documentElement.setAttribute('data-theme', theme);
          if (theme === 'light') {
            document.documentElement.classList.remove('dark');
          } else {
            document.documentElement.classList.add('dark');
          }
        }
      },

      sidebarCollapsed: false,
      toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),

      activePage: 'feed',
      setActivePage: (page) => set({ activePage: page }),

      notifications: MOCK_NOTIFICATIONS,
      unreadNotifCount: MOCK_NOTIFICATIONS.filter((n) => !n.isRead).length,
      markNotifRead: (id) => set((s) => {
        const updatedNotifications = s.notifications.map((n) => n.id === id ? { ...n, isRead: true } : n);
        return {
          notifications: updatedNotifications,
          unreadNotifCount: updatedNotifications.filter((n) => !n.isRead).length,
        };
      }),
      markAllNotifsRead: () => set((s) => ({
        notifications: s.notifications.map((n) => ({ ...n, isRead: true })),
        unreadNotifCount: 0,
      })),

      conversations: MOCK_CONVERSATIONS,
      activeConversationId: null,
      setActiveConversation: (id) => set({ activeConversationId: id }),
      messages: {},

      onlineUsers: ['u1', 'u3', 'u5', 'u_current'],

      searchQuery: '',
      setSearchQuery: (q) => set({ searchQuery: q }),
      isSearchOpen: false,
      setSearchOpen: (v) => set({ isSearchOpen: v }),

      isNotifPanelOpen: false,
      setNotifPanelOpen: (v) => set({ isNotifPanelOpen: v }),

      // --- Profile Engine: Local-First Sync ---
      currentUser: null,
      syncStatus: 'idle',
      setSyncStatus: (s) => set({ syncStatus: s }),
      updateProfile: (updates) => set((state) => {
        // 1. Instant optimistic update (0ms perceived latency)
        const newUser = { ...state.currentUser, ...updates };
        // 2. Silent background DB sync — never blocks UI
        if (state.currentUser?.id) {
          dispatchProfileSync(state.currentUser.id, {
            displayName: updates.displayName,
            username: updates.username,
            bio: updates.bio,
            avatarUrl: updates.avatar,
          });
        }
        return { currentUser: newUser };
      }),

      // --- Visual Sovereignty Engine ---
      uiThemeVariant: 'midnight',
      setUIThemeVariant: (variant) => set({ uiThemeVariant: variant }),
      chatWallpaperUrl: null,
      setChatWallpaperUrl: (url) => set({ chatWallpaperUrl: url }),
      chatWallpaperBlur: 4,
      setChatWallpaperBlur: (val) => set({ chatWallpaperBlur: val }),
      chatWallpaperDim: 0.4,
      setChatWallpaperDim: (val) => set({ chatWallpaperDim: val }),
      customThemeManifest: null,
      setCustomThemeManifest: (manifest) => set({ customThemeManifest: manifest }),

    }),
    {
      name: 'verlyn-app-state',
      partialize: (state) => ({ 
        theme: state.theme, 
        sidebarCollapsed: state.sidebarCollapsed,
        currentUser: state.currentUser,
        uiThemeVariant: state.uiThemeVariant,
        chatWallpaperUrl: state.chatWallpaperUrl,
        chatWallpaperBlur: state.chatWallpaperBlur,
        chatWallpaperDim: state.chatWallpaperDim
      }),
    }
  )
);

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Theme, Notification } from '@/lib/types';
import { MOCK_NOTIFICATIONS, MOCK_CONVERSATIONS } from '@/lib/mockData';

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
    }),
    {
      name: 'verlyn-app-state',
      partialize: (state) => ({ theme: state.theme, sidebarCollapsed: state.sidebarCollapsed }),
    }
  )
);

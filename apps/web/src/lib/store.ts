import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Theme, Notification, User, Conversation } from '@/lib/types';
import { dispatchProfileSync } from '@/lib/sync-engine';

interface AppState {
  // Theme
  theme: Theme;
  setTheme: (theme: Theme) => void;

  // Sidebar
  sidebarCollapsed: boolean;
  toggleSidebar: () => void;
  isMobileDrawerOpen: boolean;
  setMobileDrawerOpen: (v: boolean) => void;

  // Active page
  activePage: string;
  setActivePage: (page: string) => void;

  // Overlay management (prevents two overlays open at once)
  activeOverlay: string | null;
  setOverlay: (id: string | null) => void;

  // Notifications
  notifications: Notification[];
  unreadNotifCount: number;
  markNotifRead: (id: string) => void;
  markAllNotifsRead: () => void;

  // Conversations
  conversations: Conversation[];
  activeConversationId: string | null;
  setActiveConversation: (id: string | null) => void;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  messages: Record<string, any[]>;

  // Real-time (mock)
  onlineUsers: string[];

  // Search
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  isSearchOpen: boolean;
  setSearchOpen: (v: boolean) => void;

  // Profile Engine — Local-First Sync
  currentUser: User | null;
  syncStatus: 'idle' | 'syncing' | 'error';
  setSyncStatus: (s: 'idle' | 'syncing' | 'error') => void;
  updateProfile: (updates: Partial<User>) => void;

  // Hydration tracking — prevents settings flicker on SSR rehydration
  _hasHydrated: boolean;

  // Visual Sovereignty Theme & Wallpaper Engine
  uiThemeVariant: 'midnight' | 'amoled' | 'frost' | 'light';
  setUIThemeVariant: (variant: 'midnight' | 'amoled' | 'frost' | 'light') => void;
  chatWallpaperUrl: string | null;
  setChatWallpaperUrl: (url: string | null) => void;
  chatWallpaperBlur: number;
  setChatWallpaperBlur: (val: number) => void;
  chatWallpaperDim: number;
  setChatWallpaperDim: (val: number) => void;
  customThemeManifest: Record<string, string> | null;
  setCustomThemeManifest: (manifest: Record<string, string> | null) => void;

  // Notification panel
  isNotifPanelOpen: boolean;
  setNotifPanelOpen: (v: boolean) => void;

  // ─── Persistent User Preferences ────────────────────────────────────────
  likedPosts: string[];        // post IDs
  following: string[];         // user IDs
  savedPosts: string[];        // post IDs
  toggleLike: (postId: string) => void;
  toggleFollow: (userId: string) => void;
  toggleSave: (postId: string) => void;
  isLiked: (postId: string) => boolean;
  isFollowing: (userId: string) => boolean;
  isSaved: (postId: string) => boolean;

  // ─── Settings Persistence ────────────────────────────────────────────────
  settingE2EE: boolean;
  settingTwoFA: boolean;
  settingPushNotifs: boolean;
  settingEmailDigest: boolean;
  settingPrivateAccount: boolean;
  setSettingE2EE: (v: boolean) => void;
  setSettingTwoFA: (v: boolean) => void;
  setSettingPushNotifs: (v: boolean) => void;
  setSettingEmailDigest: (v: boolean) => void;
  setSettingPrivateAccount: (v: boolean) => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      theme: 'midnight',
      setTheme: (theme) => {
        set({ theme });
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
      isMobileDrawerOpen: false,
      setMobileDrawerOpen: (v) => set({ isMobileDrawerOpen: v }),

      activePage: 'feed',
      setActivePage: (page) => set({ activePage: page }),

      activeOverlay: null,
      // FIX 5: Always close notification panel when any overlay opens
      setOverlay: (id) => set({ activeOverlay: id, isNotifPanelOpen: false }),

      notifications: [],
      unreadNotifCount: 0,
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

      conversations: [],
      activeConversationId: null,
      setActiveConversation: (id) => set({ activeConversationId: id }),
      messages: {},

      onlineUsers: ['u1', 'u3', 'u5', 'u_current'],

      searchQuery: '',
      setSearchQuery: (q) => set({ searchQuery: q }),
      isSearchOpen: false,
      setSearchOpen: (v) => set({ isSearchOpen: v }),

      isNotifPanelOpen: false,
      setNotifPanelOpen: (v) => set({ isNotifPanelOpen: v, activeOverlay: v ? 'sidebar:notifications' : null }),

      currentUser: null,
      syncStatus: 'idle',
      setSyncStatus: (s) => set({ syncStatus: s }),
      updateProfile: (updates) => set((state) => {
        const newUser = { ...state.currentUser, ...updates } as User;
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

      // ─── User Preferences (Persisted) ─────────────────────────────────────
      likedPosts: [],
      following: [],
      savedPosts: [],
      toggleLike: (postId) => set((s) => ({
        likedPosts: s.likedPosts.includes(postId)
          ? s.likedPosts.filter((id) => id !== postId)
          : [...s.likedPosts, postId],
      })),
      toggleFollow: (userId) => {
        const state = get();
        const isFollowingNow = state.following.includes(userId);
        
        set((s) => {
          const nextFollowing = isFollowingNow
            ? s.following.filter((id) => id !== userId)
            : [...s.following, userId];
            
          let nextUser = s.currentUser;
          if (s.currentUser) {
            nextUser = {
              ...s.currentUser,
              followingCount: Math.max(0, (s.currentUser.followingCount || 0) + (isFollowingNow ? -1 : 1))
            } as User;
          }

          return {
            following: nextFollowing,
            currentUser: nextUser,
          };
        });

        if (state.currentUser?.id) {
          // Send to global window queue to evade strict Webpack action boundary
          if (typeof window !== 'undefined') {
             (window as any)._verlynFollowQueue = (window as any)._verlynFollowQueue || [];
             (window as any)._verlynFollowQueue.push({ userId, state: !isFollowingNow });
             // Fire event
             window.dispatchEvent(new CustomEvent('verlyn-follow-sync'));
          }
        }
      },
      toggleSave: (postId) => set((s) => ({
        savedPosts: s.savedPosts.includes(postId)
          ? s.savedPosts.filter((id) => id !== postId)
          : [...s.savedPosts, postId],
      })),
      isLiked: (postId) => get().likedPosts.includes(postId),
      isFollowing: (userId) => get().following.includes(userId),
      isSaved: (postId) => get().savedPosts.includes(postId),

      // ─── Settings (Persisted) ──────────────────────────────────────────────
      settingE2EE: true,
      settingTwoFA: false,
      settingPushNotifs: true,
      settingEmailDigest: false,
      settingPrivateAccount: false,
      setSettingE2EE: (v: boolean) => set({ settingE2EE: v }),
      setSettingTwoFA: (v: boolean) => set({ settingTwoFA: v }),
      setSettingPushNotifs: (v: boolean) => set({ settingPushNotifs: v }),
      setSettingEmailDigest: (v: boolean) => set({ settingEmailDigest: v }),
      setSettingPrivateAccount: (v: boolean) => set({ settingPrivateAccount: v }),
      _hasHydrated: false,
    }),
    {
      name: 'verlyn-app-state',
      // FIX 4: Track when localStorage rehydration completes to prevent settings flicker
      onRehydrateStorage: () => (state) => { if (state) state._hasHydrated = true; },
      partialize: (state) => ({
        theme: state.theme,
        sidebarCollapsed: state.sidebarCollapsed,
        currentUser: state.currentUser,
        uiThemeVariant: state.uiThemeVariant,
        chatWallpaperUrl: state.chatWallpaperUrl,
        chatWallpaperBlur: state.chatWallpaperBlur,
        chatWallpaperDim: state.chatWallpaperDim,
        likedPosts: state.likedPosts,
        following: state.following,
        savedPosts: state.savedPosts,
        settingE2EE: state.settingE2EE,
        settingTwoFA: state.settingTwoFA,
        settingPushNotifs: state.settingPushNotifs,
        settingEmailDigest: state.settingEmailDigest,
        settingPrivateAccount: state.settingPrivateAccount,
      }),
    }
  )
);

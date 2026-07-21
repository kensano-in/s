import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { toggleFollowDB } from '@/app/(main)/profile/actions';
import type { DBConversation } from '@/components/Chat/ConversationItem';
import type { ChatMessage } from '@/components/Chat/MessageItem';
import type { User, Theme, Notification as VerlynNotification } from '@/lib/types';
import { dispatchProfileSync } from '@/lib/sync-engine';
import { getServerTime } from '@/lib/timeSync';

function logStoreDebug(msg: string) {
  if (process.env.NODE_ENV !== 'production') {
    console.debug(`[Store] ${msg}`);
  }
}

interface AppState {
  // Theme
  theme: Theme;
  setTheme: (theme: Theme) => void;

  // ─── Breakpoint System ──────────────────────────────────────────────────
  // Single source of truth for responsive layout decisions.
  // Updated by useBreakpoint hook via ResizeObserver — never guessed inline.
  breakpoint: 'mobile' | 'tablet' | 'desktop';
  setBreakpoint: (bp: 'mobile' | 'tablet' | 'desktop') => void;

  // Sidebar
  sidebarCollapsed: boolean;
  toggleSidebar: () => void;
  isMobileDrawerOpen: boolean;
  setMobileDrawerOpen: (v: boolean) => void;

  // Active page
  activePage: string;
  setActivePage: (page: string) => void;

  // Fullscreen post creation entry experience
  isPostCreationOpen: boolean;
  setPostCreationOpen: (open: boolean) => void;

  activePostUpload: {
    progress: number;
    status: 'idle' | 'uploading' | 'verifying' | 'success' | 'error';
    errorMsg: string | null;
    mediaCount: number;
    caption: string;
    thumbnailUrl: string;
  } | null;
  setActivePostUpload: (upload: AppState['activePostUpload']) => void;

  uploadDraft: {
    selectedMedia: any[];
    mediaEdits: Record<string, any>;
    selectedTrackId: string | null;
    selectedSpotifyTrack?: any | null;
    musicVolume: number;
    musicTrimStart: number;
    musicTrimEnd: number;
    musicFadeIn: number;
    musicFadeOut: number;
    caption: string;
    taggedUsers: string[];
    selectedLocation: string | null;
    audience: string;
    isScheduled: boolean;
    scheduleDate: string;
    commentsOff?: boolean;
    hideLikes?: boolean;
    hideShares?: boolean;
    allowRemix?: boolean;
    allowDownloads?: boolean;
  } | null;
  setUploadDraft: (draft: AppState['uploadDraft']) => void;


  // ─── Feed System ────────────────────────────────────────────────────────
  feedActiveTab: 'all' | 'following' | 'communities';
  setFeedActiveTab: (tab: 'all' | 'following' | 'communities') => void;
  // Note: Optimistic updates for feed are best handled via React Query cache mutation 
  // directly in the components to avoid state duplication since React Query owns the 
  // infinite scroll data. We will rely on useQueryClient for optimistic updates.


  // Overlay management (prevents two overlays open at once)
  activeOverlay: string | null;
  setOverlay: (id: string | null) => void;

  // Notifications
  notifications: VerlynNotification[];
  unreadNotifCount: number;
  notificationPreferences: Record<string, { enabledInApp: boolean; enabledPush: boolean }>;
  setNotifications: (notifs: VerlynNotification[]) => void;
  addNotification: (notif: VerlynNotification) => void;
  markNotifRead: (id: string, userId?: string) => void;
  markAllNotifsRead: (userId?: string) => void;
  removeNotification: (id: string) => void;
  removeNotifications: (ids: string[]) => void;
  setNotificationPreferences: (prefs: any[]) => void;
  updateNotificationPreference: (type: string, enabledInApp: boolean, enabledPush: boolean) => void;

  // Real-time Engine
  wsStatus: 'connecting' | 'connected' | 'error' | 'reconnecting' | 'disconnected';
  setWsStatus: (status: 'connecting' | 'connected' | 'error' | 'reconnecting' | 'disconnected') => void;
  onlineUsers: string[];
  setOnlineUsers: (users: string[]) => void;

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
  setUser: (user: User | null) => void;

  // Hydration tracking — prevents settings flicker on SSR rehydration
  _hasHydrated: boolean;

  // Auth loading — blocks UI until identity is resolved
  isAuthLoading: boolean;
  setAuthLoading: (v: boolean) => void;

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
  setFollowing: (followingIds: string[]) => void;
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

  // Command Palette (CMD+K)
  isCommandPaletteOpen: boolean;
  setCommandPaletteOpen: (v: boolean) => void;

  // DM Settings Persistence (indexed by partnerId)
  dmSettingsCache: Record<string, any>;
  setDmSettingsCache: (partnerId: string, settings: any) => void;

  // ─── Messaging State ──────────────────────────────────────────────────
  conversations: DBConversation[];
  activeConversationId: string | null;
  activeConversationIsGroup: boolean;
  activePartnerUserId: string | null;  // DM partner's user ID — used for broadcast channel routing
  setActiveConversation: (id: string | null, isGroup?: boolean, partnerUserId?: string | null) => void;
  messages: Record<string, ChatMessage[]>;
  activeBroadcastChannel: any | null;
  setActiveBroadcastChannel: (channel: any | null) => void;
  messagesRestriction: { isRestricted: boolean; expiresAt: string | null; reason?: string | null } | null;
  setMessagesRestriction: (restriction: { isRestricted: boolean; expiresAt: string | null; reason?: string | null } | null) => void;
  
  // ─── Message Status & Progress ────────────────────────────────────────
  // Track delivery/seen status and file upload progress
  readStatus: Record<string, 'sent' | 'delivered' | 'seen'>; // messageId -> status
  mediaUploads: Record<string, { progress: number; status: 'uploading' | 'complete' | 'error'; url?: string }>;
  voiceRecordingState: { isRecording: boolean; duration: number; blobUrl?: string };


  // ─── Recording Indicators (per-conversation, multi-user for groups) ───
  recordingUsers: Record<string, string[]>; // convId → [userId, ...]
  setRecordingUser: (convId: string, userId: string, isRecording: boolean) => void;

  // ─── Unread Counts (per-conversation) ─────────────────────────────────
  unreadCounts: Record<string, number>; // convId → count
  incrementUnread: (convId: string) => void;
  clearUnread: (convId: string) => void;
  setUnreadCount: (convId: string, count: number) => void;


  // ─── Draft Messages (per-conversation) ────────────────────────────────
  // Persists the user's in-progress message when they switch conversations.
  drafts: Record<string, string>; // convId → draft text
  setDraft: (convId: string, text: string) => void;
  clearDraft: (convId: string) => void;

  // ─── Offline Queue ────────────────────────────────────────────────────
  offlineQueue: Array<{
    convId: string;
    payload: {
      clientTempId: string;
      content: string;
      type: 'text' | 'image' | 'voice' | 'file' | 'video' | 'location';
      mediaUrl?: string;
      fileName?: string;
      mimeType?: string;
      replyToId?: string;
      viewOnce?: boolean;
      mediaGroupId?: string;
      locationLat?: number;
      locationLng?: number;
      locationAddress?: string;
    };
  }>;
  addToOfflineQueue: (convId: string, payload: any) => void;
  removeFromOfflineQueue: (clientTempId: string) => void;

  // ─── Messaging Actions ──────────────────────────────────────────────────
  setConversations: (convs: DBConversation[]) => void;
  upsertConversation: (id: string, updates: Partial<DBConversation>) => void;
  setMessages: (convId: string, messages: ChatMessage[]) => void;
  upsertMessage: (convId: string, message: ChatMessage) => void;
  removeMessage: (convId: string, messageId: string) => void;
  /** Patch status on a single message. Pass hintConvId for O(1) lookup. */
  updateMessageStatus: (messageId: string, status: 'sent' | 'delivered' | 'seen', hintConvId?: string) => void;
  setMediaUpload: (fileId: string, update: Partial<AppState['mediaUploads'][string]>) => void;
  removeMediaUpload: (fileId: string) => void;
  setVoiceRecording: (update: Partial<AppState['voiceRecordingState']>) => void;
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

      // Breakpoint — default to 'desktop' (SSR-safe; useBreakpoint hook will
      // correct this on first client render via ResizeObserver)
      breakpoint: 'desktop',
      setBreakpoint: (bp) => set({ breakpoint: bp }),

      sidebarCollapsed: false,
      toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
      isMobileDrawerOpen: false,
      setMobileDrawerOpen: (v) => set({ isMobileDrawerOpen: v }),

      activePage: 'feed',
      setActivePage: (page) => set({ activePage: page }),

      isPostCreationOpen: false,
      setPostCreationOpen: (open) => set({ isPostCreationOpen: open }),

      activePostUpload: null,
      setActivePostUpload: (upload) => set({ activePostUpload: upload }),

      uploadDraft: null,
      setUploadDraft: (draft) => set({ uploadDraft: draft }),


      feedActiveTab: 'all',
      setFeedActiveTab: (tab) => set({ feedActiveTab: tab }),

      activeOverlay: null,
      // FIX 5: Always close notification panel when any overlay opens
      setOverlay: (id) => set({ activeOverlay: id, isNotifPanelOpen: false }),

      notifications: [],
      unreadNotifCount: 0,
      notificationPreferences: {},
      setNotifications: (notifs) => set({
        notifications: notifs,
        unreadNotifCount: notifs.filter((n) => !n.isRead).length,
      }),
      addNotification: (notif) => set((s) => {
        // Prevent duplicates
        if (s.notifications.some(n => n.id === notif.id)) return s;
        const newNotifs = [notif, ...s.notifications];
        return {
          notifications: newNotifs,
          unreadNotifCount: newNotifs.filter((n) => !n.isRead).length,
        };
      }),
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
      removeNotification: (id) => set((s) => {
        const filtered = s.notifications.filter((n) => n.id !== id);
        return { notifications: filtered, unreadNotifCount: filtered.filter((n) => !n.isRead).length };
      }),
      removeNotifications: (ids) => set((s) => {
        const idSet = new Set(ids);
        const filtered = s.notifications.filter((n) => !idSet.has(n.id));
        return { notifications: filtered, unreadNotifCount: filtered.filter((n) => !n.isRead).length };
      }),
      setNotificationPreferences: (prefs) => set({
        notificationPreferences: Object.fromEntries(
          prefs.map(p => [p.type, { enabledInApp: p.enabled_in_app, enabledPush: p.enabled_push }])
        )
      }),
      updateNotificationPreference: (type, enabledInApp, enabledPush) => set((s) => ({
        notificationPreferences: {
          ...s.notificationPreferences,
          [type]: { enabledInApp, enabledPush }
        }
      })),

      conversations: [],
      activeConversationId: null,
      activeConversationIsGroup: false,
      activePartnerUserId: null,
      setActiveConversation: (id, isGroup = false, partnerUserId = null) => set((s) => {
        const prevId = s.activeConversationId;
        // CE-FIX CE-11: Wipe messages for the previous conversation when switching.
        const nextMessages = { ...s.messages };
        if (prevId && prevId !== id) {
          const prevMsgs = nextMessages[prevId] || [];
          nextMessages[prevId] = prevMsgs.slice(-20);
        }
        return {
          activeConversationId: id,
          activeConversationIsGroup: isGroup,
          activePartnerUserId: partnerUserId,
          messages: nextMessages,
        };
      }),
      messages: { },
      activeBroadcastChannel: null,
      setActiveBroadcastChannel: (channel) => set({ activeBroadcastChannel: channel }),
      messagesRestriction: null,
      setMessagesRestriction: (restriction) => set({ messagesRestriction: restriction }),
      readStatus: { },
      mediaUploads: { },
      voiceRecordingState: { isRecording: false, duration: 0 },


      // ─── Recording state ──────────────────────────────────────────────────
      recordingUsers: {},
      setRecordingUser: (convId, userId, isRecording) => set((s) => {
        const current = s.recordingUsers[convId] || [];
        const next = isRecording
          ? Array.from(new Set([...current, userId]))
          : current.filter((id) => id !== userId);
        return { recordingUsers: { ...s.recordingUsers, [convId]: next } };
      }),

      // ─── Unread counts ───────────────────────────────────────────────────
      unreadCounts: {},
      incrementUnread: (convId) => set((s) => ({
        unreadCounts: { ...s.unreadCounts, [convId]: (s.unreadCounts[convId] || 0) + 1 },
      })),
      clearUnread: (convId) => set((s) => ({
        unreadCounts: { ...s.unreadCounts, [convId]: 0 },
      })),
      setUnreadCount: (convId, count) => set((s) => ({
        unreadCounts: { ...s.unreadCounts, [convId]: count },
      })),

      // ─── Draft messages ──────────────────────────────────────────────────
      drafts: {},
      setDraft: (convId, text) => set((s) => ({
        drafts: { ...s.drafts, [convId]: text },
      })),
      clearDraft: (convId) => set((s) => {
        const { [convId]: _, ...rest } = s.drafts;
        return { drafts: rest };
      }),

      // ─── Offline Queue ────────────────────────────────────────────────────
      offlineQueue: [],
      addToOfflineQueue: (convId, payload) => set((s) => ({
        offlineQueue: [...s.offlineQueue, { convId, payload }]
      })),
      removeFromOfflineQueue: (clientTempId) => set((s) => ({
        offlineQueue: s.offlineQueue.filter((item) => item.payload.clientTempId !== clientTempId)
      })),

      wsStatus: 'connecting',
      setWsStatus: (status) => set({ wsStatus: status }),
      onlineUsers: [],
      setOnlineUsers: (users) => set({ onlineUsers: users }),

      searchQuery: '',
      setSearchQuery: (q) => set({ searchQuery: q }),
      isSearchOpen: false,
      setSearchOpen: (v) => set({ isSearchOpen: v }),

      isNotifPanelOpen: false,
      setNotifPanelOpen: (v) => set({ isNotifPanelOpen: v, activeOverlay: v ? 'sidebar:notifications' : null }),

      currentUser: null,
      syncStatus: 'idle',
      setSyncStatus: (s) => set({ syncStatus: s }),
      setUser: (user) => set({ currentUser: user }),

      updateProfile: (updates) => set((state) => {
        const newUser = { ...state.currentUser, ...updates } as User;
        if (state.currentUser?.id) {
          // Safety: Don't sync local blob URLs to database
          const syncUpdates = { ...updates };
          if (syncUpdates.avatar?.startsWith('blob:')) {
            delete syncUpdates.avatar;
          }

          const hasSyncableField =
            'displayName' in syncUpdates ||
            'username' in syncUpdates ||
            'bio' in syncUpdates ||
            'avatar' in syncUpdates ||
            'isPrivate' in syncUpdates;

          if (hasSyncableField) {
            dispatchProfileSync(
              state.currentUser.id, 
              {
                displayName: syncUpdates.displayName,
                username: syncUpdates.username,
                bio: syncUpdates.bio,
                avatarUrl: syncUpdates.avatar,
                isPrivate: syncUpdates.isPrivate,
              },
              state.setSyncStatus
            );
          }
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
      setFollowing: (followingIds) => set({ following: followingIds }),
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
          // Real DB sync — fire and forget with optimistic UI above
          toggleFollowDB(state.currentUser.id, userId, !isFollowingNow).then((res) => {
            if (!res.success) console.error('[Store] Follow DB sync failed:', res.error);
          });
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
      isCommandPaletteOpen: false,
      setCommandPaletteOpen: (v: boolean) => set({ isCommandPaletteOpen: v }),
      _hasHydrated: false,
      isAuthLoading: true,
      setAuthLoading: (v: boolean) => set({ isAuthLoading: v }),

      dmSettingsCache: {},
      setDmSettingsCache: (partnerId, settings) => set((s) => {
        const existing = s.dmSettingsCache[partnerId] || {};
        return {
          dmSettingsCache: { 
            ...s.dmSettingsCache, 
            [partnerId]: { ...existing, ...settings } 
          }
        };
      }),

      // ─── Messaging Actions ──────────────────────────────────────────────
      setConversations: (convs) => set({ conversations: convs }),
      
      upsertConversation: (id, updates) => set((s) => {
        const conversations = s.conversations || [];
        const index = conversations.findIndex(c => c.id === id);
        if (index === -1) {
          // If it's a new or force-loaded conversation, add to front
          return { conversations: [ { id, ...updates } as DBConversation, ...conversations ] };
        }
        const updated = [ ...conversations ];
        updated[index] = { ...updated[index], ...updates };
        // Move to top if lastMessage changed
        if (updates.lastMessage) {
           const [item] = updated.splice(index, 1);
           return { conversations: [item, ...updated] };
        }
        return { conversations: updated };
      }),

      setMessages: (convId, fetchedMessages) => set((s) => {
        const existing = s.messages[convId] || [];
        // Extract local-only messages (sending, failed, error) that are not already present in fetchedMessages
        const localOnly = existing.filter(m => 
          (m.status === 'sending' || m.status === 'failed' || m.status === 'error') &&
          !fetchedMessages.some(fm => fm.id === m.id || (m.client_temp_id && fm.client_temp_id === m.client_temp_id))
        );

        // Combine fetched messages with the local-only unsent/failed messages
        const merged = [...fetchedMessages, ...localOnly];
        
        logStoreDebug(`setMessages: convId=${convId}, fetched=${fetchedMessages.length}, localOnly=${localOnly.length}, merged=${merged.length}`);
        
        return {
          messages: {
            ...s.messages,
            // Cap at 500 messages per conversation — prevents unbounded memory
            // growth in very long sessions. Oldest messages are trimmed from the
            // front (we keep the tail = most recent).
            [convId]: merged.length > 500 ? merged.slice(-500) : merged,
          }
        };
      }),

      upsertMessage: (convId, message) => set((s) => {
        const existing = s.messages[convId] || [];
        const index = existing.findIndex(m => m.id === message.id || (message.client_temp_id && m.client_temp_id === message.client_temp_id));

        logStoreDebug(`upsertMessage: convId=${convId}, msgId=${message.id}, tempId=${message.client_temp_id}, status=${message.status}, existingLength=${existing.length}, foundIndex=${index}`);

        const newMessages = [...existing];
        if (index > -1) {
          // State Reconciler: Reconcile optimistic → real using a deep merge to prevent metadata loss (State Amnesia)
          // Network events (like Supabase Realtime) often lack JOIN fields, UI fields, or optimistic IDs.
          const current = newMessages[index];

          // Guard: Do not downgrade status (sent, delivered, seen) to sending/failed,
          // and do not revert a confirmed database UUID back to a temporary ID.
          let targetStatus = message.status ?? current.status;
          let targetId = message.id ?? current.id;
          
          const curStatusStr = current.status as string;
          const incomingStatusStr = message.status as string;
          
          const isCurrentSent = curStatusStr === 'sent' || curStatusStr === 'delivered' || curStatusStr === 'seen';
          const isIncomingTemp = incomingStatusStr === 'sending' || incomingStatusStr === 'failed' || incomingStatusStr === 'error';
          
          if (isCurrentSent && isIncomingTemp) {
            targetStatus = current.status;
            if (current.id && !current.id.startsWith('temp_') && message.id && message.id.startsWith('temp_')) {
              targetId = current.id;
            }
          }

          const merged: ChatMessage = {
            ...current,
            ...message,
            id: targetId,
            status: targetStatus,
            // Preserve core metadata if missing in incoming payload
            client_temp_id: message.client_temp_id ?? current.client_temp_id,
            is_mine: message.is_mine ?? current.is_mine,
            sender: message.sender ?? current.sender,
            reply_to: message.reply_to ?? current.reply_to,
            // Only update reactions if incoming actually has them, else retain local (prevent wiping on edit/read receipt)
            reactions: message.reactions && Object.keys(message.reactions).length > 0 ? message.reactions : current.reactions,
            media_url: message.media_url ?? current.media_url,
          };
          // PERF: Skip state update if nothing changed (prevents re-renders on duplicate realtime events)
          if (
            merged.status === current.status &&
            merged.content === current.content &&
            merged.reactions === current.reactions &&
            merged.id === current.id &&
            // FIX-VOICE-4: Include media_url in no-op guard — status-only Realtime UPDATE
            // events were triggering re-renders of VoicePlayer bubbles unnecessarily.
            merged.media_url === current.media_url
          ) {
            logStoreDebug(`upsertMessage no-op: convId=${convId}, msgId=${message.id}`);
            return s; // no-op — identical update
          }
          logStoreDebug(`upsertMessage updating existing message: convId=${convId}, oldId=${current.id}, oldStatus=${current.status} -> newId=${merged.id}, newStatus=${merged.status}`);
          newMessages[index] = merged;
        } else {
          // Append to END — messages stored chronologically ASC (oldest first).
          // MessageList renders in this order directly. Do NOT unshift.
          logStoreDebug(`upsertMessage appending new message: convId=${convId}, id=${message.id}, status=${message.status}`);
          newMessages.push(message);
          // Cap at 500 during append to prevent long-session memory bloat
          if (newMessages.length > 500) newMessages.shift();
        }

        return {
          messages: { ...s.messages, [convId]: newMessages }
        };
      }),

      removeMessage: (convId, messageId) => set((s) => {
        logStoreDebug(`removeMessage: convId=${convId}, msgId=${messageId}`);
        return {
          messages: {
            ...s.messages,
            [convId]: (s.messages[convId] || []).filter(m => m.id !== messageId)
          }
        };
      }),


      // updateMessageStatus — patches the actual message in the store so status ticks update.
      // PERF: hintConvId short-circuits the O(N×K) scan: if the caller knows which
      // conversation the message belongs to, only that conversation is checked.
      updateMessageStatus: (id, status, hintConvId?) => set((s) => {
        const allMessages = s.messages;

        // Fast path: caller provided a conversation hint
        if (hintConvId && allMessages[hintConvId]) {
          const msgs = allMessages[hintConvId];
          const idx = msgs.findIndex(m => m.id === id);
          if (idx > -1 && msgs[idx].status !== status) {
            const newMsgs = [...msgs];
            newMsgs[idx] = { ...newMsgs[idx], status };
            return {
              readStatus: { ...s.readStatus, [id]: status },
              messages: { ...allMessages, [hintConvId]: newMsgs },
            };
          }
          // Found conv but already at target status — update readStatus only
          return { readStatus: { ...s.readStatus, [id]: status } };
        }

        // Slow path: scan all conversations (O(N×K)) — for messages where convId is unknown
        const updated: typeof allMessages = {};
        let found = false;
        for (const convId in allMessages) {
          const msgs = allMessages[convId];
          const idx = msgs.findIndex(m => m.id === id);
          if (idx > -1 && !found) {
            found = true;
            const newMsgs = [...msgs];
            newMsgs[idx] = { ...newMsgs[idx], status };
            updated[convId] = newMsgs;
          } else {
            updated[convId] = msgs;
          }
        }
        return {
          readStatus: { ...s.readStatus, [id]: status },
          ...(found ? { messages: updated } : {}),
        };
      }),

      setMediaUpload: (id, update) => set((s) => ({
        mediaUploads: { ...s.mediaUploads, [id]: { ...(s.mediaUploads[id] || { progress: 0, status: 'uploading' }), ...update } }
      })),

      removeMediaUpload: (id) => set((s) => {
        const next = { ...s.mediaUploads };
        delete next[id];
        return { mediaUploads: next };
      }),

      setVoiceRecording: (update) => set((s) => ({
        voiceRecordingState: { ...s.voiceRecordingState, ...update }
      }))
    }),
    {
      name: 'verlyn-app-state',
      // FIX 4: Track when localStorage rehydration completes to prevent settings flicker
      onRehydrateStorage: () => (state) => {
        if (state) {
          state._hasHydrated = true;
          // If a persisted user already exists in the store, clear the auth loading flag
          // immediately on rehydration. AuthProvider will still run and validate/refresh
          // the session in the background, but the app shell can render right away
          // using the cached profile instead of being blocked on the splash screen.
          if (state.currentUser) {
            state.isAuthLoading = false;
          }
        }
      },
      partialize: (state) => ({
        theme: state.theme,
        sidebarCollapsed: state.sidebarCollapsed,
        currentUser: state.currentUser,
        // conversations: state.conversations, // REMOVED: Now managed by TanStack Query
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
        offlineQueue: state.offlineQueue,
        // ST-01: Persist theme manifest so custom themes survive page refresh
        customThemeManifest: state.customThemeManifest,
        // ST-02: Cap dmSettingsCache to last 50 partners to avoid unbounded storage growth
        dmSettingsCache: Object.fromEntries(
          Object.entries(state.dmSettingsCache).slice(-50)
        ),
        // ST-03: Persist draft messages across page refresh, cap at last 20 conversations
        drafts: Object.fromEntries(
          Object.entries(state.drafts).slice(-20)
        ),
      }),
    }
  )
);

'use client';

import { useInfiniteQuery } from '@tanstack/react-query';
import { useAppStore } from '@/lib/store';
import { getMessagesDB } from '@/app/(main)/messages/actions';
import { useEffect } from 'react';
import type { ChatMessage } from '@/components/Chat/MessageItem';

const PAGE_SIZE = 50;

/**
 * useMessages — Production-grade message pagination hook.
 *
 * Features:
 *   - Cursor-based infinite scroll (oldest-first, loads older pages upward)
 *   - Hydrates Zustand store on first load (so realtime updates work off the same source)
 *   - Auto-enabled when convId and userId are set
 *   - Returns { loadMore, hasMore, isLoading, isLoadingMore }
 */
export function useMessages(convId: string | null, isGroup: boolean) {
  const currentUser = useAppStore((s) => s.currentUser);
  const setMessages = useAppStore((s) => s.setMessages);
  const userId = currentUser?.id;

  const query = useInfiniteQuery({
    queryKey: ['messages', convId, userId],
    queryFn: async ({ pageParam }: { pageParam?: string }) => {
      if (!userId || !convId) return [];
      const { success, data } = await getMessagesDB(
        userId,
        convId,
        isGroup,
        PAGE_SIZE,
        pageParam
      );
      return (success && data ? data : []) as ChatMessage[];
    },
    enabled: !!userId && !!convId,
    // Cursor = sent_at of the oldest message on the current page
    getNextPageParam: (lastPage: ChatMessage[]) => {
      if (lastPage.length < PAGE_SIZE) return undefined;
      return lastPage[0]?.sent_at; // oldest message's sent_at = cursor for next (older) page
    },
    initialPageParam: undefined as string | undefined,
    staleTime: 0, // Messages are always kept fresh through Realtime; don't auto-refetch
    refetchOnWindowFocus: false,
  });

  // Hydrate Zustand store on initial load so Realtime updates apply in same place
  useEffect(() => {
    if (!query.data || !convId) return;
    // Flatten all pages. Pages are loaded newest → oldest, so reverse to get ASC order
    const allPages = query.data.pages;
    const chronological = [...allPages].reverse().flat();
    const mapped = chronological.map((m: any) => ({
      ...m,
      is_mine: m.sender_id === userId,
      status: m.status ?? 'sent',
    }));
    setMessages(convId, mapped);
  }, [query.data, convId, userId, setMessages]);

  return {
    isLoading: query.isPending,
    isLoadingMore: query.isFetchingNextPage,
    hasMore: query.hasNextPage ?? false,
    loadMore: query.fetchNextPage,
    error: query.error,
  };
}

import { useQuery } from '@tanstack/react-query';
import { getConversationsDB } from '@/app/(main)/messages/actions';
import { useAppStore } from '@/lib/store';

export function useConversations() {
  const currentUser = useAppStore(s => s.currentUser);
  
  return useQuery({
    queryKey: ['conversations', currentUser?.id],
    queryFn: async () => {
      if (!currentUser?.id) return [];
      const { success, data } = await getConversationsDB(currentUser.id);
      if (success && data) return data;
      return [];
    },
    enabled: !!currentUser?.id,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

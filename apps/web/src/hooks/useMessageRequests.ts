import { useQuery } from '@tanstack/react-query';
import { getMessageRequestsDB } from '@/app/(main)/messages/actions';
import { useAppStore } from '@/lib/store';

export function useMessageRequests() {
  const currentUser = useAppStore(s => s.currentUser);
  
  return useQuery({
    queryKey: ['message-requests', currentUser?.id],
    queryFn: async () => {
      if (!currentUser?.id) return [];
      const { success, data } = await getMessageRequestsDB(currentUser.id);
      if (success && data) return data;
      return [];
    },
    enabled: !!currentUser?.id,
    staleTime: 1000 * 30, // 30 seconds
  });
}

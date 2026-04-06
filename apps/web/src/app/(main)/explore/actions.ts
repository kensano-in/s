'use server';

import { createClient } from '@/lib/supabase/server';

export async function getTrendingWaves() {
  const supabase = await createClient();
  
  // Real-time extraction of #hashtags from post content
  const { data, error } = await supabase.rpc('get_trending_tags');
  
  if (error) {
    // Fallback search if RPC is not yet in DB
    const { data: fallbackData } = await supabase
        .from('posts')
        .select('content')
        .order('created_at', { ascending: false })
        .limit(100);
        
    const tags = new Map<string, number>();
    fallbackData?.forEach(p => {
        const matches = p.content.match(/#\w+/g);
        matches?.forEach(t => tags.set(t, (tags.get(t) || 0) + 1));
    });
    
    return Array.from(tags.entries())
        .sort((a,b) => b[1] - a[1])
        .slice(0, 10)
        .map(([tag, count]) => ({ tag, count }));
  }
  
  return data;
}

export async function getDiscoverySignals() {
   const supabase = await createClient();
   const { data, error } = await supabase
       .from('posts')
       .select('*, author:users(*)')
       .order('like_count', { ascending: false })
       .limit(20);
   
   if (error) return { error: error.message };
   return { success: true, signals: data };
}

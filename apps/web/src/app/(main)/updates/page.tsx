export const dynamic = 'force-dynamic';

import { Suspense } from 'react';
import { createClient } from '@/lib/supabase/server';
import { getUpdates } from './actions';
import UpdatesList from './UpdatesList';

export const metadata = {
  title: 'Updates — Shincore',
  description: 'Platform updates, improvements, and release notes.',
};

async function UpdatesPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  let isAdmin = false;
  let currentUsername: string | null = null;
  let isFirst50 = false;
  if (user) {
    const { data: profile } = await supabase
      .from('users')
      .select('username')
      .eq('id', user.id)
      .single();
    if (profile) {
      currentUsername = profile.username;
      isAdmin = profile.username === 's';
    }

    // Query first 50 users
    const { data: first50 } = await supabase
      .from('users')
      .select('id')
      .order('created_at', { ascending: true })
      .limit(50);
    if (first50) {
      isFirst50 = first50.some(u => u.id === user.id);
    }
  }

  const { updates, error } = await getUpdates();

  return (
    <UpdatesList initialUpdates={updates} isAdmin={isAdmin} currentUsername={currentUsername} isFirst50={isFirst50} initialError={error} />
  );
}

export default function Page() {
  return (
    <Suspense>
      <UpdatesPage />
    </Suspense>
  );
}


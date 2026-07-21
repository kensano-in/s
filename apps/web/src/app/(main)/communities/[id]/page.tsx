import { redirect } from 'next/navigation';
import { getCommunityNameById } from '../actions';

export const dynamic = 'force-dynamic';

export default async function CommunityRedirectPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (id) {
    const res = await getCommunityNameById(id);
    if (res.success && res.name) {
      redirect(`/community/${res.name}`);
    }
  }
  redirect('/communities');
}

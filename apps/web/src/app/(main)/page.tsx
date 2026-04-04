import { redirect } from 'next/navigation';

// (main) index redirects to /feed — the actual feed page lives at (main)/feed/page.tsx
export default function MainIndexPage() {
  redirect('/feed');
}


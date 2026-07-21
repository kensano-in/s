import { redirect } from 'next/navigation';

// Root redirects to the main feed
export default function RootPage() {
  redirect('/feed');
}

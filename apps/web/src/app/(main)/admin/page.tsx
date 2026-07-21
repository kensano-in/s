import { Suspense } from 'react';
import { Loader2 } from 'lucide-react';
import AdminConsoleContent from './AdminConsoleContent';

export const dynamic = 'force-dynamic';

export default function AdminConsolePage() {
  return (
    <Suspense fallback={
      <div className="flex flex-col items-center justify-center gap-3 py-12">
        <Loader2 className="w-8 h-8 animate-spin text-zinc-500" />
        <span className="text-xs text-neutral-500 font-bold uppercase tracking-widest font-mono">Spawning Admin Stream...</span>
      </div>
    }>
      <AdminConsoleContent />
    </Suspense>
  );
}

import { Suspense } from 'react';
import { Loader2 } from 'lucide-react';
import ModerationContent from './ModerationContent';

export const dynamic = 'force-dynamic';

export default function ModerationPage() {
  return (
    <Suspense fallback={
      <div className="flex flex-col items-center justify-center gap-3 py-12">
        <Loader2 className="w-8 h-8 animate-spin text-zinc-500" />
        <span className="text-xs text-neutral-500 font-bold uppercase tracking-widest font-mono">Loading Moderation Feed...</span>
      </div>
    }>
      <ModerationContent />
    </Suspense>
  );
}

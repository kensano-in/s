import { Suspense } from 'react';
import { Loader2 } from 'lucide-react';
import LoginMFAContent from './LoginMFAContent';

export const dynamic = 'force-dynamic';

export default function LoginMFAPage() {
  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center relative overflow-hidden font-sans px-4">
      {/* Background ambient glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[80vw] h-[80vw] max-w-[800px] max-h-[800px] bg-purple-600/10 rounded-full blur-[120px] pointer-events-none opacity-50"></div>
      <Suspense fallback={
        <div className="flex flex-col items-center justify-center gap-3 relative z-10">
          <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
          <span className="text-xs text-neutral-500 font-bold uppercase tracking-widest">Loading MFA Gateway...</span>
        </div>
      }>
        <LoginMFAContent />
      </Suspense>
    </div>
  );
}

import { Suspense } from 'react';
import { Loader2 } from 'lucide-react';
import UpdatePasswordContent from './UpdatePasswordContent';

export const dynamic = 'force-dynamic';

export default function UpdatePasswordPage() {
  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center relative overflow-hidden px-4 font-sans">
      {/* Premium Ambient Background Glows */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[80vw] h-[80vw] max-w-[800px] max-h-[800px] bg-blue-600/5 rounded-full blur-[130px] pointer-events-none opacity-50"></div>
      <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-blue-500/10 rounded-full blur-[120px] pointer-events-none"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-900/10 rounded-full blur-[100px] pointer-events-none"></div>

      <Suspense fallback={
        <div className="flex flex-col items-center justify-center gap-3 relative z-10">
          <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
          <span className="text-xs text-neutral-500 font-bold uppercase tracking-widest">Loading Gateway...</span>
        </div>
      }>
        <UpdatePasswordContent />
      </Suspense>
    </div>
  );
}

'use client';

import { useEffect } from 'react';
import { ArrowLeft, AlertTriangle } from 'lucide-react';
import Link from 'next/link';

export default function PostDetailError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Post detail error page captured:', error);
  }, [error]);

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white flex flex-col items-center justify-center p-6 relative">
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-white/[0.02] rounded-full blur-[120px]" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-white/[0.01] rounded-full blur-[120px]" />
      </div>

      <div className="max-w-[400px] w-full text-center space-y-8 relative z-10">
        <div className="mx-auto w-20 h-20 rounded-3xl bg-rose-500/5 border border-rose-500/10 flex items-center justify-center shadow-[0_0_50px_rgba(239,68,68,0.02)]">
          <AlertTriangle size={28} className="text-rose-500/60" />
        </div>

        <div className="space-y-3">
          <h1 className="text-[20px] font-black uppercase tracking-[0.25em] text-white font-display">
            Unable to load post
          </h1>
          <p className="text-[14px] text-white/30 leading-relaxed max-w-[320px] mx-auto">
            An unexpected error occurred while loading this post.
          </p>
        </div>

        <div className="flex justify-center gap-4 pt-4">
          <button
            onClick={() => reset()}
            className="px-6 py-4 rounded-2xl bg-white/[0.04] text-white border border-white/[0.08] hover:bg-white/[0.08] text-[11px] font-black uppercase tracking-[0.15em] transition-all"
          >
            Retry Connection
          </button>
          
          <Link
            href="/feed"
            className="inline-flex items-center gap-2 px-6 py-4 rounded-2xl bg-white text-black hover:bg-neutral-200 text-[11px] font-black uppercase tracking-[0.15em] transition-all"
          >
            <ArrowLeft size={14} strokeWidth={2.5} />
            Go Feed
          </Link>
        </div>
      </div>
    </div>
  );
}

'use client';

import { FeedCardSkeleton } from '@/components/ui/Skeleton';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function PostDetailLoading() {
  return (
    <div className="min-h-screen pb-20 relative bg-[#0A0A0A]">
      {/* Subtle bg glows */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-white/[0.02] rounded-full blur-[120px]" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-white/[0.01] rounded-full blur-[120px]" />
      </div>

      <div className="max-w-[640px] mx-auto px-4 pt-6 relative z-10">
        {/* Back button */}
        <div className="mb-6">
          <Link
            href="/feed"
            className="inline-flex items-center gap-2 text-white/40 hover:text-white transition-colors group px-3 py-1.5 rounded-xl hover:bg-white/[0.04]"
          >
            <ArrowLeft size={18} className="group-hover:-translate-x-1 transition-transform" />
            <span className="text-sm font-semibold">Back</span>
          </Link>
        </div>

        {/* Post skeleton */}
        <FeedCardSkeleton />
      </div>
    </div>
  );
}

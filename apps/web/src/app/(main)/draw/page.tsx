'use client';

import React, { Suspense } from 'react';
import dynamicImport from 'next/dynamic';
import { useRouter } from 'next/navigation';

const DrawStudio = dynamicImport(
  () => import('@/components/features/draw/DrawStudio'),
  { ssr: false }
);

export default function DrawPage() {
  const router = useRouter();

  return (
    <Suspense fallback={
      <div className="fixed inset-0 bg-[#06040f] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-violet-600 to-purple-800 flex items-center justify-center animate-pulse">
            <span className="text-2xl">✏️</span>
          </div>
          <p className="text-white/40 text-sm font-medium">Loading Draw Studio…</p>
        </div>
      </div>
    }>
      <DrawStudio
        onClose={() => router.back()}
        onExport={(blob, format) => {
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `shincore-drawing.${format.replace('-transparent', '')}`;
          a.click();
          URL.revokeObjectURL(url);
        }}
      />
    </Suspense>
  );
}

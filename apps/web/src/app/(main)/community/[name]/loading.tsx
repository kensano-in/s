export default function CommunityLoading() {
  return (
    <div className="flex h-full w-full bg-[#09090b] animate-pulse">
      {/* Sidebar Skeleton */}
      <div className="w-64 h-full border-r border-white/[0.06] bg-white/[0.02] p-4 space-y-4 hidden md:block">
        <div className="h-6 w-36 bg-white/[0.08] rounded" />
        <div className="space-y-2 pt-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-8 rounded-lg bg-white/[0.04] w-full" />
          ))}
        </div>
      </div>

      {/* Main Chat Skeleton */}
      <div className="flex-1 flex flex-col h-full">
        <div className="h-14 border-b border-white/[0.06] bg-white/[0.02] px-6 flex items-center justify-between">
          <div className="h-5 w-40 bg-white/[0.08] rounded" />
          <div className="h-8 w-8 rounded-full bg-white/[0.05]" />
        </div>
        <div className="flex-1 p-6 space-y-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-full bg-white/[0.08]" />
              <div className="space-y-2 flex-1">
                <div className="h-3 w-28 bg-white/[0.08] rounded" />
                <div className="h-3 w-3/5 bg-white/[0.04] rounded" />
              </div>
            </div>
          ))}
        </div>
        <div className="p-4 border-t border-white/[0.06]">
          <div className="h-12 rounded-xl bg-white/[0.04] w-full" />
        </div>
      </div>
    </div>
  );
}

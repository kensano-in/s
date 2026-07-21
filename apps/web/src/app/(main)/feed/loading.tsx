export default function FeedLoading() {
  return (
    <div className="w-full max-w-2xl mx-auto space-y-6 py-4 animate-pulse">
      {/* Story Reel Skeleton */}
      <div className="flex gap-3 overflow-hidden py-2">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="w-20 h-28 rounded-2xl bg-white/[0.04] border border-white/[0.06] flex-shrink-0" />
        ))}
      </div>

      {/* Composer Skeleton */}
      <div className="h-24 rounded-2xl bg-white/[0.04] border border-white/[0.06] w-full" />

      {/* Feed Post Skeletons */}
      {[1, 2, 3].map((i) => (
        <div key={i} className="p-5 rounded-2xl bg-white/[0.03] border border-white/[0.06] space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-white/[0.08]" />
            <div className="space-y-2 flex-1">
              <div className="h-3.5 w-32 bg-white/[0.08] rounded" />
              <div className="h-2.5 w-20 bg-white/[0.05] rounded" />
            </div>
          </div>
          <div className="space-y-2">
            <div className="h-3 w-full bg-white/[0.06] rounded" />
            <div className="h-3 w-4/5 bg-white/[0.06] rounded" />
          </div>
          <div className="h-48 w-full rounded-xl bg-white/[0.04]" />
        </div>
      ))}
    </div>
  );
}

export default function ExploreLoading() {
  return (
    <div className="w-full space-y-6 py-4 animate-pulse">
      {/* Search Header Skeleton */}
      <div className="h-12 rounded-2xl bg-white/[0.04] border border-white/[0.06] w-full max-w-xl mx-auto" />

      {/* Grid Skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pt-4">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="p-5 rounded-2xl bg-white/[0.03] border border-white/[0.06] space-y-3">
            <div className="h-32 rounded-xl bg-white/[0.05]" />
            <div className="h-4 w-3/4 bg-white/[0.08] rounded" />
            <div className="h-3 w-1/2 bg-white/[0.05] rounded" />
          </div>
        ))}
      </div>
    </div>
  );
}

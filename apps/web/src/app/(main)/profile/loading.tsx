export default function ProfileLoading() {
  return (
    <div className="w-full max-w-4xl mx-auto space-y-6 py-6 animate-pulse">
      {/* Banner & Avatar Skeleton */}
      <div className="relative w-full h-48 rounded-3xl bg-white/[0.04] border border-white/[0.06] overflow-hidden">
        <div className="absolute -bottom-6 left-6 w-24 h-24 rounded-full bg-white/[0.08] border-4 border-[#09090b]" />
      </div>

      {/* User Info Skeleton */}
      <div className="pt-8 px-6 space-y-3">
        <div className="h-6 w-48 bg-white/[0.08] rounded" />
        <div className="h-3.5 w-32 bg-white/[0.05] rounded" />
        <div className="h-3 w-3/4 bg-white/[0.04] rounded pt-2" />
        <div className="flex gap-6 pt-2">
          <div className="h-4 w-20 bg-white/[0.06] rounded" />
          <div className="h-4 w-20 bg-white/[0.06] rounded" />
        </div>
      </div>

      {/* Tabs Skeleton */}
      <div className="flex gap-4 border-b border-white/[0.06] pb-3 px-6 pt-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-8 w-24 bg-white/[0.04] rounded-xl" />
        ))}
      </div>

      {/* Posts Content Skeleton */}
      <div className="space-y-4 px-6">
        {[1, 2].map((i) => (
          <div key={i} className="p-5 rounded-2xl bg-white/[0.03] border border-white/[0.06] space-y-3">
            <div className="h-4 w-40 bg-white/[0.08] rounded" />
            <div className="h-3 w-full bg-white/[0.05] rounded" />
            <div className="h-32 w-full rounded-xl bg-white/[0.04]" />
          </div>
        ))}
      </div>
    </div>
  );
}

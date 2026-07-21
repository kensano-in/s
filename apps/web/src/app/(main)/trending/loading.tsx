export default function TrendingLoading() {
  return (
    <div className="w-full max-w-2xl mx-auto space-y-4 py-4 animate-pulse">
      <div className="h-8 w-40 bg-white/[0.08] rounded mb-6" />
      {[1, 2, 3, 4, 5].map((i) => (
        <div key={i} className="p-4 rounded-xl bg-white/[0.03] border border-white/[0.06] flex items-center justify-between">
          <div className="space-y-2 flex-1">
            <div className="h-4 w-48 bg-white/[0.08] rounded" />
            <div className="h-3 w-24 bg-white/[0.05] rounded" />
          </div>
          <div className="h-6 w-16 bg-white/[0.06] rounded-full" />
        </div>
      ))}
    </div>
  );
}

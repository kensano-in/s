export default function CommunitiesLoading() {
  return (
    <div className="w-full max-w-4xl mx-auto space-y-6 py-6 animate-pulse">
      <div className="h-8 w-48 bg-white/[0.08] rounded mb-6" />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="p-5 rounded-2xl bg-white/[0.03] border border-white/[0.06] space-y-3">
            <div className="w-12 h-12 rounded-xl bg-white/[0.08]" />
            <div className="h-4 w-3/4 bg-white/[0.08] rounded" />
            <div className="h-3 w-1/2 bg-white/[0.05] rounded" />
          </div>
        ))}
      </div>
    </div>
  );
}

export default function AdminLoading() {
  return (
    <div className="w-full max-w-5xl mx-auto space-y-6 py-6 animate-pulse">
      <div className="h-8 w-40 bg-white/[0.08] rounded" />
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="p-5 rounded-2xl bg-white/[0.03] border border-white/[0.06] space-y-2">
            <div className="h-4 w-24 bg-white/[0.08] rounded" />
            <div className="h-8 w-16 bg-white/[0.1] rounded" />
          </div>
        ))}
      </div>
    </div>
  );
}

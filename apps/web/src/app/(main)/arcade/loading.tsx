export default function ArcadeLoading() {
  return (
    <div className="w-full max-w-4xl mx-auto space-y-6 py-6 animate-pulse">
      <div className="h-8 w-40 bg-white/[0.08] rounded" />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-48 rounded-2xl bg-white/[0.03] border border-white/[0.06] p-6 flex flex-col justify-between">
            <div className="h-6 w-32 bg-white/[0.08] rounded" />
            <div className="h-10 w-full rounded-xl bg-white/[0.05]" />
          </div>
        ))}
      </div>
    </div>
  );
}

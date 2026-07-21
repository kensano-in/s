export default function GuidelinesLoading() {
  return (
    <div className="w-full max-w-3xl mx-auto space-y-6 py-6 animate-pulse">
      <div className="h-8 w-52 bg-white/[0.08] rounded" />
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="p-6 rounded-2xl bg-white/[0.03] border border-white/[0.06] space-y-3">
            <div className="h-5 w-40 bg-white/[0.08] rounded" />
            <div className="h-3 w-full bg-white/[0.05] rounded" />
            <div className="h-3 w-4/5 bg-white/[0.04] rounded" />
          </div>
        ))}
      </div>
    </div>
  );
}

export default function BadgesLoading() {
  return (
    <div className="w-full max-w-4xl mx-auto space-y-6 py-6 animate-pulse">
      <div className="h-8 w-44 bg-white/[0.08] rounded" />
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
        {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
          <div key={i} className="p-4 rounded-2xl bg-white/[0.03] border border-white/[0.06] flex flex-col items-center space-y-3">
            <div className="w-16 h-16 rounded-full bg-white/[0.08]" />
            <div className="h-4 w-20 bg-white/[0.08] rounded" />
          </div>
        ))}
      </div>
    </div>
  );
}

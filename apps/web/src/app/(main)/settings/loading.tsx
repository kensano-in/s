export default function SettingsLoading() {
  return (
    <div className="w-full max-w-4xl mx-auto space-y-6 py-4 animate-pulse">
      <div className="h-8 w-36 bg-white/[0.08] rounded mb-6" />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="space-y-2">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-10 rounded-xl bg-white/[0.04] w-full" />
          ))}
        </div>
        <div className="md:col-span-2 space-y-4 p-6 rounded-2xl bg-white/[0.03] border border-white/[0.06]">
          <div className="h-6 w-48 bg-white/[0.08] rounded" />
          <div className="h-20 w-full bg-white/[0.04] rounded-xl" />
          <div className="h-10 w-32 bg-white/[0.06] rounded-xl" />
        </div>
      </div>
    </div>
  );
}

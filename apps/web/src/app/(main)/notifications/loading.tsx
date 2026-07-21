export default function NotificationsLoading() {
  return (
    <div className="w-full max-w-xl mx-auto space-y-3 py-4 animate-pulse">
      <div className="h-8 w-44 bg-white/[0.08] rounded mb-6" />
      {[1, 2, 3, 4, 5, 6].map((i) => (
        <div key={i} className="p-4 rounded-xl bg-white/[0.03] border border-white/[0.06] flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-white/[0.08]" />
          <div className="space-y-2 flex-1">
            <div className="h-3.5 w-full bg-white/[0.07] rounded" />
            <div className="h-2.5 w-24 bg-white/[0.04] rounded" />
          </div>
        </div>
      ))}
    </div>
  );
}

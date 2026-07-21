export default function DrawLoading() {
  return (
    <div className="w-full max-w-4xl mx-auto space-y-6 py-6 animate-pulse">
      <div className="h-8 w-36 bg-white/[0.08] rounded" />
      <div className="h-96 w-full rounded-2xl bg-white/[0.03] border border-white/[0.06]" />
    </div>
  );
}

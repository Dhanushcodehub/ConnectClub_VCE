export default function RootLoading() {
  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center px-6 py-24">
      <div className="relative mb-6">
        <div className="w-10 h-10 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
      <p className="text-xs font-bold uppercase tracking-[0.35em] text-white/40">
        Loading
      </p>
    </div>
  );
}

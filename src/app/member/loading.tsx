export default function MemberLoading() {
  return (
    <div className="min-h-[60vh] w-full flex flex-col items-center justify-center px-6">
      <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mb-5" />
      <p className="text-xs font-bold uppercase tracking-[0.35em] text-white/40">
        Loading member area
      </p>
    </div>
  );
}

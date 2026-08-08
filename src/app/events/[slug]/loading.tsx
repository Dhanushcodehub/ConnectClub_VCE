import { Loader2 } from "lucide-react";

export default function EventDetailLoading() {
  return (
    <div className="min-h-screen pt-32 pb-20 flex flex-col items-center justify-center">
      <Loader2 className="w-12 h-12 text-primary animate-spin mb-4" />
      <h2 className="text-xl font-bold text-white tracking-widest uppercase animate-pulse">
        Loading Event...
      </h2>
    </div>
  );
}

import { Loader2 } from "lucide-react";

export default function Loading() {
  return (
    <div className="w-full min-h-[70vh] flex flex-col items-center justify-center">
      <div className="relative flex items-center justify-center">
        {/* Outer glowing ring */}
        <div className="absolute w-24 h-24 rounded-full border border-primary/30 animate-[spin_3s_linear_infinite]" />
        
        {/* Inner glowing ring */}
        <div className="absolute w-16 h-16 rounded-full border border-secondary/40 animate-[spin_2s_linear_infinite_reverse]" />
        
        {/* Center icon */}
        <Loader2 className="w-8 h-8 text-white animate-spin" />
      </div>
      
      <h3 className="mt-8 font-display font-bold text-xl tracking-widest uppercase text-white animate-pulse">
        Loading Data
      </h3>
      <p className="mt-2 text-sm text-white/50 tracking-wider">
        Establishing secure connection...
      </p>
    </div>
  );
}

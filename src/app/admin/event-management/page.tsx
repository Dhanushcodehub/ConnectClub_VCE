import Link from "next/link";
import { 
  Ticket, 
  ArrowRight, 
  Sparkles, 
  AlertCircle, 
  BarChart3, 
  CreditCard, 
  Users, 
  Calendar, 
  FileText, 
  ShieldCheck,
  TrendingUp
} from "lucide-react";
import { getEvents } from "@/lib/firebase/api";

export default async function EventManagementPage() {
  const events = await getEvents();

  return (
    <div className="p-4 sm:p-6 md:p-8 max-w-7xl mx-auto space-y-6 sm:space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-[#0d0f14] p-6 sm:p-8 rounded-3xl border border-white/5 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-primary/10 rounded-full blur-[100px] pointer-events-none" />
        
        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20 uppercase tracking-wider">
              Management & Operations
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-display font-black text-white flex items-center gap-3">
            <Ticket className="w-7 h-7 sm:w-8 sm:h-8 text-primary" />
            Event Operations Hub
          </h1>
          <p className="text-xs sm:text-sm text-white/60 mt-1 max-w-xl">
            Live analytics, verified payment tracking, desk attendance, and credential management for all events.
          </p>
        </div>
      </div>

      {/* Events Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 sm:gap-6">
        {events.map((event) => {
          const isInspirex = event.id === "inspirex-s2" || event.title?.toLowerCase().includes("inspirex season 2");
          const isBattleground = event.id === "battleground-2k26" || event.title?.toLowerCase().includes("battleground");
          const isManaged = isInspirex || isBattleground;
          
          const analyticsHref = isInspirex 
            ? "/admin/event-management/inspirex" 
            : isBattleground 
              ? "/admin/event-management/battleground" 
              : "#";

          const attendanceHref = isInspirex
            ? "/admin/event-management/inspirex/attendance"
            : isBattleground
              ? "/admin/event-management/battleground/attendance"
              : "#";

          const docsHref = isInspirex
            ? "/admin/event-management/inspirex/member-lists"
            : isBattleground
              ? "/admin/event-management/battleground/member-lists"
              : "#";

          const certsHref = isInspirex
            ? "/admin/event-management/inspirex/certificates"
            : isBattleground
              ? "/admin/event-management/battleground/certificates"
              : "#";

          const theme = isBattleground 
            ? {
                color: "from-cyan-500 to-blue-600",
                badgeBg: "bg-cyan-500/10 text-cyan-400 border-cyan-500/20",
                iconBg: "bg-cyan-500/15 border-cyan-500/30 text-cyan-400",
                tag: "Battleground 2K26",
                highlight: "Gaming Tournament"
              }
            : isInspirex 
              ? {
                  color: "from-pink-500 to-purple-600",
                  badgeBg: "bg-pink-500/10 text-pink-400 border-pink-500/20",
                  iconBg: "bg-pink-500/15 border-pink-500/30 text-pink-400",
                  tag: "InspireX S2",
                  highlight: "Flagship Summit"
                }
              : {
                  color: "from-gray-500 to-slate-600",
                  badgeBg: "bg-white/5 text-white/50 border-white/10",
                  iconBg: "bg-white/10 border-white/20 text-white/60",
                  tag: event.organizedBy || "Event",
                  highlight: "Standard Event"
                };

          return (
            <div 
              key={event.id}
              className={`bg-[#0d0f14] border border-white/5 rounded-3xl p-5 sm:p-7 relative overflow-hidden flex flex-col justify-between transition-all ${
                isManaged ? "hover:border-white/15 shadow-lg" : "opacity-75"
              }`}
            >
              {/* Decorative gradient glow */}
              <div className={`absolute top-0 right-0 w-44 h-44 bg-gradient-to-br ${theme.color} rounded-full blur-[90px] opacity-20 pointer-events-none`} />

              <div>
                {/* Header row */}
                <div className="flex justify-between items-start mb-5 relative z-10 gap-2">
                  <div className="flex items-center gap-3">
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center border ${theme.iconBg} shrink-0`}>
                      {isManaged ? <Sparkles className="w-6 h-6" /> : <Ticket className="w-6 h-6" />}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border uppercase ${theme.badgeBg}`}>
                          {theme.tag}
                        </span>
                        <span className="text-[11px] text-white/40 hidden sm:inline">{theme.highlight}</span>
                      </div>
                      <h2 className="text-xl sm:text-2xl font-black text-white mt-1 leading-tight">{event.title}</h2>
                    </div>
                  </div>

                  <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider shrink-0 ${(event.status as string)?.toLowerCase() === "active" || (event.status as string)?.toLowerCase() === "ongoing" ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30" : "bg-white/5 text-white/50 border border-white/10"}`}>
                    {event.status}
                  </span>
                </div>

                <p className="text-xs sm:text-sm text-white/60 mb-6 leading-relaxed line-clamp-2 relative z-10">
                  {event.description}
                </p>

                {/* Operations & Analytics Highlights */}
                {isManaged && (
                  <div className="mb-6 relative z-10 bg-white/[0.02] border border-white/5 rounded-2xl p-3 sm:p-4 grid grid-cols-2 gap-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0">
                        <CreditCard className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <div className="text-[11px] text-white/40 font-medium">Payment Tracking</div>
                        <div className="text-xs font-bold text-white truncate">Verified Fees</div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400 shrink-0">
                        <BarChart3 className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <div className="text-[11px] text-white/40 font-medium">Real-time Analytics</div>
                        <div className="text-xs font-bold text-white truncate">Daily Graphs & Trends</div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Navigation Actions */}
              <div className="relative z-10 pt-4 border-t border-white/5">
                {isManaged ? (
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
                    {/* Primary Button */}
                    <Link
                      href={analyticsHref}
                      className="flex-1 px-4 py-2.5 bg-primary hover:bg-primary/90 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-2 group"
                    >
                      <BarChart3 className="w-4 h-4" />
                      <span>Live Analytics & Payments</span>
                      <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                    </Link>

                    {/* Secondary Quick Action Buttons */}
                    <div className="flex items-center gap-1.5 justify-center sm:justify-start">
                      <Link
                        href={attendanceHref}
                        title="Mark Attendance"
                        className="p-2.5 bg-white/5 hover:bg-white/10 text-white/70 hover:text-white rounded-xl border border-white/10 transition-colors flex items-center gap-1 text-xs"
                      >
                        <Calendar className="w-3.5 h-3.5 text-blue-400" />
                        <span className="hidden sm:inline text-[11px]">Attendance</span>
                      </Link>

                      <Link
                        href={docsHref}
                        title="Document & OD Editor"
                        className="p-2.5 bg-white/5 hover:bg-white/10 text-white/70 hover:text-white rounded-xl border border-white/10 transition-colors flex items-center gap-1 text-xs"
                      >
                        <FileText className="w-3.5 h-3.5 text-amber-400" />
                        <span className="hidden sm:inline text-[11px]">Docs</span>
                      </Link>

                      <Link
                        href={certsHref}
                        title="Certificates"
                        className="p-2.5 bg-white/5 hover:bg-white/10 text-white/70 hover:text-white rounded-xl border border-white/10 transition-colors flex items-center gap-1 text-xs"
                      >
                        <ShieldCheck className="w-3.5 h-3.5 text-purple-400" />
                        <span className="hidden sm:inline text-[11px]">Certs</span>
                      </Link>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center text-xs text-orange-400/80 py-1">
                    <AlertCircle className="w-4 h-4 mr-2 shrink-0" />
                    <span>External management portal not configured</span>
                  </div>
                )}
              </div>

            </div>
          );
        })}
      </div>
    </div>
  );
}

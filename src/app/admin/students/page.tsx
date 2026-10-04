"use client";

import { useState, useEffect, useMemo } from "react";
import { collection, query, onSnapshot, serverTimestamp } from "firebase/firestore";
import { db, isFirebaseConfigured } from "@/lib/firebase/config";
import { ConnectUser, getAllUsers, createNotification } from "@/lib/firebase/users";
import { 
  GraduationCap, 
  Search, 
  Mail, 
  Send, 
  X, 
  LayoutGrid, 
  List, 
  Loader2, 
  Copy, 
  Check, 
  Calendar, 
  Building2, 
  Sparkles, 
  Info, 
  Rocket, 
  Award, 
  RefreshCw, 
  Users, 
  UserCheck, 
  ShieldCheck, 
  Globe, 
  ChevronDown 
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

// Notification type options matching existing notification infrastructure
const MESSAGE_TYPES = [
  {
    id: "system" as const,
    label: "System Alert",
    icon: Info,
    badge: "bg-amber-950/80 text-amber-300 border-amber-700/60",
    description: "Important notice, account alert, or general announcement",
  },
  {
    id: "event" as const,
    label: "Event Update",
    icon: Rocket,
    badge: "bg-purple-950/80 text-purple-300 border-purple-700/60",
    description: "Hackathon, workshop, or event-related communication",
  },
  {
    id: "project" as const,
    label: "Project",
    icon: Sparkles,
    badge: "bg-sky-950/80 text-sky-300 border-sky-700/60",
    description: "Project showcase review, feedback, or submission update",
  },
  {
    id: "certificate" as const,
    label: "Certificate",
    icon: Award,
    badge: "bg-emerald-950/80 text-emerald-300 border-emerald-700/60",
    description: "Certificate issued or credential notification",
  },
];

const STANDARD_DEPARTMENTS = [
  "CSE",
  "IT",
  "AI&ML",
  "DS",
  "ECE",
  "EEE",
  "MECH",
  "CIVIL",
];

const STANDARD_YEARS = [
  "1st Year",
  "2nd Year",
  "3rd Year",
  "4th Year",
];

const AVATAR_GRADIENTS = [
  "from-purple-600 to-indigo-600 text-purple-100",
  "from-pink-600 to-rose-600 text-pink-100",
  "from-emerald-600 to-teal-600 text-emerald-100",
  "from-blue-600 to-cyan-600 text-cyan-100",
  "from-amber-600 to-orange-600 text-amber-100",
  "from-violet-600 to-fuchsia-600 text-violet-100",
];

function getAvatarGradient(identifier: string) {
  let hash = 0;
  for (let i = 0; i < identifier.length; i++) {
    hash = identifier.charCodeAt(i) + ((hash << 5) - hash);
  }
  return AVATAR_GRADIENTS[Math.abs(hash) % AVATAR_GRADIENTS.length];
}

function getInitials(name: string) {
  if (!name) return "S";
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

function formatRegistrationDate(timestamp: any): string {
  if (!timestamp) return "N/A";
  let date: Date;
  if (timestamp?.toDate) {
    date = timestamp.toDate();
  } else if (timestamp?.toMillis) {
    date = new Date(timestamp.toMillis());
  } else if (timestamp instanceof Date) {
    date = timestamp;
  } else if (typeof timestamp === "string" || typeof timestamp === "number") {
    date = new Date(timestamp);
  } else {
    return "N/A";
  }
  if (isNaN(date.getTime())) return "N/A";
  return new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date);
}

export default function AdminStudentsPage() {
  const [students, setStudents] = useState<ConnectUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDepartment, setSelectedDepartment] = useState("All");
  const [selectedYear, setSelectedYear] = useState("All");
  const [selectedProvider, setSelectedProvider] = useState("All");
  const [viewMode, setViewMode] = useState<"grid" | "table">("grid");

  // Quick Copy Feedback State
  const [copiedItem, setCopiedItem] = useState<string | null>(null);

  // Message Composer Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<ConnectUser | null>(null);
  const [messageTitle, setMessageTitle] = useState("");
  const [messageBody, setMessageBody] = useState("");
  const [messageType, setMessageType] = useState<"system" | "event" | "project" | "certificate">("system");
  const [isSending, setIsSending] = useState(false);

  // ─── Realtime Students Subscription ──────────────────────────────
  useEffect(() => {
    if (!isFirebaseConfigured || !db) {
      getAllUsers()
        .then((data) => {
          setStudents(data);
        })
        .finally(() => {
          setLoading(false);
        });
      return;
    }

    try {
      const q = query(collection(db, "users"));
      const unsubscribe = onSnapshot(
        q,
        (snapshot) => {
          const studentList = snapshot.docs.map((docSnap) => ({
            uid: docSnap.id,
            ...docSnap.data(),
          })) as ConnectUser[];

          // Sort in descending order by registration date
          studentList.sort((a, b) => {
            const timeA = a.createdAt?.toMillis
              ? a.createdAt.toMillis()
              : a.createdAt
              ? new Date(a.createdAt).getTime()
              : 0;
            const timeB = b.createdAt?.toMillis
              ? b.createdAt.toMillis()
              : b.createdAt
              ? new Date(b.createdAt).getTime()
              : 0;
            return timeB - timeA;
          });

          setStudents(studentList);
          setLoading(false);
          setIsRefreshing(false);
        },
        (error) => {
          console.error("Realtime subscription error, falling back to getAllUsers:", error);
          getAllUsers()
            .then((data) => {
              setStudents(data);
            })
            .catch((err) => {
              console.error("Failed to load users:", err);
              toast.error("Failed to load students.");
            })
            .finally(() => {
              setLoading(false);
              setIsRefreshing(false);
            });
        }
      );

      return () => unsubscribe();
    } catch (err) {
      console.error("Firestore setup error:", err);
      setLoading(false);
    }
  }, []);

  const handleManualRefresh = async () => {
    setIsRefreshing(true);
    try {
      const data = await getAllUsers();
      data.sort((a, b) => {
        const timeA = a.createdAt?.toMillis
          ? a.createdAt.toMillis()
          : a.createdAt
          ? new Date(a.createdAt).getTime()
          : 0;
        const timeB = b.createdAt?.toMillis
          ? b.createdAt.toMillis()
          : b.createdAt
          ? new Date(b.createdAt).getTime()
          : 0;
        return timeB - timeA;
      });
      setStudents(data);
      toast.success("Student list refreshed");
    } catch (err) {
      console.error("Manual refresh error:", err);
      toast.error("Failed to refresh students");
    } finally {
      setIsRefreshing(false);
    }
  };

  // ─── Filter Options Calculation ──────────────────────────────────
  const departmentsList = useMemo(() => {
    const set = new Set<string>(STANDARD_DEPARTMENTS);
    students.forEach((s) => {
      if (s.department && s.department.trim()) {
        set.add(s.department.trim());
      }
    });
    return Array.from(set);
  }, [students]);

  const yearsList = useMemo(() => {
    const set = new Set<string>(STANDARD_YEARS);
    students.forEach((s) => {
      if (s.yearOfStudy && s.yearOfStudy.trim()) {
        set.add(s.yearOfStudy.trim());
      }
    });
    return Array.from(set);
  }, [students]);

  // ─── Filtering Logic ─────────────────────────────────────────────
  const filteredStudents = useMemo(() => {
    return students.filter((student) => {
      // 1. Department filter
      if (selectedDepartment !== "All") {
        if ((student.department || "").toLowerCase() !== selectedDepartment.toLowerCase()) {
          return false;
        }
      }

      // 2. Year of study filter
      if (selectedYear !== "All") {
        if ((student.yearOfStudy || "").toLowerCase() !== selectedYear.toLowerCase()) {
          return false;
        }
      }

      // 3. Provider filter
      if (selectedProvider !== "All") {
        if ((student.provider || "email").toLowerCase() !== selectedProvider.toLowerCase()) {
          return false;
        }
      }

      // 4. Search query (matches name, email, roll number)
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const nameMatch = (student.name || "").toLowerCase().includes(q);
        const emailMatch = (student.email || "").toLowerCase().includes(q);
        const rollMatch = (student.rollNo || "").toLowerCase().includes(q);
        if (!nameMatch && !emailMatch && !rollMatch) {
          return false;
        }
      }

      return true;
    });
  }, [students, selectedDepartment, selectedYear, selectedProvider, searchQuery]);

  // ─── Statistics Calculation ──────────────────────────────────────
  const stats = useMemo(() => {
    const total = students.length;
    const googleCount = students.filter((s) => s.provider === "google").length;
    const emailCount = students.filter((s) => s.provider === "email").length;
    const verifiedRollCount = students.filter((s) => Boolean(s.rollNo && s.rollNo.trim())).length;
    return {
      total,
      googleCount,
      emailCount,
      verifiedRollCount,
      deptCount: new Set(students.map((s) => s.department).filter(Boolean)).size,
    };
  }, [students]);

  // ─── Quick Copy Helper ───────────────────────────────────────────
  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedItem(text);
    toast.success(`Copied ${label}: ${text}`);
    setTimeout(() => setCopiedItem(null), 2000);
  };

  // ─── Modal Triggers ──────────────────────────────────────────────
  const handleOpenComposer = (student: ConnectUser) => {
    setSelectedStudent(student);
    setMessageTitle("");
    setMessageBody("");
    setMessageType("system");
    setIsModalOpen(true);
  };

  const handleCloseComposer = () => {
    setIsModalOpen(false);
    setSelectedStudent(null);
    setMessageTitle("");
    setMessageBody("");
    setIsSending(false);
  };

  // ─── Message Sending Handler ─────────────────────────────────────
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudent) return;

    if (!messageTitle.trim()) {
      toast.error("Please enter a message title.");
      return;
    }

    if (!messageBody.trim()) {
      toast.error("Please enter message content.");
      return;
    }

    setIsSending(true);
    try {
      await createNotification({
        userId: selectedStudent.uid,
        title: messageTitle.trim(),
        message: messageBody.trim(),
        type: messageType,
        read: false,
      });

      const studentName = selectedStudent.name?.trim() || selectedStudent.email || "student";
      toast.success(`Message sent to ${studentName}`);
      handleCloseComposer();
    } catch (error: any) {
      console.error("Error sending message to student:", error);
      toast.error(error?.message || "Failed to send message. Please try again.");
      setIsSending(false);
    }
  };

  const hasActiveFilters =
    searchQuery.trim() !== "" ||
    selectedDepartment !== "All" ||
    selectedYear !== "All" ||
    selectedProvider !== "All";

  const handleClearFilters = () => {
    setSearchQuery("");
    setSelectedDepartment("All");
    setSelectedYear("All");
    setSelectedProvider("All");
  };

  return (
    <div className="flex flex-col min-h-full pb-16 bg-transparent">
      {/* ──────────────────────────────────────────────────────────
          STICKY HEADER
      ────────────────────────────────────────────────────────── */}
      <header className="px-5 md:px-8 py-5 border-b border-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shrink-0 bg-[#0c0c0e]/95 backdrop-blur-md sticky top-0 z-20 shadow-lg">
        <div className="flex items-center space-x-3.5">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-purple-600/20 to-blue-600/20 border border-purple-500/30 flex items-center justify-center text-primary shadow-inner">
            <GraduationCap className="w-6 h-6 text-purple-400" />
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-xl md:text-2xl font-black font-heading text-white tracking-tight">
                Registered Students
              </h1>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-purple-500/10 border border-purple-500/20 text-purple-300">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Live Sync
              </span>
            </div>
            <p className="text-xs md:text-sm text-white/50 mt-0.5">
              Every student who created an account through the Connect Club portal
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 self-start sm:self-auto">
          <button
            onClick={handleManualRefresh}
            disabled={isRefreshing}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-semibold text-white/80 hover:text-white transition-all disabled:opacity-50"
            title="Refresh student list"
          >
            <RefreshCw className={cn("w-3.5 h-3.5", isRefreshing && "animate-spin text-purple-400")} />
            <span>Refresh</span>
          </button>
        </div>
      </header>

      <div className="p-4 md:p-8 space-y-6 flex-1">
        {/* ──────────────────────────────────────────────────────────
            METRIC CARDS
        ────────────────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 md:gap-4">
          <div className="p-4 md:p-5 rounded-2xl bg-[#0c0c0e] border border-white/5 flex items-center space-x-4 shadow-sm">
            <div className="w-11 h-11 rounded-2xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center shrink-0">
              <Users className="w-5 h-5 text-purple-400" />
            </div>
            <div>
              <div className="text-xl md:text-2xl font-black font-heading text-white">
                {stats.total}
              </div>
              <div className="text-xs text-white/50 font-medium">Total Registered</div>
            </div>
          </div>

          <div className="p-4 md:p-5 rounded-2xl bg-[#0c0c0e] border border-white/5 flex items-center space-x-4 shadow-sm">
            <div className="w-11 h-11 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center shrink-0">
              <Building2 className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <div className="text-xl md:text-2xl font-black font-heading text-white">
                {stats.deptCount}
              </div>
              <div className="text-xs text-white/50 font-medium">Departments</div>
            </div>
          </div>

          <div className="p-4 md:p-5 rounded-2xl bg-[#0c0c0e] border border-white/5 flex items-center space-x-4 shadow-sm">
            <div className="w-11 h-11 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0">
              <UserCheck className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <div className="text-xl md:text-2xl font-black font-heading text-white">
                {stats.verifiedRollCount}
              </div>
              <div className="text-xs text-white/50 font-medium">Roll Numbers Provided</div>
            </div>
          </div>

          <div className="p-4 md:p-5 rounded-2xl bg-[#0c0c0e] border border-white/5 flex items-center space-x-4 shadow-sm">
            <div className="w-11 h-11 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center shrink-0">
              <Globe className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <div className="text-xl md:text-2xl font-black font-heading text-white">
                {stats.googleCount} / {stats.emailCount}
              </div>
              <div className="text-xs text-white/50 font-medium">Google / Email Auth</div>
            </div>
          </div>
        </div>

        {/* ──────────────────────────────────────────────────────────
            SEARCH & FILTER CONTROL BAR
        ────────────────────────────────────────────────────────── */}
        <div className="p-4 rounded-3xl bg-[#0c0c0e] border border-white/5 space-y-3.5 shadow-md">
          <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
            {/* Search Input */}
            <div className="relative flex-1 min-w-[260px]">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-white/40" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by student name, email, roll number..."
                className="w-full pl-10 pr-9 py-2.5 bg-black/40 border border-white/10 rounded-2xl text-xs md:text-sm text-white placeholder-white/30 focus:outline-none focus:border-primary transition-all"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Filter Dropdowns & View Mode Toggle */}
            <div className="flex flex-wrap items-center gap-2.5">
              {/* Department Dropdown */}
              <div className="relative min-w-[140px] flex-1 sm:flex-initial">
                <select
                  value={selectedDepartment}
                  onChange={(e) => setSelectedDepartment(e.target.value)}
                  className="w-full appearance-none bg-black/40 border border-white/10 rounded-2xl px-3.5 py-2.5 pr-8 text-xs font-medium text-white focus:outline-none focus:border-primary transition-all cursor-pointer"
                >
                  <option value="All" className="bg-[#121218] text-white">
                    All Departments
                  </option>
                  {departmentsList.map((dept) => (
                    <option key={dept} value={dept} className="bg-[#121218] text-white">
                      {dept}
                    </option>
                  ))}
                </select>
                <ChevronDown className="w-3.5 h-3.5 absolute right-3 top-1/2 -translate-y-1/2 text-white/40 pointer-events-none" />
              </div>

              {/* Year Dropdown */}
              <div className="relative min-w-[130px] flex-1 sm:flex-initial">
                <select
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(e.target.value)}
                  className="w-full appearance-none bg-black/40 border border-white/10 rounded-2xl px-3.5 py-2.5 pr-8 text-xs font-medium text-white focus:outline-none focus:border-primary transition-all cursor-pointer"
                >
                  <option value="All" className="bg-[#121218] text-white">
                    All Years
                  </option>
                  {yearsList.map((year) => (
                    <option key={year} value={year} className="bg-[#121218] text-white">
                      {year}
                    </option>
                  ))}
                </select>
                <ChevronDown className="w-3.5 h-3.5 absolute right-3 top-1/2 -translate-y-1/2 text-white/40 pointer-events-none" />
              </div>

              {/* Provider Dropdown */}
              <div className="relative min-w-[125px] flex-1 sm:flex-initial">
                <select
                  value={selectedProvider}
                  onChange={(e) => setSelectedProvider(e.target.value)}
                  className="w-full appearance-none bg-black/40 border border-white/10 rounded-2xl px-3.5 py-2.5 pr-8 text-xs font-medium text-white focus:outline-none focus:border-primary transition-all cursor-pointer"
                >
                  <option value="All" className="bg-[#121218] text-white">
                    All Auth
                  </option>
                  <option value="google" className="bg-[#121218] text-white">
                    Google
                  </option>
                  <option value="email" className="bg-[#121218] text-white">
                    Email
                  </option>
                </select>
                <ChevronDown className="w-3.5 h-3.5 absolute right-3 top-1/2 -translate-y-1/2 text-white/40 pointer-events-none" />
              </div>

              {/* View Mode Toggle */}
              <div className="flex items-center bg-black/40 border border-white/10 rounded-2xl p-1 shrink-0">
                <button
                  onClick={() => setViewMode("grid")}
                  className={cn(
                    "p-2 rounded-xl transition-all",
                    viewMode === "grid"
                      ? "bg-primary text-white shadow-sm"
                      : "text-white/40 hover:text-white"
                  )}
                  title="Grid View"
                >
                  <LayoutGrid className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setViewMode("table")}
                  className={cn(
                    "p-2 rounded-xl transition-all",
                    viewMode === "table"
                      ? "bg-primary text-white shadow-sm"
                      : "text-white/40 hover:text-white"
                  )}
                  title="Table View"
                >
                  <List className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Active Filter Chips & Counter */}
          <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-white/5 text-xs">
            <div className="text-white/50">
              Showing <span className="font-bold text-white">{filteredStudents.length}</span> of{" "}
              <span className="font-semibold text-white/80">{students.length}</span> students
            </div>

            {hasActiveFilters && (
              <button
                onClick={handleClearFilters}
                className="text-xs text-purple-400 hover:text-purple-300 font-semibold underline underline-offset-4 flex items-center gap-1"
              >
                Reset filters
              </button>
            )}
          </div>
        </div>

        {/* ──────────────────────────────────────────────────────────
            STUDENT LISTING (GRID OR TABLE)
        ────────────────────────────────────────────────────────── */}
        {loading ? (
          <div className="p-16 rounded-3xl bg-[#0c0c0e] border border-white/5 flex flex-col items-center justify-center space-y-3">
            <Loader2 className="w-8 h-8 text-primary animate-spin" />
            <p className="text-xs text-white/50">Loading student directory...</p>
          </div>
        ) : filteredStudents.length === 0 ? (
          <div className="p-16 rounded-3xl bg-[#0c0c0e] border border-white/5 flex flex-col items-center justify-center text-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center text-white/30">
              <GraduationCap className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-white">No students found</h3>
            <p className="text-xs text-white/40 max-w-sm">
              {hasActiveFilters
                ? "No registered students matched your active filters or search term."
                : "No registered students found in the database yet."}
            </p>
            {hasActiveFilters && (
              <button
                onClick={handleClearFilters}
                className="mt-2 px-4 py-2 rounded-xl text-xs font-semibold bg-white/10 hover:bg-white/15 text-white transition-all"
              >
                Clear all filters
              </button>
            )}
          </div>
        ) : viewMode === "grid" ? (
          /* ─── GRID VIEW ─────────────────────────────────────── */
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            <AnimatePresence>
              {filteredStudents.map((student) => {
                const gradient = getAvatarGradient(student.uid || student.email || "student");
                const initials = getInitials(student.name);

                return (
                  <motion.div
                    key={student.uid}
                    layout
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="p-5 rounded-3xl bg-[#0c0c0e] border border-white/5 hover:border-white/15 transition-all flex flex-col justify-between group shadow-sm hover:shadow-xl"
                  >
                    <div>
                      {/* Card Header: Avatar, Name, Email, Provider */}
                      <div className="flex items-start gap-3.5 mb-4">
                        {student.photoURL ? (
                          <img
                            src={student.photoURL}
                            alt={student.name || "Student"}
                            className="w-12 h-12 rounded-2xl object-cover border border-white/10 shrink-0"
                          />
                        ) : (
                          <div
                            className={cn(
                              "w-12 h-12 rounded-2xl bg-gradient-to-tr flex items-center justify-center text-sm font-black shrink-0 border border-white/10 shadow-inner",
                              gradient
                            )}
                          >
                            {initials}
                          </div>
                        )}

                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-2">
                            <h3 className="text-sm font-bold text-white truncate group-hover:text-purple-300 transition-colors">
                              {student.name || "Unnamed Student"}
                            </h3>
                            {student.provider === "google" ? (
                              <span
                                className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-500/10 border border-blue-500/20 text-blue-300 shrink-0"
                                title="Google Account"
                              >
                                Google
                              </span>
                            ) : (
                              <span
                                className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-white/5 border border-white/10 text-white/50 shrink-0"
                                title="Email Account"
                              >
                                Email
                              </span>
                            )}
                          </div>

                          <div
                            onClick={() => handleCopy(student.email, "Email")}
                            className="text-xs text-white/50 truncate hover:text-white cursor-pointer transition-colors mt-0.5 flex items-center gap-1"
                            title="Click to copy email"
                          >
                            <span className="truncate">{student.email}</span>
                            {copiedItem === student.email ? (
                              <Check className="w-3 h-3 text-emerald-400 shrink-0" />
                            ) : null}
                          </div>
                        </div>
                      </div>

                      {/* Roll Number, Department, Year Badges */}
                      <div className="flex flex-wrap items-center gap-1.5 mb-4">
                        {student.rollNo ? (
                          <button
                            type="button"
                            onClick={() => handleCopy(student.rollNo, "Roll Number")}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-mono font-bold bg-purple-950/40 border border-purple-500/30 text-purple-300 hover:bg-purple-900/40 transition-colors"
                            title="Click to copy roll number"
                          >
                            <span>{student.rollNo}</span>
                            {copiedItem === student.rollNo ? (
                              <Check className="w-3 h-3 text-emerald-400" />
                            ) : (
                              <Copy className="w-3 h-3 text-purple-400/60" />
                            )}
                          </button>
                        ) : (
                          <span className="px-2.5 py-1 rounded-xl text-xs font-mono text-white/30 bg-white/[0.02] border border-white/5">
                            No Roll No
                          </span>
                        )}

                        {student.department && (
                          <span className="px-2.5 py-1 rounded-xl text-xs font-semibold bg-white/5 border border-white/10 text-white/80">
                            {student.department}
                          </span>
                        )}

                        {student.yearOfStudy && (
                          <span className="px-2.5 py-1 rounded-xl text-xs font-semibold bg-white/5 border border-white/10 text-white/60">
                            {student.yearOfStudy}
                          </span>
                        )}
                      </div>

                      {/* Footer Info: Phone, Registration Date */}
                      <div className="space-y-1.5 py-2.5 border-t border-white/5 text-[11px] text-white/40">
                        {student.phone && (
                          <div className="flex items-center justify-between">
                            <span>Phone:</span>
                            <span className="text-white/70 font-mono">{student.phone}</span>
                          </div>
                        )}
                        <div className="flex items-center justify-between">
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            Registered:
                          </span>
                          <span className="text-white/60">
                            {formatRegistrationDate(student.createdAt)}
                          </span>
                        </div>
                        {(student.projectsCount > 0 || student.certificatesCount > 0) && (
                          <div className="flex items-center justify-between pt-1">
                            <span>Activity:</span>
                            <span className="text-purple-300 font-medium">
                              {student.projectsCount || 0} projects · {student.certificatesCount || 0} certs
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Action Button: Message */}
                    <div className="pt-3 border-t border-white/5 mt-2">
                      <button
                        onClick={() => handleOpenComposer(student)}
                        className="w-full py-2.5 px-3 rounded-2xl bg-primary hover:bg-primary/90 text-white font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-md group-hover:scale-[1.01]"
                      >
                        <Send className="w-3.5 h-3.5" />
                        <span>Message</span>
                      </button>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        ) : (
          /* ─── TABLE VIEW ────────────────────────────────────── */
          <div className="rounded-3xl bg-[#0c0c0e] border border-white/5 overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-white/70">
                <thead className="bg-black/40 text-[11px] uppercase font-bold text-white/40 border-b border-white/5">
                  <tr>
                    <th className="py-3.5 px-5">Student</th>
                    <th className="py-3.5 px-4">Roll Number</th>
                    <th className="py-3.5 px-4">Department</th>
                    <th className="py-3.5 px-4">Year</th>
                    <th className="py-3.5 px-4">Auth Provider</th>
                    <th className="py-3.5 px-4">Joined Date</th>
                    <th className="py-3.5 px-5 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {filteredStudents.map((student) => {
                    const gradient = getAvatarGradient(student.uid || student.email || "student");
                    const initials = getInitials(student.name);

                    return (
                      <tr key={student.uid} className="hover:bg-white/[0.02] transition-colors">
                        {/* Student Name & Avatar */}
                        <td className="py-3.5 px-5">
                          <div className="flex items-center gap-3">
                            {student.photoURL ? (
                              <img
                                src={student.photoURL}
                                alt={student.name || "Student"}
                                className="w-9 h-9 rounded-xl object-cover border border-white/10 shrink-0"
                              />
                            ) : (
                              <div
                                className={cn(
                                  "w-9 h-9 rounded-xl bg-gradient-to-tr flex items-center justify-center text-xs font-black shrink-0 border border-white/10",
                                  gradient
                                )}
                              >
                                {initials}
                              </div>
                            )}
                            <div className="min-w-0">
                              <div className="font-bold text-white truncate">
                                {student.name || "Unnamed Student"}
                              </div>
                              <div
                                onClick={() => handleCopy(student.email, "Email")}
                                className="text-[11px] text-white/40 hover:text-white cursor-pointer truncate max-w-[200px]"
                                title="Click to copy email"
                              >
                                {student.email}
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Roll Number */}
                        <td className="py-3.5 px-4">
                          {student.rollNo ? (
                            <button
                              type="button"
                              onClick={() => handleCopy(student.rollNo, "Roll Number")}
                              className="inline-flex items-center gap-1 font-mono font-bold text-purple-300 bg-purple-950/40 border border-purple-500/20 px-2 py-0.5 rounded-lg text-xs hover:bg-purple-900/40"
                              title="Click to copy"
                            >
                              <span>{student.rollNo}</span>
                              {copiedItem === student.rollNo ? (
                                <Check className="w-3 h-3 text-emerald-400" />
                              ) : null}
                            </button>
                          ) : (
                            <span className="text-white/30 text-xs">--</span>
                          )}
                        </td>

                        {/* Department */}
                        <td className="py-3.5 px-4 font-medium text-white/80">
                          {student.department || "--"}
                        </td>

                        {/* Year */}
                        <td className="py-3.5 px-4 text-white/60">
                          {student.yearOfStudy || "--"}
                        </td>

                        {/* Auth Provider */}
                        <td className="py-3.5 px-4">
                          {student.provider === "google" ? (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-500/10 border border-blue-500/20 text-blue-300">
                              Google
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-white/5 border border-white/10 text-white/50">
                              Email
                            </span>
                          )}
                        </td>

                        {/* Joined Date */}
                        <td className="py-3.5 px-4 text-white/50 whitespace-nowrap">
                          {formatRegistrationDate(student.createdAt)}
                        </td>

                        {/* Message Button */}
                        <td className="py-3.5 px-5 text-right">
                          <button
                            onClick={() => handleOpenComposer(student)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-primary hover:bg-primary/90 text-white font-bold text-xs transition-all shadow-sm"
                          >
                            <Send className="w-3 h-3" />
                            <span>Message</span>
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* ──────────────────────────────────────────────────────────
          MESSAGE COMPOSER MODAL
      ────────────────────────────────────────────────────────── */}
      <AnimatePresence>
        {isModalOpen && selectedStudent && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={handleCloseComposer}
              className="absolute inset-0 bg-black/75 backdrop-blur-sm"
            />

            {/* Modal Dialog */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 16 }}
              transition={{ type: "spring", duration: 0.3 }}
              className="relative w-full max-w-lg bg-[#0E0E12] border border-white/10 rounded-3xl p-6 md:p-7 shadow-2xl z-10 overflow-hidden"
            >
              {/* Top Accent Strip */}
              <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-purple-500 via-primary to-blue-500" />

              {/* Modal Header */}
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-primary">
                    <Mail className="w-4 h-4 text-purple-400" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white leading-tight">
                      Send Student Message
                    </h3>
                    <p className="text-[11px] text-white/50">
                      Delivered instantly to student's notification inbox
                    </p>
                  </div>
                </div>

                <button
                  onClick={handleCloseComposer}
                  className="p-1.5 rounded-xl text-white/40 hover:text-white hover:bg-white/5 transition-all"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Recipient Card */}
              <div className="p-3 rounded-2xl bg-white/[0.03] border border-white/5 mb-5 flex items-center gap-3">
                {selectedStudent.photoURL ? (
                  <img
                    src={selectedStudent.photoURL}
                    alt={selectedStudent.name || "Student"}
                    className="w-10 h-10 rounded-xl object-cover border border-white/10 shrink-0"
                  />
                ) : (
                  <div
                    className={cn(
                      "w-10 h-10 rounded-xl bg-gradient-to-tr flex items-center justify-center text-xs font-black shrink-0 border border-white/10",
                      getAvatarGradient(selectedStudent.uid || selectedStudent.email)
                    )}
                  >
                    {getInitials(selectedStudent.name)}
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-white text-xs truncate">
                      {selectedStudent.name || "Unnamed Student"}
                    </span>
                    {selectedStudent.rollNo && (
                      <span className="text-[10px] font-mono font-bold text-purple-300 bg-purple-950/40 px-2 py-0.5 rounded-md border border-purple-500/20">
                        {selectedStudent.rollNo}
                      </span>
                    )}
                  </div>
                  <div className="text-[11px] text-white/40 truncate mt-0.5">
                    {selectedStudent.email}
                  </div>
                </div>
              </div>

              {/* Composer Form */}
              <form onSubmit={handleSendMessage} className="space-y-4">
                {/* Title */}
                <div>
                  <label className="block text-xs font-bold text-white/70 mb-1.5">
                    Message Title <span className="text-purple-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={messageTitle}
                    onChange={(e) => setMessageTitle(e.target.value)}
                    placeholder="e.g. Welcome to Connect Club, Roll verification update..."
                    className="w-full px-3.5 py-2.5 rounded-2xl bg-black/40 border border-white/10 text-xs text-white placeholder-white/30 focus:outline-none focus:border-primary transition-all"
                  />
                </div>

                {/* Notification Type Selector */}
                <div>
                  <label className="block text-xs font-bold text-white/70 mb-1.5">
                    Notification Category
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {MESSAGE_TYPES.map((t) => {
                      const Icon = t.icon;
                      const isSelected = messageType === t.id;
                      return (
                        <button
                          key={t.id}
                          type="button"
                          onClick={() => setMessageType(t.id)}
                          className={cn(
                            "flex items-center gap-2 p-2.5 rounded-xl border text-left transition-all",
                            isSelected
                              ? "bg-purple-950/60 border-purple-500 text-white shadow-sm"
                              : "bg-black/30 border-white/5 text-white/60 hover:text-white hover:bg-white/5"
                          )}
                        >
                          <Icon className={cn("w-3.5 h-3.5 shrink-0", isSelected ? "text-purple-300" : "text-white/40")} />
                          <div className="min-w-0">
                            <div className="text-xs font-bold leading-tight truncate">
                              {t.label}
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Message Body */}
                <div>
                  <label className="block text-xs font-bold text-white/70 mb-1.5">
                    Message Body <span className="text-purple-400">*</span>
                  </label>
                  <textarea
                    required
                    rows={4}
                    value={messageBody}
                    onChange={(e) => setMessageBody(e.target.value)}
                    placeholder="Type your message here. The student will be able to read this inside their personal notification inbox (/u/notifications)..."
                    className="w-full p-3.5 rounded-2xl bg-black/40 border border-white/10 text-xs text-white placeholder-white/30 focus:outline-none focus:border-primary transition-all resize-none leading-relaxed"
                  />
                </div>

                {/* Modal Actions */}
                <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-white/5">
                  <button
                    type="button"
                    onClick={handleCloseComposer}
                    disabled={isSending}
                    className="px-4 py-2.5 rounded-xl text-xs font-bold text-white/60 hover:text-white hover:bg-white/5 transition-all"
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    disabled={isSending || !messageTitle.trim() || !messageBody.trim()}
                    className="px-5 py-2.5 rounded-xl bg-primary hover:bg-primary/90 text-white text-xs font-bold flex items-center gap-2 transition-all shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSending ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Sending...</span>
                      </>
                    ) : (
                      <>
                        <Send className="w-3.5 h-3.5" />
                        <span>Send Message</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

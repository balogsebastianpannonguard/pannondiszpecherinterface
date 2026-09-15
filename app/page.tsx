"use client";

import React, { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Calendar,
  Clock,
  MapPin,
  User,
  Phone,
  Users,
  Briefcase,
  Plane,
  Car,
  Crown,
  Handshake,
  LogOut,
  Menu,
  X,
  Search,
  Plus,
  Mail,
  UsersRound,
  Grid3X3,
  Loader2,
  Timer,
  ChevronRight,
  Bell,
  CheckCircle2,
  XCircle,
} from "lucide-react";

/* ────────────────────────── Types ────────────────────────── */

interface Booking {
  _id?: string;
  bookingCode: string;
  travelerName: string;
  travelerPhone: string;
  fromAddress: string;
  toAddress: string;
  pickupDate: string;
  pickupTime: string;
  travelers: number;
  category: string;
  status: string;
  assignedDriverName?: string;
  comment?: string;
  transferType?: string;
  companyName?: string;
  luggage?: number;
}

interface UserInfo {
  email: string;
  name: string;
  role: string;
  company?: string;
}

/* ────────────────────────── Helpers ────────────────────────── */

const HU_MONTHS = [
  "január", "február", "március", "április", "május", "június",
  "július", "augusztus", "szeptember", "október", "november", "december",
];

const HU_DAYS_SHORT = ["H", "K", "Sze", "Cs", "P", "Szo", "V"];
const HU_DAYS_LONG = ["vasárnap", "hétfő", "kedd", "szerda", "csütörtök", "péntek", "szombat"];

function pad2(n: number) { return String(n).padStart(2, "0"); }

function dateToStr(d: Date) {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

function parseTime(t: string): number {
  const [h, m] = t.split(":").map(Number);
  return (h || 0) * 60 + (m || 0);
}

function getTimeDisplay(t: string): { hours: string; mins: string } {
  const [h, m] = t.split(":");
  return { hours: h || "0", mins: m || "00" };
}

/** Get Monday of the week containing the given date */
function getWeekStart(d: Date): Date {
  const date = new Date(d);
  const day = date.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  date.setDate(date.getDate() + diff);
  date.setHours(0, 0, 0, 0);
  return date;
}

/** Get 7 days of a week */
function getWeekDays(d: Date): Date[] {
  const monday = getWeekStart(d);
  const days: Date[] = [];
  for (let i = 0; i < 7; i++) {
    const day = new Date(monday);
    day.setDate(monday.getDate() + i);
    days.push(day);
  }
  return days;
}

/** Generate an array of dates from startDate for N days */
function generateDayRange(center: Date, pastDays: number, futureDays: number): Date[] {
  const days: Date[] = [];
  for (let i = -pastDays; i <= futureDays; i++) {
    const d = new Date(center);
    d.setDate(center.getDate() + i);
    d.setHours(0, 0, 0, 0);
    days.push(d);
  }
  return days;
}

/** Countdown to next booking */
function getCountdown(bookings: Booking[], now: Date): string | null {
  const todayStr = dateToStr(now);
  const nowMins = now.getHours() * 60 + now.getMinutes();

  const upcoming = bookings
    .filter((b) => {
      if (b.pickupDate > todayStr) return true;
      if (b.pickupDate === todayStr && parseTime(b.pickupTime) > nowMins) return true;
      return false;
    })
    .sort((a, b) => {
      if (a.pickupDate !== b.pickupDate) return a.pickupDate < b.pickupDate ? -1 : 1;
      return parseTime(a.pickupTime) - parseTime(b.pickupTime);
    });

  if (upcoming.length === 0) return null;

  const next = upcoming[0];
  const [nh, nm] = next.pickupTime.split(":").map(Number);
  const nextDate = new Date(next.pickupDate + "T00:00:00");
  nextDate.setHours(nh || 0, nm || 0, 0, 0);

  const diffMs = nextDate.getTime() - now.getTime();
  if (diffMs <= 0) return null;

  const diffMins = Math.floor(diffMs / 60000);
  const hours = Math.floor(diffMins / 60);
  const mins = diffMins % 60;

  if (hours === 0 && mins === 0) return "Kezdés most";
  if (hours === 0) return `Kezdés ${mins} p múlva`;
  return `Kezdés ${hours} ó ${mins} p múlva`;
}

/** Get event color based on category/status */
function getEventStyle(booking: Booking): { bg: string; text: string; border: string } {
  if (booking.status === "cancelled") {
    return { bg: "rgba(75, 85, 99, 0.25)", text: "#9ca3af", border: "#4b5563" };
  }
  switch (booking.category) {
    case "airport":
      return { bg: "rgba(6, 182, 212, 0.18)", text: "#22d3ee", border: "#06b6d4" };
    case "city":
      return { bg: "rgba(34, 197, 94, 0.18)", text: "#4ade80", border: "#22c55e" };
    case "long-distance":
      return { bg: "rgba(168, 85, 247, 0.18)", text: "#c084fc", border: "#a855f7" };
    case "vip":
      return { bg: "rgba(234, 179, 8, 0.18)", text: "#fde047", border: "#eab308" };
    case "partner":
      return { bg: "rgba(190, 24, 93, 0.2)", text: "#f472b6", border: "#be185d" };
    default:
      return { bg: "rgba(6, 182, 212, 0.18)", text: "#22d3ee", border: "#06b6d4" };
  }
}

function getStatusLabel(status: string) {
  switch (status) {
    case "pending": return "Függőben";
    case "confirmed": return "Visszaigazolva";
    case "in-progress": return "Folyamatban";
    case "completed": return "Befejezve";
    case "cancelled": return "Törölve";
    case "modified": return "Módosítva";
    default: return status;
  }
}

function shortenAddress(addr: string): string {
  if (!addr) return "";
  if (addr.length > 32) return addr.substring(0, 30) + "…";
  return addr;
}

/* ────────────────────────── Component ────────────────────────── */

const PAST_DAYS = 14;
const FUTURE_DAYS = 60;

export default function CalendarPage() {
  const router = useRouter();
  const [user, setUser] = useState<UserInfo | null>(null);
  const [authChecked, setAuthChecked] = useState(false);

  const [now, setNow] = useState(new Date());
  const todayRef = useRef(new Date());
  todayRef.current.setHours(0, 0, 0, 0);

  const [selectedDate, setSelectedDate] = useState(() => {
    const d = new Date(); d.setHours(0, 0, 0, 0); return d;
  });
  const [weekOffset, setWeekOffset] = useState(0);

  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(false);
  const fetchedMonthsRef = useRef<Set<string>>(new Set());

  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [sideMenuOpen, setSideMenuOpen] = useState(false);
  const [approvalsOpen, setApprovalsOpen] = useState(false);
  const [pendingApprovals, setPendingApprovals] = useState<any[]>([]);
  const [loadingApprovals, setLoadingApprovals] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);
  const dayRefs = useRef<Map<string, HTMLDivElement>>(new Map());

  // Touch tracking for week swipe
  const touchStartX = useRef(0);
  const touchStartY = useRef(0);

  /* ── Clock ── */
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 30000);
    return () => clearInterval(timer);
  }, []);

  /* ── Week ── */
  const baseWeekDate = useMemo(() => {
    const d = new Date(todayRef.current);
    d.setDate(d.getDate() + weekOffset * 7);
    return d;
  }, [weekOffset]);

  const weekDays = useMemo(() => getWeekDays(baseWeekDate), [baseWeekDate]);

  const displayMonth = selectedDate.getMonth();
  const displayYear = selectedDate.getFullYear();

  /* ── All days for infinite scroll ── */
  const allDays = useMemo(() => {
    return generateDayRange(todayRef.current, PAST_DAYS, FUTURE_DAYS);
  }, []);

  /* ── Auth ── */
  useEffect(() => {
    fetch("/api/auth/session", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => {
        if (d.authenticated && d.user) setUser(d.user);
        else router.replace("/login");
      })
      .catch(() => router.replace("/login"))
      .finally(() => setAuthChecked(true));
  }, [router]);

  /* ── Fetch bookings per month (deduplicated) ── */
  const fetchMonth = useCallback(async (year: number, month: number) => {
    const key = `${year}-${month}`;
    if (fetchedMonthsRef.current.has(key)) return;
    fetchedMonthsRef.current.add(key);

    setLoading(true);
    try {
      const res = await fetch(`/api/bookings?year=${year}&month=${month}`, { cache: "no-store" });
      const data = await res.json();
      if (data.success && data.bookings) {
        setBookings((prev) => {
          const existing = new Set(prev.map((b) => b._id || b.bookingCode));
          const fresh = data.bookings.filter((b: Booking) => !existing.has(b._id || b.bookingCode));
          return [...prev, ...fresh];
        });
      }
    } catch (err) {
      console.error("Failed to fetch bookings", err);
      fetchedMonthsRef.current.delete(key); // retry on error
    } finally {
      setLoading(false);
    }
  }, []);

  /* ── Fetch all months the scroll range touches ── */
  useEffect(() => {
    if (!user) return;
    const monthsToFetch = new Set<string>();
    for (const d of allDays) {
      monthsToFetch.add(`${d.getFullYear()}-${d.getMonth()}`);
    }
    monthsToFetch.forEach((m) => {
      const [y, mo] = m.split("-").map(Number);
      fetchMonth(y, mo);
    });
  }, [user, allDays, fetchMonth]);

  /* ── Fetch Pending Approvals (admin only) ── */
  const fetchApprovals = useCallback(async () => {
    if (!user || user.role !== "admin") return;
    try {
      const res = await fetch("/api/price-approvals");
      const data = await res.json();
      if (data.success) {
        setPendingApprovals(data.approvals || []);
      }
    } catch (err) {
      console.error("Failed to fetch approvals", err);
    }
  }, [user]);

  useEffect(() => {
    fetchApprovals();
    const interval = setInterval(fetchApprovals, 30000); // 30 mp
    return () => clearInterval(interval);
  }, [fetchApprovals]);

  const handleApprovalDecision = async (id: string, decision: "approved" | "rejected") => {
    setLoadingApprovals(true);
    try {
      const res = await fetch(`/api/price-approvals/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ decision }),
      });
      if (res.ok) {
        setPendingApprovals((prev) => prev.filter((a) => a._id !== id));
      }
    } catch (err) {
      console.error("Error making decision", err);
    } finally {
      setLoadingApprovals(false);
    }
  };

  /* ── Booking lookup by date ── */
  const bookingsByDate = useMemo(() => {
    const map: Record<string, Booking[]> = {};
    for (const b of bookings) {
      if (!map[b.pickupDate]) map[b.pickupDate] = [];
      map[b.pickupDate].push(b);
    }
    // Sort each day's bookings by time
    for (const key of Object.keys(map)) {
      map[key].sort((a, b) => parseTime(a.pickupTime) - parseTime(b.pickupTime));
    }
    return map;
  }, [bookings]);

  const bookingCountByDay = useMemo(() => {
    const map: Record<string, number> = {};
    for (const b of bookings) {
      map[b.pickupDate] = (map[b.pickupDate] || 0) + 1;
    }
    return map;
  }, [bookings]);

  /* ── Countdown ── */
  const countdown = useMemo(() => getCountdown(bookings, now), [bookings, now]);

  /* ── Scroll to selected date ── */
  const scrollToDate = useCallback((d: Date) => {
    const ds = dateToStr(d);
    requestAnimationFrame(() => {
      const el = dayRefs.current.get(ds);
      if (el && scrollRef.current) {
        const containerTop = scrollRef.current.getBoundingClientRect().top;
        const elTop = el.getBoundingClientRect().top;
        scrollRef.current.scrollTop += elTop - containerTop;
      }
    });
  }, []);

  /* ── Track which day is visible at top while scrolling ── */
  const handleScroll = useCallback(() => {
    if (!scrollRef.current) return;
    const container = scrollRef.current;
    const containerTop = container.getBoundingClientRect().top + 10;

    // Find the first visible day section
    for (const [ds, el] of dayRefs.current.entries()) {
      const rect = el.getBoundingClientRect();
      if (rect.bottom > containerTop) {
        const parts = ds.split("-").map(Number);
        const d = new Date(parts[0], parts[1] - 1, parts[2]);
        d.setHours(0, 0, 0, 0);

        // Update selected date without triggering scroll
        setSelectedDate((prev) => {
          if (dateToStr(prev) !== ds) return d;
          return prev;
        });

        // Update week offset if needed
        const todayMs = todayRef.current.getTime();
        const dMs = getWeekStart(d).getTime();
        const todayWeekMs = getWeekStart(todayRef.current).getTime();
        const weekDiff = Math.round((dMs - todayWeekMs) / (7 * 24 * 60 * 60 * 1000));
        setWeekOffset((prev) => {
          if (prev !== weekDiff) return weekDiff;
          return prev;
        });

        break;
      }
    }
  }, []);

  /* ── Initial scroll to today ── */
  useEffect(() => {
    if (user && !loading) {
      const timer = setTimeout(() => scrollToDate(todayRef.current), 200);
      return () => clearTimeout(timer);
    }
  }, [user, loading, scrollToDate]);

  /* ── Select day from week strip ── */
  const selectDayFromStrip = (d: Date) => {
    setSelectedDate(new Date(d));
    scrollToDate(d);
  };

  /* ── Week swipe on strip ── */
  const handleWeekTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
  };

  const handleWeekTouchEnd = (e: React.TouchEvent) => {
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    const dy = e.changedTouches[0].clientY - touchStartY.current;
    if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 50) {
      if (dx < 0) {
        // Swipe left → next week
        setWeekOffset((v) => v + 1);
      } else {
        // Swipe right → prev week
        setWeekOffset((v) => v - 1);
      }
    }
  };

  /* ── Nav ── */
  const goToToday = () => {
    setWeekOffset(0);
    setSelectedDate(new Date(todayRef.current));
    scrollToDate(todayRef.current);
  };

  /* ── Logout ── */
  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.replace("/login");
  };

  /* ── Computed ── */
  const todayStr = dateToStr(todayRef.current);
  const selectedDateStr = dateToStr(selectedDate);

  /* ── Loading ── */
  if (!authChecked) {
    return (
      <div className="h-screen flex items-center justify-center" style={{ background: '#0d1117' }}>
        <Loader2 className="w-8 h-8 text-[#0078d4] animate-spin" />
      </div>
    );
  }
  if (!user) return null;

  const userInitial = user.name ? user.name.charAt(0).toUpperCase() : "D";

  return (
    <div className="h-screen flex flex-col overflow-hidden" style={{ background: '#0d1117' }}>

      {/* ═══════════════ TOP HEADER ═══════════════ */}
      <header className="relative z-30 flex items-center justify-between px-4 h-[52px] shrink-0"
        style={{ background: '#0d1117' }}
      >
        <button onClick={() => setSideMenuOpen(true)}
          className="w-9 h-9 flex items-center justify-center rounded-lg text-slate-400 hover:text-white active:scale-95 transition-all"
        >
          <Menu className="w-[22px] h-[22px]" />
        </button>

        <h1 className="text-[18px] font-bold text-white tracking-tight">
          {HU_MONTHS[displayMonth]}
          {displayYear !== todayRef.current.getFullYear() && (
            <span className="text-slate-500 font-normal ml-1.5 text-[14px]">{displayYear}</span>
          )}
        </h1>

        <div className="flex items-center gap-1">
          {user.role === "admin" && (
            <button
              onClick={() => setApprovalsOpen(true)}
              className="relative w-9 h-9 flex items-center justify-center rounded-lg text-slate-400 hover:text-white transition-colors"
            >
              <Bell className="w-[19px] h-[19px]" />
              {pendingApprovals.length > 0 && (
                <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-red-500 ring-2 ring-[#0d1117]" />
              )}
            </button>
          )}
          <button className="w-9 h-9 flex items-center justify-center rounded-lg text-slate-400 hover:text-white transition-colors">
            <Grid3X3 className="w-[19px] h-[19px]" />
          </button>
          <button className="w-9 h-9 flex items-center justify-center rounded-lg text-slate-400 hover:text-white transition-colors">
            <Search className="w-[19px] h-[19px]" />
          </button>
          <button onClick={() => setSideMenuOpen(true)}
            className="w-8 h-8 rounded-full flex items-center justify-center text-white text-[12px] font-bold ml-0.5 shrink-0"
            style={{ background: 'linear-gradient(135deg, #0078d4, #005a9e)' }}
          >
            {userInitial}
          </button>
        </div>
      </header>

      {/* ═══════════════ WEEK STRIP (swipeable) ═══════════════ */}
      <div
        className="relative z-20 shrink-0 border-b border-white/[0.06] select-none"
        style={{ background: '#0d1117' }}
        onTouchStart={handleWeekTouchStart}
        onTouchEnd={handleWeekTouchEnd}
      >
        <div className="grid grid-cols-7 px-1">
          {weekDays.map((d, i) => {
            const ds = dateToStr(d);
            const isSelected = ds === selectedDateStr;
            const isToday = ds === todayStr;
            const count = bookingCountByDay[ds] || 0;

            return (
              <button
                key={ds}
                onClick={() => selectDayFromStrip(d)}
                className="flex flex-col items-center py-1.5 transition-all duration-150 active:scale-95"
              >
                <span className={`text-[11px] font-semibold mb-1 ${
                  isSelected ? "text-[#4fc3f7]" : i >= 5 ? "text-slate-600" : "text-slate-500"
                }`}>
                  {HU_DAYS_SHORT[i]}
                </span>

                <div className={`relative w-[34px] h-[34px] flex items-center justify-center rounded-full transition-all duration-200`}
                  style={
                    isSelected
                      ? { background: '#0078d4' }
                      : isToday
                        ? { border: '2px solid rgba(0, 120, 212, 0.5)' }
                        : {}
                  }
                >
                  <span className={`text-[15px] font-semibold ${
                    isSelected ? "text-white" : isToday ? "text-[#4fc3f7]" : "text-slate-300"
                  }`}>
                    {d.getDate()}
                  </span>
                </div>

                <div className="flex gap-[3px] mt-1 h-[5px]">
                  {count > 0 && Array.from({ length: Math.min(count, 3) }).map((_, di) => (
                    <div key={di} className="w-[4px] h-[4px] rounded-full"
                      style={{ background: isSelected ? '#4fc3f7' : '#0078d4' }}
                    />
                  ))}
                </div>
              </button>
            );
          })}
        </div>

        <div className="flex justify-center pb-2 pt-0.5">
          <div className="w-8 h-[3px] rounded-full bg-white/[0.08]" />
        </div>
      </div>

      {/* ═══════════════ INFINITE DAY SCROLL ═══════════════ */}
      <div
        className="flex-1 overflow-y-auto overscroll-contain"
        ref={scrollRef}
        onScroll={handleScroll}
        style={{ background: '#0d1117' }}
      >
        {/* Countdown pill (shown once at top if today is visible) */}
        {countdown && (
          <div className="flex justify-center py-3 sticky top-0 z-10"
            style={{ background: 'rgba(13, 17, 23, 0.92)', backdropFilter: 'blur(8px)' }}
          >
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-white/[0.08]"
              style={{ background: 'rgba(255,255,255,0.03)' }}
            >
              <Timer className="w-3.5 h-3.5 text-[#4fc3f7]" />
              <span className="text-[12px] text-slate-300 font-medium">{countdown}</span>
            </div>
          </div>
        )}

        {/* Day sections */}
        {allDays.map((day) => {
          const ds = dateToStr(day);
          const isToday = ds === todayStr;
          const dayOfWeek = day.getDay();
          const dayName = HU_DAYS_LONG[dayOfWeek];
          const dayBookings = bookingsByDate[ds] || [];
          const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

          return (
            <div
              key={ds}
              ref={(el) => { if (el) dayRefs.current.set(ds, el); }}
              className="border-b border-white/[0.03]"
            >
              {/* ── Day header ── */}
              <div className={`sticky top-0 z-[5] px-4 py-2.5 flex items-center justify-between ${
                isToday ? "" : ""
              }`}
                style={{
                  background: isToday
                    ? 'rgba(0, 120, 212, 0.08)'
                    : 'rgba(13, 17, 23, 0.95)',
                  backdropFilter: 'blur(8px)',
                }}
              >
                <div className="flex items-center gap-2.5">
                  {/* Day number circle */}
                  <div className={`w-[36px] h-[36px] rounded-full flex items-center justify-center shrink-0 ${
                    isToday ? "" : ""
                  }`}
                    style={
                      isToday
                        ? { background: '#0078d4' }
                        : {}
                    }
                  >
                    <span className={`text-[16px] font-bold ${
                      isToday ? "text-white" : isWeekend ? "text-slate-500" : "text-slate-300"
                    }`}>
                      {day.getDate()}
                    </span>
                  </div>

                  <div className="flex flex-col">
                    <span className={`text-[14px] font-semibold leading-tight ${
                      isToday ? "text-[#4fc3f7]" : isWeekend ? "text-slate-500" : "text-slate-200"
                    }`}>
                      {dayName}
                    </span>
                    {/* Show month name if first of month or first visible */}
                    {(day.getDate() === 1) && (
                      <span className="text-[10px] text-slate-500 font-medium uppercase tracking-wider">
                        {HU_MONTHS[day.getMonth()]} {day.getFullYear() !== todayRef.current.getFullYear() ? day.getFullYear() : ""}
                      </span>
                    )}
                  </div>

                  {isToday && (
                    <span className="ml-1 px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider text-[#4fc3f7] bg-[#0078d4]/15">
                      Ma
                    </span>
                  )}
                </div>

                <span className="text-[11px] text-slate-600 font-medium tabular-nums">
                  {dayBookings.length > 0 ? `${dayBookings.length} út` : ""}
                </span>
              </div>

              {/* ── Events or empty state ── */}
              {dayBookings.length === 0 ? (
                <div className="px-4 py-4 flex items-center gap-3">
                  <div className="w-[52px] shrink-0" />
                  <p className="text-[13px] text-slate-600 italic">Nincs út erre a napra</p>
                </div>
              ) : (
                <div className="py-1">
                  {dayBookings.map((booking, idx) => {
                    const { hours, mins } = getTimeDisplay(booking.pickupTime);
                    const style = getEventStyle(booking);
                    const isCancelled = booking.status === "cancelled";

                    return (
                      <button
                        key={booking._id || `${ds}-${idx}`}
                        onClick={() => setSelectedBooking(booking)}
                        className="w-full text-left flex items-stretch px-3 py-[2px] active:opacity-70 transition-opacity"
                      >
                        {/* Time column */}
                        <div className="w-[52px] shrink-0 flex flex-col items-end justify-start pr-3 pt-2.5">
                          <span className="text-[14px] font-semibold text-slate-300 tabular-nums leading-tight">
                            {hours}:{mins}
                          </span>
                          <span className="text-[10px] text-slate-600 font-medium leading-tight mt-0.5">
                            30 p
                          </span>
                        </div>

                        {/* Event card */}
                        <div
                          className={`flex-1 rounded-md px-3 py-2.5 my-[1px] min-h-[48px] flex items-center transition-all ${
                            isCancelled ? "opacity-50" : ""
                          }`}
                          style={{
                            background: style.bg,
                            borderLeft: `3px solid ${style.border}`,
                          }}
                        >
                          <div className="flex-1 min-w-0">
                            <p className={`text-[13px] font-semibold truncate leading-snug ${isCancelled ? "line-through" : ""}`}
                              style={{ color: style.text }}
                            >
                              {shortenAddress(booking.fromAddress)} {booking.travelerName}
                            </p>
                            {booking.assignedDriverName && (
                              <p className="text-[11px] mt-0.5 truncate" style={{ color: style.text, opacity: 0.65 }}>
                                {booking.assignedDriverName}
                              </p>
                            )}
                          </div>
                          <ChevronRight className="w-4 h-4 shrink-0 ml-2 opacity-30" style={{ color: style.text }} />
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}

        <div className="h-28" />
      </div>

      {/* ═══════════════ FAB ═══════════════ */}
      <div className="fixed bottom-[72px] right-4 z-40">
        <button className="w-[52px] h-[52px] rounded-full flex items-center justify-center text-white shadow-[0_4px_20px_rgba(0,120,212,0.4)] active:scale-90 transition-transform"
          style={{ background: 'linear-gradient(135deg, #0078d4, #005a9e)' }}
        >
          <Plus className="w-6 h-6" />
        </button>
      </div>

      {/* ═══════════════ BOTTOM TAB BAR ═══════════════ */}
      <nav className="shrink-0 z-30 flex items-center justify-around border-t border-white/[0.06] h-[56px] safe-area-pb"
        style={{ background: '#0d1117' }}
      >
        <button className="flex flex-col items-center justify-center gap-0.5 flex-1 py-1 text-slate-500 active:text-slate-300 transition-colors">
          <Mail className="w-[20px] h-[20px]" />
          <span className="text-[10px] font-medium">E-mail</span>
        </button>
        <button onClick={goToToday}
          className="flex flex-col items-center justify-center gap-0.5 flex-1 py-1 text-[#4fc3f7] active:text-[#81d4fa] transition-colors"
        >
          <Calendar className="w-[20px] h-[20px]" />
          <span className="text-[10px] font-semibold">Naptár</span>
        </button>
        <button className="flex flex-col items-center justify-center gap-0.5 flex-1 py-1 text-slate-500 active:text-slate-300 transition-colors">
          <UsersRound className="w-[20px] h-[20px]" />
          <span className="text-[10px] font-medium">Személyek</span>
        </button>
      </nav>

      {/* ═══════════════ BOOKING DETAIL SHEET ═══════════════ */}
      <AnimatePresence>
        {selectedBooking && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 bg-black/60"
              onClick={() => setSelectedBooking(null)}
            />
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 30, stiffness: 300 }}
              className="fixed bottom-0 left-0 right-0 z-50 max-h-[85vh] rounded-t-[20px] overflow-hidden"
              style={{ background: '#161b22' }}
            >
              <div className="flex justify-center py-3">
                <div className="w-10 h-1 rounded-full bg-white/[0.12]" />
              </div>

              <div className="px-5 pb-8 overflow-y-auto max-h-[calc(85vh-44px)]">
                {/* Status + code */}
                <div className="flex items-center justify-between mb-5">
                  <div className="flex items-center gap-2">
                    <span className={`px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider ${
                      selectedBooking.status === "confirmed" ? "text-emerald-400 bg-emerald-500/10" :
                      selectedBooking.status === "pending" ? "text-amber-400 bg-amber-500/10" :
                      selectedBooking.status === "in-progress" ? "text-blue-400 bg-blue-500/10" :
                      selectedBooking.status === "cancelled" ? "text-red-400 bg-red-500/10" :
                      selectedBooking.status === "completed" ? "text-slate-400 bg-slate-500/10" :
                      "text-purple-400 bg-purple-500/10"
                    }`}>
                      {getStatusLabel(selectedBooking.status)}
                    </span>
                    <span className="text-[10px] text-slate-600 font-mono tracking-wider">{selectedBooking.bookingCode}</span>
                  </div>
                  <button onClick={() => setSelectedBooking(null)}
                    className="w-8 h-8 flex items-center justify-center rounded-full bg-white/[0.05] text-slate-400 hover:text-white active:scale-90 transition-all"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <h2 className="text-[20px] font-bold text-white mb-1 leading-tight">
                  {selectedBooking.travelerName}
                </h2>
                {selectedBooking.companyName && (
                  <p className="text-[12px] text-slate-400 mb-4 flex items-center gap-1.5">
                    <Briefcase className="w-3 h-3" /> {selectedBooking.companyName}
                  </p>
                )}

                <div className="space-y-0 mt-4">
                  <DetailRow icon={<Clock className="w-4 h-4 text-[#4fc3f7]" />} label="Időpont" value={`${selectedBooking.pickupDate} · ${selectedBooking.pickupTime}`} />
                  <DetailRow icon={<MapPin className="w-4 h-4 text-emerald-400" />} label="Honnan" value={selectedBooking.fromAddress} />
                  <DetailRow icon={<MapPin className="w-4 h-4 text-red-400" />} label="Hová" value={selectedBooking.toAddress} />
                  <DetailRow icon={<Phone className="w-4 h-4 text-[#FFD700]" />} label="Telefon" value={selectedBooking.travelerPhone} isPhone />
                  <DetailRow icon={<Users className="w-4 h-4 text-purple-400" />} label="Utasok" value={`${selectedBooking.travelers} fő`} />
                  {selectedBooking.assignedDriverName && (
                    <DetailRow icon={<User className="w-4 h-4 text-cyan-400" />} label="Sofőr" value={selectedBooking.assignedDriverName} />
                  )}
                  {selectedBooking.comment && (
                    <DetailRow icon={<Mail className="w-4 h-4 text-slate-400" />} label="Megjegyzés" value={selectedBooking.comment} />
                  )}
                </div>

                {selectedBooking.travelerPhone && (
                  <a href={`tel:${selectedBooking.travelerPhone}`}
                    className="flex items-center justify-center gap-2.5 w-full mt-7 py-3.5 rounded-xl text-white text-[14px] font-semibold active:scale-[0.98] transition-transform"
                    style={{ background: 'linear-gradient(135deg, #0078d4, #005a9e)', boxShadow: '0 4px 20px rgba(0,120,212,0.3)' }}
                  >
                    <Phone className="w-4.5 h-4.5" /> Hívás
                  </a>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ═══════════════ SIDE MENU ═══════════════ */}
      <AnimatePresence>
        {sideMenuOpen && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 bg-black/50" onClick={() => setSideMenuOpen(false)}
            />
            <motion.div
              initial={{ x: "-100%" }} animate={{ x: 0 }} exit={{ x: "-100%" }}
              transition={{ type: "spring", damping: 30, stiffness: 300 }}
              className="fixed top-0 left-0 bottom-0 z-50 w-[280px] border-r border-white/[0.06]"
              style={{ background: '#161b22' }}
            >
              <div className="flex flex-col h-full">
                <div className="p-5 border-b border-white/[0.06]">
                  <div className="flex items-center justify-between mb-5">
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-lg flex items-center justify-center"
                        style={{ background: 'linear-gradient(135deg, #0078d4, #005a9e)' }}
                      >
                        <span className="text-white font-serif font-bold text-sm">P</span>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-[13px] font-bold text-white">Pannon Transfer</span>
                        <span className="text-[9px] text-slate-500 uppercase tracking-[0.15em] font-semibold">Diszpécser</span>
                      </div>
                    </div>
                    <button onClick={() => setSideMenuOpen(false)}
                      className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-500 hover:text-white transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-full flex items-center justify-center text-white text-[15px] font-bold"
                      style={{ background: 'linear-gradient(135deg, #0078d4, #005a9e)' }}
                    >
                      {userInitial}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[14px] font-semibold text-white truncate">{user.name}</p>
                      <p className="text-[11px] text-slate-500 truncate">{user.email}</p>
                    </div>
                  </div>
                </div>

                <div className="flex-1 p-3 space-y-0.5">
                  <button onClick={() => { goToToday(); setSideMenuOpen(false); }}
                    className="w-full flex items-center gap-3 px-3 py-3 rounded-xl text-[#4fc3f7] bg-[#0078d4]/10 text-left"
                  >
                    <Calendar className="w-5 h-5" />
                    <span className="text-[13px] font-semibold">Naptár</span>
                  </button>
                  
                  {user.role === "admin" && (
                    <button onClick={() => { setSideMenuOpen(false); setApprovalsOpen(true); }}
                      className="w-full flex items-center gap-3 px-3 py-3 rounded-xl text-slate-300 hover:bg-white/[0.05] transition-colors text-left"
                    >
                      <Bell className="w-5 h-5" />
                      <span className="text-[13px] font-semibold">Jóváhagyások</span>
                      {pendingApprovals.length > 0 && (
                        <span className="ml-auto bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                          {pendingApprovals.length}
                        </span>
                      )}
                    </button>
                  )}
                </div>

                <div className="p-3 border-t border-white/[0.06]">
                  <button onClick={handleLogout}
                    className="w-full flex items-center gap-3 px-3 py-3 rounded-xl text-red-400 hover:text-red-300 hover:bg-red-500/[0.06] transition-all text-left active:scale-[0.98]"
                  >
                    <LogOut className="w-5 h-5" />
                    <span className="text-[13px] font-medium">Kijelentkezés</span>
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ═══════════════ APPROVALS SHEET ═══════════════ */}
      <AnimatePresence>
        {approvalsOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 bg-black/60"
              onClick={() => setApprovalsOpen(false)}
            />
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 30, stiffness: 300 }}
              className="fixed bottom-0 left-0 right-0 z-50 h-[85vh] rounded-t-[20px] overflow-hidden flex flex-col"
              style={{ background: '#161b22' }}
            >
              <div className="flex justify-center py-3 shrink-0">
                <div className="w-10 h-1 rounded-full bg-white/[0.12]" />
              </div>

              <div className="px-5 pb-2 shrink-0">
                <div className="flex items-center justify-between mb-2">
                  <h2 className="text-[20px] font-bold text-white leading-tight flex items-center gap-2">
                    <Bell className="w-5 h-5 text-amber-400" /> Jóváhagyások
                  </h2>
                  <button onClick={() => setApprovalsOpen(false)}
                    className="w-8 h-8 flex items-center justify-center rounded-full bg-white/[0.05] text-slate-400 hover:text-white active:scale-90 transition-all"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <p className="text-sm text-slate-400">
                  {pendingApprovals.length === 0 ? "Nincs függőben lévő kérés." : `${pendingApprovals.length} db ár-jóváhagyási kérés vár döntésre.`}
                </p>
              </div>

              <div className="flex-1 overflow-y-auto px-5 pb-8 mt-2 space-y-4">
                {pendingApprovals.map((app) => (
                  <div key={app._id} className="bg-[#0d1117] border border-white/[0.08] rounded-xl p-4">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <div className="text-xs font-mono text-slate-400">#{app.bookingCode}</div>
                          <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider ${
                            app.status === "confirmed" ? "text-emerald-400 bg-emerald-500/10" :
                            app.status === "pending" ? "text-amber-400 bg-amber-500/10" :
                            app.status === "in-progress" ? "text-blue-400 bg-blue-500/10" :
                            "text-slate-400 bg-slate-500/10"
                          }`}>
                            {getStatusLabel(app.status)}
                          </span>
                        </div>
                        <div className="text-sm font-bold text-white">{app.travelerName}</div>
                        {app.companyName && <div className="text-xs text-slate-500 mt-0.5">{app.companyName}</div>}
                      </div>
                      <div className="text-right">
                        <div className="text-[10px] text-slate-500 uppercase tracking-wider mb-0.5">Kért ár</div>
                        <div className="text-lg font-black text-amber-400 tabular-nums">
                          {app.priceApprovalRequest?.requestedPrice?.toLocaleString("hu-HU")} Ft
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2 mt-4 mb-4 border-t border-white/[0.04] pt-3">
                      <div className="flex items-center gap-2 text-xs">
                        <Calendar className="w-3.5 h-3.5 text-slate-500" />
                        <span className="text-slate-300 font-medium">{app.pickupDate} · {app.pickupTime}</span>
                      </div>
                      <div className="flex items-start gap-2 text-xs">
                        <MapPin className="w-3.5 h-3.5 text-emerald-500 mt-0.5 shrink-0" />
                        <span className="text-slate-300 leading-tight">{app.fromAddress}</span>
                      </div>
                      <div className="flex items-start gap-2 text-xs">
                        <MapPin className="w-3.5 h-3.5 text-red-500 mt-0.5 shrink-0" />
                        <span className="text-slate-300 leading-tight">{app.toAddress}</span>
                      </div>
                      <div className="flex items-center gap-4 text-xs pt-1">
                        <div className="flex items-center gap-1.5">
                          <Users className="w-3.5 h-3.5 text-purple-400" />
                          <span className="text-slate-300">{app.travelers} fő</span>
                        </div>
                        {app.category && (
                          <div className="flex items-center gap-1.5">
                            <Car className="w-3.5 h-3.5 text-slate-400" />
                            <span className="text-slate-300 capitalize">{app.category}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="space-y-1.5 mb-4 border-t border-white/[0.04] pt-3">
                      {app.price > 0 && (
                        <div className="flex gap-2 text-xs">
                          <span className="text-slate-500 w-16">Eredeti ár:</span>
                          <span className="text-slate-300 tabular-nums line-through opacity-70">{app.price.toLocaleString("hu-HU")} Ft</span>
                        </div>
                      )}
                      <div className="flex gap-2 text-xs">
                        <span className="text-slate-500 w-16">Kérte:</span>
                        <span className="text-slate-300 truncate">{app.priceApprovalRequest?.requestedBy}</span>
                      </div>
                      {app.priceApprovalRequest?.reason && (
                        <div className="flex gap-2 text-xs">
                          <span className="text-slate-500 w-16 shrink-0">Indok:</span>
                          <span className="text-slate-300 italic">{app.priceApprovalRequest.reason}</span>
                        </div>
                      )}
                    </div>

                    <div className="flex gap-2">
                      <button
                        onClick={() => handleApprovalDecision(app._id, "rejected")}
                        disabled={loadingApprovals}
                        className="flex-1 py-2.5 rounded-lg bg-red-500/10 text-red-400 text-xs font-bold border border-red-500/20 active:bg-red-500/20 transition-colors disabled:opacity-50"
                      >
                        Elutasít
                      </button>
                      <button
                        onClick={() => handleApprovalDecision(app._id, "approved")}
                        disabled={loadingApprovals}
                        className="flex-1 py-2.5 rounded-lg bg-emerald-500/10 text-emerald-400 text-xs font-bold border border-emerald-500/20 active:bg-emerald-500/20 transition-colors disabled:opacity-50 flex items-center justify-center gap-1.5"
                      >
                        <CheckCircle2 className="w-4 h-4" /> Elfogad
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ── Detail Row ── */
function DetailRow({ icon, label, value, isPhone }: { icon: React.ReactNode; label: string; value: string; isPhone?: boolean }) {
  return (
    <div className="flex items-start gap-3 py-3 border-b border-white/[0.04] last:border-0">
      <div className="mt-0.5 shrink-0">{icon}</div>
      <div className="flex-1 min-w-0">
        <p className="text-[10px] text-slate-500 font-bold uppercase tracking-[0.08em] mb-1">{label}</p>
        {isPhone ? (
          <a href={`tel:${value}`} className="text-[14px] text-[#4fc3f7] font-medium">{value}</a>
        ) : (
          <p className="text-[14px] text-slate-200 font-medium leading-snug">{value}</p>
        )}
      </div>
    </div>
  );
}

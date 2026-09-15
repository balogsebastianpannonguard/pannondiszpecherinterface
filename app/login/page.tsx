"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  Check,
  ArrowRight,
  Loader2,
  AlertTriangle,
  Calendar,
} from "lucide-react";

type State = "login" | "done";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [state, setState] = useState<State>("login");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError("Kérjük, adja meg az e-mail címet és a jelszót.");
      return;
    }
    setError(null);
    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, remember }),
        cache: "no-store",
      });
      const json = await res.json().catch(() => null);

      if (!res.ok || !json?.success) {
        setError(json?.message || "Sikertelen bejelentkezés.");
        return;
      }

      if (json?.user) {
        setState("done");
        setTimeout(() => {
          router.push("/");
        }, 2800);
        return;
      }

      setError("Váratlan hiba történt a bejelentkezés során.");
    } catch {
      setError("Hálózati hiba történt. Kérjük, próbálja újra.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen flex flex-col justify-between overflow-hidden selection:bg-[#0078d4] selection:text-white"
      style={{ background: 'linear-gradient(180deg, #0d1117 0%, #111820 50%, #0d1117 100%)' }}
    >
      {/* Ambient glows */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-15%] left-[-15%] w-[500px] h-[500px] bg-[#0056D2]/[0.06] blur-[120px] rounded-full" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[400px] h-[400px] bg-[#FFD700]/[0.04] blur-[100px] rounded-full" />
        <div className="absolute top-[30%] right-[-5%] w-[300px] h-[300px] bg-[#0056D2]/[0.03] blur-[80px] rounded-full" />
      </div>

      {/* Header */}
      <div className="relative z-10 w-full pt-12 px-8 flex justify-center">
        <div className="flex items-center gap-3">
          <div className="relative w-11 h-11 rounded-xl flex items-center justify-center shadow-[0_4px_24px_rgba(0,86,210,0.3)]"
            style={{ background: 'linear-gradient(135deg, #0056D2, #003F9F)' }}
          >
            <Calendar className="w-5 h-5 text-white" />
            <div className="absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full border-2 border-[#0a0e17]"
              style={{ background: 'linear-gradient(135deg, #FFD700, #E6B800)' }}
            />
          </div>
          <div className="flex flex-col">
            <span className="text-[15px] font-serif font-bold text-white leading-none tracking-wide">
              Pannon Transfer
            </span>
            <span className="text-[9px] text-slate-500 mt-1 font-semibold tracking-[0.2em] uppercase">
              Diszpécser Naptár
            </span>
          </div>
        </div>
      </div>

      {/* Main */}
      <div className="relative z-10 flex-1 flex items-center justify-center p-5">
        <div className="w-full max-w-[380px]">
          <AnimatePresence mode="wait">
            {state === "login" && (
              <motion.div
                key="card-login"
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15, scale: 0.98 }}
                transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                className="relative"
              >
                {/* Card glow border */}
                <div className="absolute -inset-[1px] rounded-[20px] opacity-40"
                  style={{ background: 'linear-gradient(135deg, rgba(0,86,210,0.3), transparent 40%, rgba(255,215,0,0.2))' }}
                />
                <div className="relative rounded-[20px] border border-white/[0.06] p-7 sm:p-8"
                  style={{ background: 'rgba(17, 24, 39, 0.8)', backdropFilter: 'blur(20px)' }}
                >
                  <form onSubmit={handleSubmit} className="flex flex-col">
                    <div className="mb-8 text-center">
                      <h1 className="text-[26px] font-serif font-bold text-white tracking-tight mb-3">
                        Bejelentkezés
                      </h1>
                      <div className="w-8 h-0.5 rounded-full mx-auto mb-4"
                        style={{ background: 'linear-gradient(90deg, #FFD700, #E6B800)' }}
                      />
                      <p className="text-[13px] text-slate-400 font-medium">
                        Diszpécseri hozzáférés a naptárhoz
                      </p>
                    </div>

                    <div className="space-y-4 mb-6">
                      {/* Email */}
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-500 ml-1">
                          E-mail cím
                        </label>
                        <div className={`relative flex items-center border transition-all duration-300 rounded-xl overflow-hidden ${
                          error
                            ? "border-red-500/30 bg-red-500/5"
                            : "border-white/[0.08] bg-white/[0.03] focus-within:border-[#0056D2]/50 focus-within:bg-[#0056D2]/5 hover:border-white/[0.12]"
                        }`}>
                          <Mail className={`absolute left-3.5 w-4 h-4 transition-colors ${error ? "text-red-400/60" : "text-[#0056D2]/70"}`} />
                          <input
                            type="email"
                            value={email}
                            onChange={(e) => { setEmail(e.target.value); if (error) setError(null); }}
                            placeholder="pelda@pannon.hu"
                            className="w-full bg-transparent pl-10 pr-4 py-3.5 text-[14px] text-white placeholder:text-slate-600 font-medium outline-none"
                            autoComplete="email"
                            spellCheck={false}
                          />
                        </div>
                      </div>

                      {/* Password */}
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-500 ml-1">
                          Jelszó
                        </label>
                        <div className={`relative flex items-center border transition-all duration-300 rounded-xl overflow-hidden ${
                          error
                            ? "border-red-500/30 bg-red-500/5"
                            : "border-white/[0.08] bg-white/[0.03] focus-within:border-[#0056D2]/50 focus-within:bg-[#0056D2]/5 hover:border-white/[0.12]"
                        }`}>
                          <Lock className={`absolute left-3.5 w-4 h-4 transition-colors ${error ? "text-red-400/60" : "text-[#0056D2]/70"}`} />
                          <input
                            type={showPassword ? "text" : "password"}
                            value={password}
                            onChange={(e) => { setPassword(e.target.value); if (error) setError(null); }}
                            placeholder="••••••••"
                            className="w-full bg-transparent pl-10 pr-11 py-3.5 text-[14px] text-white placeholder:text-slate-600 font-medium outline-none tracking-widest"
                            autoComplete="current-password"
                          />
                          <button
                            type="button"
                            onClick={() => setShowPassword((v) => !v)}
                            className="absolute right-2 w-8 h-8 flex items-center justify-center text-slate-500 hover:text-[#0056D2] transition-colors rounded-lg"
                            tabIndex={-1}
                          >
                            {showPassword ? <EyeOff className="w-[15px] h-[15px]" /> : <Eye className="w-[15px] h-[15px]" />}
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Remember */}
                    <div className="flex items-center justify-between mb-6 px-0.5">
                      <div className="flex items-center gap-2.5 cursor-pointer group" onClick={() => setRemember((v) => !v)}>
                        <div className={`w-4 h-4 rounded flex items-center justify-center border transition-all duration-300 ${
                          remember
                            ? "bg-[#0056D2] border-[#0056D2] shadow-[0_2px_8px_rgba(0,86,210,0.3)]"
                            : "bg-transparent border-slate-600 group-hover:border-[#0056D2]/40"
                        }`}>
                          {remember && <Check className="w-3 h-3 text-white" strokeWidth={3} />}
                        </div>
                        <span className="text-[12px] text-slate-400 font-medium select-none group-hover:text-slate-300 transition-colors">
                          Emlékezzen rám
                        </span>
                      </div>
                    </div>

                    {/* Error */}
                    <AnimatePresence>
                      {error && (
                        <motion.div
                          initial={{ opacity: 0, y: -4, height: 0 }}
                          animate={{ opacity: 1, y: 0, height: "auto" }}
                          exit={{ opacity: 0, y: -4, height: 0 }}
                          transition={{ duration: 0.2 }}
                          className="overflow-hidden mb-5"
                        >
                          <div className="flex items-center gap-2.5 px-4 py-3 bg-red-500/10 border border-red-500/20 rounded-xl">
                            <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
                            <p className="text-[12px] text-red-300 font-medium">{error}</p>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {/* Submit */}
                    <button
                      type="submit"
                      disabled={loading}
                      className="group relative w-full h-[50px] rounded-xl text-white text-[14px] font-semibold transition-all duration-300 disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2 overflow-hidden"
                      style={{
                        background: 'linear-gradient(135deg, #0056D2, #003F9F)',
                        boxShadow: '0 8px 24px -6px rgba(0,86,210,0.4)',
                      }}
                    >
                      <div className="absolute inset-0 bg-white/10 translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-out" />
                      <span className="relative z-10 flex items-center gap-2">
                        {loading ? (
                          <Loader2 className="w-4.5 h-4.5 animate-spin" />
                        ) : (
                          <>
                            Belépés
                            <ArrowRight className="w-4.5 h-4.5 group-hover:translate-x-1 transition-transform duration-300" />
                          </>
                        )}
                      </span>
                    </button>
                  </form>
                </div>
              </motion.div>
            )}

            {state === "done" && (
              <motion.div
                key="card-done"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0, scale: 1.1 }}
                transition={{ duration: 0.4 }}
                className="flex flex-col items-center justify-center p-10 relative"
              >
                {/* ── Outer pulsing rings ── */}
                {[0, 1, 2].map((i) => (
                  <motion.div
                    key={`ring-${i}`}
                    initial={{ scale: 0.5, opacity: 0 }}
                    animate={{ scale: [0.5, 2.5 + i * 0.5], opacity: [0.6, 0] }}
                    transition={{
                      delay: 0.2 + i * 0.25,
                      duration: 1.8,
                      ease: "easeOut",
                      repeat: Infinity,
                      repeatDelay: 0.5,
                    }}
                    className="absolute w-20 h-20 rounded-full border"
                    style={{ borderColor: i === 0 ? 'rgba(0, 120, 212, 0.5)' : i === 1 ? 'rgba(79, 195, 247, 0.3)' : 'rgba(255, 215, 0, 0.2)' }}
                  />
                ))}

                {/* ── Orbiting particles ── */}
                {[...Array(8)].map((_, i) => {
                  const angle = (i / 8) * 360;
                  const radius = 70;
                  const delay = i * 0.1;
                  return (
                    <motion.div
                      key={`particle-${i}`}
                      initial={{ opacity: 0, scale: 0 }}
                      animate={{
                        opacity: [0, 1, 1, 0],
                        scale: [0, 1, 1, 0],
                        x: [0, Math.cos((angle * Math.PI) / 180) * radius],
                        y: [0, Math.sin((angle * Math.PI) / 180) * radius],
                      }}
                      transition={{
                        delay: 0.3 + delay,
                        duration: 1.5,
                        ease: "easeOut",
                      }}
                      className="absolute w-1.5 h-1.5 rounded-full"
                      style={{
                        background: i % 3 === 0 ? '#FFD700' : i % 3 === 1 ? '#4fc3f7' : '#0078d4',
                        boxShadow: `0 0 8px ${i % 3 === 0 ? '#FFD700' : '#4fc3f7'}`,
                      }}
                    />
                  );
                })}

                {/* ── Radial burst lines ── */}
                {[...Array(12)].map((_, i) => {
                  const angle = (i / 12) * 360;
                  return (
                    <motion.div
                      key={`burst-${i}`}
                      initial={{ opacity: 0, scale: 0 }}
                      animate={{ opacity: [0, 0.8, 0], scale: [0.3, 1] }}
                      transition={{ delay: 0.15 + i * 0.03, duration: 0.8, ease: "easeOut" }}
                      className="absolute w-[2px] h-6 origin-bottom"
                      style={{
                        background: 'linear-gradient(to top, rgba(0,120,212,0.8), transparent)',
                        transform: `rotate(${angle}deg) translateY(-40px)`,
                      }}
                    />
                  );
                })}

                {/* ── Glow backdrop ── */}
                <motion.div
                  initial={{ opacity: 0, scale: 0 }}
                  animate={{ opacity: [0, 0.4, 0.2], scale: [0, 1.5, 1.2] }}
                  transition={{ delay: 0.1, duration: 1.2, ease: "easeOut" }}
                  className="absolute w-40 h-40 rounded-full"
                  style={{
                    background: 'radial-gradient(circle, rgba(0,120,212,0.3) 0%, rgba(0,120,212,0.05) 60%, transparent 100%)',
                    filter: 'blur(20px)',
                  }}
                />

                {/* ── Main check icon ── */}
                <motion.div
                  initial={{ scale: 0, rotate: -180 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{
                    delay: 0.1,
                    type: "spring",
                    stiffness: 200,
                    damping: 15,
                  }}
                  className="relative z-10 w-20 h-20 rounded-full flex items-center justify-center mb-7"
                  style={{
                    background: 'linear-gradient(135deg, #0078d4 0%, #005a9e 50%, #003d7a 100%)',
                    boxShadow: '0 0 40px rgba(0,120,212,0.5), 0 0 80px rgba(0,120,212,0.2), inset 0 1px 0 rgba(255,255,255,0.15)',
                  }}
                >
                  {/* Inner shine */}
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: [0, 0.6, 0.3] }}
                    transition={{ delay: 0.4, duration: 1 }}
                    className="absolute inset-0 rounded-full"
                    style={{
                      background: 'radial-gradient(circle at 35% 35%, rgba(255,255,255,0.25), transparent 60%)',
                    }}
                  />

                  {/* Check mark with draw animation */}
                  <motion.div
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: [0, 1.3, 1], opacity: 1 }}
                    transition={{ delay: 0.35, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                  >
                    <Check className="w-9 h-9 text-white drop-shadow-lg" strokeWidth={3} />
                  </motion.div>

                  {/* Golden ring pulse */}
                  <motion.div
                    initial={{ scale: 1, opacity: 0 }}
                    animate={{ scale: [1, 1.4], opacity: [0.8, 0] }}
                    transition={{ delay: 0.5, duration: 0.8, repeat: 2, repeatDelay: 0.3 }}
                    className="absolute inset-0 rounded-full border-2"
                    style={{ borderColor: '#FFD700' }}
                  />
                </motion.div>

                {/* ── "Hitelesítve" text ── */}
                <motion.h2
                  initial={{ opacity: 0, y: 15, filter: "blur(10px)" }}
                  animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                  transition={{ delay: 0.45, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                  className="text-[26px] font-serif font-bold text-white mb-2 relative z-10"
                  style={{ textShadow: '0 0 30px rgba(0,120,212,0.4)' }}
                >
                  Hitelesítve
                </motion.h2>

                {/* ── Subtitle with typing effect ── */}
                <motion.p
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.65, duration: 0.4 }}
                  className="text-[13px] text-slate-400 mb-6 relative z-10"
                >
                  Üdvözöljük a rendszerben
                </motion.p>

                {/* ── Shield verified badge ── */}
                <motion.div
                  initial={{ opacity: 0, scale: 0 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.8, type: "spring", stiffness: 300, damping: 20 }}
                  className="flex items-center gap-2 px-4 py-2 rounded-full border border-white/[0.08] mb-6 relative z-10"
                  style={{ background: 'rgba(0,120,212,0.08)' }}
                >
                  <motion.div
                    animate={{ rotate: [0, 10, -10, 0] }}
                    transition={{ delay: 1, duration: 0.5 }}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#4fc3f7" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                      <polyline points="9 12 11 14 15 10" stroke="#FFD700" strokeWidth="2.5"/>
                    </svg>
                  </motion.div>
                  <span className="text-[11px] text-[#4fc3f7] font-semibold tracking-wide">Biztonságos kapcsolat</span>
                </motion.div>

                {/* ── Progress bar ── */}
                <motion.div
                  initial={{ opacity: 0, width: 0 }}
                  animate={{ opacity: 1, width: 120 }}
                  transition={{ delay: 0.9, duration: 0.3 }}
                  className="h-[3px] rounded-full overflow-hidden relative z-10"
                  style={{ background: 'rgba(255,255,255,0.06)' }}
                >
                  <motion.div
                    initial={{ width: "0%" }}
                    animate={{ width: "100%" }}
                    transition={{ delay: 1.0, duration: 1.2, ease: "easeInOut" }}
                    className="h-full rounded-full"
                    style={{
                      background: 'linear-gradient(90deg, #0078d4, #4fc3f7, #FFD700)',
                    }}
                  />
                </motion.div>

                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 1.1 }}
                  className="text-[10px] text-slate-600 mt-3 uppercase tracking-[0.15em] font-semibold relative z-10"
                >
                  Naptár betöltése...
                </motion.p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Footer */}
      <div className="relative z-10 w-full pb-8 px-8 flex justify-center text-[10px] text-slate-600 font-medium uppercase tracking-[0.05em]">
        <span>© {new Date().getFullYear()} Pannon Transfer Zrt.</span>
      </div>
    </div>
  );
}

"use client";

import { FormEvent, useEffect, useState } from "react";
import { ArrowRight, Eye, EyeOff, KeyRound, Lock, Mail, RefreshCw, BookOpenCheck } from "lucide-react";

export default function TeacherLoginPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [showKey, setShowKey] = useState(false);
  const [status, setStatus] = useState("");
  const [statusType, setStatusType] = useState<"error" | "info" | "warning">("info");
  const [loading, setLoading] = useState(false);
  const [showClearSession, setShowClearSession] = useState(false);
  const [pendingCredentials, setPendingCredentials] = useState<Record<string, string> | null>(null);
  const [clearingSession, setClearingSession] = useState(false);

  // Clear any existing session (student/guest/principal) when landing on the teacher login page
  useEffect(() => {
    (async () => {
      await fetch("/api/auth/clear-current", { method: "POST" }).catch(() => {});
      // Small delay to ensure the Set-Cookie takes effect before the navbar re-checks.
      setTimeout(() => window.dispatchEvent(new Event("adyapan-auth-change")), 50);
    })();
  }, []);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setStatus("");
    setStatusType("info");

    try {
      const body = Object.fromEntries(new FormData(event.currentTarget).entries()) as Record<string, string>;
      const response = await fetch("/api/teacher/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
      });
      const data = await response.json().catch(() => ({}));

      if (response.status === 409 && data.code === "ACTIVE_SESSION_EXISTS") {
        setPendingCredentials(body);
        setShowClearSession(true);
        setStatus("A session for this teacher account is already active on another device.");
        setStatusType("warning");
        setLoading(false);
        return;
      }

      if (!response.ok) {
        setStatus(data.error ?? "Teacher login failed.");
        setStatusType("error");
        setLoading(false);
        return;
      }

      window.dispatchEvent(new Event("adyapan-auth-change"));
      window.location.href = "/teacher/dashboard";
    } catch {
      setStatus("Network issue. Please try again.");
      setStatusType("error");
      setLoading(false);
    }
  }

  async function handleClearSessions() {
    if (!pendingCredentials) return;
    setClearingSession(true);
    setStatus("Clearing previous sessions...");
    setStatusType("info");

    try {
      const response = await fetch("/api/teacher/clear-sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(pendingCredentials)
      });
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        setStatus(data.error ?? "Failed to clear sessions. Please try again.");
        setStatusType("error");
        setClearingSession(false);
        return;
      }

      setShowClearSession(false);
      setStatus("Previous sessions cleared. Logging you in...");
      setStatusType("info");

      const loginResponse = await fetch("/api/teacher/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(pendingCredentials)
      });
      const loginData = await loginResponse.json().catch(() => ({}));

      if (!loginResponse.ok) {
        setStatus(loginData.error ?? "Login failed after clearing sessions. Please try again.");
        setStatusType("error");
        setClearingSession(false);
        setPendingCredentials(null);
        return;
      }

      window.dispatchEvent(new Event("adyapan-auth-change"));
      window.location.href = "/teacher/dashboard";
    } catch {
      setStatus("Network issue. Please try again.");
      setStatusType("error");
      setClearingSession(false);
    }
  }

  return (
    <main className="relative flex h-screen items-center justify-end overflow-hidden">
      {/* Background video */}
      <video
        autoPlay
        loop={true}
        muted
        playsInline
        className="absolute inset-0 h-full w-full object-cover opacity-80"
        aria-hidden="true"
      >
        <source src="/newlogin-vid_qPNCEcV9.mp4" type="video/mp4" />
      </video>
      {/* Adyapan logo and branding centered on the left half */}
      <div className="absolute left-0 top-0 hidden h-full w-1/2 flex-col items-center justify-center lg:flex z-10 pointer-events-none">
        <img
          src="/ady-logo.png"
          alt="ADYAPAN"
          className="h-36 w-36 rounded-full object-cover"
        />
        <h2 className="mt-6 text-5xl font-black text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.9)]">
          Adyapan <span className="text-sky-400 drop-shadow-[0_2px_8px_rgba(56,189,248,0.5)]">School</span>
        </h2>
      </div>

      {/* Right side form container */}
      <div className="relative z-10 flex w-full items-center justify-center px-6 sm:w-[60%] md:w-[52%] lg:w-[48%]">
        <div className="w-full max-w-[380px]">
          {/* Login Card */}
          <div className="rounded-2xl border border-white bg-white/90 px-6 py-6 shadow-[0_8px_40px_rgba(0,0,0,0.25)] backdrop-blur-md">
            {/* Welcome heading */}
            <div className="mb-5">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-blue-600 shadow-md">
                  <BookOpenCheck className="h-4 w-4 text-white" />
                </div>
                <h1 className="text-[22px] font-black text-slate-900">Teacher Login</h1>
              </div>
              <p className="mt-1 pl-[46px] text-[13px] text-slate-700 font-medium">Sign in to access your teacher dashboard</p>
            </div>
            {/* Active session conflict banner */}
            {showClearSession && (
              <div className="mb-5 rounded-xl border border-amber-200 bg-amber-50 p-4">
                <p className="text-sm font-black text-amber-900">⚠️ Active Session Detected</p>
                <p className="mt-1 text-sm font-medium text-amber-800">
                  This teacher account is already logged in on another device. Clear the previous session to continue.
                </p>
                <div className="mt-3 flex gap-2">
                  <button
                    onClick={handleClearSessions}
                    disabled={clearingSession}
                    className="flex-1 rounded-lg bg-amber-600 px-3 py-2.5 text-xs font-black text-white transition hover:bg-amber-700 disabled:opacity-60"
                  >
                    {clearingSession ? "Clearing..." : "Clear & Login"}
                  </button>
                  <button
                    onClick={() => { setShowClearSession(false); setPendingCredentials(null); setStatus(""); }}
                    className="rounded-lg border border-slate-200 px-3 py-2.5 text-xs font-black text-slate-700 transition hover:bg-slate-50"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            <form onSubmit={onSubmit} className="space-y-4">
              <input type="hidden" name="captcha" value="ADYAPAN" />

              {/* Email */}
              <div>
                <label className="mb-1.5 block text-sm font-bold text-slate-700">Teacher Email</label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 h-[16px] w-[16px] -translate-y-1/2 text-slate-400" />
                  <input
                    name="email"
                    type="email"
                    placeholder="yourname@school.edu"
                    autoComplete="email"
                    className="h-[44px] w-full rounded-lg border border-slate-200 bg-white pl-10 pr-4 text-sm font-medium text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                    required
                  />
                </div>
              </div>

              {/* Password */}
              <div>
                <label className="mb-1.5 block text-sm font-bold text-slate-700">Password</label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 h-[16px] w-[16px] -translate-y-1/2 text-slate-400" />
                  <input
                    name="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter your password"
                    className="h-[44px] w-full rounded-lg border border-slate-200 bg-white pl-10 pr-12 text-sm font-medium text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                    required
                    minLength={8}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 transition hover:text-slate-600"
                    aria-label="Toggle password visibility"
                  >
                    {showPassword ? <EyeOff className="h-[16px] w-[16px]" /> : <Eye className="h-[16px] w-[16px]" />}
                  </button>
                </div>
              </div>

              {/* Staff Access Key */}
              <div>
                <label className="mb-1.5 block text-sm font-bold text-slate-700">Staff Access Key</label>
                <div className="relative">
                  <KeyRound className="absolute left-3.5 top-1/2 h-[16px] w-[16px] -translate-y-1/2 text-slate-400" />
                  <input
                    name="staffKey"
                    type={showKey ? "text" : "password"}
                    placeholder="Private staff key"
                    className="h-[44px] w-full rounded-lg border border-slate-200 bg-white pl-10 pr-12 text-sm font-medium text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                    required
                    minLength={8}
                  />
                  <button
                    type="button"
                    onClick={() => setShowKey(!showKey)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 transition hover:text-slate-600"
                    aria-label="Toggle staff key visibility"
                  >
                    {showKey ? <EyeOff className="h-[16px] w-[16px]" /> : <Eye className="h-[16px] w-[16px]" />}
                  </button>
                </div>
              </div>

              {/* Error/Status */}
              {status && !showClearSession && (
                <div className={`rounded-lg px-4 py-3 text-sm font-semibold ${
                  statusType === "error" ? "bg-red-50 text-red-700 border border-red-100" :
                  statusType === "warning" ? "bg-amber-50 text-amber-700 border border-amber-100" :
                  "bg-blue-50 text-blue-700 border border-blue-100"
                }`}>
                  {status}
                </div>
              )}

              {/* Submit */}
              <button
                type="submit"
                disabled={loading || showClearSession}
                className="group flex h-[44px] w-full items-center justify-center gap-2 rounded-full bg-gradient-to-r from-blue-500 to-blue-600 text-sm font-black text-white shadow-lg shadow-blue-200/50 transition-all hover:from-blue-600 hover:to-blue-700 active:scale-[0.98] disabled:opacity-60 disabled:shadow-none"
              >
                {loading ? (
                  <RefreshCw className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    Open Teacher Dashboard
                    <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                  </>
                )}
              </button>
            </form>

            <p className="mt-4 text-center text-[11px] text-slate-900 font-semibold leading-relaxed">
              Only pre-registered teacher accounts can login.<br />Contact your school admin for access.
            </p>
          </div>

          {/* Back link */}
          <p className="mt-4 text-center text-sm">
            <a href="/" className="inline-flex items-center gap-1 font-bold text-white drop-shadow-[0_1px_3px_rgba(0,0,0,0.8)] transition hover:text-blue-300">
              ← Back to Adyapan
            </a>
          </p>
        </div>
      </div>
    </main>
  );
}

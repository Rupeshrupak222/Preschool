"use client";

import { FormEvent, Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Eye, EyeOff, GraduationCap, Lock, Mail, RefreshCw, ArrowRight, UserRound } from "lucide-react";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [showPassword, setShowPassword] = useState(false);
  const [status, setStatus] = useState("");
  const [statusType, setStatusType] = useState<"error" | "info" | "warning">("info");
  const [loading, setLoading] = useState(false);
  const [guestLoading, setGuestLoading] = useState(false);
  const [showClearSession, setShowClearSession] = useState(false);
  const [pendingCredentials, setPendingCredentials] = useState<Record<string, string> | null>(null);
  const [clearingSession, setClearingSession] = useState(false);

  useEffect(() => {
    const next = searchParams.get("next");
    if (next === "/admin") {
      router.replace("/admin");
    }
    // Clear any existing session (teacher/principal/guest) when landing on the student login page
    (async () => {
      await fetch("/api/auth/clear-current", { method: "POST" }).catch(() => {});
      setTimeout(() => window.dispatchEvent(new Event("adyapan-auth-change")), 50);
    })();
  }, [searchParams, router]);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setStatus("");
    const body = Object.fromEntries(new FormData(event.currentTarget).entries()) as Record<string, string>;

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
      });

      const text = await response.text();
      let data: Record<string, unknown>;
      try {
        data = text ? JSON.parse(text) : {};
      } catch {
        setStatus("Server response error. Please try again.");
        setStatusType("error");
        setLoading(false);
        return;
      }

      if (response.status === 409 && (data as { code?: string }).code === "ACTIVE_SESSION_EXISTS") {
        setPendingCredentials(body);
        setShowClearSession(true);
        setStatus("This account is already active on another device.");
        setStatusType("warning");
        setLoading(false);
        return;
      }

      if (!response.ok) {
        setStatus((data as { error?: string }).error || "Login failed. Please try again.");
        setStatusType("error");
        setLoading(false);
        return;
      }

      window.dispatchEvent(new Event("adyapan-auth-change"));
      const params = new URLSearchParams(window.location.search);
      const next = params.get("next");
      const target = next && next.startsWith("/") ? next : (data as { user?: { role?: string } }).user?.role === "admin" ? "/admin" : "/student-dashboard";
      window.location.href = target;
    } catch {
      setStatus("Network error. Please check your connection.");
      setStatusType("error");
      setLoading(false);
    }
  }

  async function continueAsGuest() {
    setGuestLoading(true);
    setStatus("");
    try {
      const response = await fetch("/api/auth/guest", { method: "POST" });
      if (!response.ok) {
        const data = await response.json().catch(() => ({})) as { error?: string };
        setStatus(data.error ?? "Could not start guest session.");
        setStatusType("error");
        setGuestLoading(false);
        return;
      }
      window.dispatchEvent(new Event("adyapan-auth-change"));
      window.location.href = "/student-dashboard";
    } catch {
      setStatus("Network error. Please check your connection.");
      setStatusType("error");
      setGuestLoading(false);
    }
  }

  async function handleClearSessions() {
    if (!pendingCredentials) return;
    setClearingSession(true);
    setStatus("Clearing previous sessions...");
    setStatusType("info");

    try {
      const response = await fetch("/api/auth/clear-sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(pendingCredentials)
      });
      const data = await response.json().catch(() => ({})) as { error?: string };

      if (!response.ok) {
        setStatus(data.error ?? "Failed to clear sessions. Please try again.");
        setStatusType("error");
        setClearingSession(false);
        return;
      }

      setShowClearSession(false);
      setStatus("Previous sessions cleared. Logging you in...");
      setStatusType("info");

      const loginResponse = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(pendingCredentials)
      });
      const loginData = await loginResponse.json().catch(() => ({})) as { error?: string; user?: { role?: string } };

      if (!loginResponse.ok) {
        setStatus(loginData.error ?? "Login failed after clearing sessions. Please try again.");
        setStatusType("error");
        setClearingSession(false);
        setPendingCredentials(null);
        return;
      }

      window.dispatchEvent(new Event("adyapan-auth-change"));
      const target = loginData.user?.role === "admin" ? "/admin" : "/student-dashboard";
      window.location.href = target;
    } catch {
      setStatus("Network error. Please check your connection.");
      setStatusType("error");
      setClearingSession(false);
    }
  }

  return (
    <main className="relative flex h-screen items-center justify-end">
      <video autoPlay loop muted playsInline className="absolute inset-0 h-full w-full object-cover opacity-80" aria-hidden="true">
        <source src="/newlogin-vid_qPNCEcV9.mp4" type="video/mp4" />
      </video>
      <div className="absolute left-0 top-0 hidden h-full w-1/2 flex-col items-center justify-center lg:flex z-10 pointer-events-none">
        <img src="/ady-logo.png" alt="ADYAPAN" className="h-36 w-36 rounded-full object-cover" />
        <h2 className="mt-6 text-5xl font-black text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.9)]">
          Adyapan <span className="text-sky-400 drop-shadow-[0_2px_8px_rgba(56,189,248,0.5)]">School</span>
        </h2>
      </div>

      <div className="relative z-10 flex w-full items-center justify-center px-6 sm:w-[60%] md:w-[52%] lg:w-[48%]">
        <div className="w-full max-w-[380px]">
          <div className="rounded-2xl border border-white bg-white/90 px-6 py-6 shadow-[0_8px_40px_rgba(0,0,0,0.25)] backdrop-blur-md">
            <div className="mb-5">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-blue-600 shadow-md">
                  <GraduationCap className="h-4 w-4 text-white" />
                </div>
                <h1 className="text-[22px] font-black text-slate-900">Welcome back!</h1>
              </div>
              <p className="mt-1 pl-[46px] text-[13px] text-slate-700 font-medium">Sign in to access your student dashboard</p>
            </div>

            {showClearSession && (
              <div className="mb-5 rounded-xl border border-amber-200 bg-amber-50 p-4">
                <p className="text-sm font-black text-amber-900">⚠️ Active Session Detected</p>
                <p className="mt-1 text-sm font-medium text-amber-800">
                  This account is already logged in on another device. Clear the previous session to continue.
                </p>
                <div className="mt-3 flex gap-2">
                  <button onClick={handleClearSessions} disabled={clearingSession} className="flex-1 rounded-lg bg-amber-600 px-3 py-2.5 text-xs font-black text-white transition hover:bg-amber-700 disabled:opacity-60">
                    {clearingSession ? "Clearing..." : "Clear & Login"}
                  </button>
                  <button onClick={() => { setShowClearSession(false); setPendingCredentials(null); setStatus(""); }} className="rounded-lg border border-slate-200 px-3 py-2.5 text-xs font-black text-slate-700 transition hover:bg-slate-50">
                    Cancel
                  </button>
                </div>
              </div>
            )}

            <form onSubmit={onSubmit} className="space-y-4">
              <input type="hidden" name="captcha" value="ADYAPAN" />

              <div>
                <label className="mb-1.5 block text-sm font-bold text-slate-700">Email Address</label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 h-[16px] w-[16px] -translate-y-1/2 text-slate-400" />
                  <input name="email" type="email" placeholder="student@example.com" className="h-[44px] w-full rounded-lg border border-slate-200 bg-white pl-10 pr-4 text-sm font-medium text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-400 focus:ring-2 focus:ring-blue-100" required />
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-bold text-slate-700">Password</label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 h-[16px] w-[16px] -translate-y-1/2 text-slate-400" />
                  <input name="password" type={showPassword ? "text" : "password"} placeholder="Enter your password" className="h-[44px] w-full rounded-lg border border-slate-200 bg-white pl-10 pr-12 text-sm font-medium text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-400 focus:ring-2 focus:ring-blue-100" required />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 transition hover:text-slate-600" aria-label="Toggle password visibility">
                    {showPassword ? <EyeOff className="h-[16px] w-[16px]" /> : <Eye className="h-[16px] w-[16px]" />}
                  </button>
                </div>
              </div>

              {status && !showClearSession && (
                <div className={`rounded-lg px-4 py-3 text-sm font-semibold ${
                  statusType === "error" ? "bg-red-50 text-red-700 border border-red-100" :
                  statusType === "warning" ? "bg-amber-50 text-amber-700 border border-amber-100" :
                  "bg-blue-50 text-blue-700 border border-blue-100"
                }`}>
                  {status}
                </div>
              )}

              <button type="submit" disabled={loading || showClearSession || guestLoading} className="group flex h-[44px] w-full items-center justify-center gap-2 rounded-full bg-gradient-to-r from-blue-500 to-blue-600 text-sm font-black text-white shadow-lg shadow-blue-200/50 transition-all hover:from-blue-600 hover:to-blue-700 active:scale-[0.98] disabled:opacity-60 disabled:shadow-none">
                {loading ? <RefreshCw className="h-4 w-4 animate-spin" /> : (<>Sign In to Dashboard<ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" /></>)}
              </button>
            </form>

            {/* Divider */}
            <div className="my-4 flex items-center gap-3">
              <span className="h-px flex-1 bg-slate-200" />
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">or</span>
              <span className="h-px flex-1 bg-slate-200" />
            </div>

            {/* Guest access */}
            <button
              type="button"
              onClick={continueAsGuest}
              disabled={guestLoading || loading}
              className="flex h-[44px] w-full items-center justify-center gap-2 rounded-full border-2 border-slate-200 bg-white text-sm font-black text-slate-700 transition hover:bg-slate-50 active:scale-[0.98] disabled:opacity-60"
            >
              {guestLoading ? <RefreshCw className="h-4 w-4 animate-spin" /> : (<><UserRound className="h-4 w-4" />Continue as Guest</>)}
            </button>

            <p className="mt-4 text-center text-[11px] text-slate-900 font-semibold leading-relaxed">
              Guest access is temporary and read-only.<br />Contact your school admin for a full account.
            </p>
          </div>

          <p className="mt-4 text-center text-sm">
            <a href="/" className="inline-flex items-center gap-1 font-bold text-white drop-shadow-[0_1px_3px_rgba(0,0,0,0.8)] transition hover:text-blue-300">← Back to Adyapan</a>
          </p>
        </div>
      </div>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <main className="flex h-screen items-center justify-center bg-slate-900">
        <RefreshCw className="h-8 w-8 animate-spin text-blue-500" />
      </main>
    }>
      <LoginForm />
    </Suspense>
  );
}

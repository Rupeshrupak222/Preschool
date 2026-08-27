"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Activity,
  Award,
  Building2,
  Download,
  Eye,
  IndianRupee,
  LayoutDashboard,
  LogOut,
  RefreshCw,
  School,
  Search,
  Settings,
  ShieldCheck,
  UserCog,
  UserPlus,
  Users,
  X
} from "lucide-react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { broadcastLogout, onAuthChange } from "@/lib/auth-channel";
import { useSessionHeartbeat } from "@/lib/use-session-heartbeat";

type Row = Record<string, unknown>;

type AdminOverview = {
  mode?: string;
  totals?: Record<string, number>;
  schools?: Row[];
  principals?: Row[];
  teachers?: Row[];
  teacherPerformance?: Row[];
  students?: Row[];
  leads?: Row[];
  payments?: Row[];
  certificates?: Row[];
  loginEvents?: Row[];
  teacherLoginEvents?: Row[];
  tables?: Array<{ name: string; label: string; rows: Row[] }>;
};

const tabs = [
  { id: "schools", label: "Schools", icon: School },
  { id: "teachers", label: "Teachers", icon: UserCog },
  { id: "principals", label: "Principals", icon: ShieldCheck },
  { id: "students", label: "Students", icon: Users },
  { id: "payments", label: "Payments", icon: IndianRupee },
  { id: "activity", label: "Activity", icon: Activity },
  { id: "add-user", label: "Add User", icon: UserPlus },
  { id: "manage-users", label: "Manage", icon: Settings }
] as const;

function text(value: unknown, fallback = "-") {
  if (value === null || value === undefined || value === "") return fallback;
  if (Array.isArray(value)) return value.join(", ");
  return String(value);
}

function numberValue(value: unknown) {
  const number = Number(value ?? 0);
  return Number.isFinite(number) ? number : 0;
}

function formatCurrency(value: unknown) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0
  }).format(numberValue(value));
}

function formatDate(value: unknown) {
  if (!value) return "-";
  const date = new Date(String(value));
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" });
}

function exportCsv(filename: string, rows: Row[]) {
  if (!rows.length) return;
  const keys = Object.keys(rows[0]);
  const csv = [keys.join(","), ...rows.map((row) => keys.map((key) => JSON.stringify(row[key] ?? "")).join(","))].join("\n");
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export default function AdminPage() {
  const router = useRouter();
  const [overview, setOverview] = useState<AdminOverview | null>(null);
  const [query, setQuery] = useState("");
  const [activeTab, setActiveTab] = useState<(typeof tabs)[number]["id"]>("schools");
  const [selectedStudent, setSelectedStudent] = useState<Row | null>(null);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState("");
  const [mounted, setMounted] = useState(false);
  const [showLogin, setShowLogin] = useState(false);
  const [loginError, setLoginError] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showAccessKey, setShowAccessKey] = useState(false);
  const [showClearSession, setShowClearSession] = useState(false);
  const [clearingSession, setClearingSession] = useState(false);
  const [pendingCredentials, setPendingCredentials] = useState<{ email: string; password: string; accessKey: string } | null>(null);
  const [adminName, setAdminName] = useState("");

  async function handleAdminLogin(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoginLoading(true);
    setLoginError("");
    setShowClearSession(false);

    const form = new FormData(e.currentTarget);
    const email = String(form.get("email") || "").trim();
    const password = String(form.get("password") || "");
    const accessKey = String(form.get("accessKey") || "");

    if (!email || !password || !accessKey) {
      setLoginError("All fields are required.");
      setLoginLoading(false);
      return;
    }

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, accessKey, captcha: "admin-bypass" }),
      });
      const data = await res.json().catch(() => ({})) as { error?: string; code?: string; user?: { role?: string } };

      if (res.status === 409 && data.code === "ACTIVE_SESSION_EXISTS") {
        // Store credentials so user doesn't have to re-enter after clearing
        setPendingCredentials({ email, password, accessKey });
        setShowClearSession(true);
        setLoginError("");
        setLoginLoading(false);
        return;
      }

      if (!res.ok) {
        setLoginError(data.error || "Login failed.");
        setLoginLoading(false);
        return;
      }

      if (data.user?.role !== "admin") {
        setLoginError("Access denied. Admin role required.");
        setLoginLoading(false);
        return;
      }

      // Login successful — reload dashboard
      setShowLogin(false);
      setLoginError("");
      loadOverview();
    } catch {
      setLoginError("Network error. Please try again.");
    } finally {
      setLoginLoading(false);
    }
  }

  async function handleClearAdminSessions() {
    if (!pendingCredentials) return;
    setClearingSession(true);

    try {
      const res = await fetch("/api/admin/clear-sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(pendingCredentials),
      });
      const data = await res.json().catch(() => ({})) as { error?: string };

      if (!res.ok) {
        setLoginError(data.error ?? "Failed to clear sessions. Please try again.");
        setShowClearSession(false);
        setClearingSession(false);
        return;
      }

      // Sessions cleared — retry login automatically
      setShowClearSession(false);
      setLoginError("");

      const loginRes = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...pendingCredentials, captcha: "admin-bypass" }),
      });
      const loginData = await loginRes.json().catch(() => ({})) as { error?: string; user?: { role?: string } };

      if (!loginRes.ok) {
        setLoginError(loginData.error ?? "Login failed after clearing sessions. Please try again.");
        setClearingSession(false);
        setPendingCredentials(null);
        return;
      }

      if (loginData.user?.role !== "admin") {
        setLoginError("Access denied. Admin role required.");
        setClearingSession(false);
        setPendingCredentials(null);
        return;
      }

      setShowLogin(false);
      setPendingCredentials(null);
      loadOverview();
    } catch {
      setLoginError("Network error. Please try again.");
    } finally {
      setClearingSession(false);
    }
  }

  async function loadOverview() {
    setLoading(true);
    setStatus("");

    const authResponse = await fetch("/api/auth/me", { cache: "no-store" });
    const authData = await authResponse.json().catch(() => ({}));
    const isGuestUser = Boolean(authData.user?.guest);

    if (!authResponse.ok || (authData.user?.role !== "admin" && !isGuestUser)) {
      setShowLogin(true);
      setLoading(false);
      return;
    }

    setAdminName(isGuestUser ? "Guest User" : authData.user?.name || "Admin");

    const overviewResponse = await fetch("/api/admin/overview", { cache: "no-store" });
    const data = await overviewResponse.json().catch(() => ({}));

    if (!overviewResponse.ok) {
      setStatus(data.error ?? "Admin dashboard could not be loaded.");
      setLoading(false);
      return;
    }

    setShowLogin(false);
    setOverview(data);
    setLoading(false);
  }

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    broadcastLogout();
    window.dispatchEvent(new Event("adyapan-auth-change"));
    setOverview(null);
    setShowLogin(true);
  }

  useEffect(() => {
    setMounted(true);
    loadOverview();
  }, []);

  // Session heartbeat — auto-logout if session is cleared from another device
  // Only runs when dashboard is showing (not on login form)
  useSessionHeartbeat({
    checkUrl: "/api/auth/me",
    loginUrl: "/admin",
    enabled: !showLogin && !!overview,
    onSessionLost: () => {
      setOverview(null);
      setShowLogin(true);
    },
  });

  // Listen for logout from other tabs
  useEffect(() => {
    const cleanup = onAuthChange((message) => {
      if (message.type === "logout") {
        setOverview(null);
        setShowLogin(true);
      }
    });
    return cleanup;
  }, []);

  const totals = overview?.totals ?? {};
  const schools = overview?.schools ?? [];
  const teachers = overview?.teachers ?? [];
  const principals = overview?.principals ?? [];
  const students = overview?.students ?? [];
  const payments = overview?.payments ?? [];
  const teacherPerformance = overview?.teacherPerformance ?? [];
  const activity = [...(overview?.loginEvents ?? []), ...(overview?.teacherLoginEvents as Row[] | undefined ?? [])].slice(0, 120);

  const activeRows = useMemo(() => {
    const rows =
      activeTab === "schools"
        ? schools
        : activeTab === "teachers"
          ? teacherPerformance
          : activeTab === "principals"
            ? principals
            : activeTab === "students"
              ? students
              : activeTab === "payments"
                ? payments
                : activity;
    const search = query.trim().toLowerCase();
    if (!search) return rows;
    return rows.filter((row) => JSON.stringify(row).toLowerCase().includes(search));
  }, [activeTab, activity, payments, principals, query, schools, students, teacherPerformance]);

  const schoolChart = schools.slice(0, 8).map((school) => ({
    name: text(school.name, "School"),
    students: numberValue(school.students),
    teachers: numberValue(school.teachers)
  }));

  const statCards = [
    ["Schools", totals.schools, School, "bg-cyan-50 text-cyan-700"],
    ["Students", totals.students, Users, "bg-emerald-50 text-emerald-700"],
    ["Teachers", totals.teachers, UserCog, "bg-violet-50 text-violet-700"],
    ["Principals", totals.principals, ShieldCheck, "bg-blue-50 text-blue-700"],
    ["Connections", totals.connections, Building2, "bg-indigo-50 text-indigo-700"],
    ["Revenue", formatCurrency(totals.revenue), IndianRupee, "bg-amber-50 text-amber-700"],
    ["Certificates", totals.certificates, Award, "bg-rose-50 text-rose-700"]
  ] as const;

  if (loading && !showLogin) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4 text-slate-950">
        <div className="rounded-lg border border-slate-200 bg-white p-6 text-center shadow-sm">
          <RefreshCw className="mx-auto h-8 w-8 animate-spin text-cyan-700" />
          <p className="mt-4 text-sm font-black text-slate-700">Loading admin control center...</p>
        </div>
      </main>
    );
  }

  if (showLogin) {
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
                    <ShieldCheck className="h-4 w-4 text-white" />
                  </div>
                  <h1 className="text-[22px] font-black text-slate-900">Admin Login</h1>
                </div>
                <p className="mt-1 pl-[46px] text-[13px] text-slate-700 font-medium">Authorized access only</p>
              </div>

              {/* Active session conflict banner */}
              {showClearSession && (
                <div className="mb-5 rounded-xl border border-amber-200 bg-amber-50 p-4">
                  <p className="text-sm font-black text-amber-900">⚠️ Active Session Detected</p>
                  <p className="mt-1 text-sm font-medium text-amber-800">
                    This admin account is already logged in on another device. Clear the previous session to continue.
                  </p>
                  <div className="mt-3 flex gap-2">
                    <button
                      type="button"
                      onClick={handleClearAdminSessions}
                      disabled={clearingSession}
                      className="flex-1 rounded-lg bg-amber-600 px-3 py-2.5 text-xs font-black text-white transition hover:bg-amber-700 disabled:opacity-60"
                    >
                      {clearingSession ? "Clearing..." : "Clear & Login"}
                    </button>
                    <button
                      type="button"
                      onClick={() => { setShowClearSession(false); setPendingCredentials(null); }}
                      className="rounded-lg border border-slate-200 px-3 py-2.5 text-xs font-black text-slate-700 transition hover:bg-slate-50"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              <form onSubmit={handleAdminLogin} className="space-y-4">
                {/* Email */}
                <div>
                  <label className="mb-1.5 block text-sm font-bold text-slate-700">Email Address</label>
                  <div className="relative">
                    <svg className="absolute left-3.5 top-1/2 h-[16px] w-[16px] -translate-y-1/2 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                    <input
                      name="email"
                      type="email"
                      placeholder="admin@adyapan.com"
                      className="h-[44px] w-full rounded-lg border border-slate-200 bg-white pl-10 pr-4 text-sm font-medium text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                      required
                    />
                  </div>
                </div>

                {/* Password */}
                <div>
                  <label className="mb-1.5 block text-sm font-bold text-slate-700">Password</label>
                  <div className="relative">
                    <svg className="absolute left-3.5 top-1/2 h-[16px] w-[16px] -translate-y-1/2 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                    <input
                      name="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="Enter your password"
                      className="h-[44px] w-full rounded-lg border border-slate-200 bg-white pl-10 pr-12 text-sm font-medium text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 transition hover:text-slate-600"
                      aria-label="Toggle password visibility"
                    >
                      <Eye className="h-[16px] w-[16px]" />
                    </button>
                  </div>
                </div>

                {/* Access Key */}
                <div>
                  <label className="mb-1.5 block text-sm font-bold text-slate-700">Access Key</label>
                  <div className="relative">
                    <svg className="absolute left-3.5 top-1/2 h-[16px] w-[16px] -translate-y-1/2 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" /></svg>
                    <input
                      name="accessKey"
                      type={showAccessKey ? "text" : "password"}
                      placeholder="Enter your admin access key"
                      className="h-[44px] w-full rounded-lg border border-slate-200 bg-white pl-10 pr-12 text-sm font-medium text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowAccessKey(!showAccessKey)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 transition hover:text-slate-600"
                      aria-label="Toggle access key visibility"
                    >
                      <Eye className="h-[16px] w-[16px]" />
                    </button>
                  </div>
                </div>

                {/* Error */}
                {loginError && (
                  <div className="rounded-lg bg-red-50 px-4 py-3 text-sm font-semibold text-red-700 border border-red-100">
                    {loginError}
                  </div>
                )}

                {/* Submit */}
                <button
                  type="submit"
                  disabled={loginLoading || showClearSession}
                  className="group flex h-[44px] w-full items-center justify-center gap-2 rounded-full bg-gradient-to-r from-blue-500 to-blue-600 text-sm font-black text-white shadow-lg shadow-blue-200/50 transition-all hover:from-blue-600 hover:to-blue-700 active:scale-[0.98] disabled:opacity-60 disabled:shadow-none"
                >
                  {loginLoading ? (
                    <RefreshCw className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      Sign In to Admin
                      <svg className="h-4 w-4 transition-transform group-hover:translate-x-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                    </>
                  )}
                </button>
              </form>

              <p className="mt-4 text-center text-[11px] text-slate-900 font-semibold leading-relaxed">
                All login attempts are logged and monitored.
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

  if (!overview) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4 text-slate-950">
        <div className="max-w-md rounded-lg border border-slate-200 bg-white p-6 text-center shadow-sm">
          <p className="text-base font-black text-slate-950">{status || "Admin dashboard not available."}</p>
          <button onClick={() => setShowLogin(true)} className="mt-5 inline-flex rounded-lg bg-slate-950 px-5 py-3 text-sm font-black text-white">
            Admin Login
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 px-6 py-6 text-slate-950 md:px-10 lg:px-16">
      <div className="mx-auto max-w-[1500px]">
        <header className="flex flex-col gap-4 rounded-lg border border-slate-200 bg-white p-5 shadow-sm xl:flex-row xl:items-center xl:justify-between">
          <div className="flex gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg bg-slate-950 text-white">
              <LayoutDashboard className="h-7 w-7" />
            </div>
            <div>
              <p className="text-xs font-black uppercase tracking-[0.18em] text-cyan-700">Admin Control Center</p>
              <h1 className="mt-1 text-2xl font-black tracking-tight text-slate-950 md:text-3xl">
                Welcome {adminName}
              </h1>
              <p className="mt-2 max-w-3xl text-sm font-semibold leading-6 text-slate-600">
                Schools, principals, teachers, students, payments, certificates, and access logs are controlled from this secure admin view.
              </p>
            </div>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <button
              onClick={() => exportCsv(`${activeTab}.csv`, activeRows)}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 text-sm font-black text-slate-950 transition hover:bg-slate-950 hover:text-white"
            >
              <Download className="h-4 w-4" />
              Export
            </button>
            <button
              onClick={loadOverview}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-cyan-700 px-4 text-sm font-black text-white transition hover:bg-slate-950"
            >
              <RefreshCw className="h-4 w-4" />
              Refresh
            </button>
            <button
              onClick={logout}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-slate-950 px-4 text-sm font-black text-white transition hover:bg-rose-700"
            >
              <LogOut className="h-4 w-4" />
              Logout
            </button>
          </div>
        </header>

        <section className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-7">
          {statCards.map(([label, value, Icon, color]) => (
            <article key={label} className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
              <div className={`flex h-11 w-11 items-center justify-center rounded-lg ${color}`}>
                <Icon className="h-5 w-5" />
              </div>
              <p className="mt-4 text-3xl font-black text-slate-950">{text(value, "0")}</p>
              <p className="mt-1 text-sm font-black text-slate-500">{label}</p>
            </article>
          ))}
        </section>

        <section className="mt-6 grid gap-6 xl:grid-cols-[1fr_430px]">
          <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <h2 className="text-xl font-black text-slate-950">School network</h2>
                <p className="mt-1 text-sm font-semibold text-slate-500">Top schools by student and teacher coverage</p>
              </div>
              <span className="inline-flex items-center gap-2 rounded-lg bg-slate-50 px-3 py-2 text-xs font-black uppercase tracking-[0.12em] text-slate-500">
                <Building2 className="h-4 w-4" />
                {overview.mode ?? "mysql"}
              </span>
            </div>
            <div className="mt-5 h-80">
              {mounted && (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={schoolChart}>
                    <CartesianGrid stroke="#e2e8f0" vertical={false} />
                    <XAxis dataKey="name" stroke="#475569" tickLine={false} />
                    <YAxis stroke="#475569" tickLine={false} />
                    <Tooltip contentStyle={{ background: "#ffffff", border: "1px solid #cbd5e1", borderRadius: 8, color: "#0f172a" }} />
                    <Bar dataKey="students" fill="#0891b2" radius={[6, 6, 0, 0]} />
                    <Bar dataKey="teachers" fill="#059669" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-xl font-black text-slate-950">Security overview</h2>
            <div className="mt-4 grid gap-3 text-sm font-semibold text-slate-600">
              {[
                ["Admin API guard", "Role checked server-side"],
                ["Session cookie", "httpOnly and sameSite=lax"],
                ["Teacher portal", `${totals.teacherLogins ?? 0} successful logins`],
                ["Principal portal", `${totals.principalLogins ?? 0} successful logins`],
                ["Active students", `${totals.activeStudents ?? 0} recent login users`]
              ].map(([label, value]) => (
                <div key={label} className="flex items-center justify-between gap-4 rounded-lg bg-slate-50 px-4 py-3">
                  <span>{label}</span>
                  <span className="text-right font-black text-slate-950">{value}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="mt-6 rounded-lg border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-col gap-4 border-b border-slate-200 p-5 xl:flex-row xl:items-center xl:justify-between">
            <div>
              <h2 className="text-xl font-black text-slate-950">Management tables</h2>
              <p className="mt-1 text-sm font-semibold text-slate-500">Search and inspect the full operational data set</p>
            </div>
            <label className="relative block xl:w-96">
              <Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-slate-400" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search any name, school, email, class, status"
                className="h-10 w-full rounded-lg border border-slate-200 bg-white pl-9 pr-3 text-sm font-semibold outline-none focus:border-cyan-600 focus:ring-4 focus:ring-cyan-100"
              />
            </label>
          </div>

          <div className="flex gap-2 overflow-x-auto border-b border-slate-200 p-3">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const active = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`inline-flex h-10 shrink-0 items-center gap-2 rounded-lg px-4 text-sm font-black transition ${
                    active ? "bg-slate-950 text-white" : "bg-slate-50 text-slate-600 hover:bg-cyan-50 hover:text-cyan-700"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {tab.label}
                </button>
              );
            })}
          </div>

          <div className="overflow-x-auto">
            {activeTab === "schools" && <SchoolsTable rows={activeRows} onView={setSelectedStudent} />}
            {activeTab === "teachers" && <TeacherPerformanceTable rows={activeRows} onView={setSelectedStudent} />}
            {activeTab === "principals" && <PrincipalsTable rows={activeRows} onView={setSelectedStudent} />}
            {activeTab === "students" && <StudentsTable rows={activeRows} onView={setSelectedStudent} />}
            {activeTab === "payments" && <PaymentsTable rows={activeRows} onView={setSelectedStudent} />}
            {activeTab === "activity" && <ActivityTable rows={activeRows} />}
            {activeTab === "add-user" && <AddUserPanel onSuccess={loadOverview} />}
            {activeTab === "manage-users" && <ManageUsersPanel onSuccess={loadOverview} />}
          </div>
        </section>

        {selectedStudent && (
          <StudentDetailsModal student={selectedStudent} onClose={() => setSelectedStudent(null)} />
        )}
      </div>
    </main>
  );
}

function EmptyRow({ columns }: { columns: number }) {
  return (
    <tr>
      <td colSpan={columns} className="px-5 py-8 text-center text-sm font-black text-slate-500">
        No records found.
      </td>
    </tr>
  );
}

function SchoolsTable({ rows, onView }: { rows: Row[]; onView: (row: Row) => void }) {
  return (
    <table className="w-full min-w-[1100px] text-left text-sm">
      <thead className="bg-slate-50 text-xs font-black uppercase tracking-[0.12em] text-slate-500">
        <tr>
          <th className="px-5 py-4">School</th>
          <th className="px-5 py-4">Contact</th>
          <th className="px-5 py-4">Students</th>
          <th className="px-5 py-4">Teachers</th>
          <th className="px-5 py-4">Principals</th>
          <th className="px-5 py-4">Revenue</th>
          <th className="px-5 py-4">Status</th>
          <th className="px-5 py-4 text-right">Action</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-slate-100">
        {rows.length ? rows.map((row) => (
          <tr key={text(row.id)} className="font-semibold text-slate-700">
            <td className="px-5 py-4">
              <span className="block font-black text-slate-950">{text(row.name)}</span>
              <span className="text-xs text-slate-500">{text(row.city)}</span>
            </td>
            <td className="px-5 py-4">
              <span className="block">{text(row.contactPerson)}</span>
              <span className="text-xs text-slate-500">{text(row.phone || row.email)}</span>
            </td>
            <td className="px-5 py-4">{text(row.students, "0")}</td>
            <td className="px-5 py-4">{text(row.teachers, "0")}</td>
            <td className="px-5 py-4">{text(row.principals, "0")}</td>
            <td className="px-5 py-4 font-black text-slate-950">{formatCurrency(row.revenue)}</td>
            <td className="px-5 py-4"><StatusBadge value={row.status} /></td>
            <td className="px-5 py-4 text-right">
              <button type="button" onClick={() => onView(row)} className="inline-flex h-9 items-center justify-center gap-2 rounded-lg bg-slate-950 px-3 text-xs font-black text-white transition hover:bg-cyan-700">
                <Eye className="h-4 w-4" /> View
              </button>
            </td>
          </tr>
        )) : <EmptyRow columns={8} />}
      </tbody>
    </table>
  );
}

function TeacherPerformanceTable({ rows, onView }: { rows: Row[]; onView: (row: Row) => void }) {
  return (
    <table className="w-full min-w-[1200px] text-left text-sm">
      <thead className="bg-slate-50 text-xs font-black uppercase tracking-[0.12em] text-slate-500">
        <tr>
          <th className="px-5 py-4">Teacher</th>
          <th className="px-5 py-4">School</th>
          <th className="px-5 py-4">Classes</th>
          <th className="px-5 py-4">Students</th>
          <th className="px-5 py-4">Sessions</th>
          <th className="px-5 py-4">Score</th>
          <th className="px-5 py-4">Last Login</th>
          <th className="px-5 py-4">Status</th>
          <th className="px-5 py-4 text-right">Action</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-slate-100">
        {rows.length ? rows.map((row) => (
          <tr key={text(row.teacherId || row.id)} className="font-semibold text-slate-700">
            <td className="px-5 py-4">
              <span className="block font-black text-slate-950">{text(row.name)}</span>
              <span className="text-xs text-slate-500">{text(row.email)}</span>
            </td>
            <td className="px-5 py-4">{text(row.schoolName)}</td>
            <td className="px-5 py-4">{text(row.assignedClasses)}</td>
            <td className="px-5 py-4">{text(row.students, "0")}</td>
            <td className="px-5 py-4">{text(row.sessions, "0")}</td>
            <td className="px-5 py-4">
              <span className="rounded bg-cyan-50 px-2 py-1 text-xs font-black text-cyan-700">{text(row.score, "0")}</span>
            </td>
            <td className="px-5 py-4">{formatDate(row.lastLoginAt)}</td>
            <td className="px-5 py-4"><StatusBadge value={row.status} /></td>
            <td className="px-5 py-4 text-right">
              <button type="button" onClick={() => onView(row)} className="inline-flex h-9 items-center justify-center gap-2 rounded-lg bg-slate-950 px-3 text-xs font-black text-white transition hover:bg-cyan-700">
                <Eye className="h-4 w-4" /> View
              </button>
            </td>
          </tr>
        )) : <EmptyRow columns={9} />}
      </tbody>
    </table>
  );
}

function PrincipalsTable({ rows, onView }: { rows: Row[]; onView: (row: Row) => void }) {
  return (
    <table className="w-full min-w-[1000px] text-left text-sm">
      <thead className="bg-slate-50 text-xs font-black uppercase tracking-[0.12em] text-slate-500">
        <tr>
          <th className="px-5 py-4">Principal</th>
          <th className="px-5 py-4">School</th>
          <th className="px-5 py-4">Phone</th>
          <th className="px-5 py-4">Last Login</th>
          <th className="px-5 py-4">Status</th>
          <th className="px-5 py-4 text-right">Action</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-slate-100">
        {rows.length ? rows.map((row) => (
          <tr key={text(row.id)} className="font-semibold text-slate-700">
            <td className="px-5 py-4">
              <span className="block font-black text-slate-950">{text(row.name)}</span>
              <span className="text-xs text-slate-500">{text(row.email)}</span>
            </td>
            <td className="px-5 py-4">{text(row.schoolName)}</td>
            <td className="px-5 py-4">{text(row.phone)}</td>
            <td className="px-5 py-4">{formatDate(row.lastLoginAt)}</td>
            <td className="px-5 py-4"><StatusBadge value={row.status} /></td>
            <td className="px-5 py-4 text-right">
              <button type="button" onClick={() => onView(row)} className="inline-flex h-9 items-center justify-center gap-2 rounded-lg bg-slate-950 px-3 text-xs font-black text-white transition hover:bg-cyan-700">
                <Eye className="h-4 w-4" /> View
              </button>
            </td>
          </tr>
        )) : <EmptyRow columns={6} />}
      </tbody>
    </table>
  );
}

function StudentsTable({ rows, onView }: { rows: Row[]; onView: (row: Row) => void }) {
  return (
    <table className="w-full min-w-[1040px] text-left text-sm">
      <thead className="bg-slate-50 text-xs font-black uppercase tracking-[0.12em] text-slate-500">
        <tr>
          <th className="px-5 py-4">Student</th>
          <th className="px-5 py-4">Phone</th>
          <th className="px-5 py-4">School</th>
          <th className="px-5 py-4">Class</th>
          <th className="px-5 py-4">Source</th>
          <th className="px-5 py-4">Joined</th>
          <th className="px-5 py-4 text-right">Action</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-slate-100">
        {rows.length ? rows.map((row) => (
          <tr key={text(row.id)} className="font-semibold text-slate-700">
            <td className="px-5 py-4">
              <span className="block font-black text-slate-950">{text(row.name)}</span>
              <span className="text-xs text-slate-500">{text(row.email)}</span>
            </td>
            <td className="px-5 py-4">{text(row.phone)}</td>
            <td className="px-5 py-4">{text(row.schoolName)}</td>
            <td className="px-5 py-4">{text(row.classLevel)}</td>
            <td className="px-5 py-4">{text(row.signupSource)}</td>
            <td className="px-5 py-4">{formatDate(row.createdAt)}</td>
            <td className="px-5 py-4 text-right">
              <button
                type="button"
                onClick={() => onView(row)}
                className="inline-flex h-9 items-center justify-center gap-2 rounded-lg bg-slate-950 px-3 text-xs font-black text-white transition hover:bg-cyan-700"
              >
                <Eye className="h-4 w-4" />
                View
              </button>
            </td>
          </tr>
        )) : <EmptyRow columns={7} />}
      </tbody>
    </table>
  );
}

function StudentDetailsModal({ student, onClose }: { student: Row; onClose: () => void }) {
  const rawFields = Object.entries(student).filter(([, value]) => value !== null && value !== undefined && value !== "");

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-950/60 px-4 py-6 backdrop-blur-sm">
      <section className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-lg bg-white text-slate-950 shadow-[0_28px_80px_rgba(15,23,42,0.35)]">
        <div className="sticky top-0 flex items-start justify-between gap-4 border-b border-slate-200 bg-white p-5">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.16em] text-cyan-700">Student Details</p>
            <h2 className="mt-1 text-2xl font-black text-slate-950">{text(student.name, "Student")}</h2>
            <p className="mt-1 text-sm font-semibold text-slate-500">{text(student.email)}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-700 transition hover:bg-slate-950 hover:text-white"
            aria-label="Close student details"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="grid gap-5 p-5">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <DetailBox label="Phone" value={student.phone} />
            <DetailBox label="School" value={student.schoolName} />
            <DetailBox label="Class" value={student.classLevel} />
            <DetailBox label="Signup Source" value={student.signupSource} />
            <DetailBox label="Role" value={student.role} />
            <DetailBox label="Joined" value={formatDate(student.createdAt)} />
          </div>

          <div className="rounded-lg border border-slate-200">
            <div className="border-b border-slate-200 bg-slate-50 px-4 py-3">
              <h3 className="text-sm font-black uppercase tracking-[0.12em] text-slate-500">Complete Record</h3>
            </div>
            <div className="divide-y divide-slate-100">
              {rawFields.map(([key, value]) => (
                <div key={key} className="grid gap-1 px-4 py-3 text-sm sm:grid-cols-[180px_1fr] sm:gap-4">
                  <span className="font-black capitalize text-slate-500">{key.replace(/([A-Z])/g, " $1")}</span>
                  <span className="break-words font-semibold text-slate-900">{text(value)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

function DetailBox({ label, value }: { label: string; value: unknown }) {
  return (
    <div className="rounded-lg bg-slate-50 p-4">
      <p className="text-xs font-black uppercase tracking-[0.12em] text-slate-500">{label}</p>
      <p className="mt-2 break-words text-sm font-black text-slate-950">{text(value)}</p>
    </div>
  );
}

function PaymentsTable({ rows, onView }: { rows: Row[]; onView: (row: Row) => void }) {
  return (
    <table className="w-full min-w-[1040px] text-left text-sm">
      <thead className="bg-slate-50 text-xs font-black uppercase tracking-[0.12em] text-slate-500">
        <tr>
          <th className="px-5 py-4">User</th>
          <th className="px-5 py-4">Plan</th>
          <th className="px-5 py-4">Amount</th>
          <th className="px-5 py-4">Order</th>
          <th className="px-5 py-4">Date</th>
          <th className="px-5 py-4">Status</th>
          <th className="px-5 py-4 text-right">Action</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-slate-100">
        {rows.length ? rows.map((row) => (
          <tr key={text(row.id)} className="font-semibold text-slate-700">
            <td className="px-5 py-4">{text(row.userEmail)}</td>
            <td className="px-5 py-4">{text(row.plan)}</td>
            <td className="px-5 py-4 font-black text-slate-950">{formatCurrency(row.amount)}</td>
            <td className="px-5 py-4">{text(row.razorpayOrderId)}</td>
            <td className="px-5 py-4">{formatDate(row.createdAt)}</td>
            <td className="px-5 py-4"><StatusBadge value={row.status} /></td>
            <td className="px-5 py-4 text-right">
              <button type="button" onClick={() => onView(row)} className="inline-flex h-9 items-center justify-center gap-2 rounded-lg bg-slate-950 px-3 text-xs font-black text-white transition hover:bg-cyan-700">
                <Eye className="h-4 w-4" /> View
              </button>
            </td>
          </tr>
        )) : <EmptyRow columns={7} />}
      </tbody>
    </table>
  );
}

function ActivityTable({ rows }: { rows: Row[] }) {
  return (
    <table className="w-full min-w-[860px] text-left text-sm">
      <thead className="bg-slate-50 text-xs font-black uppercase tracking-[0.12em] text-slate-500">
        <tr>
          <th className="px-5 py-4">Email</th>
          <th className="px-5 py-4">Role</th>
          <th className="px-5 py-4">Source</th>
          <th className="px-5 py-4">When</th>
          <th className="px-5 py-4">Status</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-slate-100">
        {rows.length ? rows.map((row, index) => (
          <tr key={`${text(row.id)}-${index}`} className="font-semibold text-slate-700">
            <td className="px-5 py-4">{text(row.email)}</td>
            <td className="px-5 py-4">{text(row.role || (row.teacherId ? "teacher" : "user"))}</td>
            <td className="px-5 py-4">{text(row.source || row.schoolId)}</td>
            <td className="px-5 py-4">{formatDate(row.createdAt)}</td>
            <td className="px-5 py-4"><StatusBadge value={row.status} /></td>
          </tr>
        )) : <EmptyRow columns={5} />}
      </tbody>
    </table>
  );
}

function StatusBadge({ value }: { value: unknown }) {
  const status = text(value, "active").toLowerCase();
  const color =
    status === "active" || status === "paid" || status === "success"
      ? "bg-emerald-50 text-emerald-700"
      : status === "failed" || status === "paused"
        ? "bg-rose-50 text-rose-700"
        : "bg-slate-100 text-slate-700";

  return <span className={`rounded px-2 py-1 text-xs font-black uppercase ${color}`}>{status}</span>;
}

function AddUserPanel({ onSuccess }: { onSuccess: () => void }) {
  const [role, setRole] = useState<"student" | "admin" | "principal" | "teacher">("student");
  const [formStatus, setFormStatus] = useState("");
  const [formSuccess, setFormSuccess] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setFormStatus("");
    setFormSuccess(false);

    const form = new FormData(event.currentTarget);
    const body: Record<string, string> = { role };
    form.forEach((value, key) => {
      if (value) body[key] = String(value);
    });

    try {
      const response = await fetch("/api/admin/add-user", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
      });
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        setFormStatus(data.error || "Failed to add user.");
        setFormSuccess(false);
      } else {
        setFormStatus(data.message || "User added successfully!");
        setFormSuccess(true);
        (event.target as HTMLFormElement).reset();
        onSuccess();
      }
    } catch {
      setFormStatus("Network error. Please try again.");
      setFormSuccess(false);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="p-6">
      <div className="mx-auto max-w-2xl">
        <div className="mb-6">
          <h3 className="text-xl font-black text-slate-950">Add New User</h3>
          <p className="mt-1 text-sm font-semibold text-slate-500">
            Add students, teachers, principals, or admins directly to the database.
          </p>
        </div>

        {/* Role Selector */}
        <div className="mb-6 flex gap-2">
          {(["student", "teacher", "principal", "admin"] as const).map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => { setRole(r); setFormStatus(""); setFormSuccess(false); }}
              className={`rounded-lg px-4 py-2.5 text-sm font-black capitalize transition ${
                role === r
                  ? "bg-slate-950 text-white"
                  : "bg-slate-100 text-slate-600 hover:bg-cyan-50 hover:text-cyan-700"
              }`}
            >
              {r}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="grid gap-4">
          {/* Common Fields */}
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="grid gap-1.5">
              <span className="text-xs font-black uppercase tracking-wide text-slate-500">Full Name *</span>
              <input name="name" required placeholder="Enter full name" className="h-11 rounded-lg border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-950 outline-none focus:border-cyan-600 focus:ring-4 focus:ring-cyan-100" />
            </label>
            <label className="grid gap-1.5">
              <span className="text-xs font-black uppercase tracking-wide text-slate-500">Email *</span>
              <input name="email" type="email" required placeholder="email@example.com" className="h-11 rounded-lg border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-950 outline-none focus:border-cyan-600 focus:ring-4 focus:ring-cyan-100" />
            </label>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="grid gap-1.5">
              <span className="text-xs font-black uppercase tracking-wide text-slate-500">Password *</span>
              <input name="password" type="text" required placeholder="Min 8 chars, 1 uppercase, 1 number" className="h-11 rounded-lg border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-950 outline-none focus:border-cyan-600 focus:ring-4 focus:ring-cyan-100" />
            </label>
            <label className="grid gap-1.5">
              <span className="text-xs font-black uppercase tracking-wide text-slate-500">Phone</span>
              <input name="phone" placeholder="9876543210" className="h-11 rounded-lg border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-950 outline-none focus:border-cyan-600 focus:ring-4 focus:ring-cyan-100" />
            </label>
          </div>

          {/* Student/Teacher/Principal Fields */}
          {role !== "admin" && (
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="grid gap-1.5">
                <span className="text-xs font-black uppercase tracking-wide text-slate-500">School Name {role !== "student" ? "*" : ""}</span>
                <input name="school" required placeholder="School name" className="h-11 rounded-lg border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-950 outline-none focus:border-cyan-600 focus:ring-4 focus:ring-cyan-100" />
              </label>
              {role === "student" && (
                <label className="grid gap-1.5">
                  <span className="text-xs font-black uppercase tracking-wide text-slate-500">Class</span>
                  <select name="classLevel" className="h-11 rounded-lg border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-950 outline-none focus:border-cyan-600 focus:ring-4 focus:ring-cyan-100">
                    <option value="">Select class</option>
                    {Array.from({ length: 12 }, (_, i) => (
                      <option key={i + 1} value={`Class ${i + 1}`}>Class {i + 1}</option>
                    ))}
                  </select>
                </label>
              )}
            </div>
          )}

          {/* Principal-specific */}
          {role === "principal" && (
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="grid gap-1.5">
                <span className="text-xs font-black uppercase tracking-wide text-slate-500">School Key * (login secret)</span>
                <input name="schoolKey" required placeholder="e.g. DPS-KEY-2024" className="h-11 rounded-lg border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-950 outline-none focus:border-cyan-600 focus:ring-4 focus:ring-cyan-100" />
              </label>
              <label className="grid gap-1.5">
                <span className="text-xs font-black uppercase tracking-wide text-slate-500">School ID (optional)</span>
                <input name="schoolId" placeholder="Auto-generated if empty" className="h-11 rounded-lg border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-950 outline-none focus:border-cyan-600 focus:ring-4 focus:ring-cyan-100" />
              </label>
            </div>
          )}

          {/* Teacher-specific */}
          {role === "teacher" && (
            <>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="grid gap-1.5">
                  <span className="text-xs font-black uppercase tracking-wide text-slate-500">Staff Key * (login secret)</span>
                  <input name="staffKey" required placeholder="e.g. STAFF-KEY-001" className="h-11 rounded-lg border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-950 outline-none focus:border-cyan-600 focus:ring-4 focus:ring-cyan-100" />
                </label>
                <label className="grid gap-1.5">
                  <span className="text-xs font-black uppercase tracking-wide text-slate-500">Subject</span>
                  <input name="subject" placeholder="e.g. Maths, Science" className="h-11 rounded-lg border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-950 outline-none focus:border-cyan-600 focus:ring-4 focus:ring-cyan-100" />
                </label>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="grid gap-1.5">
                  <span className="text-xs font-black uppercase tracking-wide text-slate-500">Assigned Classes (comma-separated)</span>
                  <input name="classes" placeholder="Class 8, Class 9, Class 10" className="h-11 rounded-lg border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-950 outline-none focus:border-cyan-600 focus:ring-4 focus:ring-cyan-100" />
                </label>
                <label className="grid gap-1.5">
                  <span className="text-xs font-black uppercase tracking-wide text-slate-500">School ID (optional)</span>
                  <input name="schoolId" placeholder="Auto-generated if empty" className="h-11 rounded-lg border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-950 outline-none focus:border-cyan-600 focus:ring-4 focus:ring-cyan-100" />
                </label>
              </div>
            </>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="mt-2 h-12 rounded-lg bg-slate-950 text-sm font-black text-white transition hover:bg-cyan-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitting ? "Adding..." : `Add ${role.charAt(0).toUpperCase() + role.slice(1)}`}
          </button>

          {formStatus && (
            <p className={`rounded-lg px-4 py-3 text-center text-sm font-black ${formSuccess ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"}`}>
              {formStatus}
            </p>
          )}
        </form>
      </div>
    </div>
  );
}

function ManageUsersPanel({ onSuccess }: { onSuccess: () => void }) {
  const [resetEmail, setResetEmail] = useState("");
  const [resetRole, setResetRole] = useState<"student" | "admin" | "principal" | "teacher">("student");
  const [resetPassword, setResetPassword] = useState("");
  const [resetStatus, setResetStatus] = useState("");
  const [resetSuccess, setResetSuccess] = useState(false);
  const [resetting, setResetting] = useState(false);

  const [deleteEmail, setDeleteEmail] = useState("");
  const [deleteRole, setDeleteRole] = useState<"student" | "admin" | "principal" | "teacher">("student");
  const [deleteStatus, setDeleteStatus] = useState("");
  const [deleteSuccess, setDeleteSuccess] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  async function handleReset(event: React.FormEvent) {
    event.preventDefault();
    setResetting(true);
    setResetStatus("");
    setResetSuccess(false);

    try {
      const response = await fetch("/api/admin/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: resetEmail, newPassword: resetPassword, role: resetRole })
      });
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        setResetStatus(data.error || "Failed to reset password.");
        setResetSuccess(false);
      } else {
        setResetStatus(data.message || "Password reset successfully!");
        setResetSuccess(true);
        setResetPassword("");
      }
    } catch {
      setResetStatus("Network error.");
      setResetSuccess(false);
    } finally {
      setResetting(false);
    }
  }

  async function handleDelete(event: React.FormEvent) {
    event.preventDefault();
    if (!confirmDelete) {
      setConfirmDelete(true);
      setDeleteStatus("⚠️ Click Delete again to confirm. This action cannot be undone!");
      setDeleteSuccess(false);
      return;
    }

    setDeleting(true);
    setDeleteStatus("");
    setDeleteSuccess(false);

    try {
      const response = await fetch("/api/admin/delete-user", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: deleteEmail, role: deleteRole })
      });
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        setDeleteStatus(data.error || "Failed to delete user.");
        setDeleteSuccess(false);
      } else {
        setDeleteStatus(data.message || "User deleted successfully!");
        setDeleteSuccess(true);
        setDeleteEmail("");
        setConfirmDelete(false);
        onSuccess();
      }
    } catch {
      setDeleteStatus("Network error.");
      setDeleteSuccess(false);
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="p-6">
      <div className="mx-auto max-w-3xl grid gap-8 lg:grid-cols-2">
        {/* Reset Password */}
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h3 className="text-lg font-black text-slate-950">🔑 Reset Password</h3>
          <p className="mt-1 text-sm font-semibold text-slate-500">Change password for any user</p>

          <form onSubmit={handleReset} className="mt-5 grid gap-4">
            <label className="grid gap-1.5">
              <span className="text-xs font-black uppercase tracking-wide text-slate-500">Role</span>
              <select
                value={resetRole}
                onChange={(e) => setResetRole(e.target.value as typeof resetRole)}
                className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-950 outline-none focus:border-cyan-600 focus:ring-4 focus:ring-cyan-100"
              >
                <option value="student">Student</option>
                <option value="admin">Admin</option>
                <option value="principal">Principal</option>
                <option value="teacher">Teacher</option>
              </select>
            </label>

            <label className="grid gap-1.5">
              <span className="text-xs font-black uppercase tracking-wide text-slate-500">Email</span>
              <input
                type="email"
                required
                value={resetEmail}
                onChange={(e) => setResetEmail(e.target.value)}
                placeholder="user@example.com"
                className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-950 outline-none focus:border-cyan-600 focus:ring-4 focus:ring-cyan-100"
              />
            </label>

            <label className="grid gap-1.5">
              <span className="text-xs font-black uppercase tracking-wide text-slate-500">New Password</span>
              <input
                type="text"
                required
                value={resetPassword}
                onChange={(e) => setResetPassword(e.target.value)}
                placeholder="Min 8 chars, 1 uppercase, 1 number"
                className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-950 outline-none focus:border-cyan-600 focus:ring-4 focus:ring-cyan-100"
              />
            </label>

            <button
              type="submit"
              disabled={resetting}
              className="h-10 rounded-lg bg-cyan-700 text-sm font-black text-white transition hover:bg-slate-950 disabled:opacity-60"
            >
              {resetting ? "Resetting..." : "Reset Password"}
            </button>

            {resetStatus && (
              <p className={`rounded-lg px-3 py-2 text-center text-xs font-black ${resetSuccess ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"}`}>
                {resetStatus}
              </p>
            )}
          </form>
        </div>

        {/* Delete User */}
        <div className="rounded-xl border border-rose-200 bg-white p-6 shadow-sm">
          <h3 className="text-lg font-black text-rose-700">🗑️ Delete User</h3>
          <p className="mt-1 text-sm font-semibold text-slate-500">Permanently remove a user and all their data</p>

          <form onSubmit={handleDelete} className="mt-5 grid gap-4">
            <label className="grid gap-1.5">
              <span className="text-xs font-black uppercase tracking-wide text-slate-500">Role</span>
              <select
                value={deleteRole}
                onChange={(e) => { setDeleteRole(e.target.value as typeof deleteRole); setConfirmDelete(false); setDeleteStatus(""); }}
                className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-950 outline-none focus:border-rose-400 focus:ring-4 focus:ring-rose-100"
              >
                <option value="student">Student</option>
                <option value="admin">Admin</option>
                <option value="principal">Principal</option>
                <option value="teacher">Teacher</option>
              </select>
            </label>

            <label className="grid gap-1.5">
              <span className="text-xs font-black uppercase tracking-wide text-slate-500">Email</span>
              <input
                type="email"
                required
                value={deleteEmail}
                onChange={(e) => { setDeleteEmail(e.target.value); setConfirmDelete(false); setDeleteStatus(""); }}
                placeholder="user@example.com"
                className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-950 outline-none focus:border-rose-400 focus:ring-4 focus:ring-rose-100"
              />
            </label>

            <button
              type="submit"
              disabled={deleting}
              className={`h-10 rounded-lg text-sm font-black text-white transition disabled:opacity-60 ${
                confirmDelete ? "bg-rose-700 hover:bg-rose-900" : "bg-slate-950 hover:bg-rose-700"
              }`}
            >
              {deleting ? "Deleting..." : confirmDelete ? "⚠️ Confirm Delete" : "Delete User"}
            </button>

            {deleteStatus && (
              <p className={`rounded-lg px-3 py-2 text-center text-xs font-black ${deleteSuccess ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-800"}`}>
                {deleteStatus}
              </p>
            )}
          </form>
        </div>
      </div>
    </div>
  );
}

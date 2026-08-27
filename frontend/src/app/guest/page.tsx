"use client";

import { useEffect, useState } from "react";
import { GraduationCap, BookOpenCheck, ShieldCheck, LayoutDashboard, ArrowRight, LogOut, RefreshCw, Sparkles, Info } from "lucide-react";

const portals = [
  {
    key: "student",
    label: "Student Portal",
    desc: "Explore the 360° learning dashboard — courses, quizzes, attendance and progress tracking.",
    icon: GraduationCap,
    href: "/student-dashboard",
    gradient: "from-blue-500 to-indigo-600",
    tag: "Learning"
  },
  {
    key: "teacher",
    label: "Teacher Portal",
    desc: "Preview class management, homework assignments, notes library and student doubt solving.",
    icon: BookOpenCheck,
    href: "/teacher/dashboard",
    gradient: "from-emerald-500 to-teal-600",
    tag: "Teaching"
  },
  {
    key: "principal",
    label: "Principal Portal",
    desc: "See school-wide statistics, student directory, admission leads and activity insights.",
    icon: ShieldCheck,
    href: "/principal/dashboard",
    gradient: "from-purple-500 to-fuchsia-600",
    tag: "Management"
  },
  {
    key: "admin",
    label: "Admin Portal",
    desc: "Browse the platform control center with schools, analytics, payments and system activity.",
    icon: LayoutDashboard,
    href: "/admin",
    gradient: "from-slate-600 to-slate-800",
    tag: "Platform"
  }
];

export default function GuestHubPage() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    fetch("/api/auth/guest", { method: "POST" })
      .then(() => {
        window.dispatchEvent(new Event("adyapan-auth-change"));
        setReady(true);
      })
      .catch(() => setReady(true));
  }, []);

  async function endGuest() {
    await fetch("/api/auth/guest", { method: "DELETE" }).catch(() => {});
    window.dispatchEvent(new Event("adyapan-auth-change"));
    window.location.href = "/";
  }

  return (
    <div
      className="relative z-10 min-h-screen w-full text-white"
      style={{ background: "radial-gradient(circle at 20% 10%, #1e3a8a 0%, #0f172a 45%, #020617 100%)" }}
    >
      <div className="mx-auto max-w-5xl px-6 py-14 sm:py-20">
        {/* Header */}
        <div className="flex flex-col items-start justify-between gap-6 sm:flex-row sm:items-center">
          <div className="flex items-center gap-4">
            <img src="/ady-logo.png" alt="ADYAPAN" className="h-14 w-14 rounded-full object-cover ring-2 ring-white/20" />
            <div>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-sky-400/20 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-sky-200">
                <Sparkles className="h-3 w-3" /> Guest Demo
              </span>
              <h1 className="mt-2 text-3xl font-black leading-tight text-white sm:text-4xl">Explore Adyapan Portals</h1>
            </div>
          </div>
          <button
            onClick={endGuest}
            className="inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/10 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-white/20"
          >
            <LogOut className="h-4 w-4" /> Exit Demo
          </button>
        </div>

        {/* Info banner */}
        <div className="mt-8 flex items-start gap-3 rounded-2xl border border-amber-300/30 bg-amber-400/15 px-5 py-4">
          <Info className="mt-0.5 h-5 w-5 shrink-0 text-amber-300" />
          <p className="text-sm font-semibold leading-relaxed text-amber-100">
            You are in guest demo mode. Everything you see is <span className="font-black text-amber-50">sample content</span> — no
            real student records are displayed, and nothing you do is saved.
          </p>
        </div>

        {/* Portal cards */}
        {!ready ? (
          <div className="mt-20 flex flex-col items-center gap-3">
            <RefreshCw className="h-8 w-8 animate-spin text-sky-300" />
            <p className="text-sm font-semibold text-slate-300">Preparing your demo…</p>
          </div>
        ) : (
          <div className="mt-10 grid gap-6 sm:grid-cols-2">
            {portals.map((p) => (
              <a
                key={p.key}
                href={p.href}
                className="group relative overflow-hidden rounded-3xl border border-white/15 bg-white/10 p-7 shadow-xl transition-all duration-300 hover:-translate-y-1 hover:border-white/30 hover:bg-white/15"
              >
                <div className="flex items-start justify-between">
                  <div className={`flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br ${p.gradient} shadow-lg`}>
                    <p.icon className="h-7 w-7 text-white" />
                  </div>
                  <span className="rounded-full border border-white/20 bg-white/10 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-slate-200">
                    {p.tag}
                  </span>
                </div>

                <h2 className="mt-6 text-2xl font-black text-white">{p.label}</h2>
                <p className="mt-2 text-sm font-medium leading-relaxed text-slate-200">{p.desc}</p>

                <span className="mt-6 inline-flex items-center gap-2 text-sm font-bold text-sky-300 transition group-hover:text-sky-200">
                  Open demo
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                </span>
              </a>
            ))}
          </div>
        )}

        {/* Footer — ends the demo session */}
        <div className="mt-14 text-center">
          <button onClick={endGuest} className="text-sm font-bold text-slate-300 transition hover:text-white">
            ← Back to Adyapan
          </button>
        </div>
      </div>
    </div>
  );
}

"use client";

import { useEffect, useRef, useState } from "react";
import {
  Award,
  BarChart3,
  BookOpen,
  ChevronDown,
  LayoutDashboard,
  LogOut,
  Menu,
  Settings,
  X
} from "lucide-react";
import { usePathname } from "next/navigation";
import { broadcastLogout, onAuthChange } from "@/lib/auth-channel";

const navItems = [
  { label: "Home", href: "/#top" },
  { label: "Overview", href: "/overview" },
  { label: "Mentor", href: "/mentors" },
  { label: "My App", href: "/our" },
  { label: "LMS", href: "/dashboard" },
  { label: "About Us", href: "/about" },
  { label: "Contact Us", href: "/contact" }
];

type NavUser = {
  name: string;
  email?: string;
  role: "student" | "admin" | "principal" | "teacher";
  schoolName?: string;
  guest?: boolean;
};

export default function SiteNavbar() {
  const pathname = usePathname();
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [user, setUser] = useState<NavUser | null>(null);

  useEffect(() => {
    let active = true;

    async function loadUser() {
      try {
        const response = await fetch("/api/auth/me", { cache: "no-store" });
        const data = await response.json();
        if (response.ok) {
          if (active) setUser(data.user);
          return;
        }

        const principalResponse = await fetch("/api/principal/me", { cache: "no-store" });
        const principalData = await principalResponse.json();
        if (principalResponse.ok) {
          if (active) {
            setUser({
              name: principalData.principal.name,
              email: principalData.principal.email,
              role: "principal",
              schoolName: principalData.principal.schoolName
            });
          }
          return;
        }

        const teacherResponse = await fetch("/api/teacher/me", { cache: "no-store" });
        const teacherData = await teacherResponse.json();
        if (active) {
          setUser(
            teacherResponse.ok
              ? {
                  name: teacherData.teacher.name,
                  email: teacherData.teacher.email,
                  role: "teacher",
                  schoolName: teacherData.teacher.schoolName
                }
              : null
          );
        }
      } catch {
        if (active) setUser(null);
      }
    }

    loadUser();
    window.addEventListener("adyapan-auth-change", loadUser);
    return () => {
      active = false;
      window.removeEventListener("adyapan-auth-change", loadUser);
    };
  }, [pathname]);

  useEffect(() => {
    setProfileOpen(false);
    setMenuOpen(false);
  }, [pathname]);

  // Listen for logout from other tabs (e.g., dashboard tab)
  useEffect(() => {
    const cleanup = onAuthChange((message) => {
      if (message.type === "logout") {
        setUser(null);
        window.dispatchEvent(new Event("adyapan-auth-change"));
      } else if (message.type === "login") {
        window.dispatchEvent(new Event("adyapan-auth-change"));
      }
    });
    return cleanup;
  }, []);

  useEffect(() => {
    function closeOnOutsideClick(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setProfileOpen(false);
      }
    }

    document.addEventListener("mousedown", closeOnOutsideClick);
    return () => document.removeEventListener("mousedown", closeOnOutsideClick);
  }, []);

  function isActive(href: string) {
    const path = href.split("#")[0] || "/";
    if (path === "/") {
      return href === "/#top" && pathname === "/";
    }

    return pathname === path || (path !== "/" && pathname.startsWith(path));
  }

  async function logout() {
    if (user?.guest) {
      await fetch("/api/auth/guest", { method: "DELETE" });
      broadcastLogout();
      setUser(null);
      setMenuOpen(false);
      setProfileOpen(false);
      window.dispatchEvent(new Event("adyapan-auth-change"));
      window.location.href = "/";
      return;
    }
    const logoutUrl =
      user?.role === "principal" ? "/api/principal/logout" : user?.role === "teacher" ? "/api/teacher/logout" : "/api/auth/logout";
    await fetch(logoutUrl, { method: "POST" });
    broadcastLogout();
    setUser(null);
    setMenuOpen(false);
    setProfileOpen(false);
    window.dispatchEvent(new Event("adyapan-auth-change"));
    window.location.href = user?.role === "principal" ? "/principal/login" : user?.role === "teacher" ? "/teacher/login" : "/login";
  }

  function continueAsGuest() {
    setMenuOpen(false);
    window.location.href = "/guest";
  }

  function openDashboardWindow(href: string) {
    const target = href.includes("#") ? href.replace("#", "/") : href;
    const windowName =
      user?.role === "admin"
        ? "adyapan_admin_dashboard"
        : user?.role === "principal"
          ? "adyapan_principal_dashboard"
          : user?.role === "teacher"
            ? "adyapan_teacher_dashboard"
            : "adyapan_student_dashboard";
    const dashboardWindow = window.open(target, windowName);
    dashboardWindow?.focus();
    setMenuOpen(false);
    setProfileOpen(false);
  }

  const dashboardHref =
    user?.role === "admin"
      ? "/admin"
      : user?.role === "principal"
        ? "/principal/dashboard"
        : user?.role === "teacher"
          ? "/teacher/dashboard"
          : "/student-dashboard";
  const shortName = user?.name?.split(" ")[0] || "Student";
  const initial = (user?.name?.trim()?.[0] || "A").toUpperCase();
  const menuItems =
    user?.guest
      ? [
          { label: "Demo Portals Hub", href: "/guest", icon: LayoutDashboard },
          { label: "Student Portal", href: "/student-dashboard", icon: BookOpen },
          { label: "Teacher Portal", href: "/teacher/dashboard", icon: BarChart3 },
          { label: "Admin Portal", href: "/admin", icon: Settings }
        ]
    : user?.role === "admin"
      ? [{ label: "Admin Dashboard", href: dashboardHref, icon: LayoutDashboard }]
      : user?.role === "principal"
        ? [
            { label: "Principal Dashboard", href: dashboardHref, icon: LayoutDashboard },
            { label: "School Students", href: "/principal/dashboard#students", icon: BookOpen },
            { label: "Activity", href: "/principal/dashboard#activity", icon: BarChart3 },
            { label: "Security", href: "/principal/dashboard#security", icon: Settings }
          ]
        : user?.role === "teacher"
          ? [
              { label: "Teacher Dashboard", href: dashboardHref, icon: LayoutDashboard },
              { label: "Student List", href: "/teacher/dashboard#students", icon: BookOpen },
              { label: "Class Schedule", href: "/teacher/dashboard#schedule", icon: BarChart3 },
              { label: "Security", href: "/teacher/dashboard#security", icon: Settings }
            ]
      : [
          { label: "Dashboard", href: dashboardHref, icon: LayoutDashboard },
          { label: "My Courses", href: "/student-dashboard#courses", icon: BookOpen },
          { label: "Track Result", href: "/student-dashboard#results", icon: BarChart3 },
          { label: "Certificates", href: "/student-dashboard#certificates", icon: Award },
          { label: "Settings", href: "/student-dashboard#settings", icon: Settings }
        ];

  return (
    <nav className="fixed left-0 right-0 top-0 z-[100] bg-gradient-to-r from-[#0f172a] via-[#1e293b] to-[#0f172a] shadow-[0_12px_36px_rgba(0,0,0,0.4)] backdrop-blur-xl">
      <div className="pointer-events-none absolute left-9 top-3 h-3 w-3 rounded-full bg-[#f6d748]" />
      <div className="pointer-events-none absolute left-[82px] top-5 text-sm font-black text-yellow-200">*</div>

      <div className="relative z-10 mx-auto flex h-20 max-w-[1500px] items-center justify-between gap-3 px-3 sm:px-6 md:px-10 lg:px-16">
        <a href="/#top" className="flex min-w-0 shrink-0 items-center gap-2 sm:gap-3" aria-label="ADYAPAN School home">
          <img
            src="/ady-logo.png"
            alt="ADYAPAN"
            className="h-12 w-12 shrink-0 rounded-full object-contain drop-shadow-[0_12px_18px_rgba(234,88,12,0.26)] sm:h-14 sm:w-14"
          />
         <span className="relative min-w-0">
  <span className="block text-[24px] font-black tracking-tight text-[#c084fc] sm:text-[28px] md:text-[32px]">
    Adyapan
  </span>

  <span className="absolute left-[65%] top-[68%] text-[7px] font-black uppercase tracking-[0.28em] text-white sm:text-[8px] md:text-[9px]">
    SCHOOL
  </span>
</span>
        </a>

        <div className="hidden min-w-0 flex-1 items-center justify-center gap-2 rounded-full border-2 border-white/20 bg-white/10 px-3 py-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.15),0_12px_30px_rgba(0,0,0,0.2)] backdrop-blur-xl xl:flex 2xl:gap-3 2xl:px-5">
          {navItems.map((item) => {
            const active = isActive(item.href);
            return (
              <a
                key={item.label}
                href={item.label === "LMS" ? "/dashboard" : item.href}
                className={`inline-flex h-12 min-w-[80px] items-center justify-center whitespace-nowrap rounded-full px-2.5 text-[13px] font-black text-white transition hover:-translate-y-0.5 hover:bg-white/15 xl:min-w-[94px] xl:px-3 xl:text-[15px] 2xl:h-14 2xl:min-w-[108px] 2xl:px-5 2xl:text-[17px] ${
                  active
                    ? "bg-gradient-to-r from-[#ffd84d] to-[#ff9f2f] text-slate-950 shadow-[0_12px_24px_rgba(249,158,47,0.35)]"
                    : ""
                }`}
              >
                {item.label}
              </a>
            );
          })}
        </div>

        <div className="hidden shrink-0 items-center gap-2 xl:flex 2xl:gap-3">
          {user ? (
            <div ref={dropdownRef} className="relative">
              <button
                type="button"
                onClick={() => setProfileOpen((value) => !value)}
                className={`inline-flex h-12 max-w-[240px] items-center gap-3 rounded-full border-2 px-3 pr-4 text-left font-black shadow-[0_10px_22px_rgba(0,0,0,0.2)] transition hover:-translate-y-0.5 ${
                  user.guest
                    ? "border-amber-300/60 bg-amber-400/15 text-white hover:bg-amber-400/25"
                    : "border-white/30 bg-white/10 text-white hover:bg-white/20"
                }`}
                aria-expanded={profileOpen}
                aria-haspopup="menu"
              >
                <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-black text-slate-950 ${user.guest ? "bg-gradient-to-br from-[#ffd84d] to-[#ff9f2f]" : "bg-gradient-to-br from-[#ffd84d] to-[#ff5b55]"}`}>
                  {user.guest ? "G" : initial}
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-[15px] leading-4">{user.guest ? "Guest" : shortName}</span>
                  <span className={`block truncate text-[11px] font-bold uppercase tracking-[0.12em] ${user.guest ? "text-amber-200" : "text-slate-600"}`}>
                    {user.guest
                      ? "Demo Mode"
                      : user.role === "admin"
                        ? "Admin"
                        : user.role === "principal"
                          ? "Principal"
                          : user.role === "teacher"
                            ? "Teacher"
                            : "Student"}
                  </span>
                </span>
                <ChevronDown className={`h-4 w-4 shrink-0 transition ${profileOpen ? "rotate-180" : ""}`} />
              </button>

              {profileOpen && (
                <div
                  role="menu"
                  className="absolute right-0 mt-3 w-72 overflow-hidden rounded-2xl border border-white/70 bg-white p-2 text-slate-950 shadow-[0_24px_60px_rgba(15,23,42,0.18)]"
                >
                  <div className="flex items-center gap-3 border-b border-slate-100 p-3">
                    <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-base font-black text-white ${user.guest ? "bg-gradient-to-br from-amber-400 to-orange-500" : "bg-slate-950"}`}>
                      {user.guest ? "G" : initial}
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-black">{user.guest ? "Guest User" : user.name}</span>
                      <span className="block truncate text-xs font-semibold text-slate-500">{user.guest ? "Demo mode · sample data only" : user.email || "ADYAPAN learner"}</span>
                    </span>
                  </div>

                  <div className="py-2">
                    {menuItems.map((item) => (
                      <button
                        key={item.label}
                        type="button"
                        onClick={() => openDashboardWindow(item.href)}
                        className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-black transition hover:bg-blue-50 hover:text-blue-700"
                      >
                        <item.icon className="h-4 w-4" />
                        {item.label}
                      </button>
                    ))}
                  </div>

                  <button
                    type="button"
                    onClick={logout}
                    className="flex w-full items-center gap-3 rounded-xl border-t border-slate-100 px-3 py-3 text-left text-sm font-black text-rose-600 transition hover:bg-rose-50"
                  >
                    <LogOut className="h-4 w-4" />
                    {user.guest ? "Exit Demo" : "Logout"}
                  </button>
                </div>
              )}
            </div>
          ) : (
            <>
              <a
                href="/login"
                className="inline-flex h-12 min-w-[92px] items-center justify-center rounded-full border-2 border-white/30 bg-white/10 px-5 text-[15px] font-black text-white shadow-[0_10px_22px_rgba(0,0,0,0.2)] transition hover:-translate-y-0.5 hover:bg-white/20 2xl:min-w-[100px] 2xl:px-6"
              >
                Login
              </a>
              <button
                type="button"
                onClick={continueAsGuest}
                className="inline-flex h-12 min-w-[92px] items-center justify-center rounded-full bg-gradient-to-r from-[#ffd84d] to-[#ff9f2f] px-5 text-[15px] font-black text-slate-950 shadow-[0_10px_22px_rgba(0,0,0,0.2)] transition hover:-translate-y-0.5 hover:brightness-105 2xl:min-w-[100px] 2xl:px-6"
              >
                Guest User
              </button>
            </>
          )}
        </div>

        <button
          className="shrink-0 rounded-full border-2 border-white/30 bg-white/10 p-3 text-white shadow-[0_10px_22px_rgba(0,0,0,0.2)] transition hover:bg-white/20 xl:hidden"
          onClick={() => setMenuOpen((value) => !value)}
          aria-label="Open navigation"
        >
          {menuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>

      {menuOpen && (
        <div className="max-h-[calc(100vh-80px)] overflow-y-auto border-t-2 border-white/10 bg-gradient-to-b from-[#0f172a] to-[#1e293b] px-4 py-5 shadow-[0_16px_36px_rgba(0,0,0,0.3)] backdrop-blur-xl xl:hidden">
          <div className="grid gap-3">
            {navItems.map((item) => (
              <a
                key={item.label}
                href={item.label === "LMS" ? "/dashboard" : item.href}
                onClick={() => setMenuOpen(false)}
                className={`rounded-full px-6 py-4 text-lg font-black text-white transition hover:bg-white/15 ${
                  isActive(item.href) ? "bg-gradient-to-r from-[#ffd84d] to-[#ff9f2f] text-slate-950" : "bg-white/10"
                }`}
              >
                {item.label}
              </a>
            ))}
            {user ? (
              <div className="mt-3 rounded-3xl border-2 border-white/55 bg-white/42 p-3">
                <div className="mb-3 flex items-center gap-3 px-2">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#ffd84d] to-[#ff5b55] text-base font-black text-slate-950">
                    {initial}
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate text-base font-black text-slate-950">{user.name}</span>
                    <span className="block truncate text-xs font-bold uppercase tracking-[0.12em] text-slate-700">
                      {user.guest
                        ? "Demo"
                        : user.role === "admin"
                          ? "Admin"
                          : user.role === "principal"
                            ? "Principal"
                            : user.role === "teacher"
                              ? "Teacher"
                              : "Student"}
                    </span>
                  </span>
                </div>
                <div className="grid gap-2">
                  {menuItems.map((item) => (
                    <button
                      key={item.label}
                      type="button"
                      onClick={() => openDashboardWindow(item.href)}
                      className="flex items-center gap-3 rounded-2xl bg-white/76 px-4 py-3 text-left text-base font-black text-slate-950"
                    >
                      <item.icon className="h-5 w-5" />
                      {item.label}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={logout}
                    className="flex items-center gap-3 rounded-2xl bg-rose-50 px-4 py-3 text-left text-base font-black text-rose-600"
                  >
                    <LogOut className="h-5 w-5" />
                    {user.guest ? "Exit Demo" : "Logout"}
                  </button>
                </div>
              </div>
            ) : (
              <div className="mt-4 grid gap-3">
                <a
                  href="/login"
                  onClick={() => setMenuOpen(false)}
                  className="block rounded-full border-2 border-white bg-white/78 px-4 py-3 text-center text-base font-black text-slate-950 transition hover:bg-white"
                >
                  Login
                </a>
                <button
                  type="button"
                  onClick={continueAsGuest}
                  className="block w-full rounded-full bg-gradient-to-r from-[#ffd84d] to-[#ff9f2f] px-4 py-3 text-center text-base font-black text-slate-950 transition hover:brightness-105"
                >
                  Guest User
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}

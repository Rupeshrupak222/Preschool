"use client";

import { usePathname } from "next/navigation";
import SiteFooter from "./SiteFooter";
import SiteNavbar from "./SiteNavbar";

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isLmsRoute = pathname === "/student-dashboard" || pathname.startsWith("/student-dashboard/");
  const isAdminRoute = pathname === "/admin" || pathname.startsWith("/admin/");
  const isPrincipalDashboard = pathname === "/principal/dashboard" || pathname.startsWith("/principal/dashboard/");
  const isTeacherDashboard = pathname === "/teacher/dashboard" || pathname.startsWith("/teacher/dashboard/") || pathname.startsWith("/teacher/dashboard-preview");
  const isOurApp = pathname === "/our";
  const isLegalPage = pathname === "/privacy-policy" || pathname === "/terms-of-service";
  const isGuestHub = pathname === "/guest";
  const hideNav = isLmsRoute || isAdminRoute || isPrincipalDashboard || isTeacherDashboard || isLegalPage || isGuestHub;

  return (
    <>
      {!hideNav && <SiteNavbar />}
      <div className={hideNav ? undefined : "site-page-with-nav"}>{children}</div>
      {!hideNav && !isOurApp && <SiteFooter />}
    </>
  );
}

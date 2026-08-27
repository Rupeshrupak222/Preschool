import { NextResponse } from "next/server";
import { clearActiveSessions } from "@/lib/db";
import { clearAuthCookies, currentUser, currentTeacher, currentPrincipal, GUEST_COOKIE } from "@/lib/security";

// Clears whatever session is currently active (student/guest, teacher, or principal)
// and wipes all auth cookies (including the guest demo cookie). Used when landing
// on a login page while already signed in or in guest demo mode.
export async function POST(request: Request) {
  const user = await currentUser(request);
  const teacher = await currentTeacher(request);
  const principal = await currentPrincipal(request);

  const active = user ?? teacher ?? principal;
  if (active) {
    await clearActiveSessions(active.id);
  }

  const response = NextResponse.json({ ok: true, cleared: Boolean(active) });
  clearAuthCookies(response);
  // Also clear the guest demo cookie.
  response.cookies.set(GUEST_COOKIE, "", {
    httpOnly: true,
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0
  });
  return response;
}

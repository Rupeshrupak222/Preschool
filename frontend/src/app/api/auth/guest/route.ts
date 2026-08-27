import { NextResponse } from "next/server";
import { GUEST_COOKIE } from "@/lib/security";

// Guest demo access — sets a single guest cookie that unlocks read-only demo
// views across ALL portals (student, teacher, principal, admin). No DB account.
export async function POST() {
  const response = NextResponse.json({
    ok: true,
    guest: true,
    user: { id: "guest", email: "guest@guest.adyapan.local", name: "Guest User", role: "guest", guest: true }
  });

  response.cookies.set(GUEST_COOKIE, "1", {
    httpOnly: true,
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 // 1 hour demo session
  });

  return response;
}

// Allow ending the guest session.
export async function DELETE() {
  const response = NextResponse.json({ ok: true });
  response.cookies.set(GUEST_COOKIE, "", {
    httpOnly: true,
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0
  });
  return response;
}

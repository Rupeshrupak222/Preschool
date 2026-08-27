import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";

const AUTH_COOKIE_NAMES = ["adyapan_token", "adyapan_principal_token", "adyapan_teacher_token"] as const;

// Login pages that should be blocked when already logged in
const LOGIN_PATHS = ["/login", "/principal/login", "/teacher/login"];

// Dashboard paths mapped by role
const DASHBOARD_BY_ROLE: Record<string, string> = {
  student: "/student-dashboard",
  admin: "/admin",
  principal: "/principal/dashboard",
  teacher: "/teacher/dashboard",
};

// Protected paths — only the listed roles can access them
// This enforces both vertical (student can't access teacher routes)
// and horizontal (teacher can't access principal routes) privilege escalation prevention
const PROTECTED_PATHS: { prefix: string; allowedRoles: string[] }[] = [
  { prefix: "/student-dashboard", allowedRoles: ["student"] },
  { prefix: "/principal/dashboard", allowedRoles: ["principal"] },
  { prefix: "/teacher/dashboard", allowedRoles: ["teacher"] },
  { prefix: "/admin", allowedRoles: ["admin"] },
];

// API routes that are role-restricted
// Students cannot call teacher/principal/admin APIs
// Teachers cannot call principal/admin APIs
const PROTECTED_API_PATHS: { prefix: string; allowedRoles: string[] }[] = [
  { prefix: "/api/admin", allowedRoles: ["admin"] },
  { prefix: "/api/principal", allowedRoles: ["principal", "admin"] },
  { prefix: "/api/teacher", allowedRoles: ["teacher", "admin"] },
  { prefix: "/api/student-dashboard", allowedRoles: ["student", "admin"] },
];

function getJwtSecret() {
  const secret = process.env.JWT_SECRET || "local-dev-secret-change-in-production";
  return new TextEncoder().encode(secret);
}

type TokenPayload = {
  id: string;
  email: string;
  role: "student" | "admin" | "principal" | "teacher";
  name: string;
  sid?: string;
};

async function verifyTokenEdge(token: string): Promise<TokenPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getJwtSecret(), {
      issuer: "adyapan-frontend",
      audience: "adyapan-app",
    });
    return payload as unknown as TokenPayload;
  } catch {
    return null;
  }
}

async function getActiveSession(request: NextRequest): Promise<TokenPayload | null> {
  for (const cookieName of AUTH_COOKIE_NAMES) {
    const cookie = request.cookies.get(cookieName);
    if (cookie?.value) {
      const payload = await verifyTokenEdge(cookie.value);
      if (payload) {
        // Validate cookie-role pairing to prevent token substitution attacks
        if (cookieName === "adyapan_token" && (payload.role === "student" || payload.role === "admin")) return payload;
        if (cookieName === "adyapan_principal_token" && payload.role === "principal") return payload;
        if (cookieName === "adyapan_teacher_token" && payload.role === "teacher") return payload;
      }
    }
  }
  return null;
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Guest demo mode — a single guest cookie unlocks read-only demo views
  // across ALL portals. The route handlers themselves return sample data
  // and block any writes, so it is safe to let guests through here.
  const isGuest = request.cookies.get("adyapan_guest")?.value === "1";
  if (isGuest) {
    return NextResponse.next();
  }

  const session = await getActiveSession(request);

  // Login pages are always accessible — never redirect away from them.
  // The login pages themselves handle active session conflicts
  // (showing "Clear Previous Sessions" prompt when needed).
  // This ensures footer links always work: Teacher Access → /teacher/login, etc.

  // Protect API routes — enforce role-based access control
  for (const { prefix, allowedRoles } of PROTECTED_API_PATHS) {
    if (pathname.startsWith(prefix + "/") || pathname === prefix) {
      // Skip the login and clear-sessions endpoints themselves
      if (
        pathname.endsWith("/login") ||
        pathname.endsWith("/clear-sessions") ||
        pathname.endsWith("/logout")
      ) {
        break;
      }

      if (!session) {
        return NextResponse.json({ error: "Authentication required." }, { status: 401 });
      }

      if (!allowedRoles.includes(session.role)) {
        // Privilege escalation attempt — deny silently with generic message
        return NextResponse.json({ error: "Access denied." }, { status: 403 });
      }
      break;
    }
  }

  // Protect dashboard routes — only the correct role can access
  for (const { prefix, allowedRoles } of PROTECTED_PATHS) {
    if (pathname === prefix || pathname.startsWith(prefix + "/")) {
      if (!session) {
        // Admin page has its own embedded login form — let it render directly
        // instead of redirecting to the student login page
        if (prefix.startsWith("/admin")) {
          return NextResponse.next();
        }

        const url = request.nextUrl.clone();
        if (prefix.startsWith("/principal")) {
          url.pathname = "/principal/login";
        } else if (prefix.startsWith("/teacher")) {
          url.pathname = "/teacher/login";
        } else {
          url.pathname = "/login";
          url.searchParams.set("next", pathname);
        }
        return NextResponse.redirect(url);
      }

      if (!allowedRoles.includes(session.role)) {
        // Wrong role — redirect to their own dashboard, not an error page
        const dashboard = DASHBOARD_BY_ROLE[session.role] || "/";
        const url = request.nextUrl.clone();
        url.pathname = dashboard;
        url.searchParams.set("notice", "wrong_role");
        return NextResponse.redirect(url);
      }
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/login",
    "/principal/login",
    "/teacher/login",
    "/student-dashboard/:path*",
    "/principal/dashboard/:path*",
    "/teacher/dashboard/:path*",
    "/admin/:path*",
    "/api/admin/:path*",
    "/api/principal/:path*",
    "/api/teacher/:path*",
    "/api/student-dashboard/:path*",
  ],
};

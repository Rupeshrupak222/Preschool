import { NextResponse } from "next/server";
import { getPrincipalDashboard } from "@/lib/db";
import { currentPrincipal, isGuest } from "@/lib/security";
import { guestPrincipalDashboard } from "@/lib/demo-data";

export async function GET(request: Request) {
  // Guests see demo principal data only.
  if (await isGuest(request)) {
    return NextResponse.json(guestPrincipalDashboard);
  }

  const auth = await currentPrincipal(request);

  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const dashboard = await getPrincipalDashboard(auth.id);

  if (!dashboard) {
    return NextResponse.json({ error: "Principal dashboard not found." }, { status: 404 });
  }

  return NextResponse.json(dashboard);
}

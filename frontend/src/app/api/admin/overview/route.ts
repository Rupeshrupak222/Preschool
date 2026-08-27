import { NextResponse } from "next/server";
import { getAdminOverview, isMysqlConfigured } from "@/lib/db";
import { currentUser, isGuest } from "@/lib/security";
import { guestAdminOverview } from "@/lib/demo-data";
import { store } from "@/lib/store";

export async function GET(request: Request) {
  // Guests see demo admin data only.
  if (await isGuest(request)) {
    return NextResponse.json({ ...guestAdminOverview, mode: "guest", guest: true });
  }

  const auth = await currentUser(request);

  if (!auth || auth.role !== "admin") {
    return NextResponse.json({ error: "Admin access required." }, { status: 403 });
  }

  if (isMysqlConfigured()) {
    const overview = await getAdminOverview();
    return NextResponse.json({ ...overview, mode: "mysql" });
  }

  return NextResponse.json({
    students: store.users.filter((user) => user.role !== "admin"),
    leads: store.leads,
    payments: store.payments,
    mode: "dev"
  });
}

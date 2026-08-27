import { NextResponse } from "next/server";
import { getStudentDashboardData } from "@/lib/db";
import { dashboardData } from "@/lib/dashboard/dashboard-data";
import { currentUser, isGuest } from "@/lib/security";

export async function GET(request: Request) {
  // Guests only see demo data — never real student records from the database.
  if (await isGuest(request)) {
    return NextResponse.json({ dashboard: dashboardData, mode: "guest", guest: true });
  }

  const user = await currentUser(request);
  const dashboard = await getStudentDashboardData(user?.email);
  return NextResponse.json(dashboard);
}

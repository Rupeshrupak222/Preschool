import { NextResponse } from "next/server";
import { getTeacherDashboard } from "@/lib/db";
import { currentTeacher, isGuest } from "@/lib/security";
import { guestTeacherDashboard } from "@/lib/demo-data";

export async function GET(request: Request) {
  // Guests see demo teacher data only.
  if (await isGuest(request)) {
    return NextResponse.json(guestTeacherDashboard);
  }

  const auth = await currentTeacher(request);

  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const dashboard = await getTeacherDashboard(auth.id);

  if (!dashboard) {
    return NextResponse.json({ error: "Teacher dashboard not found." }, { status: 404 });
  }

  return NextResponse.json(dashboard);
}

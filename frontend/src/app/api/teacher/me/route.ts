import { NextResponse } from "next/server";
import { currentTeacher, isGuest, guestIdentity } from "@/lib/security";

export async function GET(request: Request) {
  if (await isGuest(request)) {
    return NextResponse.json({ user: guestIdentity("teacher") });
  }

  const teacher = await currentTeacher(request);

  if (!teacher) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }

  return NextResponse.json({ user: teacher });
}

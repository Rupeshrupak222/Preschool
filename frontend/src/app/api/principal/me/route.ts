import { NextResponse } from "next/server";
import { currentPrincipal, isGuest, guestIdentity } from "@/lib/security";

export async function GET(request: Request) {
  if (await isGuest(request)) {
    return NextResponse.json({ user: guestIdentity("principal") });
  }

  const principal = await currentPrincipal(request);

  if (!principal) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }

  return NextResponse.json({ user: principal });
}

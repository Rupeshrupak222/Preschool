import { NextResponse } from "next/server";
import { findUserByEmail, isMysqlConfigured } from "@/lib/db";
import { currentUser, isGuest, guestIdentity } from "@/lib/security";
import { publicUser, store } from "@/lib/store";

export async function GET(request: Request) {
  // Guest demo — return a synthetic student identity.
  if (await isGuest(request)) {
    return NextResponse.json({ user: guestIdentity("student") });
  }

  const user = await currentUser(request);

  if (!user) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }

  if (isMysqlConfigured()) {
    const mysqlUser = await findUserByEmail(user.email);
    return NextResponse.json({ user: mysqlUser ? publicUser(mysqlUser) : user });
  }

  const devUser = store.users.find((item) => item.email === user.email);
  return NextResponse.json({ user: devUser ? publicUser(devUser) : user });
}

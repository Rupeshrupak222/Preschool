import { NextResponse } from "next/server";

// Signup is disabled — use guest access or a pre-registered account.
export async function POST() {
  return NextResponse.json(
    { error: "Registration is disabled. Continue as a guest or contact your school admin for an account." },
    { status: 403 }
  );
}

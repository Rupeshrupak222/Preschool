import { redirect } from "next/navigation";
import { currentUser, isGuest } from "@/lib/security";

export default async function StudentDashboardLayout({ children }: { children: React.ReactNode }) {
  // Allow guest demo access.
  if (await isGuest()) {
    return children;
  }

  const user = await currentUser();

  if (!user) {
    redirect("/login?next=/student-dashboard");
  }

  return children;
}

import { redirect } from "next/navigation";
import { getSessionFromCookie } from "@/lib/auth";

export default async function ReportsPage() {
  const session = await getSessionFromCookie();
  if (!session) {
    redirect("/login");
  }
  if (session.role === "owner") {
    redirect("/reports/consumption");
  }
  redirect("/reports/low-stock");
}

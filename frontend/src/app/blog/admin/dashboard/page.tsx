import { redirect } from "next/navigation";

export default function BlogAdminDashboardRedirect() {
  redirect("/posts/admin/dashboard");
}
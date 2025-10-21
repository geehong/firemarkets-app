import { redirect } from "next/navigation";

export default function BlogAdminCreateRedirect() {
  redirect("/posts/admin/create");
}
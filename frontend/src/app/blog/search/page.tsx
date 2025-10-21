import { redirect } from "next/navigation";

export default function BlogSearchRedirect() {
  redirect("/posts/search");
}
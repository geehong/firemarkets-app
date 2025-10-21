import { redirect } from "next/navigation";

interface PageProps {
  params: { category: string }
}

export default function BlogCategoryRedirect({ params }: PageProps) {
  const { category } = params;
  redirect(`/posts/category/${encodeURIComponent(category)}`);
}
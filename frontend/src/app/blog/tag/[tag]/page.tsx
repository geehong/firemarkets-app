import { redirect } from "next/navigation";

interface PageProps {
  params: { tag: string }
}

export default function BlogTagRedirect({ params }: PageProps) {
  const { tag } = params;
  redirect(`/posts/tag/${encodeURIComponent(tag)}`);
}
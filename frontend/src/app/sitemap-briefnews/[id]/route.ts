import { generateBriefnewsSitemap } from '@/lib/sitemap-helper';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(
    request: Request,
    context: { params: Promise<{ id: string }> }
) {
    const { id } = await context.params;
    const pageId = parseInt(id, 10) || 1;
    return generateBriefnewsSitemap(pageId);
}

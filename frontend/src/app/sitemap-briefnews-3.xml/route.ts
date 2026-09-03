import { generateBriefnewsSitemap } from '@/lib/sitemap-helper';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
    return generateBriefnewsSitemap(3);
}

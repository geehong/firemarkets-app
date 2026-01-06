import OnChainOverview from '@/components/template/OnChainOverview'

interface PageProps {
    params: Promise<{
        locale: string;
        slug: string[];
    }>;
}

export default async function OnChainPage({ params }: PageProps) {

    const { locale, slug } = await params;

    return (
        <div className="p-6">
            <OnChainOverview locale={locale} />
        </div>
    );
}

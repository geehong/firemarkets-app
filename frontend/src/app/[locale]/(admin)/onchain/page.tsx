import OnChainMainView from '@/components/onchain/OnChainMainView'

interface PageProps {
    params: Promise<{
        locale: string;
    }>;
}

export default async function OnChainLandingPage({ params }: PageProps) {
    const { locale } = await params;

    return (
        <div className="p-6">
            <OnChainMainView locale={locale} />
        </div>
    );
}

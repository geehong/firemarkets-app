import { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'

interface PageProps {
    params: Promise<{ locale: string }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
    const { locale } = await params
    const t = await getTranslations({ locale, namespace: 'legal' })

    return {
        title: t('privacyPolicy.title'),
        description: t('privacyPolicy.metaDescription'),
    }
}

export default async function PrivacyPolicyPage({ params }: PageProps) {
    const { locale } = await params
    const t = await getTranslations({ locale, namespace: 'legal' })

    return (
        <article className="w-full px-4 py-12 max-w-4xl">
            <header className="mb-8 text-center">
                <h1 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-gray-100 mb-4">
                    {t('privacyPolicy.title')}
                </h1>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                    {t('privacyPolicy.lastUpdated')}: 2026-01-08
                </p>
            </header>

            <div className="prose dark:prose-invert max-w-none">
                {/* 1. 개요 */}
                <section className="mb-8">
                    <h2 className="text-2xl font-semibold mb-4">{t('privacyPolicy.sections.overview.title')}</h2>
                    <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                        {t('privacyPolicy.sections.overview.content')}
                    </p>
                </section>

                {/* 2. 수집하는 정보 */}
                <section className="mb-8">
                    <h2 className="text-2xl font-semibold mb-4">{t('privacyPolicy.sections.dataCollection.title')}</h2>
                    <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-4">
                        {t('privacyPolicy.sections.dataCollection.content')}
                    </p>
                    <ul className="list-disc list-inside text-gray-700 dark:text-gray-300 space-y-2">
                        <li>{t('privacyPolicy.sections.dataCollection.items.cookies')}</li>
                        <li>{t('privacyPolicy.sections.dataCollection.items.analytics')}</li>
                        <li>{t('privacyPolicy.sections.dataCollection.items.account')}</li>
                    </ul>
                </section>

                {/* 3. 정보 사용 목적 */}
                <section className="mb-8">
                    <h2 className="text-2xl font-semibold mb-4">{t('privacyPolicy.sections.dataUsage.title')}</h2>
                    <ul className="list-disc list-inside text-gray-700 dark:text-gray-300 space-y-2">
                        <li>{t('privacyPolicy.sections.dataUsage.items.service')}</li>
                        <li>{t('privacyPolicy.sections.dataUsage.items.improvement')}</li>
                        <li>{t('privacyPolicy.sections.dataUsage.items.communication')}</li>
                    </ul>
                </section>

                {/* 4. 정보 보호 */}
                <section className="mb-8">
                    <h2 className="text-2xl font-semibold mb-4">{t('privacyPolicy.sections.dataSecurity.title')}</h2>
                    <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                        {t('privacyPolicy.sections.dataSecurity.content')}
                    </p>
                </section>

                {/* 5. 제3자 제공 */}
                <section className="mb-8">
                    <h2 className="text-2xl font-semibold mb-4">{t('privacyPolicy.sections.thirdParty.title')}</h2>
                    <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                        {t('privacyPolicy.sections.thirdParty.content')}
                    </p>
                </section>

                {/* 6. 사용자 권리 */}
                <section className="mb-8">
                    <h2 className="text-2xl font-semibold mb-4">{t('privacyPolicy.sections.userRights.title')}</h2>
                    <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                        {t('privacyPolicy.sections.userRights.content')}
                    </p>
                </section>

                {/* 7. 광고 및 쿠기 (Google AdSense) */}
                <section className="mb-8">
                    <h2 className="text-2xl font-semibold mb-4">{t('privacyPolicy.sections.advertising.title')}</h2>
                    <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-4">
                        {t('privacyPolicy.sections.advertising.content')}
                    </p>
                    <ul className="list-disc list-inside text-gray-700 dark:text-gray-300 space-y-2">
                        <li>{t('privacyPolicy.sections.advertising.items.google')}</li>
                        <li>{t('privacyPolicy.sections.advertising.items.optOut')}</li>
                    </ul>
                </section>

                {/* 8. 문의 */}
                <section className="mb-8">
                    <h2 className="text-2xl font-semibold mb-4">{t('privacyPolicy.sections.contact.title')}</h2>
                    <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                        {t('privacyPolicy.sections.contact.content')}
                    </p>
                </section>
            </div>
        </article>
    )
}

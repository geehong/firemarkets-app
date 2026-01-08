import { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'

interface PageProps {
    params: Promise<{ locale: string }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
    const { locale } = await params
    const t = await getTranslations({ locale, namespace: 'legal' })

    return {
        title: t('termsOfService.title'),
        description: t('termsOfService.metaDescription'),
    }
}

export default async function TermsOfServicePage({ params }: PageProps) {
    const { locale } = await params
    const t = await getTranslations({ locale, namespace: 'legal' })

    return (
        <article className="container mx-auto px-4 py-12 max-w-4xl">
            <header className="mb-8 text-center">
                <h1 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-gray-100 mb-4">
                    {t('termsOfService.title')}
                </h1>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                    {t('termsOfService.lastUpdated')}: 2026-01-08
                </p>
            </header>

            <div className="prose dark:prose-invert max-w-none">
                {/* 1. 서비스 이용 동의 */}
                <section className="mb-8">
                    <h2 className="text-2xl font-semibold mb-4">{t('termsOfService.sections.agreement.title')}</h2>
                    <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                        {t('termsOfService.sections.agreement.content')}
                    </p>
                </section>

                {/* 2. 서비스 설명 */}
                <section className="mb-8">
                    <h2 className="text-2xl font-semibold mb-4">{t('termsOfService.sections.serviceDescription.title')}</h2>
                    <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                        {t('termsOfService.sections.serviceDescription.content')}
                    </p>
                </section>

                {/* 3. 사용자 책임 */}
                <section className="mb-8">
                    <h2 className="text-2xl font-semibold mb-4">{t('termsOfService.sections.userResponsibilities.title')}</h2>
                    <ul className="list-disc list-inside text-gray-700 dark:text-gray-300 space-y-2">
                        <li>{t('termsOfService.sections.userResponsibilities.items.accuracy')}</li>
                        <li>{t('termsOfService.sections.userResponsibilities.items.security')}</li>
                        <li>{t('termsOfService.sections.userResponsibilities.items.compliance')}</li>
                    </ul>
                </section>

                {/* 4. 지적 재산권 */}
                <section className="mb-8">
                    <h2 className="text-2xl font-semibold mb-4">{t('termsOfService.sections.intellectualProperty.title')}</h2>
                    <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                        {t('termsOfService.sections.intellectualProperty.content')}
                    </p>
                </section>

                {/* 5. 면책 조항 */}
                <section className="mb-8">
                    <h2 className="text-2xl font-semibold mb-4">{t('termsOfService.sections.disclaimer.title')}</h2>
                    <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                        {t('termsOfService.sections.disclaimer.content')}
                    </p>
                </section>

                {/* 6. 투자 위험 고지 */}
                <section className="mb-8">
                    <h2 className="text-2xl font-semibold mb-4">{t('termsOfService.sections.investmentRisk.title')}</h2>
                    <p className="text-gray-700 dark:text-gray-300 leading-relaxed bg-amber-50 dark:bg-amber-900/20 border-l-4 border-amber-500 p-4 rounded">
                        {t('termsOfService.sections.investmentRisk.content')}
                    </p>
                </section>

                {/* 7. 서비스 변경 및 종료 */}
                <section className="mb-8">
                    <h2 className="text-2xl font-semibold mb-4">{t('termsOfService.sections.serviceChanges.title')}</h2>
                    <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                        {t('termsOfService.sections.serviceChanges.content')}
                    </p>
                </section>

                {/* 8. 준거법 */}
                <section className="mb-8">
                    <h2 className="text-2xl font-semibold mb-4">{t('termsOfService.sections.governingLaw.title')}</h2>
                    <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                        {t('termsOfService.sections.governingLaw.content')}
                    </p>
                </section>

                {/* 9. 문의 */}
                <section className="mb-8">
                    <h2 className="text-2xl font-semibold mb-4">{t('termsOfService.sections.contact.title')}</h2>
                    <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                        {t('termsOfService.sections.contact.content')}
                    </p>
                </section>
            </div>
        </article>
    )
}

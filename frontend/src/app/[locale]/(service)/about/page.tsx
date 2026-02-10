import { useTranslations } from 'next-intl';
import { Metadata } from 'next';
import { Mail, Users, Zap, Globe, BarChart3, Brain } from 'lucide-react';
import { getTranslations } from 'next-intl/server';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
    const { locale } = await params;
    const t = await getTranslations({ locale, namespace: 'legal.about' });
    return {
        title: `${t('title')} | FireMarkets`,
        description: t('metaDescription'),
    };
}

export default async function AboutPage({ params }: { params: Promise<{ locale: string }> }) {
    const { locale } = await params;
    const t = await getTranslations({ locale, namespace: 'legal.about' });

    const features = [
        { icon: <Zap className="w-6 h-6" />, text: t('features.realtime') },
        { icon: <BarChart3 className="w-6 h-6" />, text: t('features.onchain') },
        { icon: <Brain className="w-6 h-6" />, text: t('features.ai') },
        { icon: <Globe className="w-6 h-6" />, text: t('features.global') },
    ];

    return (
        <main className="min-h-screen bg-gradient-to-b from-gray-50 to-white dark:from-gray-950 dark:to-gray-900">
            <div className="max-w-4xl mx-auto px-6 py-16">
                {/* Header */}
                <div className="text-center mb-16">
                    <h1 className="text-4xl md:text-5xl font-black text-gray-900 dark:text-white mb-6">
                        {t('heading')}
                    </h1>
                    <p className="text-lg text-gray-600 dark:text-gray-300 max-w-2xl mx-auto leading-relaxed">
                        {t('intro')}
                    </p>
                </div>

                {/* Mission Section */}
                <section className="mb-16">
                    <div className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-3xl p-8 md:p-12 text-white">
                        <h2 className="text-2xl font-bold mb-4 flex items-center gap-3">
                            <Users className="w-7 h-7" />
                            {t('mission.title')}
                        </h2>
                        <p className="text-blue-100 text-lg leading-relaxed">
                            {t('mission.content')}
                        </p>
                    </div>
                </section>

                {/* Features Section */}
                <section className="mb-16">
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-8 text-center">
                        {t('features.title')}
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {features.map((feature, idx) => (
                            <div 
                                key={idx}
                                className="flex items-start gap-4 p-6 bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm hover:shadow-md transition-shadow"
                            >
                                <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-xl text-blue-600 dark:text-blue-400">
                                    {feature.icon}
                                </div>
                                <p className="text-gray-700 dark:text-gray-300 font-medium pt-2">
                                    {feature.text}
                                </p>
                            </div>
                        ))}
                    </div>
                </section>

                {/* Team Section */}
                <section className="mb-16">
                    <div className="bg-gray-50 dark:bg-gray-800/50 rounded-3xl p-8 md:p-12 border border-gray-100 dark:border-gray-700">
                        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                            {t('team.title')}
                        </h2>
                        <p className="text-gray-600 dark:text-gray-300 leading-relaxed mb-6">
                            {t('team.content')}
                        </p>
                        <div className="flex flex-wrap gap-4">
                            <a 
                                href="mailto:geecgpia@gmail.com"
                                className="inline-flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-700 rounded-full text-sm font-medium text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-600 hover:border-blue-400 hover:text-blue-600 transition-colors"
                            >
                                <Mail className="w-4 h-4" />
                                geecgpia@gmail.com
                            </a>
                            <a 
                                href="mailto:geecgpia1@gmail.com"
                                className="inline-flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-700 rounded-full text-sm font-medium text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-600 hover:border-blue-400 hover:text-blue-600 transition-colors"
                            >
                                <Mail className="w-4 h-4" />
                                geecgpia1@gmail.com
                            </a>
                        </div>
                    </div>
                </section>

                {/* Company Info Section */}
                <section className="mb-16">
                    <div className="bg-white dark:bg-gray-800 rounded-3xl p-8 md:p-12 border border-gray-100 dark:border-gray-700 shadow-sm">
                        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
                            {t('companyInfo.title')}
                        </h2>
                        <div className="space-y-3 text-gray-600 dark:text-gray-300 leading-relaxed text-lg">
                            <p>{t('companyInfo.address')}</p>
                            <p>{t('companyInfo.representative')}</p>
                            <p>{t('companyInfo.businessArea')}</p>
                        </div>
                    </div>
                </section>

                {/* Contact CTA */}
                <section className="text-center">
                    <a 
                        href={`/${locale}/contact`}
                        className="inline-flex items-center gap-2 px-8 py-4 bg-gray-900 dark:bg-white text-white dark:text-gray-900 font-bold rounded-full hover:opacity-90 transition-opacity"
                    >
                        <Mail className="w-5 h-5" />
                        {locale === 'ko' ? '문의하기' : 'Contact Us'}
                    </a>
                </section>
            </div>
        </main>
    );
}

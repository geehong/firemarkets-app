import { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { Mail, MessageSquare, Headphones, Share2 } from 'lucide-react';
import Link from 'next/link';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
    const { locale } = await params;
    const t = await getTranslations({ locale, namespace: 'legal.contact' });
    return {
        title: `${t('title')} | FireMarkets`,
        description: t('metaDescription'),
    };
}

export default async function ContactPage({ params }: { params: Promise<{ locale: string }> }) {
    const { locale } = await params;
    const t = await getTranslations({ locale, namespace: 'legal.contact' });

    const contactItems = [
        { 
            icon: <Mail className="w-6 h-6" />, 
            title: t('email.title'), 
            content: t('email.address'),
            isEmail: true
        },
        { 
            icon: <MessageSquare className="w-6 h-6" />, 
            title: t('business.title'), 
            content: t('business.content'),
            isEmail: false
        },
        { 
            icon: <Headphones className="w-6 h-6" />, 
            title: t('support.title'), 
            content: t('support.content'),
            isEmail: false
        },
        { 
            icon: <Share2 className="w-6 h-6" />, 
            title: t('social.title'), 
            content: t('social.content'),
            isEmail: false
        },
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

                {/* Main Email Card */}
                <section className="mb-12">
                    <div className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-3xl p-8 md:p-12 text-center">
                        <div className="inline-flex items-center justify-center w-16 h-16 bg-white/20 rounded-full mb-6">
                            <Mail className="w-8 h-8 text-white" />
                        </div>
                        <h2 className="text-2xl font-bold text-white mb-4">{t('email.title')}</h2>
                        <div className="flex flex-col md:flex-row items-center justify-center gap-4">
                            <a 
                                href="mailto:geecgpia@gmail.com" 
                                className="text-xl md:text-2xl font-black text-white hover:text-blue-200 transition-colors"
                            >
                                geecgpia@gmail.com
                            </a>
                            <span className="hidden md:block text-white/50">|</span>
                            <a 
                                href="mailto:geecgpia1@gmail.com" 
                                className="text-xl md:text-2xl font-black text-white hover:text-blue-200 transition-colors"
                            >
                                geecgpia1@gmail.com
                            </a>
                        </div>
                    </div>
                </section>

                {/* Contact Cards Grid */}
                <section className="mb-16">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {contactItems.slice(1).map((item, idx) => (
                            <div 
                                key={idx}
                                className="p-6 bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm"
                            >
                                <div className="flex items-center gap-3 mb-4">
                                    <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-xl text-blue-600 dark:text-blue-400">
                                        {item.icon}
                                    </div>
                                    <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                                        {item.title}
                                    </h3>
                                </div>
                                <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
                                    {item.content}
                                </p>
                            </div>
                        ))}
                    </div>
                </section>

                {/* Social Links */}
                <section className="text-center">
                    <h3 className="text-lg font-bold text-gray-700 dark:text-gray-300 mb-6">
                        {locale === 'ko' ? '소셜 미디어에서 팔로우하세요' : 'Follow us on Social Media'}
                    </h3>
                    <div className="flex justify-center gap-4">
                        {[
                            { name: 'Facebook', href: 'https://facebook.com', color: 'hover:text-blue-600' },
                            { name: 'X (Twitter)', href: 'https://twitter.com', color: 'hover:text-gray-800 dark:hover:text-white' },
                            { name: 'YouTube', href: 'https://youtube.com', color: 'hover:text-red-600' },
                            { name: 'LinkedIn', href: 'https://linkedin.com', color: 'hover:text-blue-700' },
                        ].map((social, idx) => (
                            <Link
                                key={idx}
                                href={social.href}
                                target="_blank"
                                rel="noopener noreferrer"
                                className={`px-4 py-2 bg-gray-100 dark:bg-gray-800 rounded-full text-sm font-medium text-gray-600 dark:text-gray-400 ${social.color} transition-colors`}
                            >
                                {social.name}
                            </Link>
                        ))}
                    </div>
                </section>
            </div>
        </main>
    );
}

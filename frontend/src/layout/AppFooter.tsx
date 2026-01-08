import Link from 'next/link';
import { useTranslations } from 'next-intl';

export default function AppFooter() {
    const currentYear = new Date().getFullYear();
    const t = useTranslations('Sidebar');

    return (
        <footer className="w-full bg-white border-t border-gray-200 dark:bg-gray-900 dark:border-gray-800 mt-auto">
            <div className="max-w-[1920px] mx-auto px-4 md:px-6 py-6 lg:py-8">
                <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                    <div className="flex flex-col items-center md:items-start gap-2">
                        <div className="flex items-center gap-4 mb-1">
                            <Link href="/privacy-policy" className="text-sm text-gray-500 hover:text-blue-600 dark:text-gray-400 dark:hover:text-blue-400 transition-colors">
                                {t('privacyPolicy')}
                            </Link>
                            <span className="text-gray-300 dark:text-gray-700">|</span>
                            <Link href="/terms-of-service" className="text-sm text-gray-500 hover:text-blue-600 dark:text-gray-400 dark:hover:text-blue-400 transition-colors">
                                {t('termsOfService')}
                            </Link>
                        </div>
                        <span className="text-sm text-gray-500 dark:text-gray-400">
                            © {currentYear} FireMarkets. All rights reserved.
                        </span>
                    </div>


                    <div className="flex items-center gap-6">
                        <Link
                            href="https://facebook.com"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-gray-400 hover:text-blue-600 transition-colors"
                            aria-label="Facebook"
                        >
                            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                                <path fillRule="evenodd" d="M22 12c0-5.523-4.477-10-10-10S2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.878v-6.987h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.988C18.343 21.128 22 16.991 22 12z" clipRule="evenodd" />
                            </svg>
                        </Link>

                        <Link
                            href="https://twitter.com"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-gray-400 hover:text-blue-400 transition-colors"
                            aria-label="X (Twitter)"
                        >
                            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                                <path d="M13.6823 10.6218L20.2391 3H18.6854L12.9921 9.61788L8.44486 3H3.2002L10.0765 13.0074L3.2002 21H4.75404L10.7663 14.0113L15.5685 21H20.8131L13.6819 10.6218H13.6823ZM11.5541 13.0956L10.8574 12.0991L5.31391 4.16971H7.70053L12.1742 10.5689L12.8709 11.5655L18.6861 19.8835H16.2995L11.5541 13.096V13.0956Z" />
                            </svg>
                        </Link>

                        <Link
                            href="https://instagram.com"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-gray-400 hover:text-pink-600 transition-colors"
                            aria-label="Instagram"
                        >
                            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                                <path fillRule="evenodd" d="M12.315 2c2.43 0 2.784.013 3.808.06 1.064.049 1.791.218 2.427.465a4.902 4.902 0 011.772 1.153 4.902 4.902 0 011.153 1.772c.247.636.416 1.363.465 2.427.048 1.067.06 1.407.06 4.123v.08c0 2.643-.012 2.987-.06 4.043-.049 1.064-.218 1.791-.465 2.427a4.902 4.902 0 01-1.153 1.772 4.902 4.902 0 01-1.772 1.153c-.636.247-1.363.416-2.427.465-1.067.048-1.407.06-4.123.06h-.08c-2.643 0-2.987-.012-4.043-.06-1.064-.049-1.791-.218-2.427-.465a4.902 4.902 0 01-1.772-1.153 4.902 4.902 0 01-1.153-1.772c-.247-.636-.416-1.363-.465-2.427-.047-1.024-.06-1.379-.06-3.808v-.63c0-2.43.013-2.784.06-3.808.049-1.064.218-1.791.465-2.427a4.902 4.902 0 011.153-1.772 4.902 4.902 0 011.772-1.153c.636-.247 1.363-.416 2.427-.465C9.673 2.013 10.03 2 12.48 2h.165zm-5.378 1.67c-1.004.047-1.546.219-1.912.361-.483.187-.828.409-1.17.751-.342.342-.564.687-.751 1.17-.142.366-.314.908-.361 1.912C2.69 8.769 2.677 9.176 2.677 12s.013 3.23.058 4.185c.047 1.004.219 1.546.361 1.912.187.483.409.828.751 1.17.342.342.687.564 1.17.751.366.142.908.314 1.912.361.955.045 1.36.058 4.185.058s3.23-.013 4.185-.058c1.004-.047 1.546-.219 1.912-.361.483-.187.828-.409 1.17-.751.342-.342.564-.687.751-1.17.142-.366.314-.908.361-1.912.045-.955.058-1.36.058-4.185s-.013-3.23-.058-4.185c-.047-1.004-.219-1.546-.361-1.912-.187-.483-.409-.828-.751-1.17-.342-.342-.687-.564-1.17-.751-.366-.142-.908-.314-1.912-.361-.955-.045-1.36-.058-4.185-.058-2.825 0-3.23.013-4.185.058zM12 6.865a5.135 5.135 0 110 10.27 5.135 5.135 0 010-10.27zm0 1.67a3.465 3.465 0 100 6.93 3.465 3.465 0 000-6.93zm5.495-3.085a1.145 1.145 0 110 2.29 1.145 1.145 0 010-2.29z" clipRule="evenodd" />
                            </svg>
                        </Link>

                        <Link
                            href="https://youtube.com"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-gray-400 hover:text-red-600 transition-colors"
                            aria-label="YouTube"
                        >
                            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                                <path fillRule="evenodd" d="M19.812 5.418c.861.23 1.538.907 1.768 1.768C21.998 8.746 22 12 22 12s0 3.255-.418 4.814a2.504 2.504 0 0 1-1.768 1.768c-1.56.419-7.814.419-7.814.419s-6.255 0-7.814-.419a2.505 2.505 0 0 1-1.768-1.768C2 15.255 2 12 2 12s0-3.255.417-4.814a2.507 2.507 0 0 1 1.768-1.768C5.744 5 11.998 5 11.998 5s6.255 0 7.814.418ZM15.194 12 10 15V9l5.194 3Z" clipRule="evenodd" />
                            </svg>
                        </Link>

                        <Link
                            href="https://linkedin.com"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-gray-400 hover:text-blue-700 transition-colors"
                            aria-label="LinkedIn"
                        >
                            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                                <path fillRule="evenodd" d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z" clipRule="evenodd" />
                            </svg>
                        </Link>
                    </div>
                </div>
            </div>
        </footer>
    );
}

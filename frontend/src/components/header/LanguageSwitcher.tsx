"use client";
import React, { useState, useRef, useEffect } from "react";
import { usePathname, useRouter } from "@/i18n/navigation";
import { useLocale } from "next-intl";

export default function LanguageSwitcher() {
    const [dropdownOpen, setDropdownOpen] = useState(false);
    const trigger = useRef<HTMLButtonElement>(null);
    const dropdown = useRef<HTMLDivElement>(null);
    const pathname = usePathname();
    const router = useRouter();

    // Determine current locale from pathname handled by middleware, 
    // but usePathname from next-intl removes the locale prefix. 
    // We need a way to know current locale. 
    // Actually, usePathname returns path WITHOUT locale.
    // We can pass locale as prop or use useLocale hook.

    // Let's use useLocale from next-intl
    const locale = useLocale();

    const toggleDropdown = () => setDropdownOpen(!dropdownOpen);

    const switchLanguage = (newLocale: string) => {
        router.replace(pathname, { locale: newLocale });
        setDropdownOpen(false);
    };

    useEffect(() => {
        const clickHandler = ({ target }: MouseEvent) => {
            if (!dropdown.current) return;
            if (
                !dropdownOpen ||
                dropdown.current.contains(target as Node) ||
                trigger.current?.contains(target as Node)
            )
                return;
            setDropdownOpen(false);
        };
        document.addEventListener("click", clickHandler);
        return () => document.removeEventListener("click", clickHandler);
    }, [dropdownOpen]);

    return (
        <div className="relative">
            <button
                ref={trigger}
                onClick={toggleDropdown}
                className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 bg-gray-50 rounded-lg dark:text-gray-400 dark:bg-white/5 hover:bg-gray-100 dark:hover:bg-white/10"
            >
                <span className="w-5 h-5 overflow-hidden rounded-full">
                    {locale === 'ko' ? (
                        <img src="/images/flags/korea.svg" alt="Korea" className="object-cover w-full h-full" />
                    ) : (
                        <img src="/images/flags/usa.svg" alt="USA" className="object-cover w-full h-full" />
                    )}
                </span>

                <svg
                    className={`w-4 h-4 transition-transform ${dropdownOpen ? 'rotate-180' : ''}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
            </button>

            {dropdownOpen && (
                <div
                    ref={dropdown}
                    className="absolute right-0 mt-2 bg-white border border-gray-100 rounded-lg shadow-lg top-full dark:bg-gray-800 dark:border-gray-700 min-w-fit"
                >
                    <ul className="py-1">
                        <li>
                            <button
                                onClick={() => switchLanguage('ko')}
                                className="flex justify-center items-center w-full px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 dark:text-gray-200 dark:hover:bg-gray-700/50"
                            >
                                <span className="w-5 h-5 overflow-hidden rounded-full">
                                    <img src="/images/flags/korea.svg" alt="Korea" className="object-cover w-full h-full" />
                                </span>

                            </button>
                        </li>
                        <li>
                            <button
                                onClick={() => switchLanguage('en')}
                                className="flex justify-center items-center w-full px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 dark:text-gray-200 dark:hover:bg-gray-700/50"
                            >
                                <span className="w-5 h-5 overflow-hidden rounded-full">
                                    <img src="/images/flags/usa.svg" alt="USA" className="object-cover w-full h-full" />
                                </span>

                            </button>
                        </li>
                    </ul>
                </div>
            )}
        </div>
    );
}

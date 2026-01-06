export type LocalizedValue = string | { [key: string]: LocalizedValue } | null | undefined;

/**
 * Recursively parses a localized value to find the string for the target locale.
 * Handles nested structures like {"ko": {"ko": "Value"}} -> "Value".
 *
 * @param value The value to parse (string, object, or null/undefined)
 * @param locale The target locale (e.g., 'ko', 'en')
 * @returns The localized string or an empty string if not found.
 */
export function parseLocalized(value: LocalizedValue, locale: string = 'ko'): string {
    if (!value) return '';

    // JSON 문자열 처리
    if (typeof value === 'string') {
        const trimmed = value.trim();
        if ((trimmed.startsWith('{') || trimmed.startsWith('[')) && (trimmed.endsWith('}') || trimmed.endsWith(']'))) {
            try {
                const parsed = JSON.parse(value);
                // 파싱 성공시 재귀 호출로 값 추출
                return parseLocalized(parsed, locale);
            } catch (e) {
                // 파싱 실패시 그냥 문자열 반환
            }
        }
        return value;
    }

    // If it's an object, first try the target locale
    if (value[locale]) {
        return parseLocalized(value[locale], locale);
    }

    // Fallback: try 'en'
    if (value['en']) {
        return parseLocalized(value['en'], locale);
    }

    // Fallback: try 'ko' if different from target
    if (locale !== 'ko' && value['ko']) {
        return parseLocalized(value['ko'], locale);
    }

    // Fallback: return the first string value found in values
    for (const key in value) {
        const val = value[key];
        if (typeof val === 'string' && val.length > 0) return val;
        // Recursive check for deeper nesting even if keys don't match standard locales
        if (typeof val === 'object') {
            const nested = parseLocalized(val, locale);
            if (nested) return nested;
        }
    }

    return '';
}

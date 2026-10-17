import koKRStrings from '@/locales/ko-KR.json';

export type TranslationKey = keyof typeof koKRStrings;

const strings: Record<string, string> = koKRStrings;

/**
 * Format a number to locale string with options
 */
export function formatNumber(
  value: number,
  options?: Intl.NumberFormatOptions,
  locale = 'ko-KR'
): string {
  try {
    return new Intl.NumberFormat(locale, options).format(value);
  } catch {
    return value.toLocaleString();
  }
}

/**
 * Format currency amount with currency code
 */
export function formatCurrency(
  amount: number,
  currencyCode: string,
  locale = 'ko-KR'
): string {
  try {
    // If KRW, JPY, VND, typically no fraction digits
    const zeroDecimalCurrencies = ['KRW', 'JPY', 'VND', 'TWD'];
    const maxFraction = zeroDecimalCurrencies.includes(currencyCode.toUpperCase()) ? 0 : 2;

    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: currencyCode,
      maximumFractionDigits: maxFraction,
    }).format(amount);
  } catch {
    return `${currencyCode} ${formatNumber(amount, undefined, locale)}`;
  }
}

/**
 * Format currency as plain number with symbol or code
 */
export function formatAmountNumber(
  amount: number,
  currencyCode: string,
  locale = 'ko-KR'
): string {
  const zeroDecimalCurrencies = ['KRW', 'JPY', 'VND', 'TWD'];
  const maxFraction = zeroDecimalCurrencies.includes(currencyCode.toUpperCase()) ? 0 : 2;
  return formatNumber(amount, { maximumFractionDigits: maxFraction }, locale);
}

/**
 * Format date in localized format (YYYY. MM. DD. or YYYY-MM-DD HH:mm)
 */
export function formatDate(date: Date | string, includeTime = false, locale = 'ko-KR'): string {
  try {
    const d = typeof date === 'string' ? new Date(date) : date;
    if (isNaN(d.getTime())) return typeof date === 'string' ? date : '';

    return new Intl.DateTimeFormat(locale, {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      ...(includeTime ? { hour: '2-digit', minute: '2-digit' } : {}),
    }).format(d);
  } catch {
    return String(date);
  }
}

/**
 * Main translation function with named variable interpolation
 * Resolves keys according to A03 UX Copy contract
 */
export function t(
  key: string,
  variables?: Record<string, string | number | undefined | null>
): string {
  let text = strings[key];
  if (!text) {
    // Fallback gracefully to key or last segment
    console.warn(`[i18n] Missing translation key: ${key}`);
    return key;
  }

  if (variables) {
    for (const [varName, varVal] of Object.entries(variables)) {
      if (varVal !== undefined && varVal !== null) {
        const regex = new RegExp(`\\{\\{${varName}\\}\\}`, 'g');
        text = text.replace(regex, String(varVal));
      }
    }
  }

  return text;
}

/**
 * Checks if a copy key exists
 */
export function hasKey(key: string): boolean {
  return Boolean(strings[key]);
}

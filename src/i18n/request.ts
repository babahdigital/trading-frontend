import { getRequestConfig } from 'next-intl/server';
import { cookies, headers } from 'next/headers';
import { locales, defaultLocale, type Locale } from './config';

function isSupported(value: string | undefined | null): value is Locale {
  return !!value && (locales as readonly string[]).includes(value);
}

export default getRequestConfig(async ({ requestLocale }) => {
  let locale: string | undefined = await requestLocale;

  // For routes outside the [locale] segment (e.g. /login, /forgot-password),
  // requestLocale is undefined. Fall back to NEXT_LOCALE cookie, then
  // Accept-Language, then defaultLocale.
  if (!isSupported(locale)) {
    const cookieLocale = cookies().get('NEXT_LOCALE')?.value;
    if (isSupported(cookieLocale)) {
      locale = cookieLocale;
    } else {
      const accept = headers().get('accept-language') ?? '';
      const primary = accept.split(',')[0]?.split(';')[0]?.trim().toLowerCase() ?? '';
      if (primary.startsWith('en')) locale = 'en';
      else if (primary.startsWith('id')) locale = 'id';
      else locale = defaultLocale;
    }
  }

  return {
    locale,
    messages: (await import(`./messages/${locale}.json`)).default,
  };
});

export const LANGUAGES = ['en', 'zh', 'fr', 'de', 'es'] as const;
export const NON_ENGLISH_LANGUAGES = ['zh', 'fr', 'de', 'es'] as const;
export const CATEGORIES = ['tech', 'ai', 'economic', 'github', 'sports'] as const;

export const CATEGORY_LABELS: Record<string, string> = {
  tech: 'Tech',
  ai: 'AI',
  economic: 'Economic',
  github: 'GitHub',
  sports: 'Sports',
};

export const OG_LOCALES: Record<string, string> = {
  en: 'en_US',
  zh: 'zh_CN',
  fr: 'fr_FR',
  de: 'de_DE',
  es: 'es_ES',
};

export function langPrefix(lang: string): string {
  return lang === 'en' ? '' : `/${lang}`;
}

export function categoryPath(lang: string, category: string): string {
  const prefix = langPrefix(lang);
  if (category === 'all') return prefix || '/';
  return `${prefix}/${category}`;
}

type Article = {
  title: string;
  slug: string;
  url: string;
  source: string;
  date: string;
  summary: string;
  content: string;
  category: string;
  translations?: Record<string, { title: string; summary: string }>;
};

type ResolvedArticle = Omit<Article, 'translations'>;

export function resolveTranslations(articles: Article[], lang: string): ResolvedArticle[] {
  return articles.map(({ translations, ...rest }) => {
    if (lang !== 'en' && translations && translations[lang]) {
      return {
        ...rest,
        title: translations[lang].title,
        summary: translations[lang].summary,
      };
    }
    return rest;
  });
}

export function getHreflangLinks(category: string, site: string): Array<{ lang: string; href: string }> {
  const links = LANGUAGES.map(lang => ({
    lang,
    href: `${site}${categoryPath(lang, category)}`,
  }));
  links.push({ lang: 'x-default', href: `${site}${categoryPath('en', category)}` });
  return links;
}

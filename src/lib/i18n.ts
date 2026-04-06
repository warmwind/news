export const CATEGORIES = ['tech', 'ai', 'economic', 'github', 'sports'] as const;

export const CATEGORY_LABELS: Record<string, string> = {
  tech: 'Tech',
  ai: 'AI',
  economic: 'Economic',
  github: 'GitHub',
  sports: 'Sports',
};

export function categoryPath(category: string): string {
  if (category === 'all') return '/';
  return `/${category}`;
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

export function resolveTranslations(articles: Article[]): ResolvedArticle[] {
  return articles.map(({ translations, ...rest }) => {
    if (translations && translations['zh']) {
      return {
        ...rest,
        title: translations['zh'].title,
        summary: translations['zh'].summary,
      };
    }
    return rest;
  });
}

export function articlePath(category: string, slug: string): string {
  return `/${category}/${slug}`;
}

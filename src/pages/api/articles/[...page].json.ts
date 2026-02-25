import type { GetStaticPaths } from 'astro';

const PAGE_SIZE = 10;
const categories = ['all', 'tech', 'ai', 'economic', 'github', 'sports'];
const languages = ['en', 'zh', 'fr', 'de', 'es'];

type Article = {
  title: string;
  slug: string;
  url: string;
  source: string;
  date: string;
  summary: string;
  category: string;
  translations?: Record<string, { title: string; summary: string }>;
};

function loadArticles(category: string): Article[] {
  const newsFiles = import.meta.glob('../../../data/news/*/*.json', { eager: true });
  const articles: Article[] = [];

  for (const [path, mod] of Object.entries(newsFiles)) {
    if (category !== 'all') {
      const pathCategory = path.split('/').at(-2);
      if (pathCategory !== category) continue;
    }
    const data = (mod as any).default || mod;
    if (Array.isArray(data)) {
      for (const article of data) {
        const { content, ...rest } = article;
        articles.push(rest);
      }
    }
  }

  articles.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  return articles;
}

function resolveLanguage(articles: Article[], lang: string): Omit<Article, 'translations'>[] {
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

export const getStaticPaths: GetStaticPaths = () => {
  const paths: Array<{ params: { page: string } }> = [];

  for (const lang of languages) {
    for (const category of categories) {
      const articles = loadArticles(category);
      const totalPages = Math.ceil(articles.length / PAGE_SIZE);

      for (let i = 1; i <= Math.max(totalPages, 1); i++) {
        paths.push({ params: { page: `${lang}/${category}/${i}` } });
      }
    }
  }

  return paths;
};

export function GET({ params }: { params: { page: string } }) {
  const parts = params.page.split('/');
  const lang = parts[0];
  const category = parts[1];
  const page = parseInt(parts[2], 10);

  const articles = loadArticles(category);
  const totalPages = Math.ceil(articles.length / PAGE_SIZE);
  const start = (page - 1) * PAGE_SIZE;
  const items = resolveLanguage(articles.slice(start, start + PAGE_SIZE), lang);

  return new Response(JSON.stringify({
    items,
    page,
    totalPages,
    hasMore: page < totalPages,
  }), {
    headers: { 'Content-Type': 'application/json' },
  });
}

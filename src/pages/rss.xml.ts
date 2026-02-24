import rss from '@astrojs/rss';
import type { APIContext } from 'astro';

export function GET(context: APIContext) {
  const newsFiles = import.meta.glob('../data/news/*/*.json', { eager: true });
  const allNews: Array<{ title: string; slug: string; url: string; source: string; date: string; summary: string; category: string }> = [];

  for (const [, mod] of Object.entries(newsFiles)) {
    const articles = (mod as any).default || mod;
    if (Array.isArray(articles)) {
      allNews.push(...articles);
    }
  }

  allNews.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  const latest = allNews.slice(0, 30);

  return rss({
    title: "Oscar's News",
    description: 'AI-curated news aggregation',
    site: context.site!.toString(),
    items: latest.map(article => ({
      title: article.title,
      link: `${context.site}article/${article.category}/${article.date.slice(0, 10)}/${article.slug}`,
      description: article.summary,
      pubDate: new Date(article.date),
    })),
  });
}

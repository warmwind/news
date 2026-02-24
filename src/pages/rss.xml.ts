import rss from '@astrojs/rss';
import type { APIContext } from 'astro';

import techNews from '../data/news/tech.json';
import aiNews from '../data/news/ai.json';
import economicNews from '../data/news/economic.json';
import githubNews from '../data/news/github.json';
import sportsNews from '../data/news/sports.json';

export function GET(context: APIContext) {
  const allNews = [...techNews, ...aiNews, ...economicNews, ...githubNews, ...sportsNews]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 30);

  return rss({
    title: "Oscar's News",
    description: 'AI-curated news aggregation',
    site: context.site!.toString(),
    items: allNews.map(article => ({
      title: article.title,
      link: article.url,
      description: article.summary,
      pubDate: new Date(article.date),
    })),
  });
}

import Parser from 'rss-parser';
import { writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';

const parser = new Parser({
  timeout: 15000,
  headers: {
    'User-Agent': 'OscarsNews/1.0 (+https://news.oscarjiang.site)',
  },
});

interface FeedConfig {
  url: string;
  source: string;
  category: string;
}

const feeds: FeedConfig[] = [
  // Tech
  { url: 'https://techcrunch.com/feed/', source: 'TechCrunch', category: 'tech' },
  { url: 'https://www.theverge.com/rss/index.xml', source: 'The Verge', category: 'tech' },
  { url: 'https://feeds.arstechnica.com/arstechnica/index', source: 'Ars Technica', category: 'tech' },

  // Economic
  { url: 'https://feeds.bbci.co.uk/news/business/rss.xml', source: 'BBC Business', category: 'economic' },
  { url: 'https://search.cnbc.com/rs/search/combinedcms/view.xml?partnerId=wrss01&id=100003114', source: 'CNBC', category: 'economic' },
  { url: 'https://feeds.marketwatch.com/marketwatch/topstories/', source: 'MarketWatch', category: 'economic' },

  // AI
  { url: 'https://www.technologyreview.com/feed/', source: 'MIT Technology Review', category: 'ai' },
  { url: 'https://blog.google/technology/ai/rss/', source: 'Google AI Blog', category: 'ai' },
  { url: 'https://rss.arxiv.org/rss/cs.AI', source: 'arXiv cs.AI', category: 'ai' },

  // GitHub / Dev
  { url: 'https://github.blog/feed/', source: 'GitHub Blog', category: 'github' },
  { url: 'https://hnrss.org/best', source: 'Hacker News', category: 'github' },
  { url: 'https://dev.to/feed', source: 'DEV Community', category: 'github' },

  // Sports (Soccer/Football)
  { url: 'https://feeds.bbci.co.uk/sport/football/rss.xml', source: 'BBC Football', category: 'sports' },
  { url: 'https://feeds.bbci.co.uk/sport/football/premier-league/rss.xml', source: 'BBC Premier League', category: 'sports' },
  { url: 'https://feeds.bbci.co.uk/sport/football/champions-league/rss.xml', source: 'BBC Champions League', category: 'sports' },
  { url: 'https://www.espn.com/espn/rss/soccer/news', source: 'ESPN Soccer', category: 'sports' },
];

interface RawArticle {
  title: string;
  url: string;
  source: string;
  category: string;
  date: string;
  contentSnippet: string;
}

async function fetchFeed(config: FeedConfig): Promise<RawArticle[]> {
  try {
    const feed = await parser.parseURL(config.url);
    return (feed.items || []).map(item => ({
      title: item.title?.trim() || 'Untitled',
      url: item.link || '',
      source: config.source,
      category: config.category,
      date: item.isoDate || item.pubDate || new Date().toISOString(),
      contentSnippet: (item.contentSnippet || item.content || '').slice(0, 500).trim(),
    }));
  } catch (err) {
    console.error(`Failed to fetch ${config.source}: ${(err as Error).message}`);
    return [];
  }
}

async function main() {
  console.log('Fetching RSS feeds...');

  const results = await Promise.allSettled(feeds.map(f => fetchFeed(f)));
  const allArticles: RawArticle[] = [];

  for (const result of results) {
    if (result.status === 'fulfilled') {
      allArticles.push(...result.value);
    }
  }

  // Filter to last 48 hours
  const cutoff = new Date(Date.now() - 48 * 60 * 60 * 1000);
  const recent = allArticles.filter(a => new Date(a.date) > cutoff);

  // Deduplicate by URL
  const seen = new Set<string>();
  const unique = recent.filter(a => {
    if (!a.url || seen.has(a.url)) return false;
    seen.add(a.url);
    return true;
  });

  // Sort by date descending
  unique.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  // Group by category
  const categories: Record<string, RawArticle[]> = {};
  for (const article of unique) {
    if (!categories[article.category]) categories[article.category] = [];
    categories[article.category].push(article);
  }

  // Write raw articles for Claude to process
  const outDir = join(process.cwd(), 'src', 'data', 'raw');
  mkdirSync(outDir, { recursive: true });

  for (const [category, articles] of Object.entries(categories)) {
    const path = join(outDir, `${category}.json`);
    writeFileSync(path, JSON.stringify(articles.slice(0, 15), null, 2));
    console.log(`Wrote ${articles.slice(0, 15).length} articles to ${category}.json`);
  }

  console.log(`Total: ${unique.length} unique articles from last 48h`);
}

main().catch(console.error);

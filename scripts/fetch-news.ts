import Parser from 'rss-parser';
import { execFileSync } from 'child_process';
import { writeFileSync, readFileSync, mkdirSync, existsSync, readdirSync } from 'fs';
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

interface NewsArticle {
  title: string;
  slug: string;
  url: string;
  source: string;
  date: string;
  summary: string;
  content: string;
  category: string;
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

function getDateStr(isoDate: string): string {
  return isoDate.slice(0, 10);
}

function getExistingUrls(newsDir: string, category: string): Set<string> {
  const urls = new Set<string>();
  const catDir = join(newsDir, category);
  if (!existsSync(catDir)) return urls;

  for (const file of readdirSync(catDir)) {
    if (!file.endsWith('.json')) continue;
    try {
      const articles: NewsArticle[] = JSON.parse(readFileSync(join(catDir, file), 'utf-8'));
      for (const a of articles) urls.add(a.url);
    } catch { /* skip corrupted files */ }
  }
  return urls;
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
      contentSnippet: (item.contentSnippet || item.content || '').slice(0, 2000).trim(),
    }));
  } catch (err) {
    console.error(`Failed to fetch ${config.source}: ${(err as Error).message}`);
    return [];
  }
}

async function summarizeWithHaiku(
  articles: RawArticle[],
): Promise<Array<{ summary: string; slug: string }>> {
  if (articles.length === 0) return [];

  const articlesText = articles
    .map((a, i) => `[${i}] Title: ${a.title}\nSource: ${a.source}\nContent: ${a.contentSnippet}`)
    .join('\n\n');

  const prompt = `For each article below, generate:
1. A 2-3 sentence summary capturing key facts and why it matters. Use neutral, journalistic tone.
2. A URL-safe slug derived from the title (lowercase, hyphens, no special chars, max 80 chars).

Return ONLY a JSON array with objects like: {"summary": "...", "slug": "..."}
One object per article, in the same order. No markdown fences.

Articles:
${articlesText}`;

  try {
    const output = execFileSync(
      'claude',
      ['-p', prompt, '--model', 'claude-haiku-4-5-20251001', '--output-format', 'json', '--max-turns', '1'],
      { timeout: 120_000, maxBuffer: 10 * 1024 * 1024, encoding: 'utf-8' },
    );

    const envelope = JSON.parse(output.trim());
    const text = typeof envelope.result === 'string' ? envelope.result : JSON.stringify(envelope.result);
    return JSON.parse(text.trim());
  } catch (err) {
    console.error('Failed to get Haiku response via Claude CLI, using fallback slugs/summaries:', (err as Error).message);
    return articles.map(a => ({
      summary: a.contentSnippet.slice(0, 200),
      slug: slugify(a.title),
    }));
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

  const newsDir = join(process.cwd(), 'src', 'data', 'news');

  // Deduplicate against existing articles and limit per category
  for (const [category, articles] of Object.entries(categories)) {
    const existingUrls = getExistingUrls(newsDir, category);
    categories[category] = articles
      .filter(a => !existingUrls.has(a.url))
      .slice(0, 15);
  }

  const totalNew = Object.values(categories).reduce((sum, arr) => sum + arr.length, 0);
  console.log(`Found ${totalNew} new articles to process`);

  if (totalNew === 0) {
    console.log('No new articles to process');
    return;
  }

  // Process each category: summarize with Haiku, then write date-based files
  for (const [category, articles] of Object.entries(categories)) {
    if (articles.length === 0) continue;

    console.log(`Summarizing ${articles.length} ${category} articles with Haiku...`);
    const summaries = await summarizeWithHaiku(articles);

    // Build NewsArticle objects
    const newsArticles: NewsArticle[] = articles.map((a, i) => ({
      title: a.title,
      slug: summaries[i]?.slug || slugify(a.title),
      url: a.url,
      source: a.source,
      date: a.date,
      summary: summaries[i]?.summary || a.contentSnippet.slice(0, 200),
      content: a.contentSnippet,
      category: a.category,
    }));

    // Group by date and merge with existing date files
    const byDate: Record<string, NewsArticle[]> = {};
    for (const article of newsArticles) {
      const dateStr = getDateStr(article.date);
      if (!byDate[dateStr]) byDate[dateStr] = [];
      byDate[dateStr].push(article);
    }

    const catDir = join(newsDir, category);
    mkdirSync(catDir, { recursive: true });

    for (const [dateStr, newArticles] of Object.entries(byDate)) {
      const filePath = join(catDir, `${dateStr}.json`);
      let existing: NewsArticle[] = [];
      if (existsSync(filePath)) {
        try {
          existing = JSON.parse(readFileSync(filePath, 'utf-8'));
        } catch { /* start fresh if corrupted */ }
      }

      // Merge: existing + new, deduplicate by URL
      const urlSet = new Set(existing.map(a => a.url));
      const merged = [...existing];
      for (const a of newArticles) {
        if (!urlSet.has(a.url)) {
          merged.push(a);
          urlSet.add(a.url);
        }
      }

      // Sort by date descending within the file
      merged.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

      writeFileSync(filePath, JSON.stringify(merged, null, 2));
      console.log(`Wrote ${merged.length} articles to ${category}/${dateStr}.json (${newArticles.length} new)`);
    }
  }

  console.log('Done!');
}

main().catch(console.error);

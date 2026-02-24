# Oscar's News

AI-curated news aggregation site at [news.oscarjiang.site](https://news.oscarjiang.site).

## Architecture

- **Framework**: Astro (static site generation)
- **News Pipeline**: `scripts/fetch-news.ts` fetches RSS feeds and calls Haiku for summarization in a single step
- **Data Storage**: `src/data/news/{category}/{YYYY-MM-DD}.json` — date-based JSON files, one per category per day
- **Categories**: tech, ai, economic, github, sports

## Data Format

Each article in the date-based JSON files:
```json
{
  "title": "Article Title",
  "slug": "article-title",
  "url": "https://source.com/article",
  "source": "TechCrunch",
  "date": "2026-02-24T10:00:00Z",
  "summary": "2-3 sentence summary for listing.",
  "content": "Full article content from RSS feed.",
  "category": "tech"
}
```

## Key Scripts

- `pnpm dev` — Start dev server
- `pnpm build` — Build static site
- `pnpm fetch-news` — Fetch RSS feeds, summarize with Haiku, write to date-based files

## GitHub Action

The `fetch-news.yml` workflow runs every 6 hours:
1. Fetches RSS feeds and summarizes with Haiku (single step)
2. Builds the site
3. Commits and pushes if news data changed

# Oscar's News - Claude Code Action Instructions

## Your Role
You are the AI editor for Oscar's News (news.oscarjiang.site). When the GitHub Action runs, your job is to read the raw RSS feed data and produce summarized, curated news articles.

## Task: Summarize Raw News Articles

### Input
Raw articles are in `src/data/raw/{category}.json`. Each has:
- `title`, `url`, `source`, `category`, `date`, `contentSnippet`

### Output
Write summarized articles to `src/data/news/{category}.json`. Each article should have:
- `title`: Keep the original title (clean up if needed)
- `url`: Keep original URL
- `source`: Keep original source name
- `date`: Keep original ISO date
- `summary`: Write a 2-3 sentence summary based on the title and content snippet
- `category`: Keep original category

### Instructions

1. Read each file in `src/data/raw/` (tech.json, ai.json, economic.json, github.json, sports.json)
2. For each article, write a concise 2-3 sentence summary that:
   - Captures the key facts and why it matters
   - Is written in a neutral, journalistic tone
   - Avoids clickbait language
   - Is accessible to a general tech-savvy audience
3. Keep the top 10 most interesting/impactful articles per category
4. Write the output to `src/data/news/{category}.json`
5. If a raw file is missing, keep the existing news file unchanged

### Quality Guidelines
- Prefer articles with substance over announcements
- Deduplicate similar stories (keep the best source)
- Skip articles that are paywalled summaries with no useful content snippet
- For arXiv papers, explain the significance in plain language

### Example Output Format
```json
[
  {
    "title": "Article Title Here",
    "url": "https://example.com/article",
    "source": "Source Name",
    "date": "2026-02-24T10:00:00Z",
    "summary": "Two to three sentence summary of the article. Captures the key facts and explains why this matters.",
    "category": "tech"
  }
]
```

After writing all news files, delete the `src/data/raw/` directory to keep the repo clean.

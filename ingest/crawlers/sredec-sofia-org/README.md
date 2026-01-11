# Sredec-sofia-org Crawler

Crawler for public infrastructure announcements from Sredec District Municipality (СО-район „Средец").

## Source

- **Website:** https://sredec-sofia.org/
- **Target Page:** https://sredec-sofia.org/category/публикации/полезна-информация/
- **Source Type:** `sredec-sofia-org`
- **Data Type:** HTML/webpage-based (long ingestion flow)

## What it Crawls

This crawler fetches public infrastructure announcements ("Полезна информация") from the Sredec district website, including traffic organization changes, construction schedules, and maintenance notifications.

## How it Works

1. **Discovery Phase:**

   - Navigate to the category page using Playwright
   - Extract post cards from `article.blog-entry` containers
   - Parse post URL, title, and date from each card
   - Extract date from `.meta-date .updated` element (DD.MM.YYYY format)
   - **Only crawl first page** (no pagination)

2. **Extraction Phase:**

   - For each discovered post, navigate to detail page
   - Extract title from `h1.single-post-title`
   - Extract date from `.single-blog-article time.updated` element
   - Extract content HTML from `.single-blog-content.entry`
   - Clean up unwanted elements (scripts, styles)

3. **Document Creation:**
   - Convert HTML to Markdown using shared `buildWebPageSourceDocument`
   - Generate stable document ID from URL (base64 encoding)
   - Check for duplicates via `isUrlProcessed`
   - Save to Firestore (skip if already processed)
   - Delay 2 seconds between requests

## Ingestion Flow

Since this crawler provides **raw text** (no GeoJSON), it goes through the **full AI-powered pipeline**:

See [messageIngest/README.md](../../messageIngest/README.md) for pipeline details.

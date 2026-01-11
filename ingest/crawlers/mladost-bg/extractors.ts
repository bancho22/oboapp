import type { Page } from "playwright";
import type { PostLink } from "./types";
import { SELECTORS } from "./selectors";
import { extractPostDetailsGeneric } from "../shared/extractors";

/**
 * Extract post links from the index page
 */
export async function extractPostLinks(page: Page): Promise<PostLink[]> {
  console.log("📋 Extracting post links from index page...");

  const posts = await page.evaluate(() => {
    const postLinks: Array<{
      url: string;
      title: string;
      date: string;
    }> = [];

    const containers = document.querySelectorAll(".news");

    containers.forEach((container) => {
      const linkEl = container.querySelector('a[href*="?post_type=post&p="]');
      if (!linkEl) return;

      const url = (linkEl as HTMLAnchorElement).href;
      if (!url.includes("mladost.bg") || !url.includes("?post_type=post&p="))
        return;

      // Extract title
      const titleEl = container.querySelector(
        "h5.news-title, h4.news-title, .news-title"
      );
      const title = titleEl?.textContent?.trim() || "";

      // Extract date (DD.MM.YY format)
      const dateEl = container.querySelector("span.date, .date");
      const date = dateEl?.textContent?.trim() || "";

      if (url && title) {
        postLinks.push({ url, title, date });
      }
    });

    return postLinks;
  });

  console.log(`📊 Found ${posts.length} posts on index page`);

  return posts;
}

/**
 * Extract post details from individual post page
 */
export async function extractPostDetails(
  page: Page
): Promise<{ title: string; dateText: string; contentHtml: string }> {
  return extractPostDetailsGeneric(page, SELECTORS.POST, ["script", "style"]);
}

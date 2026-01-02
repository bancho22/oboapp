import type { Page } from "playwright";
import type { PostLink } from "./types";
import { SELECTORS } from "./selectors";
import { extractPostLinks as extractPostLinksShared } from "../shared/extractors";

/**
 * Extract post links from the index page
 */
export async function extractPostLinks(page: Page): Promise<PostLink[]> {
  // Filter to only include actual post URLs (not category links, etc.)
  const urlFilter = (url: string) =>
    url.includes(
      "/%d1%83%d0%b2%d0%b5%d0%b4%d0%be%d0%bc%d0%bb%d0%b5%d0%bd%d0%b8%d0%b5-"
    );

  return extractPostLinksShared(page, SELECTORS, urlFilter);
}

/**
 * Extract post details from individual post page
 */
export async function extractPostDetails(
  page: Page
): Promise<{ title: string; dateText: string; contentHtml: string }> {
  const details = await page.evaluate(() => {
    // Extract title
    const titleEl = document.querySelector("h1, .entry-title, .post-title");
    const title = titleEl?.textContent?.trim() || "";

    // Extract date
    const dateEl = document.querySelector(
      'time, .date, .published, [class*="date"]'
    );
    const dateText = dateEl?.textContent?.trim() || "";

    // Extract main content
    // Try to find the main content area and get its HTML
    const contentEl = document.querySelector(
      ".entry-content, .post-content, article .entry-content"
    );

    let contentHtml = "";
    if (contentEl) {
      // Clone the element to avoid modifying the page
      const clone = contentEl.cloneNode(true) as HTMLElement;

      // Remove unwanted elements (navigation, share buttons, etc.)
      clone
        .querySelectorAll(
          "script, style, nav, .sharedaddy, .share-buttons, .navigation, .post-navigation"
        )
        .forEach((el) => el.remove());

      contentHtml = clone.innerHTML;
    }

    return {
      title,
      dateText,
      contentHtml,
    };
  });

  return details;
}

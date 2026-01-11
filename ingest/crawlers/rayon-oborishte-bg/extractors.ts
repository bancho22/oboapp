import type { Page } from "playwright";
import type { PostLink } from "./types";
import { SELECTORS } from "./selectors";
import {
  extractPostLinks as extractPostLinksShared,
  extractPostDetailsGeneric,
} from "../shared/extractors";

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
  return extractPostDetailsGeneric(page, SELECTORS.POST, [
    "script",
    "style",
    "nav",
    ".sharedaddy",
    ".share-buttons",
    ".navigation",
    ".post-navigation",
  ]);
}

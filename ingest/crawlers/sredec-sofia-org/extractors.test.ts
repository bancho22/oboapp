import { describe, it, expect, vi } from "vitest";
import { extractPostLinks, extractPostDetails } from "./extractors";

// Mock Page type from Playwright
interface MockPage {
  evaluate: <T>(fn: (...args: any[]) => T, ...args: any[]) => Promise<T>;
}

function createMockPage(mockEvaluate: any): MockPage {
  return {
    evaluate: mockEvaluate,
  } as MockPage;
}

describe("sredec-sofia-org/extractors", () => {
  describe("extractPostLinks", () => {
    it("should extract post links from valid HTML", async () => {
      const mockEvaluate = vi.fn().mockResolvedValue([
        {
          url: "https://sredec-sofia.org/test-post",
          title: "Организация на движението",
          date: "26.04.2024",
        },
      ]);

      const page = createMockPage(mockEvaluate) as any;
      const posts = await extractPostLinks(page);

      expect(posts).toHaveLength(1);
      expect(posts[0].url).toContain("sredec-sofia.org");
      expect(posts[0].title).toBe("Организация на движението");
      expect(posts[0].date).toBe("26.04.2024");
    });

    it("should extract multiple post links", async () => {
      const mockEvaluate = vi.fn().mockResolvedValue([
        {
          url: "https://sredec-sofia.org/post-1",
          title: "Post 1",
          date: "26.04.2024",
        },
        {
          url: "https://sredec-sofia.org/post-2",
          title: "Post 2",
          date: "25.04.2024",
        },
      ]);

      const page = createMockPage(mockEvaluate) as any;
      const posts = await extractPostLinks(page);

      expect(posts).toHaveLength(2);
      expect(posts[0].title).toBe("Post 1");
      expect(posts[1].title).toBe("Post 2");
    });

    it("should return empty array when no posts found", async () => {
      const mockEvaluate = vi.fn().mockResolvedValue([]);

      const page = createMockPage(mockEvaluate) as any;
      const posts = await extractPostLinks(page);

      expect(posts).toEqual([]);
    });
  });

  describe("extractPostDetails", () => {
    it("should extract post details from valid HTML", async () => {
      const mockEvaluate = vi.fn().mockResolvedValue({
        title: 'Организация на движението по бул. „Патриарх Евтимий"',
        dateText: "26.04.2024",
        contentHtml: "<p>Във връзка със строителни дейности...</p>",
      });

      const page = createMockPage(mockEvaluate) as any;
      const details = await extractPostDetails(page);

      expect(details.title).toBe(
        'Организация на движението по бул. „Патриарх Евтимий"'
      );
      expect(details.dateText).toBe("26.04.2024");
      expect(details.contentHtml).toContain("строителни дейности");
    });

    it("should handle missing elements gracefully", async () => {
      const mockEvaluate = vi.fn().mockResolvedValue({
        title: "",
        dateText: "",
        contentHtml: "",
      });

      const page = createMockPage(mockEvaluate) as any;
      const details = await extractPostDetails(page);

      expect(details.title).toBe("");
      expect(details.dateText).toBe("");
      expect(details.contentHtml).toBe("");
    });

    it("should extract content with cleaned HTML", async () => {
      const mockEvaluate = vi.fn().mockResolvedValue({
        title: "Test Post",
        dateText: "26.04.2024",
        contentHtml: "<p>Clean content without scripts</p>",
      });

      const page = createMockPage(mockEvaluate) as any;
      const details = await extractPostDetails(page);

      expect(details.contentHtml).not.toContain("<script");
      expect(details.contentHtml).not.toContain("<style");
      expect(details.contentHtml).toContain("<p>");
    });
  });
});

export const SELECTORS = {
  INDEX: {
    POST_CONTAINER: "article.blog-entry",
    POST_LINK: "h2.blog-entry-title a",
    POST_TITLE: "h2.blog-entry-title",
    POST_DATE: ".meta-date .updated",
  },
  POST: {
    TITLE: "h1.single-post-title",
    DATE: ".single-blog-article time.updated",
    CONTENT: ".single-blog-content.entry",
  },
} as const;

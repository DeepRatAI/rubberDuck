export type CuratedRssSource = {
  name: string;
  url: string;
  language: "en";
  tags: string[];
};

export const curatedRssSources: CuratedRssSource[] = [
  {
    name: "GitHub Blog",
    url: "https://github.blog/feed/",
    language: "en",
    tags: ["oss", "github", "developer-tools"],
  },
  {
    name: "GitHub Changelog",
    url: "https://github.blog/changelog/feed/",
    language: "en",
    tags: ["github", "developer-tools", "platform"],
  },
  {
    name: "Next.js Blog",
    url: "https://nextjs.org/feed.xml",
    language: "en",
    tags: ["nextjs", "frontend", "cloud"],
  },
  {
    name: "PlanetScale Blog",
    url: "https://planetscale.com/blog/rss.xml",
    language: "en",
    tags: ["postgres", "mysql", "database"],
  },
  {
    name: "Cloudflare Blog",
    url: "https://blog.cloudflare.com/rss/",
    language: "en",
    tags: ["edge", "security", "infrastructure"],
  },
  {
    name: "Neon Blog",
    url: "https://neon.com/blog/rss.xml",
    language: "en",
    tags: ["postgres", "database", "serverless"],
  },
  {
    name: "Planet PostgreSQL",
    url: "https://planet.postgresql.org/rss20.xml",
    language: "en",
    tags: ["postgres", "database", "sql"],
  },
  {
    name: "Postgres Weekly",
    url: "https://postgresweekly.com/rss/",
    language: "en",
    tags: ["postgres", "database", "weekly"],
  },
  {
    name: "Python Insider",
    url: "https://pythoninsider.blogspot.com/feeds/posts/default?alt=rss",
    language: "en",
    tags: ["python", "language", "runtime"],
  },
  {
    name: "React Blog",
    url: "https://react.dev/rss.xml",
    language: "en",
    tags: ["react", "frontend", "javascript"],
  },
  {
    name: "Node.js Blog",
    url: "https://nodejs.org/en/feed/blog.xml",
    language: "en",
    tags: ["nodejs", "javascript", "runtime"],
  },
  {
    name: "Deno Blog",
    url: "https://deno.com/feed",
    language: "en",
    tags: ["javascript", "typescript", "runtime"],
  },
  {
    name: "Rust Blog",
    url: "https://blog.rust-lang.org/feed.xml",
    language: "en",
    tags: ["rust", "systems", "language"],
  },
  {
    name: "Go Blog",
    url: "https://go.dev/blog/feed.atom",
    language: "en",
    tags: ["go", "backend", "language"],
  },
  {
    name: "Kubernetes Blog",
    url: "https://kubernetes.io/feed.xml",
    language: "en",
    tags: ["kubernetes", "platform", "devops"],
  },
  {
    name: "Docker Blog",
    url: "https://www.docker.com/feed/",
    language: "en",
    tags: ["containers", "devops", "platform"],
  },
  {
    name: "Grafana Blog",
    url: "https://grafana.com/blog/index.xml",
    language: "en",
    tags: ["observability", "metrics", "devops"],
  },
  {
    name: "OpenTelemetry Blog",
    url: "https://opentelemetry.io/blog/index.xml",
    language: "en",
    tags: ["observability", "tracing", "standards"],
  },
  {
    name: "Sentry Blog",
    url: "https://blog.sentry.io/feed.xml",
    language: "en",
    tags: ["observability", "frontend", "reliability"],
  },
  {
    name: "Hugging Face Blog",
    url: "https://huggingface.co/blog/feed.xml",
    language: "en",
    tags: ["ai", "machine-learning", "open-source"],
  },
  {
    name: "OpenAI News",
    url: "https://openai.com/news/rss.xml",
    language: "en",
    tags: ["ai", "models", "research"],
  },
  {
    name: "Google Developers Blog",
    url: "https://developers.googleblog.com/en/rss/",
    language: "en",
    tags: ["google", "developer-tools", "cloud"],
  },
  {
    name: "AWS Open Source Blog",
    url: "https://aws.amazon.com/blogs/opensource/feed/",
    language: "en",
    tags: ["aws", "oss", "cloud"],
  },
  {
    name: "Mozilla Hacks",
    url: "https://hacks.mozilla.org/feed/",
    language: "en",
    tags: ["web", "browser", "standards"],
  },
  {
    name: "Stack Overflow Blog",
    url: "https://stackoverflow.blog/feed/",
    language: "en",
    tags: ["developer-community", "career", "software"],
  },
  {
    name: "Martin Fowler",
    url: "https://martinfowler.com/feed.atom",
    language: "en",
    tags: ["architecture", "delivery", "software-design"],
  },
  {
    name: "ACM Queue",
    url: "https://queue.acm.org/rss/feeds/queuecontent.xml",
    language: "en",
    tags: ["systems", "architecture", "research"],
  },
  {
    name: "InfoQ Articles",
    url: "https://feed.infoq.com/articles",
    language: "en",
    tags: ["architecture", "engineering", "leadership"],
  },
  {
    name: "Hacker News Front Page",
    url: "https://hnrss.org/frontpage",
    language: "en",
    tags: ["technology", "startups", "discussion"],
  },
  {
    name: "The Pragmatic Engineer",
    url: "https://blog.pragmaticengineer.com/rss/",
    language: "en",
    tags: ["engineering-management", "career", "software"],
  },
  {
    name: "LWN Development",
    url: "https://lwn.net/headlines/rss",
    language: "en",
    tags: ["linux", "systems", "open-source"],
  },
];

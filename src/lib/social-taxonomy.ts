export const domainTags = [
  "AI Engineering",
  "Web Development",
  "Developer Tools",
  "Education",
  "Data",
  "Infrastructure",
  "Security",
  "Open Source",
  "Research",
  "Local-first",
  "Productivity",
  "Systems",
  "Design Tools",
  "Testing",
  "Observability",
] as const;

export const stackTags = [
  "TypeScript",
  "Python",
  "Rust",
  "Go",
  "Next.js",
  "React",
  "PostgreSQL",
  "Drizzle",
  "Docker",
  "Pyodide",
  "Supabase",
  "Cloudflare",
  "Vercel",
] as const;

export const needTags = [
  "Early users",
  "Contributors",
  "Technical feedback",
  "Docs review",
  "Design feedback",
  "Testing",
  "Security review",
  "Funding",
  "Maintainers",
  "Visibility",
] as const;

export const maturityTags = [
  "Idea",
  "Prototype",
  "MVP",
  "Active development",
  "Beta",
  "Production-ready",
  "Maintained",
  "Experimental",
  "Archived",
] as const;

export const intentTags = [
  "Showcase",
  "Looking for feedback",
  "Looking for contributors",
  "Build in public",
  "Launch",
  "Changelog",
  "Research note",
  "Learning resource",
] as const;

const categories = [
  { category: "domain", values: domainTags },
  { category: "stack", values: stackTags },
  { category: "need", values: needTags },
  { category: "maturity", values: maturityTags },
  { category: "intent", values: intentTags },
] as const;

export function toTagSlug(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export function getTagCategory(value: string) {
  const normalized = value.trim().toLowerCase();
  const match = categories.find(({ values }) =>
    values.some((candidate) => candidate.toLowerCase() === normalized),
  );

  return match?.category ?? "custom";
}

export function normalizeTagLabels(values: string[]) {
  const tags = new Map<string, string>();

  for (const value of values) {
    const label = value.trim().replace(/^#/, "");
    const slug = toTagSlug(label);
    if (label && slug && !tags.has(slug)) {
      tags.set(slug, label);
    }
  }

  return Array.from(tags.values());
}

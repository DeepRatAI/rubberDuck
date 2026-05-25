import ReactMarkdown from "react-markdown";
import rehypeRaw from "rehype-raw";
import rehypeSanitize, { defaultSchema } from "rehype-sanitize";
import remarkGfm from "remark-gfm";

const markdownSanitizeSchema = {
  ...defaultSchema,
  tagNames: [...(defaultSchema.tagNames ?? []), "details", "summary"],
  attributes: {
    ...defaultSchema.attributes,
    a: [...(defaultSchema.attributes?.a ?? []), ["target"], ["rel"]],
    details: [["open"]],
  },
};

export function SafeMarkdown({ value }: { value: string }) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      rehypePlugins={[rehypeRaw, [rehypeSanitize, markdownSanitizeSchema]]}
      components={{
        a: ({ children, href }) => (
          <a
            href={href}
            target="_blank"
            rel="noreferrer"
            className="font-medium text-[color:var(--accent)] underline-offset-4 hover:underline"
          >
            {children}
          </a>
        ),
        blockquote: ({ children }) => (
          <blockquote className="my-3 border-l-2 border-[color:var(--accent)]/60 pl-3 text-[color:var(--muted)]">
            {children}
          </blockquote>
        ),
        details: ({ children }) => (
          <details className="my-3 rounded-md border border-[color:var(--line)] bg-[color:var(--surface-2)] p-3">
            {children}
          </details>
        ),
        summary: ({ children }) => (
          <summary className="cursor-pointer text-sm font-semibold text-[color:var(--foreground)]">
            {children}
          </summary>
        ),
        ul: ({ children }) => (
          <ul className="my-3 list-disc space-y-1 pl-5">{children}</ul>
        ),
        ol: ({ children }) => (
          <ol className="my-3 list-decimal space-y-1 pl-5">{children}</ol>
        ),
        p: ({ children }) => <p className="mb-3 last:mb-0">{children}</p>,
        code: ({ children }) => (
          <code className="rounded border border-[color:var(--line)] bg-[color:var(--surface-2)] px-1.5 py-0.5 font-mono text-xs text-[color:var(--foreground)]">
            {children}
          </code>
        ),
        pre: ({ children }) => (
          <pre className="my-3 overflow-x-auto rounded-md border border-[color:var(--line)] bg-[color:var(--surface-2)] p-3 text-xs leading-6 text-[color:var(--foreground)]">
            {children}
          </pre>
        ),
      }}
    >
      {value}
    </ReactMarkdown>
  );
}

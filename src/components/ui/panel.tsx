import { cn } from "@/lib/utils";

export function Panel({
  children,
  className,
  ...props
}: React.HTMLAttributes<HTMLElement>) {
  return (
    <section
      className={cn(
        "min-w-0 rounded-lg border border-[color:var(--line)] bg-[color:var(--surface)] shadow-[0_18px_60px_rgba(0,0,0,0.22)]",
        className,
      )}
      {...props}
    >
      {children}
    </section>
  );
}

export function SectionHeader({
  title,
  action,
  description,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex min-w-0 items-start justify-between gap-4 border-b border-[color:var(--line)] px-4 py-3">
      <div className="min-w-0">
        <h2 className="text-base font-semibold text-[color:var(--foreground)]">
          {title}
        </h2>
        {description ? (
          <p className="mt-1 text-sm text-[color:var(--muted)]">
            {description}
          </p>
        ) : null}
      </div>
      {action}
    </div>
  );
}

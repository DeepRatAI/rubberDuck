import { cn } from "@/lib/utils";

type BadgeProps = {
  children: React.ReactNode;
  tone?: "blue" | "green" | "amber" | "slate" | "cyan";
  className?: string;
};

const tones = {
  blue: "border-[color:var(--badge-blue-border)] bg-[color:var(--badge-blue-bg)] text-[color:var(--badge-blue-text)]",
  green:
    "border-[color:var(--badge-green-border)] bg-[color:var(--badge-green-bg)] text-[color:var(--badge-green-text)]",
  amber:
    "border-[color:var(--badge-amber-border)] bg-[color:var(--badge-amber-bg)] text-[color:var(--badge-amber-text)]",
  slate:
    "border-[color:var(--badge-slate-border)] bg-[color:var(--badge-slate-bg)] text-[color:var(--badge-slate-text)]",
  cyan: "border-[color:var(--badge-cyan-border)] bg-[color:var(--badge-cyan-bg)] text-[color:var(--badge-cyan-text)]",
};

export function Badge({ children, tone = "slate", className }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium",
        tones[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

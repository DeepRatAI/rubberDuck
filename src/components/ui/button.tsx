import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex h-9 items-center justify-center gap-2 rounded-md border px-3 text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--accent)] disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        primary:
          "rd-button-primary border-[color:var(--accent)] bg-[color:var(--accent)] text-[color:var(--accent-contrast)] shadow-[0_0_0_1px_rgba(22,217,210,0.2),0_10px_30px_rgba(22,217,210,0.18)] hover:brightness-110",
        secondary:
          "border-[color:var(--line)] bg-[color:var(--surface)] text-[color:var(--foreground)] hover:border-[color:var(--accent-2)] hover:bg-[color:var(--surface-2)]",
        ghost:
          "border-transparent bg-transparent text-[color:var(--muted)] hover:bg-[color:var(--control-hover)] hover:text-[color:var(--foreground)]",
        subtle:
          "border-[color:var(--line)] bg-[color:var(--surface-2)] text-[color:var(--muted)] hover:text-[color:var(--foreground)]",
        danger:
          "border-red-300/40 bg-red-500/10 text-red-200 hover:bg-red-500/20",
      },
      size: {
        sm: "h-8 px-2.5 text-xs",
        md: "h-9 px-3 text-sm",
        lg: "h-11 px-4 text-sm",
        icon: "size-9 px-0",
      },
    },
    defaultVariants: {
      variant: "secondary",
      size: "md",
    },
  },
);

export interface ButtonProps
  extends
    React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        ref={ref}
        className={cn(buttonVariants({ variant, size, className }))}
        {...props}
      />
    );
  },
);

Button.displayName = "Button";

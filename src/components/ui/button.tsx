import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";
import { useMagneticHover } from "@/hooks/use-magnetic-hover";

function mergeRefs<T>(...refs: Array<React.Ref<T> | undefined>) {
  return (node: T | null) => {
    for (const ref of refs) {
      if (!ref) continue;
      if (typeof ref === "function") ref(node);
      else (ref as React.RefObject<T | null>).current = node;
    }
  };
}

const buttonVariants = cva(
  "btn-lift inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-[var(--radius-md)] text-sm font-medium ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "bg-accent text-accent-foreground hover:bg-[var(--accent-hover)] active:bg-[var(--accent-hover)]",
        destructive: "bg-destructive text-destructive-foreground hover:opacity-90",
        outline: "border border-border bg-transparent hover:border-accent/50 hover:bg-accent/10",
        secondary: "bg-secondary text-secondary-foreground hover:bg-accent/10",
        ghost: "hover:bg-accent/10",
        link: "text-accent underline-offset-4 hover:text-[var(--accent-hover)] hover:underline",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 rounded-[var(--radius-sm)] px-3",
        lg: "h-12 rounded-[var(--radius-lg)] px-6",
        icon: "h-9 w-9",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    // Magnetic hover only on primary CTAs (default variant) — applying it to
    // every ghost/outline/icon button everywhere would turn a subtle premium
    // touch into distracting wobble on toolbar clutter.
    const magneticRef = useMagneticHover<HTMLButtonElement>();
    const composedRef = variant === "default" || variant === undefined ? mergeRefs(ref, magneticRef) : ref;
    return (
      <Comp className={cn(buttonVariants({ variant, size, className }))} ref={composedRef} {...props} />
    );
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };

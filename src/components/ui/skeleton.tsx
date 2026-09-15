import { cn } from "@/lib/utils";

function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("skeleton-shimmer animate-pulse rounded-[var(--radius-md)] bg-surface-2", className)}
      {...props}
    />
  );
}

export { Skeleton };

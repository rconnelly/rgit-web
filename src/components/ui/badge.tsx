import * as React from "react";
import { cn } from "@/lib/utils";

export function Badge({
  className,
  variant = "default",
  ...props
}: React.ComponentProps<"span"> & { variant?: "default" | "outline" | "gold" }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium",
        variant === "default" && "bg-primary text-primary-foreground border-transparent",
        variant === "outline" && "text-foreground",
        variant === "gold" && "border-gold/40 bg-gold/15 text-foreground",
        className,
      )}
      {...props}
    />
  );
}

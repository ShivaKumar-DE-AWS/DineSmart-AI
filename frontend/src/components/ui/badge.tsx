import * as React from "react";
import { cn } from "@/lib/utils";

export function Badge({ className, variant = "default", ...props }: React.HTMLAttributes<HTMLSpanElement> & { variant?: "default" | "clay" | "sage" | "ready" | "warn" | "alert" | "outline" }) {
  const variants: Record<string, string> = {
    default: "bg-ink/10 text-ink",
    clay: "bg-clay/10 text-clay",
    sage: "bg-sage/10 text-sage",
    ready: "bg-ready/15 text-ready",
    warn: "bg-warn/15 text-warn",
    alert: "bg-alert/15 text-alert",
    outline: "border border-ink/15 text-ink",
  };
  return <span className={cn("inline-flex items-center rounded-full px-3 py-1 text-xs font-medium uppercase tracking-wider", variants[variant], className)} {...props} />;
}

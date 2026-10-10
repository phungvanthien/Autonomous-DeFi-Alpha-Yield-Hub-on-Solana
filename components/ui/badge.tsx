import * as React from "react";

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "outline";
}

export function Badge({ className = "", variant = "default", ...props }: BadgeProps) {
  const baseStyles = "inline-flex items-center rounded-md px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2";
  const variantStyles = variant === "outline" 
    ? "border border-zinc-700 text-zinc-300" 
    : "bg-primary text-primary-foreground hover:bg-primary/80";

  return (
    <div className={`${baseStyles} ${variantStyles} ${className}`} {...props} />
  );
}
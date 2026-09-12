import * as React from "react";
import { cn } from "@/lib/utils";

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "secondary" | "destructive" | "outline" | "success" | "warning" | "lime" | "forest";
}

function Badge({ className, variant = "default", ...props }: BadgeProps) {
  const variantStyles = {
    default: "border-transparent bg-leaf-700 text-white shadow hover:bg-leaf-800",
    secondary: "border-transparent bg-sage-100 text-forest-900 hover:bg-sage-200",
    destructive: "border-red-200 bg-red-50 text-red-700 hover:bg-red-100",
    outline: "border-sage-200 text-forest-900 bg-white",
    success: "border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-100",
    warning: "border-amber-200 bg-amber-50 text-amber-800 hover:bg-amber-100",
    lime: "border-lime-300 bg-lime-50 text-lime-800 font-semibold",
    forest: "border-transparent bg-forest-900 text-white",
  };

  return (
    <div
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
        variantStyles[variant],
        className
      )}
      {...props}
    />
  );
}

export { Badge };

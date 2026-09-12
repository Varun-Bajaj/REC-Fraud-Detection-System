import * as React from "react";
import { cn } from "@/lib/utils";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link" | "sprout";
  size?: "default" | "sm" | "lg" | "icon";
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "default", size = "default", ...props }, ref) => {
    const baseStyles =
      "inline-flex items-center justify-center whitespace-nowrap rounded-lg text-sm font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-leaf-600 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 active:scale-[0.98]";

    const variantStyles = {
      default: "bg-leaf-700 text-white shadow hover:bg-leaf-800",
      destructive: "bg-red-600 text-white shadow-sm hover:bg-red-700",
      outline: "border border-sage-200 bg-white text-forest-900 shadow-sm hover:bg-sage-100 hover:text-leaf-800",
      secondary: "bg-sage-100 text-forest-900 hover:bg-sage-200",
      ghost: "text-forest-900 hover:bg-sage-100 hover:text-leaf-700",
      link: "text-leaf-700 underline-offset-4 hover:underline",
      sprout: "bg-sprout-500 text-forest-950 font-semibold shadow hover:bg-sprout-600 hover:text-white",
    };

    const sizeStyles = {
      default: "h-9 px-4 py-2",
      sm: "h-8 rounded-md px-3 text-xs",
      lg: "h-11 rounded-lg px-8 text-base",
      icon: "h-9 w-9",
    };

    return (
      <button
        className={cn(baseStyles, variantStyles[variant], sizeStyles[size], className)}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

export { Button };

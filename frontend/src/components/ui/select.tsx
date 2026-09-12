import * as React from "react";
import { cn } from "@/lib/utils";

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {}

const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <select
        ref={ref}
        className={cn(
          "flex h-10 w-full rounded-lg border border-sage-200 bg-white px-3 py-2 text-sm text-forest-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-leaf-600 focus-visible:border-leaf-600 disabled:cursor-not-allowed disabled:opacity-50 transition-all",
          className
        )}
        {...props}
      >
        {children}
      </select>
    );
  }
);
Select.displayName = "Select";

export { Select };

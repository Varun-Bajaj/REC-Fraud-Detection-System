import * as React from "react";
import { cn } from "@/lib/utils";
import { X } from "lucide-react";

interface SheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  side?: "left" | "right";
  children: React.ReactNode;
}

function Sheet({ open, onOpenChange, side = "left", children }: SheetProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-forest-950/40 backdrop-blur-sm transition-opacity"
        onClick={() => onOpenChange(false)}
      />
      {/* Drawer */}
      <div
        className={cn(
          "relative z-50 flex flex-col w-72 max-w-[85vw] h-full bg-white border-r border-sage-200 shadow-2xl p-6 transition-transform duration-300 ease-in-out",
          side === "left" ? "mr-auto animate-in slide-in-from-left" : "ml-auto animate-in slide-in-from-right"
        )}
      >
        <button
          onClick={() => onOpenChange(false)}
          className="absolute right-4 top-4 rounded-full p-1 text-sage-600 hover:bg-sage-100 hover:text-forest-900 transition-colors"
        >
          <X className="h-5 w-5" />
          <span className="sr-only">Close</span>
        </button>
        {children}
      </div>
    </div>
  );
}

const SheetHeader = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("flex flex-col space-y-2 text-left mb-6", className)} {...props} />
);
SheetHeader.displayName = "SheetHeader";

const SheetTitle = ({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) => (
  <h3 className={cn("text-lg font-bold text-forest-900", className)} {...props} />
);
SheetTitle.displayName = "SheetTitle";

export { Sheet, SheetHeader, SheetTitle };

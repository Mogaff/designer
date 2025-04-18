import * as React from "react"
import { X } from "lucide-react"
import { cn } from "@/lib/utils"

export interface SlidingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: React.ReactNode;
  className?: string;
}

export interface SlidingDialogContentProps extends React.HTMLAttributes<HTMLDivElement> {
  className?: string;
  children: React.ReactNode;
}

export const SlidingDialog: React.FC<SlidingDialogProps> = ({ 
  open, 
  onOpenChange, 
  children,
  className 
}) => {
  return (
    <>
      {open && (
        <div className={cn("fixed inset-0 z-50 bg-black/40", className)} onClick={() => onOpenChange(false)} />
      )}
      {React.Children.map(children, child => {
        if (React.isValidElement(child)) {
          return React.cloneElement(child as React.ReactElement<any>, { open, onOpenChange });
        }
        return child;
      })}
    </>
  );
};

export const SlidingDialogTrigger: React.FC<React.ButtonHTMLAttributes<HTMLButtonElement> & { 
  asChild?: boolean,
  children: React.ReactNode
}> = ({ 
  asChild, 
  children,
  ...props
}) => {
  return asChild ? (
    React.Children.map(children, child => 
      React.isValidElement(child) 
        ? React.cloneElement(child as React.ReactElement<any>, { ...props })
        : child
    )[0]
  ) : (
    <button {...props}>{children}</button>
  );
};

export const SlidingDialogContent: React.FC<SlidingDialogContentProps & { 
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}> = ({ 
  children, 
  className,
  open,
  onOpenChange,
  ...props
}) => {
  const ref = React.useRef<HTMLDivElement>(null);
  
  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node) && onOpenChange) {
        onOpenChange(false);
      }
    };
    if (open) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [open, onOpenChange]);

  return (
    <div
      ref={ref}
      className={cn(
        "fixed left-[calc(var(--sidebar-width))] top-16 z-50 h-auto rounded-lg w-72 max-h-[80vh] overflow-auto border border-white/10 bg-black/60 backdrop-blur-md shadow-lg duration-300 transition-transform",
        open ? "translate-x-0 opacity-100" : "-translate-x-full opacity-0 pointer-events-none",
        className
      )}
      {...props}
    >
      {onOpenChange && (
        <button 
          className="absolute right-3 top-3 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none"
          onClick={() => onOpenChange(false)}
        >
          <X className="h-4 w-4 text-white" />
          <span className="sr-only">Close</span>
        </button>
      )}
      {children}
    </div>
  );
};

export const SlidingDialogHeader: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({
  className,
  children,
  ...props
}) => (
  <div
    className={cn(
      "flex flex-col space-y-1.5 border-b border-white/10 p-4",
      className
    )}
    {...props}
  >
    {children}
  </div>
);

export const SlidingDialogFooter: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({
  className,
  children,
  ...props
}) => (
  <div
    className={cn(
      "flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2 border-t border-white/10 p-4",
      className
    )}
    {...props}
  >
    {children}
  </div>
);

export const SlidingDialogTitle: React.FC<React.HTMLAttributes<HTMLHeadingElement>> = ({
  className,
  children,
  ...props
}) => (
  <h3
    className={cn(
      "text-lg font-semibold leading-none tracking-tight text-white",
      className
    )}
    {...props}
  >
    {children}
  </h3>
);

export const SlidingDialogDescription: React.FC<React.HTMLAttributes<HTMLParagraphElement>> = ({
  className,
  children,
  ...props
}) => (
  <p
    className={cn("text-sm text-white/70", className)}
    {...props}
  >
    {children}
  </p>
);
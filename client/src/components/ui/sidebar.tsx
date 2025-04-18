import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface SidebarContextType {
  expanded: boolean;
  setExpanded: React.Dispatch<React.SetStateAction<boolean>>;
  collapsible: "icon" | "full" | false;
}

const SidebarContext = React.createContext<SidebarContextType | undefined>(undefined);

export interface SidebarProviderProps {
  children: React.ReactNode;
  defaultCollapsed?: boolean;
  collapsible?: "icon" | "full" | false;
  as?: React.ElementType;
}

export const SidebarProvider = ({
  children,
  defaultCollapsed = false,
  collapsible = false,
  as: Component = React.Fragment,
}: SidebarProviderProps) => {
  const [expanded, setExpanded] = React.useState(!defaultCollapsed);

  return (
    <SidebarContext.Provider
      value={{
        expanded,
        setExpanded,
        collapsible,
      }}
    >
      <Component>
        {children}
      </Component>
    </SidebarContext.Provider>
  );
};

export function useSidebar() {
  const context = React.useContext(SidebarContext);
  if (context === undefined) {
    throw new Error("useSidebar must be used within a SidebarProvider");
  }
  return context;
}

const sidebarVariants = cva(
  "shadow-sm flex flex-col h-screen transition-all duration-300 fixed top-0 border-r border-white/10 backdrop-blur-md bg-black/40",
  {
    variants: {
      side: {
        left: "left-0",
        right: "right-0",
      },
      expanded: {
        true: "w-64",
        false: "w-16", 
      },
    },
    defaultVariants: {
      side: "left",
      expanded: true,
    },
  }
);

interface SidebarProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof sidebarVariants> {
  side?: "left" | "right";
}

export const Sidebar = ({
  className,
  side = "left",
  expanded: forcedExpanded,
  ...props
}: SidebarProps) => {
  const { expanded, setExpanded, collapsible } = useSidebar();
  const isExpanded = forcedExpanded !== undefined ? forcedExpanded : expanded;
  
  const handleMouseEnter = () => {
    if (collapsible === "icon") {
      setExpanded(true);
    }
  };
  
  const handleMouseLeave = () => {
    if (collapsible === "icon") {
      setExpanded(false);
    }
  };

  return (
    <aside
      className={cn(
        sidebarVariants({ side, expanded: isExpanded }), 
        !isExpanded && "sidebar-collapsed",
        className
      )}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      {...props}
    />
  );
};

export const SidebarHeader = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => {
  const { expanded } = useSidebar();

  return (
    <div
      className={cn(
        "flex h-14 items-center border-b px-3",
        expanded ? "justify-between" : "justify-center",
        className
      )}
      {...props}
    />
  );
};

export const SidebarContent = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => {
  return <div className={cn("flex-1 overflow-auto p-3", className)} {...props} />;
};

export const SidebarFooter = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => {
  return <div className={cn("mt-auto", className)} {...props} />;
};

export const SidebarTrigger = ({
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement>) => {
  const { expanded, setExpanded, collapsible } = useSidebar();

  if (!collapsible) return null;

  return (
    <button
      className={cn(
        "rounded-md p-1.5 hover:bg-secondary focus:bg-secondary focus:outline-none",
        className
      )}
      onClick={() => setExpanded(!expanded)}
      {...props}
    >
      {expanded ? <ChevronLeft className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
    </button>
  );
};

export const SidebarGroup = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => {
  return <div className={cn("mb-4", className)} {...props} />;
};

export const SidebarGroupLabel = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => {
  const { expanded } = useSidebar();

  return (
    <div
      className={cn(
        "mb-2 px-2 text-xs uppercase tracking-wider",
        expanded ? "text-left" : "text-center flex justify-center items-center",
        className
      )}
      {...props}
    />
  );
};

export const SidebarGroupContent = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => {
  const { expanded } = useSidebar();

  return (
    <div
      className={cn(
        "space-y-1",
        expanded ? "text-left" : "text-center",
        className
      )}
      {...props}
    />
  );
};

export const SidebarGroupAction = ({
  className,
  asChild = false,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & { asChild?: boolean }) => {
  if (asChild) {
    return <>{props.children}</>;
  }
  return <div className={cn("", className)} {...props} />;
};

export const SidebarMenu = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLUListElement>) => {
  return <ul className={cn("space-y-1", className)} {...props} />;
};

export const SidebarMenuItem = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLLIElement>) => {
  return <li className={cn("", className)} {...props} />;
};

export const SidebarMenuButton = ({
  className,
  asChild = false,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { asChild?: boolean }) => {
  const { expanded } = useSidebar();
  
  if (asChild) {
    return <>{props.children}</>;
  }

  return (
    <button
      className={cn(
        "block w-full",
        !expanded && "px-0 py-2 flex justify-center items-center",
        className
      )}
      {...props}
    />
  );
};

export const SidebarSeparator = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => {
  return <div className={cn("my-3 h-px bg-border", className)} {...props} />;
};

export const SidebarInset = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => {
  const { expanded, collapsible } = useSidebar();
  const isIconMode = collapsible === "icon";

  return (
    <div
      className={cn(
        "transition-all duration-300 w-full min-h-screen",
        isIconMode && expanded ? "pl-64" : "pl-16",
        className
      )}
      {...props}
    />
  );
};
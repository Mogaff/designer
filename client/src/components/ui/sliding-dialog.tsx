import * as React from "react"
import * as DialogPrimitive from "@radix-ui/react-dialog"
import { X } from "lucide-react"

import { cn } from "@/lib/utils"

const SlidingDialog = DialogPrimitive.Root

const SlidingDialogTrigger = DialogPrimitive.Trigger

const SlidingDialogPortal = DialogPrimitive.Portal

const SlidingDialogClose = DialogPrimitive.Close

const SlidingDialogOverlay = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Overlay
    ref={ref}
    className={cn(
      "fixed inset-0 z-50 bg-black/40 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
      className
    )}
    {...props}
  />
))
SlidingDialogOverlay.displayName = DialogPrimitive.Overlay.displayName

const SlidingDialogContent = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content>
>(({ className, children, ...props }, ref) => (
  <SlidingDialogPortal>
    <SlidingDialogOverlay />
    <DialogPrimitive.Content
      ref={ref}
      className={cn(
        "fixed left-[calc(var(--sidebar-width))] top-16 z-50 h-auto rounded-lg w-72 max-h-[80vh] overflow-auto border border-white/10 bg-black/60 backdrop-blur-md shadow-lg duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:slide-out-to-left-full data-[state=open]:slide-in-from-left-1/2",
        className
      )}
      {...props}
    >
      {children}
      <DialogPrimitive.Close className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground">
        <X className="h-4 w-4" />
        <span className="sr-only">Close</span>
      </DialogPrimitive.Close>
    </DialogPrimitive.Content>
  </SlidingDialogPortal>
))
SlidingDialogContent.displayName = DialogPrimitive.Content.displayName

const SlidingDialogHeader = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      "flex flex-col space-y-1.5 border-b border-white/10 p-4",
      className
    )}
    {...props}
  />
)
SlidingDialogHeader.displayName = "SlidingDialogHeader"

const SlidingDialogFooter = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      "flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2 border-t border-white/10 p-4",
      className
    )}
    {...props}
  />
)
SlidingDialogFooter.displayName = "SlidingDialogFooter"

const SlidingDialogTitle = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Title
    ref={ref}
    className={cn(
      "text-lg font-semibold leading-none tracking-tight",
      className
    )}
    {...props}
  />
))
SlidingDialogTitle.displayName = DialogPrimitive.Title.displayName

const SlidingDialogDescription = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Description>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Description
    ref={ref}
    className={cn("text-sm text-muted-foreground", className)}
    {...props}
  />
))
SlidingDialogDescription.displayName = DialogPrimitive.Description.displayName

export {
  SlidingDialog,
  SlidingDialogPortal,
  SlidingDialogOverlay,
  SlidingDialogClose,
  SlidingDialogTrigger,
  SlidingDialogContent,
  SlidingDialogHeader,
  SlidingDialogFooter,
  SlidingDialogTitle,
  SlidingDialogDescription,
}
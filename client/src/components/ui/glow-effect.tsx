import React, { ReactNode } from "react";
import { cn } from "@/lib/utils";

type GlowEffectProps = {
  className?: string;
  children: ReactNode;
  colors?: string[];
  mode?: "static" | "colorShift" | "pulse";
  scale?: number;
};

export function GlowEffect({
  className,
  children,
  colors = ["#8B5CF6", "#3B82F6", "#10B981"],
  mode = "static",
  scale = 1.2,
}: GlowEffectProps) {
  const getAnimation = () => {
    if (mode === "colorShift") {
      return "animate-glow-color-shift";
    } else if (mode === "pulse") {
      return "animate-glow-pulse";
    }
    return "";
  };

  const colorVar = {
    "--glow-color-1": colors[0] || "#8B5CF6",
    "--glow-color-2": colors[1] || "#3B82F6",
    "--glow-color-3": colors[2] || "#10B981",
    "--glow-scale": scale.toString(),
  } as React.CSSProperties;

  return (
    <div
      className={cn(
        "relative inline-flex items-center justify-center",
        className
      )}
      style={colorVar}
    >
      <div
        className={cn(
          "absolute inset-0 -z-10 blur-xl",
          "bg-gradient-to-r from-[var(--glow-color-1)] via-[var(--glow-color-2)] to-[var(--glow-color-3)]",
          "opacity-70 transform scale-[var(--glow-scale)]",
          getAnimation()
        )}
      />
      {children}
    </div>
  );
}
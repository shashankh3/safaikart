import React from "react";
import { cn } from "@/lib/utils";

interface BrandLogoProps {
  className?: string;
  variant?: "icon" | "full" | "horizontal";
  size?: "sm" | "md" | "lg" | "xl";
}

export function BrandLogo({ className, variant = "icon", size = "md" }: BrandLogoProps) {
  const sizeMap = {
    sm: "h-8 w-8",
    md: "h-10 w-10",
    lg: "h-14 w-14",
    xl: "h-16 w-16",
  };

  if (variant === "icon") {
    return (
      <div
        className={cn(
          "rounded-2xl overflow-hidden shadow-elevated bg-[#0C3818] flex items-center justify-center p-0.5",
          sizeMap[size] || "h-10 w-10",
          className
        )}
      >
        <img
          src="/images/logo.png"
          alt="SafaiKart"
          className="h-full w-full object-cover"
        />
      </div>
    );
  }

  return (
    <div className={cn("inline-flex items-center gap-3", className)}>
      <div
        className={cn(
          "rounded-2xl overflow-hidden shadow-elevated bg-[#0C3818] flex items-center justify-center p-0.5",
          sizeMap[size] || "h-10 w-10"
        )}
      >
        <img
          src="/images/logo.png"
          alt="SafaiKart"
          className="h-full w-full object-cover"
        />
      </div>
      <div className="flex flex-col">
        <div className="flex items-center font-black tracking-tight text-lg leading-none">
          <span className="text-gold">Safa</span>
          <span className="text-gold relative">
            ı
            <span className="absolute -top-1.5 left-1/2 -translate-x-1/2 h-1.5 w-1.5 rounded-full bg-red-600 animate-pulse" />
          </span>
          <span className="text-white ml-0.5">Kart</span>
        </div>
        <span className="text-[10px] uppercase font-bold tracking-widest text-gold/80 mt-1">
          Laundry &amp; Dry Cleaning
        </span>
      </div>
    </div>
  );
}

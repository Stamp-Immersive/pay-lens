"use client"

import * as React from "react"
import { Loader2 } from "lucide-react"

import { cn } from "@/lib/utils"

interface LoadingOverlayProps {
  isLoading: boolean
  message?: string
  children: React.ReactNode
  className?: string
}

function LoadingOverlay({
  isLoading,
  message,
  children,
  className,
}: LoadingOverlayProps) {
  return (
    <div data-slot="loading-overlay-container" className={cn("relative", className)}>
      {children}
      {isLoading && (
        <div
          data-slot="loading-overlay"
          className="absolute inset-0 z-50 flex flex-col items-center justify-center gap-3 rounded-xl bg-background/80 backdrop-blur-sm"
        >
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          {message && (
            <p className="text-sm text-muted-foreground font-medium">{message}</p>
          )}
        </div>
      )}
    </div>
  )
}

export { LoadingOverlay }

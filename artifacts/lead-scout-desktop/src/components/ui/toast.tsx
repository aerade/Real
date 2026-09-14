import * as React from "react"
import { type VariantProps } from "class-variance-authority"

export interface ToastProps
  extends React.HTMLAttributes<HTMLDivElement> {
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

export type ToastActionElement = React.ReactElement

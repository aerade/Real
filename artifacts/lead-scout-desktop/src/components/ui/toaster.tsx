import { useToast } from "@/hooks/use-toast"
import { Bell, X } from "lucide-react"

export function Toaster() {
  const { toasts, dismiss } = useToast()

  return (
    <div className="pointer-events-none fixed right-4 top-4 z-[100] flex w-[calc(100%-2rem)] max-w-[390px] flex-col gap-3 sm:right-5 sm:top-5">
      {toasts.map(function ({ id, title, description, action, open, onOpenChange, ...props }) {
        return (
          <div
            key={id}
            {...props}
            data-state={open ? "open" : "closed"}
            role="status"
            aria-live="polite"
            className="real-toast pointer-events-auto group relative flex w-full items-start gap-3 overflow-hidden rounded-2xl border border-primary/25 bg-card/95 p-4 pr-10 text-foreground shadow-2xl shadow-black/25 backdrop-blur-xl"
          >
            <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-primary/12 text-primary">
              <Bell className="h-4 w-4" />
            </div>
            <div className="min-w-0 flex-1">
              {title && <div className="text-sm font-semibold leading-5">{title}</div>}
              {description && (
                <div className="mt-1 text-xs leading-4 text-muted-foreground">{description}</div>
              )}
              {action}
            </div>
            <button type="button" aria-label="Закрыть уведомление" onClick={() => { onOpenChange?.(false); dismiss(id); }} className="absolute right-2.5 top-2.5 rounded-lg p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">
              <X className="h-3.5 w-3.5" />
            </button>
            <span className="real-toast-progress absolute inset-x-0 bottom-0 h-0.5 origin-left bg-primary/70" />
          </div>
        )
      })}
    </div>
  )
}

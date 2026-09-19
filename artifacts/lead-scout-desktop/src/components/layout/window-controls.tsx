import { Minus, Square, X } from "lucide-react";

export function WindowControls({ variant = "mac" }: { variant?: "mac" | "windows" }) {
  const control = (action: "minimize" | "maximize" | "close") => {
    window.realDesktop?.windowControl(action);
  };

  const handleControlClick = (
    event: React.MouseEvent<HTMLButtonElement>,
    action: "minimize" | "maximize" | "close",
  ) => {
    event.preventDefault();
    event.stopPropagation();
    control(action);
  };

  return (
    <div
      className={`flex items-center shrink-0 h-full pointer-events-auto ${variant === "mac" ? "gap-2" : "gap-0.5"}`}
      style={{ WebkitAppRegion: "no-drag", pointerEvents: "auto" } as React.CSSProperties}
    >
      {variant === "mac" && <button
        type="button"
         aria-label="Закрыть"
         title="Закрыть"
        onClick={(event) => handleControlClick(event, "close")}
         className="window-control window-control-close group flex h-3 w-3 items-center justify-center rounded-full border border-black/10 bg-[#ff5f57] cursor-pointer pointer-events-auto"
        style={{ WebkitAppRegion: "no-drag" } as React.CSSProperties}
       >
         <X aria-hidden="true" className="window-control-icon h-2.5 w-2.5" />
       </button>}
      {variant === "mac" && <button
        type="button"
         aria-label="Свернуть"
         title="Свернуть"
        onClick={(event) => handleControlClick(event, "minimize")}
         className="window-control window-control-minimize group flex h-3 w-3 items-center justify-center rounded-full border border-black/10 bg-[#febc2e] cursor-pointer pointer-events-auto"
        style={{ WebkitAppRegion: "no-drag" } as React.CSSProperties}
       >
         <Minus aria-hidden="true" className="window-control-icon h-2.5 w-2.5" />
       </button>}
      {variant === "mac" && <button
        type="button"
         aria-label="Развернуть"
         title="Развернуть"
        onClick={(event) => handleControlClick(event, "maximize")}
         className="window-control window-control-maximize group flex h-3 w-3 items-center justify-center rounded-full border border-black/10 bg-[#28c840] cursor-pointer pointer-events-auto"
        style={{ WebkitAppRegion: "no-drag" } as React.CSSProperties}
       >
         <Square aria-hidden="true" className="window-control-icon h-2 w-2" />
       </button>}
      {variant === "windows" && (
        <>
          <button
            type="button"
             aria-label="Свернуть"
             title="Свернуть"
            onClick={(event) => handleControlClick(event, "minimize")}
            className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
            style={{ WebkitAppRegion: "no-drag" } as React.CSSProperties}
          >
              <Minus className="window-control-icon h-3 w-3" />
          </button>
          <button
            type="button"
             aria-label="Развернуть"
             title="Развернуть"
            onClick={(event) => handleControlClick(event, "maximize")}
            className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
            style={{ WebkitAppRegion: "no-drag" } as React.CSSProperties}
          >
              <Square className="window-control-icon h-2.5 w-2.5" />
          </button>
          <button
            type="button"
             aria-label="Закрыть"
             title="Закрыть"
            onClick={(event) => handleControlClick(event, "close")}
            className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-destructive/15 hover:text-destructive"
            style={{ WebkitAppRegion: "no-drag" } as React.CSSProperties}
          >
              <X className="window-control-icon h-3 w-3" />
          </button>
        </>
      )}
    </div>
  );
}
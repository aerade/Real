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
        aria-label="Close"
        title="Close"
        onClick={(event) => handleControlClick(event, "close")}
        className="h-3 w-3 rounded-full bg-[#ff5f57] border border-black/10 cursor-pointer pointer-events-auto"
        style={{ WebkitAppRegion: "no-drag" } as React.CSSProperties}
      />}
      {variant === "mac" && <button
        type="button"
        aria-label="Minimize"
        title="Minimize"
        onClick={(event) => handleControlClick(event, "minimize")}
        className="h-3 w-3 rounded-full bg-[#febc2e] border border-black/10 cursor-pointer pointer-events-auto"
        style={{ WebkitAppRegion: "no-drag" } as React.CSSProperties}
      />}
      {variant === "mac" && <button
        type="button"
        aria-label="Maximize"
        title="Maximize"
        onClick={(event) => handleControlClick(event, "maximize")}
        className="h-3 w-3 rounded-full bg-[#28c840] border border-black/10 cursor-pointer pointer-events-auto"
        style={{ WebkitAppRegion: "no-drag" } as React.CSSProperties}
      />}
      {variant === "windows" && (
        <>
          <button
            type="button"
            aria-label="Minimize"
            title="Minimize"
            onClick={(event) => handleControlClick(event, "minimize")}
            className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
            style={{ WebkitAppRegion: "no-drag" } as React.CSSProperties}
          >
            <Minus className="h-3 w-3" />
          </button>
          <button
            type="button"
            aria-label="Maximize"
            title="Maximize"
            onClick={(event) => handleControlClick(event, "maximize")}
            className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
            style={{ WebkitAppRegion: "no-drag" } as React.CSSProperties}
          >
            <Square className="h-2.5 w-2.5" />
          </button>
          <button
            type="button"
            aria-label="Close"
            title="Close"
            onClick={(event) => handleControlClick(event, "close")}
            className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-destructive/15 hover:text-destructive"
            style={{ WebkitAppRegion: "no-drag" } as React.CSSProperties}
          >
            <X className="h-3 w-3" />
          </button>
        </>
      )}
    </div>
  );
}
export function WindowControls() {
  const control = (action: "minimize" | "maximize" | "close") => {
    window.realDesktop?.windowControl(action);
  };

  const handleControlMouseDown = (
    event: React.MouseEvent<HTMLButtonElement>,
    action: "minimize" | "maximize" | "close",
  ) => {
    event.preventDefault();
    event.stopPropagation();
    control(action);
  };

  return (
    <div
      className="flex items-center gap-2 shrink-0 h-full pointer-events-auto"
      style={{ WebkitAppRegion: "no-drag", pointerEvents: "auto" } as React.CSSProperties}
    >
      <button
        type="button"
        aria-label="Close"
        title="Close"
        onMouseDown={(event) => handleControlMouseDown(event, "close")}
        className="h-3 w-3 rounded-full bg-[#ff5f57] border border-black/10 hover:brightness-110 active:brightness-90 transition-all cursor-pointer pointer-events-auto"
        style={{ WebkitAppRegion: "no-drag" } as React.CSSProperties}
      />
      <button
        type="button"
        aria-label="Minimize"
        title="Minimize"
        onMouseDown={(event) => handleControlMouseDown(event, "minimize")}
        className="h-3 w-3 rounded-full bg-[#febc2e] border border-black/10 hover:brightness-110 active:brightness-90 transition-all cursor-pointer pointer-events-auto"
        style={{ WebkitAppRegion: "no-drag" } as React.CSSProperties}
      />
      <button
        type="button"
        aria-label="Maximize"
        title="Maximize"
        onMouseDown={(event) => handleControlMouseDown(event, "maximize")}
        className="h-3 w-3 rounded-full bg-[#28c840] border border-black/10 hover:brightness-110 active:brightness-90 transition-all cursor-pointer pointer-events-auto"
        style={{ WebkitAppRegion: "no-drag" } as React.CSSProperties}
      />
    </div>
  );
}
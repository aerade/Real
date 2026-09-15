export function WindowControls() {
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
      className="flex items-center gap-2 shrink-0 h-full pointer-events-auto"
      style={{ WebkitAppRegion: "no-drag", pointerEvents: "auto" } as React.CSSProperties}
    >
      <button
        type="button"
        aria-label="Close"
        title="Close"
        onClick={(event) => handleControlClick(event, "close")}
        className="h-3 w-3 rounded-full bg-[#ff5f57] border border-black/10 cursor-pointer pointer-events-auto"
        style={{ WebkitAppRegion: "no-drag" } as React.CSSProperties}
      />
      <button
        type="button"
        aria-label="Minimize"
        title="Minimize"
        onClick={(event) => handleControlClick(event, "minimize")}
        className="h-3 w-3 rounded-full bg-[#febc2e] border border-black/10 cursor-pointer pointer-events-auto"
        style={{ WebkitAppRegion: "no-drag" } as React.CSSProperties}
      />
      <button
        type="button"
        aria-label="Maximize"
        title="Maximize"
        onClick={(event) => handleControlClick(event, "maximize")}
        className="h-3 w-3 rounded-full bg-[#28c840] border border-black/10 cursor-pointer pointer-events-auto"
        style={{ WebkitAppRegion: "no-drag" } as React.CSSProperties}
      />
    </div>
  );
}
export function WindowControls() {
  const control = (action: "minimize" | "maximize" | "close") => {
    window.realDesktop?.windowControl(action);
  };

  return (
    <div
      className="flex items-center gap-2 shrink-0 h-full"
      style={{ WebkitAppRegion: "no-drag" } as React.CSSProperties}
    >
      <button
        type="button"
        aria-label="Close"
        title="Close"
        onClick={() => control("close")}
        className="h-3 w-3 rounded-full bg-[#ff5f57] border border-black/10 hover:brightness-110 active:brightness-90 transition-all cursor-pointer"
      />
      <button
        type="button"
        aria-label="Minimize"
        title="Minimize"
        onClick={() => control("minimize")}
        className="h-3 w-3 rounded-full bg-[#febc2e] border border-black/10 hover:brightness-110 active:brightness-90 transition-all cursor-pointer"
      />
      <button
        type="button"
        aria-label="Maximize"
        title="Maximize"
        onClick={() => control("maximize")}
        className="h-3 w-3 rounded-full bg-[#28c840] border border-black/10 hover:brightness-110 active:brightness-90 transition-all cursor-pointer"
      />
    </div>
  );
}
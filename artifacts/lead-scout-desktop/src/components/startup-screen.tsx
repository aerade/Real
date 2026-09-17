import { useEffect, useRef, useState } from "react";
import { WindowControls } from "@/components/layout/window-controls";
import startupBg from "@assets/image_1789532603940.png";

type StartupUpdate = {
  configured: boolean;
  status: string;
  percent?: number;
  latestVersion?: string;
  message?: string;
};

export function StartupScreen({ onComplete }: { onComplete: () => void }) {
  const [update, setUpdate] = useState<StartupUpdate>({ configured: false, status: "checking" });
  const [phase, setPhase] = useState<"checking" | "preparing" | "ready">("checking");
  const [progress, setProgress] = useState(12);
  const completeRef = useRef(onComplete);
  completeRef.current = onComplete;

  useEffect(() => {
    let mounted = true;
    const desktop = window.realDesktop;
    const timers: ReturnType<typeof setTimeout>[] = [];
    timers.push(setTimeout(() => {
      if (!mounted) return;
      setPhase("preparing");
      setProgress(54);
    }, 900));
    timers.push(setTimeout(() => {
      if (!mounted) return;
      setPhase("ready");
      setProgress(86);
    }, 1900));
    timers.push(setTimeout(() => {
      if (!mounted) return;
      setProgress(100);
      completeRef.current();
    }, 2950));
    const unsubscribe = desktop?.onUpdateStatus?.((value) => {
      if (!mounted || !value || typeof value !== "object") return;
      const next = value as StartupUpdate;
      setUpdate(next);
       if (next.status === "downloading" && typeof next.percent === "number") setProgress(Math.max(54, Math.min(96, next.percent)));
    });

    const check = desktop?.checkForUpdates?.();
    if (desktop) {
      check?.then((value) => {
        if (!mounted || !value) return;
        if (value.status) setUpdate({ ...value, status: value.status });
      }).catch(() => {
        if (!mounted) return;
        setUpdate({ configured: true, status: "error" });
      });
    }

    return () => {
      mounted = false;
      unsubscribe?.();
      timers.forEach((timer) => clearTimeout(timer));
    };
  }, []);

  const statusText = phase === "checking"
    ? "Checking workspace and release channel"
    : phase === "preparing"
      ? "Preparing your lead workspace"
      : "Ready — opening Real";

  return (
    <div className="h-full w-full rounded-[24px] flex flex-col items-center justify-center bg-black select-none overflow-hidden relative border border-white/10 shadow-2xl" style={{ WebkitAppRegion: "drag" } as React.CSSProperties}>
      <div className="absolute left-4 top-4 z-20">
        <WindowControls />
      </div>
      <div className="absolute inset-0 bg-cover bg-center opacity-45" style={{ backgroundImage: `url(${startupBg})` }} />
      <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-black/55 to-black/95" />
      
      <div className="relative z-10">
        <h1 className="text-[86px] font-bold tracking-[0.38em] pl-[0.38em] text-white drop-shadow-2xl uppercase">REAL</h1>
      </div>

      <div className="absolute z-10 bottom-12 left-1/2 -translate-x-1/2 w-[72%] space-y-4">
         <p className="text-[11px] text-white/75 text-center uppercase tracking-widest font-mono font-medium h-4">
           {statusText}
        </p>
        <div className="w-full h-1.5 bg-white/15 rounded-full overflow-hidden relative">
            <div className={`absolute inset-y-0 left-0 rounded-full bg-white shadow-[0_0_10px_rgba(255,255,255,0.55)] transition-all duration-500 ${phase === "checking" ? "animate-progress-indeterminate w-1/2" : ""}`} style={phase === "checking" ? undefined : { width: `${progress}%` }} />
        </div>
          {update.status === "available" && <p className="text-center text-[10px] text-white/55">A newer build is available for download.</p>}
      </div>
    </div>
  );
}

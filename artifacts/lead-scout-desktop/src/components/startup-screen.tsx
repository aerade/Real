import { useEffect, useState } from "react";
import { WindowControls } from "@/components/layout/window-controls";
import startupBg from "@assets/image_1789395466523.png";

const STARTUP_LABELS = [
  "Initializing environment...",
  "Loading native modules...",
  "Warming up cache...",
  "Establishing connections...",
  "Preparing interface..."
];

export function StartupScreen({ onComplete }: { onComplete: () => void }) {
  const [labelIndex, setLabelIndex] = useState(0);

  useEffect(() => {
    let mounted = true;
    
    // Total time ~4.5s
    const TOTAL_DURATION = 4500;
    const startTime = Date.now();

    const interval = setInterval(() => {
      setLabelIndex(prev => (prev + 1) % STARTUP_LABELS.length);
    }, 800);

    async function checkUpdates() {
      try {
        if (window.realDesktop?.checkForUpdates) {
          await window.realDesktop.checkForUpdates();
        }
      } catch (err) {
        // Ignore errors silently for startup screen
      }
    }

    checkUpdates().finally(() => {
      if (!mounted) return;
      
      const elapsed = Date.now() - startTime;
      const remaining = Math.max(0, TOTAL_DURATION - elapsed);
      
      setTimeout(() => {
        if (mounted) onComplete();
      }, remaining);
    });

    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, [onComplete]);

  return (
    <div className="h-full w-full rounded-[24px] flex flex-col items-center justify-center bg-black select-none overflow-hidden relative border border-white/10 shadow-2xl" style={{ WebkitAppRegion: "drag" } as React.CSSProperties}>
      <div className="absolute left-4 top-4 z-20">
        <WindowControls />
      </div>
      <div className="absolute inset-0 bg-cover bg-center opacity-55" style={{ backgroundImage: `url(${startupBg})` }} />
      <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-black/55 to-black/95" />
      
      <div className="relative z-10">
        <h1 className="text-[86px] font-bold tracking-[0.38em] pl-[0.38em] text-white drop-shadow-2xl uppercase">REAL</h1>
      </div>

      <div className="absolute z-10 bottom-12 left-1/2 -translate-x-1/2 w-[72%] space-y-4">
        <p className="text-[11px] text-white/60 text-center uppercase tracking-widest font-mono font-medium h-4">
          {STARTUP_LABELS[labelIndex]}
        </p>
        <div className="w-full h-1.5 bg-white/15 rounded-full overflow-hidden relative">
          <div className="absolute top-0 bottom-0 left-0 w-1/3 bg-white rounded-full animate-progress-indeterminate shadow-[0_0_10px_rgba(255,255,255,0.55)]" />
        </div>
      </div>
    </div>
  );
}

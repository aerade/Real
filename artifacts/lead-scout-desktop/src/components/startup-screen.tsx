import { useEffect, useState } from "react";
import startupBg from "@assets/image_1789395466523.png";
import { WindowControls } from "@/components/layout/window-controls";

export function StartupScreen({ onComplete }: { onComplete: () => void }) {
  const [status, setStatus] = useState("Initializing...");

  useEffect(() => {
    let mounted = true;

    async function checkUpdates() {
      try {
        if (window.realDesktop?.checkForUpdates) {
          setStatus("Checking version...");
          await window.realDesktop.checkForUpdates();
          if (!mounted) return;
          setStatus("Loading interface...");
          setTimeout(() => {
            if (mounted) onComplete();
          }, 500);
        } else {
          // Web preview mode, just wait a bit to show the screen
          setStatus("Loading interface...");
          setTimeout(() => {
            if (mounted) onComplete();
          }, 1500);
        }
      } catch (err) {
        if (!mounted) return;
        setStatus("Ready.");
        setTimeout(() => {
          if (mounted) onComplete();
        }, 500);
      }
    }

    // Give a brief moment to show initialization
    setTimeout(() => {
      if (mounted) checkUpdates();
    }, 800);

    return () => {
      mounted = false;
    };
  }, [onComplete]);

  return (
    <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-black select-none" style={{ WebkitAppRegion: "drag" } as React.CSSProperties}>
      <div className="absolute left-4 top-4 z-20">
        <WindowControls />
      </div>
      <div 
        className="absolute inset-0 z-0 bg-cover bg-center bg-no-repeat opacity-40 mix-blend-screen"
        style={{ backgroundImage: `url(${startupBg})` }}
      />
      <div className="absolute inset-0 z-0 bg-gradient-to-t from-black via-black/80 to-transparent" />
      
      <div className="relative z-10 flex flex-col items-center w-full max-w-sm px-8">
        <h1 className="text-5xl font-bold tracking-tight text-white mb-16 drop-shadow-lg">Real</h1>
        
        <div className="w-full space-y-4">
          <div className="w-full h-1 bg-white/10 rounded-full overflow-hidden relative">
            <div className="absolute top-0 bottom-0 left-0 w-1/2 bg-white rounded-full animate-progress-indeterminate shadow-[0_0_10px_rgba(255,255,255,0.5)]" />
          </div>
          <p className="text-[11px] text-white/50 text-center uppercase tracking-widest font-mono font-medium">
            {status}
          </p>
        </div>
      </div>
    </div>
  );
}

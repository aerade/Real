import { ReactNode } from "react";
import { Link, useLocation } from "wouter";
import { Home, Search, Target, Settings } from "lucide-react";
import { cn } from "@/lib/utils";
import { WindowControls } from "./window-controls";
import realMarkWhite from "@/assets/real-mark-white.svg";

export function AppLayout({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  
  const navItems = [
    { href: "/", label: "Overview", icon: Home },
    { href: "/search", label: "Search", icon: Search },
    { href: "/leads", label: "Clients", icon: Target },
    { href: "/admin", label: "Settings", icon: Settings },
  ];

  return (
    <div className="flex flex-col h-full w-full bg-background text-foreground overflow-hidden rounded-[24px] border border-border/40 select-none shadow-2xl relative">
      {/* Top Titlebar / Navbar */}
      <header 
        className="h-14 flex items-center justify-between px-4 shrink-0 bg-background/80 backdrop-blur-md z-50 relative"
        style={{ WebkitAppRegion: "drag" } as React.CSSProperties}
      >
        <div className="w-[100px] shrink-0">
          <WindowControls />
        </div>
        
        {/* Navigation - Centered */}
        <nav className="flex h-full items-center gap-1 flex-1 justify-center" style={{ WebkitAppRegion: "no-drag" } as React.CSSProperties}>
          {navItems.map((item) => {
            const isActive = location === item.href || (item.href !== "/" && location.startsWith(item.href));
            return (
              <Link key={item.href} href={item.href} className="relative h-9 flex items-center justify-center px-4 cursor-pointer">
                <div className={cn(
                  "flex items-center gap-1.5 text-xs font-semibold transition-colors duration-200",
                  isActive ? "text-primary" : "text-muted-foreground"
                )}>
                  <item.icon className="w-3.5 h-3.5" />
                  {item.label}
                </div>
                {isActive && (
                  <div className="absolute -bottom-[2px] left-1/2 -translate-x-1/2 w-[calc(100%_-_36px)] h-[3px] bg-primary rounded-full" />
                )}
              </Link>
            );
          })}
        </nav>
        
        <div className="w-[100px] shrink-0 flex justify-end pointer-events-none">
          <img src={realMarkWhite} alt="Real" className="h-5 w-5 object-contain opacity-90" />
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto bg-background/50 relative rounded-b-2xl">
        <div className="max-w-5xl mx-auto h-full px-6 py-6 pb-20">
          {children}
        </div>
      </main>
    </div>
  );
}

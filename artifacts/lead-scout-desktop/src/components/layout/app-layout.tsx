import { ReactNode } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { Home, Search, Target, Settings, LogOut } from "lucide-react";
import { cn } from "@/lib/utils";
import realMarkWhite from "@/assets/real-mark-white.svg";
import { WindowControls } from "./window-controls";

export function AppLayout({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  const { session, logout } = useAuth();
  
  const navItems = [
    { href: "/", label: "Overview", icon: Home },
    { href: "/search", label: "Search", icon: Search },
    { href: "/leads", label: "Pipeline", icon: Target },
  ];

  if (session?.user?.role === 'owner') {
    navItems.push({ href: "/admin", label: "Admin", icon: Settings });
  }

  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground overflow-hidden border-border/40 select-none">
      {/* Top Titlebar / Navbar */}
      <header 
        className="h-14 border-b border-border/50 flex items-center justify-between px-4 shrink-0 bg-background z-50"
        style={{ WebkitAppRegion: "drag" } as React.CSSProperties}
      >
        <WindowControls />
        {/* Navigation */}
        <nav className="ml-6 flex h-full items-center gap-2 flex-1" style={{ WebkitAppRegion: "no-drag" } as React.CSSProperties}>
          {navItems.map((item) => {
            const isActive = location === item.href || (item.href !== "/" && location.startsWith(item.href));
            return (
              <Link key={item.href} href={item.href} className="relative h-full flex items-center px-3 group">
                <div className={cn(
                  "flex items-center gap-2 text-sm font-medium transition-colors duration-200",
                  isActive ? "text-foreground" : "text-muted-foreground group-hover:text-foreground"
                )}>
                  <item.icon className="w-4 h-4" />
                  {item.label}
                </div>
                {isActive && (
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-white" />
                )}
              </Link>
            );
          })}
        </nav>
        
        <div className="flex items-center gap-6" style={{ WebkitAppRegion: "no-drag" } as React.CSSProperties}>
          {/* User & Logout */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 max-w-[120px]">
              <div className="w-6 h-6 rounded-full bg-accent flex items-center justify-center text-[10px] font-bold text-foreground shrink-0 border border-border/50">
                {session?.user?.name.charAt(0)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-xs font-medium truncate text-foreground leading-tight">{session?.user?.name}</div>
              </div>
            </div>
            <button 
              onClick={logout}
              className="text-muted-foreground hover:text-destructive transition-colors shrink-0 p-1"
              title="Logout"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>

          {/* Real Logo on Right */}
          <div className="flex justify-end opacity-80 pointer-events-none">
            <img src={realMarkWhite} alt="Real" className="h-4 w-4 object-contain" />
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto bg-background relative">
        <div className="max-w-5xl mx-auto h-full px-6 py-6 pb-20">
          {children}
        </div>
      </main>
    </div>
  );
}

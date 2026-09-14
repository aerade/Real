import { ReactNode } from "react";
import { Sidebar } from "./sidebar";
import { Link } from "wouter";

export function AppLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground overflow-hidden border-border/40 select-none">
      {/* Top Titlebar / Navbar */}
      <header className="h-12 border-b border-border/50 flex items-center justify-between px-4 shrink-0 bg-background z-50">
        {/* Mac Controls (Decorative) */}
        <div className="flex items-center gap-2 w-48">
          <div className="w-3 h-3 rounded-full bg-[#FF5F56] border border-[#E0443E]/50" />
          <div className="w-3 h-3 rounded-full bg-[#FFBD2E] border border-[#DEA123]/50" />
          <div className="w-3 h-3 rounded-full bg-[#27C93F] border border-[#1AAB29]/50" />
        </div>
        
        {/* Real Logo on Right */}
        <div className="w-48 flex justify-end">
          <div className="flex items-center gap-1.5 opacity-90">
            <img src="/real-mark-white.svg" alt="Real" className="h-4 w-4 object-contain" />
            <span className="font-semibold text-xs tracking-wide">Real</span>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <main className="flex-1 flex flex-col h-full overflow-hidden bg-background relative">
          <div className="flex-1 overflow-y-auto px-6 py-6 pb-20">
            <div className="max-w-6xl mx-auto h-full">
              {children}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

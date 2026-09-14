import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/use-auth";
import { 
  LayoutDashboard, 
  Search, 
  Users, 
  Settings, 
  LogOut,
  Target
} from "lucide-react";

export function Sidebar() {
  const [location] = useLocation();
  const { session, logout } = useAuth();
  
  const navItems = [
    { href: "/", label: "Обзор", icon: LayoutDashboard },
    { href: "/search", label: "Поиск", icon: Search },
    { href: "/leads", label: "Мои лиды", icon: Target },
  ];

  if (session?.user?.role === 'owner') {
    navItems.push({ href: "/admin", label: "Админ", icon: Settings });
  }

  return (
    <aside className="w-64 bg-sidebar text-sidebar-foreground border-r border-sidebar-border flex flex-col h-screen sticky top-0">
      <div className="p-6">
        <div className="flex items-center gap-2 font-bold text-xl tracking-tight text-sidebar-primary">
          <Target className="w-6 h-6" />
          <span>Lead Scout</span>
        </div>
      </div>
      
      <nav className="flex-1 px-4 space-y-1">
        {navItems.map((item) => {
          const isActive = location === item.href || (item.href !== "/" && location.startsWith(item.href));
          return (
            <Link key={item.href} href={item.href} className={cn(
              "flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors",
              isActive 
                ? "bg-sidebar-accent text-sidebar-accent-foreground" 
                : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
            )}>
              <item.icon className={cn("w-4 h-4", isActive ? "text-sidebar-primary" : "text-sidebar-foreground/50")} />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="p-4 mt-auto border-t border-sidebar-border">
        <div className="flex items-center gap-3 px-3 py-2 mb-2">
          <div className="w-8 h-8 rounded-full bg-sidebar-accent flex items-center justify-center text-xs font-bold text-sidebar-primary">
            {session?.user?.name.charAt(0)}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium truncate">{session?.user?.name}</div>
            <div className="text-xs text-sidebar-foreground/50 capitalize">{session?.user?.role}</div>
          </div>
        </div>
        <button 
          onClick={logout}
          className="flex w-full items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground transition-colors"
        >
          <LogOut className="w-4 h-4 text-sidebar-foreground/50" />
          Выход
        </button>
      </div>
    </aside>
  );
}

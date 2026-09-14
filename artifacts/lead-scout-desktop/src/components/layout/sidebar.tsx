import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/use-auth";
import { 
  Home,
  Search, 
  Target, 
  Settings, 
  LogOut,
  ChevronLeft
} from "lucide-react";

export function Sidebar() {
  const [location] = useLocation();
  const { session, logout } = useAuth();
  
  const navItems = [
    { href: "/", label: "Обзор", icon: Home },
    { href: "/search", label: "Поиск", icon: Search },
    { href: "/leads", label: "Мои лиды", icon: Target },
  ];

  if (session?.user?.role === 'owner') {
    navItems.push({ href: "/admin", label: "Настройки", icon: Settings });
  }

  const getPageTitle = () => {
    if (location === "/") return "Главная";
    if (location.startsWith("/search")) return "Поиск";
    if (location.startsWith("/leads")) return "Лиды";
    if (location.startsWith("/admin")) return "Настройки";
    return "Меню";
  };

  return (
    <aside className="w-56 bg-sidebar text-sidebar-foreground border-r border-sidebar-border flex flex-col h-full shrink-0">
      <div className="p-5 flex items-center justify-between">
        <h2 className="font-bold text-lg tracking-tight text-sidebar-primary flex items-center gap-2">
          {getPageTitle()}
        </h2>
        {location !== "/" && (
          <Link href="/" className="text-muted-foreground hover:text-foreground transition-colors">
            <ChevronLeft className="w-4 h-4" />
          </Link>
        )}
      </div>
      
      <div className="px-3 pb-2">
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
          <input 
            type="text" 
            placeholder="Search..." 
            className="w-full bg-accent/50 border-none rounded-md pl-8 pr-3 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring/50"
            readOnly
          />
        </div>
      </div>

      <nav className="flex-1 px-3 py-2 space-y-0.5 overflow-y-auto">
        {navItems.map((item) => {
          const isActive = location === item.href || (item.href !== "/" && location.startsWith(item.href));
          return (
            <Link key={item.href} href={item.href} className={cn(
              "flex items-center gap-3 px-2.5 py-2 rounded-lg text-[13px] font-medium transition-colors",
              isActive 
                ? "bg-accent/80 text-foreground" 
                : "text-muted-foreground hover:bg-accent/40 hover:text-foreground"
            )}>
              <item.icon className={cn("w-4 h-4", isActive ? "text-foreground" : "text-muted-foreground")} />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="p-4 mt-auto">
        <div className="flex items-center justify-between bg-accent/30 rounded-lg p-2.5 border border-border/40">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-7 h-7 rounded-full bg-accent flex items-center justify-center text-[10px] font-bold text-foreground shrink-0 border border-border/50">
              {session?.user?.name.charAt(0)}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xs font-medium truncate text-foreground leading-tight">{session?.user?.name}</div>
              <div className="text-[10px] text-muted-foreground capitalize leading-tight">{session?.user?.role}</div>
            </div>
          </div>
          <button 
            onClick={logout}
            className="text-muted-foreground hover:text-destructive transition-colors shrink-0 p-1"
            title="Выход"
          >
            <LogOut className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </aside>
  );
}

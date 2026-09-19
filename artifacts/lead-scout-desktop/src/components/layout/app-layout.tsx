import { ReactNode, useEffect, useState } from "react";
import { Link, useLocation } from "wouter";
import { Home, Search, Target, Settings } from "lucide-react";
import { cn } from "@/lib/utils";
import { WindowControls } from "./window-controls";
import realMarkWhite from "@/assets/real-mark-white.svg";
import realMarkBlack from "@/assets/real-mark.svg";

function hexToHsl(hex: string) {
  const value = hex.replace("#", "");
  const red = Number.parseInt(value.slice(0, 2), 16) / 255;
  const green = Number.parseInt(value.slice(2, 4), 16) / 255;
  const blue = Number.parseInt(value.slice(4, 6), 16) / 255;
  const max = Math.max(red, green, blue);
  const min = Math.min(red, green, blue);
  const lightness = (max + min) / 2;
  if (max === min) return `0 0% ${Math.round(lightness * 100)}%`;
  const delta = max - min;
  const saturation = lightness > 0.5 ? delta / (2 - max - min) : delta / (max + min);
  let hue = 0;
  if (max === red) hue = (green - blue) / delta + (green < blue ? 6 : 0);
  else if (max === green) hue = (blue - red) / delta + 2;
  else hue = (red - green) / delta + 4;
  return `${Math.round(hue * 60)} ${Math.round(saturation * 100)}% ${Math.round(lightness * 100)}%`;
}

export function AppLayout({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  const [titleVersion, setTitleVersion] = useState(false);
  const [macButtons, setMacButtons] = useState(true);
  const [theme, setTheme] = useState("dark");
  const [version, setVersion] = useState("");
  const [versionPosition, setVersionPosition] = useState<"left" | "right">("right");
  useEffect(() => {
    const readSettings = () => {
      try {
        const raw = window.localStorage.getItem("real:settings") ?? window.localStorage.getItem("lead-scout:settings");
        const saved = raw ? JSON.parse(raw) : {};
        setTitleVersion(Boolean(saved.titleVersion));
        setMacButtons(saved.macButtons ?? true);
        setTheme(String(saved.theme ?? "dark"));
        setVersionPosition(saved.versionPosition === "left" ? "left" : "right");
        const root = document.documentElement;
        const dataset = root.dataset as DOMStringMap & Record<string, string>;
        const settingsMap: Record<string, string | number | boolean | undefined> = {
          settingsCompact: saved.compact,
          settingsReduceMotion: saved.reduceMotion,
          settingsAccent: saved.accent,
          settingsTheme: saved.theme,
          settingsFont: saved.font,
          settingsIcons: saved.colorfulIcons,
          settingsIconShift: saved.iconColorShift,
          settingsMacButtons: saved.macButtons ?? true,
          settingsTitleVersion: saved.titleVersion,
          settingsVersionPosition: saved.versionPosition,
          settingsToolbarPosition: saved.toolbarPosition,
          settingsNavbarPosition: saved.navbarPosition,
          settingsAnimationStyle: saved.animationStyle,
          settingsAnimations: saved.animations,
          settingsAnimationSpeed: saved.animationSpeed,
          settingsNavStyle: saved.topBarStyle,
          settingsBorderColor: saved.borderColor,
          settingsRainbow: saved.rainbowBorder,
        };
        Object.entries(settingsMap).forEach(([key, value]) => {
          if (value !== undefined) dataset[key] = String(value);
        });
        root.style.setProperty("--settings-radius", String(saved.radius ?? 12));
        root.style.setProperty("--settings-border", String(saved.borderThickness ?? 1));
        root.style.setProperty("--settings-icon-shift", String(saved.iconColorShift ?? 0));
        root.style.setProperty("--settings-animation-speed", String(saved.animationSpeed ?? 1));
        const customTheme = saved.customTheme;
         const customThemeVariables = [
           "--background", "--foreground", "--card", "--card-foreground", "--primary",
           "--primary-foreground", "--accent", "--accent-foreground", "--border", "--input",
           "--card-border", "--muted", "--muted-foreground", "--sidebar", "--sidebar-foreground",
           "--sidebar-border", "--popover", "--popover-foreground", "--popover-border", "--ring",
         ];
        if (saved.theme === "custom" && customTheme) {
          const background = typeof customTheme.background === "string" ? hexToHsl(customTheme.background) : "";
          const foreground = typeof customTheme.foreground === "string" ? hexToHsl(customTheme.foreground) : "";
          const card = typeof customTheme.card === "string" ? hexToHsl(customTheme.card) : "";
          const primary = typeof customTheme.primary === "string" ? hexToHsl(customTheme.primary) : "";
          const accent = typeof customTheme.accent === "string" ? hexToHsl(customTheme.accent) : "";
          const border = typeof customTheme.border === "string" ? hexToHsl(customTheme.border) : "";
          const customVariables = {
            "--background": background, "--foreground": foreground, "--card": card,
            "--card-foreground": foreground, "--primary": primary, "--primary-foreground": background,
            "--accent": accent, "--accent-foreground": foreground, "--border": border,
            "--input": border, "--card-border": border, "--muted": accent,
            "--muted-foreground": foreground, "--sidebar": background,
            "--sidebar-foreground": foreground, "--sidebar-border": border,
            "--popover": card, "--popover-foreground": foreground, "--popover-border": border,
             "--ring": primary,
          };
          Object.entries(customVariables).forEach(([key, value]) => root.style.setProperty(key, value));
          Object.entries(customTheme).forEach(([key, value]) => {
            const variables: Record<string, string> = {
              background: "--background", foreground: "--foreground", card: "--card",
              primary: "--primary", accent: "--accent", border: "--border",
            };
            const variable = variables[key];
            if (variable && typeof value === "string") root.style.setProperty(variable, hexToHsl(value));
          });
        } else {
          customThemeVariables.forEach((key) => root.style.removeProperty(key));
        }
      } catch {
        setTitleVersion(false);
        setMacButtons(true);
      }
    };
    readSettings();
    const handler = () => readSettings();
    window.addEventListener("real:settings-changed", handler);
    window.realDesktop?.getAppInfo().then((info) => setVersion(info.version)).catch(() => undefined);
    return () => window.removeEventListener("real:settings-changed", handler);
  }, []);
  
  const navItems = [
    { href: "/", label: "Overview", icon: Home },
    { href: "/search", label: "Search", icon: Search },
    { href: "/leads", label: "Clients", icon: Target },
    { href: "/admin", label: "Settings", icon: Settings },
  ];
   const isSettingsPage = location === "/admin";

  return (
    <div className="real-app-frame flex flex-col h-full w-full bg-background text-foreground overflow-hidden rounded-[24px] border border-border/40 select-none shadow-2xl relative" style={{ borderRadius: "calc(var(--settings-radius, 12) * 1px)", borderWidth: "calc(var(--settings-border, 1) * 1px)" }}>
      {/* Top Titlebar / Navbar */}
      <header 
        className="h-14 flex items-center justify-between px-4 shrink-0 bg-background/80 backdrop-blur-md z-50 relative"
        style={{ WebkitAppRegion: "drag" } as React.CSSProperties}
      >
         <div className="flex shrink-0 items-center" style={{ WebkitAppRegion: "drag" } as React.CSSProperties}>
           {macButtons ? <WindowControls /> : (
            <div className="flex items-center gap-2">
              {titleVersion && versionPosition === "left" && <span className="text-[10px] font-semibold tracking-wide text-muted-foreground">v{version || "1.0.0"}</span>}
               <img src={realMarkWhite} alt="Real" className="h-6 w-6 object-contain" />
              {titleVersion && versionPosition === "right" && <span className="text-[10px] font-semibold tracking-wide text-muted-foreground">v{version || "1.0.0"}</span>}
            </div>
          )}
        </div>
        
        {/* Navigation - Centered */}
        <div className="min-w-4 flex-1 self-stretch" style={{ WebkitAppRegion: "drag" } as React.CSSProperties} />
        <nav className="flex h-full shrink-0 items-center gap-1" style={{ WebkitAppRegion: "no-drag" } as React.CSSProperties}>
          {navItems.map((item) => {
            const isActive = location === item.href || (item.href !== "/" && location.startsWith(item.href));
            return (
              <Link key={item.href} href={item.href} className="relative h-9 flex items-center justify-center px-4 cursor-pointer">
                <div className={cn(
                  "flex items-center gap-1.5 text-xs font-semibold transition-colors duration-200",
                  isActive ? "text-primary" : "text-muted-foreground"
                )}>
                  <item.icon className="w-3.5 h-3.5" />
                  <span>{item.label}</span>
                </div>
                {isActive && (
                  <div className="absolute -bottom-[2px] left-1/2 -translate-x-1/2 w-[calc(100%_-_36px)] h-[3px] bg-primary rounded-full" />
                )}
              </Link>
            );
          })}
        </nav>
        
         <div className="min-w-4 flex-1 self-stretch" style={{ WebkitAppRegion: "drag" } as React.CSSProperties} />
         <div className="flex shrink-0 items-center justify-end gap-3" style={{ WebkitAppRegion: "drag" } as React.CSSProperties}>
          {macButtons ? (
            <div className="flex items-center gap-2">
              {titleVersion && versionPosition === "left" && <span className="text-[10px] font-semibold tracking-wide text-muted-foreground">v{version || "1.0.0"}</span>}
              <img src={theme === "light" ? realMarkBlack : realMarkWhite} alt="Логотип Real" className="h-6 w-6 object-contain" />
              {titleVersion && versionPosition === "right" && <span className="text-[10px] font-semibold tracking-wide text-muted-foreground">v{version || "1.0.0"}</span>}
            </div>
          ) : (
            <WindowControls variant="windows" />
          )}
        </div>
      </header>

      {/* Main Content Area */}
       <main className={cn("relative flex-1 bg-background/50 rounded-b-2xl", isSettingsPage ? "overflow-hidden" : "overflow-y-auto")}>
         <div className={cn("mx-auto w-full", isSettingsPage ? "h-full min-h-0 px-4 py-5 sm:px-6 sm:py-6" : "min-h-full px-4 py-5 pb-20 sm:px-6 sm:py-6")}>
          {children}
        </div>
      </main>
    </div>
  );
}

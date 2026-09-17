import { useEffect, useMemo, useRef, useState, type ChangeEvent, type ReactNode } from "react";
import {
  Bell,
  Check,
  CircleHelp,
  Download,
  Eye,
  ImagePlus,
  Info,
  KeyRound,
  Laptop,
  LogOut,
  MonitorCog,
  Palette,
  RotateCcw,
  Search,
  Settings2,
  Shield,
  SlidersHorizontal,
  Sparkles,
  Trash2,
  User as UserIcon,
  Users,
  X,
  Palette as PaletteIcon,
  Volume2,
  LayoutPanelTop,
  Play,
} from "lucide-react";
import { getListUsersQueryKey, useListUsers } from "@workspace/api-client-react";
import { AppLayout } from "@/components/layout/app-layout";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import realMarkWhite from "@/assets/real-mark-white.svg";
import realMarkBlack from "@/assets/real-mark.svg";

type SettingsSection = "profile" | "appearance" | "window" | "workspace" | "about";

type Preferences = {
  compact: boolean;
  reduceMotion: boolean;
  showUpdates: boolean;
  accent: "signal" | "slate" | "copper";
  theme: string;
  font: string;
  colorfulIcons: boolean;
  iconColorShift: number;
  macButtons: boolean;
  titleVersion: boolean;
  versionPosition: "left" | "right";
  radius: number;
  borderThickness: number;
  borderColor: string;
  rainbowBorder: boolean;
  animations: boolean;
  animationSpeed: number;
  animationStyle: "smooth" | "spring" | "snappy" | "slide" | "minimal";
  buttonSound: string;
  topBarStyle: "icons" | "labels";
  startupTab: string;
  toolbarPosition: "top" | "bottom";
  navbarPosition: "top" | "bottom";
  customTheme: CustomTheme;
};

type CustomTheme = {
  background: string;
  foreground: string;
  card: string;
  primary: string;
  accent: string;
  border: string;
};

const defaultCustomTheme: CustomTheme = {
  background: "#17191b",
  foreground: "#f3f0ea",
  card: "#202326",
  primary: "#e9b872",
  accent: "#30353a",
  border: "#42484e",
};

const defaultPreferences: Preferences = {
  compact: false,
  reduceMotion: false,
  showUpdates: true,
  accent: "signal",
  theme: "dark",
  font: "bricolage",
  colorfulIcons: false,
  iconColorShift: 0,
  macButtons: true,
  titleVersion: false,
  versionPosition: "right",
  radius: 12,
  borderThickness: 1,
  borderColor: "default",
  rainbowBorder: false,
  animations: true,
  animationSpeed: 1,
  animationStyle: "smooth",
  buttonSound: "off",
  topBarStyle: "labels",
  startupTab: "overview",
  toolbarPosition: "top",
  navbarPosition: "top",
  customTheme: defaultCustomTheme,
};

const sections: Array<{
  id: SettingsSection;
  label: string;
  description: string;
  icon: typeof UserIcon;
}> = [
  { id: "profile", label: "Profile", description: "Данные и доступ к аккаунту", icon: UserIcon },
  { id: "appearance", label: "Appearance", description: "Тема и плотность интерфейса", icon: Palette },
  { id: "window", label: "Window", description: "Запуск и поведение окна", icon: MonitorCog },
  { id: "workspace", label: "Workspace", description: "Доступ владельца и управление", icon: Users },
  { id: "about", label: "About", description: "Версия и поддержка", icon: Info },
];

function readPreferences(): Preferences {
  try {
    const saved = window.localStorage.getItem("real:settings") ?? window.localStorage.getItem("lead-scout:settings");
    if (!saved) return defaultPreferences;
    const parsed = JSON.parse(saved) as Partial<Preferences>;
    return { ...defaultPreferences, ...parsed, customTheme: { ...defaultCustomTheme, ...(parsed.customTheme ?? {}) } };
  } catch {
    return defaultPreferences;
  }
}

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

function avatarKey(login?: string) {
  return login ? `real:avatar:${login.toLowerCase()}` : "";
}

function SettingRow({
  icon: Icon,
  title,
  description,
  children,
  className,
}: {
  icon?: typeof Bell;
  title: string;
  description: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("setting-row flex items-center justify-between gap-8 border-b border-border/60 py-4 last:border-b-0", className)}>
      <div className="flex min-w-0 items-start gap-3">
        {Icon && (
          <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-border/70 bg-background text-muted-foreground">
            <Icon className="h-3.5 w-3.5" />
           </div>
         )}
        <div className="min-w-0">
          <p className="text-[13px] font-semibold text-foreground">{title}</p>
          <p className="mt-0.5 max-w-[520px] text-xs leading-5 text-muted-foreground">{description}</p>
        </div>
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}

function SectionHeader({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description: string;
}) {
  return (
    <div className="border-b border-border/70 pb-5">
      <div className="mb-2 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.18em] text-primary">
        <span className="h-1.5 w-1.5 rounded-full bg-primary" />
        {eyebrow}
      </div>
      <h2 className="text-xl font-semibold tracking-tight text-foreground">{title}</h2>
      <p className="mt-1.5 max-w-2xl text-sm leading-6 text-muted-foreground">{description}</p>
    </div>
  );
}

export function AdminPage() {
  const { session, logout } = useAuth();
  const isOwner = session?.user?.role === "owner";
  const login = session?.user?.login;
  const userName = session?.user?.name ?? "Real user";
  const initials = userName
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const [activeSection, setActiveSection] = useState<SettingsSection>("profile");
  const [navQuery, setNavQuery] = useState("");
  const [preferences, setPreferences] = useState<Preferences>(defaultPreferences);
  const [avatar, setAvatar] = useState<string | null>(null);
  const [profileNote, setProfileNote] = useState("");
  const [appInfo, setAppInfo] = useState({
    version: "1.0.0",
    platform: "Web preview",
    arch: "—",
    electronVersion: "—",
    packaged: false,
    updateConfigured: false,
  });
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const { data: users, isLoading: usersLoading } = useListUsers({
    query: { enabled: isOwner, queryKey: getListUsersQueryKey() },
  });
  useEffect(() => {
    setPreferences(readPreferences());
    window.realDesktop?.getAppInfo().then(setAppInfo).catch(() => undefined);
    if (login) {
      setAvatar(window.localStorage.getItem(avatarKey(login)));
      try {
        const savedNote = window.localStorage.getItem(`real:profile-note:${login.toLowerCase()}`) ?? window.localStorage.getItem(`lead-scout:profile-note:${login.toLowerCase()}`);
        setProfileNote(savedNote ?? "");
      } catch {
        setProfileNote("");
      }
    }
  }, [login]);

  useEffect(() => {
    document.documentElement.dataset.settingsCompact = String(preferences.compact);
    document.documentElement.dataset.settingsReduceMotion = String(preferences.reduceMotion);
    document.documentElement.dataset.settingsAccent = preferences.accent;
    document.documentElement.dataset.settingsTheme = preferences.theme;
    document.documentElement.dataset.settingsFont = preferences.font;
    document.documentElement.dataset.settingsIcons = String(preferences.colorfulIcons);
    document.documentElement.dataset.settingsIconShift = String(preferences.iconColorShift);
    document.documentElement.dataset.settingsMacButtons = String(preferences.macButtons);
    document.documentElement.dataset.settingsTitleVersion = String(preferences.titleVersion);
    document.documentElement.dataset.settingsVersionPosition = preferences.versionPosition;
    document.documentElement.dataset.settingsToolbarPosition = preferences.toolbarPosition;
    document.documentElement.dataset.settingsNavbarPosition = preferences.navbarPosition;
    document.documentElement.dataset.settingsAnimationStyle = preferences.animationStyle;
    document.documentElement.dataset.settingsAnimations = String(preferences.animations);
    document.documentElement.dataset.settingsAnimationSpeed = String(preferences.animationSpeed);
    document.documentElement.dataset.settingsNavStyle = preferences.topBarStyle;
    document.documentElement.dataset.settingsBorderColor = preferences.borderColor;
    document.documentElement.dataset.settingsRainbow = String(preferences.rainbowBorder);
    document.documentElement.style.setProperty("--settings-radius", String(preferences.radius));
    document.documentElement.style.setProperty("--settings-border", String(preferences.borderThickness));
    document.documentElement.style.setProperty("--settings-icon-shift", String(preferences.iconColorShift));
    document.documentElement.style.setProperty("--settings-animation-speed", String(preferences.animationSpeed));
    const customProperties: Record<string, string> = {
      "--background": hexToHsl(preferences.customTheme.background),
      "--foreground": hexToHsl(preferences.customTheme.foreground),
      "--card": hexToHsl(preferences.customTheme.card),
      "--card-foreground": hexToHsl(preferences.customTheme.foreground),
      "--primary": hexToHsl(preferences.customTheme.primary),
      "--primary-foreground": hexToHsl(preferences.customTheme.background),
      "--accent": hexToHsl(preferences.customTheme.accent),
      "--accent-foreground": hexToHsl(preferences.customTheme.foreground),
      "--border": hexToHsl(preferences.customTheme.border),
      "--input": hexToHsl(preferences.customTheme.border),
      "--card-border": hexToHsl(preferences.customTheme.border),
      "--muted": hexToHsl(preferences.customTheme.accent),
      "--muted-foreground": hexToHsl(preferences.customTheme.foreground),
      "--sidebar": hexToHsl(preferences.customTheme.background),
      "--sidebar-foreground": hexToHsl(preferences.customTheme.foreground),
      "--sidebar-border": hexToHsl(preferences.customTheme.border),
      "--popover": hexToHsl(preferences.customTheme.card),
      "--popover-foreground": hexToHsl(preferences.customTheme.foreground),
      "--popover-border": hexToHsl(preferences.customTheme.border),
      "--ring": hexToHsl(preferences.customTheme.primary),
    };
    if (preferences.theme === "custom") {
      Object.entries(customProperties).forEach(([key, value]) => document.documentElement.style.setProperty(key, value));
    } else {
      Object.keys(customProperties).forEach((key) => document.documentElement.style.removeProperty(key));
    }
  }, [preferences]);

  const filteredSections = useMemo(() => {
    const query = navQuery.trim().toLowerCase();
    if (!query) return sections;
    return sections.filter((section) =>
      `${section.label} ${section.description}`.toLowerCase().includes(query),
    );
  }, [navQuery]);

  const updatePreference = <K extends keyof Preferences>(key: K, value: Preferences[K]) => {
    setPreferences((current) => {
      const next = { ...current, [key]: value };
      const serialized = JSON.stringify(next);
      window.localStorage.setItem("real:settings", serialized);
      window.localStorage.setItem("lead-scout:settings", serialized);
      window.dispatchEvent(new Event("real:settings-changed"));
      return next;
    });
  };

  const handleAvatarUpload = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !login) return;
    if (!file.type.startsWith("image/")) {
      toast({ title: "Выберите файл изображения" });
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const result = typeof reader.result === "string" ? reader.result : null;
      if (!result) return;
      try {
        window.localStorage.setItem(avatarKey(login), result);
        setAvatar(result);
        toast({ title: "Изображение профиля обновлено" });
      } catch {
        toast({ title: "Изображение слишком большое", description: "Выберите файл размером менее 2 МБ." });
      }
    };
    if (file.size > 2 * 1024 * 1024) {
      toast({ title: "Изображение слишком большое", description: "Выберите файл размером менее 2 МБ." });
      event.target.value = "";
      return;
    }
    reader.readAsDataURL(file);
    event.target.value = "";
  };

  const handleRemoveAvatar = () => {
    if (!login) return;
    window.localStorage.removeItem(avatarKey(login));
    setAvatar(null);
    toast({ title: "Изображение профиля удалено" });
  };

  const resetPreferences = () => {
    setPreferences(defaultPreferences);
    const serialized = JSON.stringify(defaultPreferences);
    window.localStorage.setItem("real:settings", serialized);
    window.localStorage.setItem("lead-scout:settings", serialized);
    if (login) {
      const key = login.toLowerCase();
      window.localStorage.removeItem(`real:profile-note:${key}`);
    }
    setProfileNote("");
    window.dispatchEvent(new Event("real:settings-changed"));
    toast({ title: "Настройки сброшены", description: "Real вернулся к стандартному поведению рабочего пространства." });
  };

  const updateCustomTheme = (key: keyof CustomTheme, value: string) => {
    setPreferences((current) => {
      const next = { ...current, theme: "custom", customTheme: { ...current.customTheme, [key]: value } };
      const serialized = JSON.stringify(next);
      window.localStorage.setItem("real:settings", serialized);
      window.localStorage.setItem("lead-scout:settings", serialized);
      window.dispatchEvent(new Event("real:settings-changed"));
      return next;
    });
  };

  const renderProfile = () => (
    <>
       <SectionHeader
         eyebrow="Аккаунт"
         title="Profile"
         description="Эти данные используются при назначении и ведении лидов в рабочем пространстве."
       />
      <div className="mt-6 rounded-lg border border-border/70 bg-background/50 p-5">
        <div className="flex items-center gap-4">
          <Avatar className="h-16 w-16 rounded-lg border border-primary/30 bg-primary/10">
            {avatar && <AvatarImage src={avatar} alt={`${userName} profile`} />}
            <AvatarFallback className="rounded-lg bg-primary/10 text-lg font-bold text-primary">{initials}</AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-foreground">{userName}</p>
            <p className="mt-1 font-mono text-xs text-muted-foreground">{login ?? "No login available"}</p>
            <div className="mt-2 flex items-center gap-2">
              <Badge variant="outline" className="h-5 border-primary/30 px-2 text-[10px] uppercase tracking-wider text-primary">
                {session?.user?.role ?? "member"}
              </Badge>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <input ref={fileInputRef} type="file" accept="image/*" onChange={handleAvatarUpload} className="hidden" />
             <Button type="button" variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>
              <ImagePlus className="h-3.5 w-3.5" />
               Загрузить
            </Button>
            {avatar && (
              <Button type="button" variant="ghost" size="sm" onClick={handleRemoveAvatar} className="text-muted-foreground hover:text-destructive">
                <Trash2 className="h-3.5 w-3.5" />
                 Удалить
              </Button>
            )}
          </div>
        </div>
      </div>
      <div className="mt-5 rounded-lg border border-border/70 px-5">
          <SettingRow icon={KeyRound} title="Логин" description="Управляется вашей учётной записью Real. Обратитесь к владельцу, чтобы изменить доступ.">
           <span className="font-mono text-xs text-muted-foreground">{login ?? "—"}</span>
        </SettingRow>
         <SettingRow icon={Shield} title="Уровень доступа" description="Текущие права в рабочем пространстве определяются ролью вашей учётной записи.">
          <Badge variant="secondary" className="text-[10px] uppercase tracking-wider">{session?.user?.role ?? "member"}</Badge>
        </SettingRow>
         <SettingRow icon={Bell} title="Заметка профиля" description="Личное напоминание, сохранённое только в этом профиле на устройстве.">
           <Input value={profileNote} onChange={(event) => {
            const value = event.target.value;
            setProfileNote(value);
             if (login) window.localStorage.setItem(`real:profile-note:${login.toLowerCase()}`, value);
           }} placeholder="Необязательно" className="h-8 w-44 text-xs" />
        </SettingRow>
      </div>
      <div className="mt-7 flex items-center justify-between rounded-lg border border-destructive/25 bg-destructive/5 p-4">
        <div>
           <p className="text-sm font-semibold text-foreground">Завершить сеанс</p>
            <p className="mt-1 text-xs text-muted-foreground">Выйти из Real на этом устройстве.</p>
        </div>
         <Button type="button" variant="outline" onClick={logout} className="border-destructive/30 text-destructive hover:bg-destructive hover:text-destructive-foreground">
           <LogOut className="h-3.5 w-3.5 text-destructive" />
           Выйти
        </Button>
      </div>
    </>
  );

  const renderAppearance = () => (
    <>
       <SectionHeader
         eyebrow="Интерфейс"
         title="Appearance"
         description="Настройте Real под свой рабочий процесс: цвет, шрифт, анимации и параметры окна."
       />
      <div className="mt-6 space-y-5">
          <div className="rounded-lg border border-border/70 p-5">
            <div className="mb-4"><p className="text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">Тема</p><p className="mt-1 text-xs text-muted-foreground">Выберите основную цветовую систему рабочего пространства.</p></div>
           <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {[
              ["dark", "Тёмная", "bg-[#0b0d0d]"], ["blue", "Синяя", "bg-[#6db5e6]"], ["purple", "Фиолетовая", "bg-[#bda4ec]"],
              ["red", "Красная", "bg-[#eb7479]"], ["orange", "Оранжевая", "bg-[#dfae83]"], ["pink", "Розовая", "bg-[#dba5be]"],
              ["sakura", "Сакура", "bg-[#eadfe3]"], ["green", "Зелёная", "bg-[#73d59d]"], ["teal", "Бирюзовая", "bg-[#6cd0ca]"],
              ["cyan", "Циановая", "bg-[#65c6df]"], ["yellow", "Жёлтая", "bg-[#f2cf69]"], ["indigo", "Индиго", "bg-[#9ba7ef]"],
              ["light", "Светлая", "bg-[#f2f1ee]"],
            ].map(([value, label, swatch]) => (
              <button key={value} type="button" onClick={() => updatePreference("theme", value)} className={cn("rounded-md border p-2 text-left transition-colors", preferences.theme === value ? "border-primary bg-primary/10" : "border-border/70 hover:border-primary/50")}>
                <span className="flex h-5 overflow-hidden rounded-sm"><span className={cn("w-1/2", swatch)} /><span className="w-1/4 bg-foreground/50" /><span className="w-1/4 bg-card" /></span>
                <span className="mt-2 flex items-center justify-between text-[11px] font-semibold">{label}{preferences.theme === value && <Check className="h-3.5 w-3.5 text-primary" />}</span>
              </button>
            ))}
             <button type="button" onClick={() => updatePreference("theme", "custom")} className={cn("rounded-md border p-2 text-left transition-colors", preferences.theme === "custom" ? "border-primary bg-primary/10" : "border-border/70 hover:border-primary/50")}>
               <span className="flex h-5 overflow-hidden rounded-sm">
                 <span className="w-1/2" style={{ backgroundColor: preferences.customTheme.primary }} />
                 <span className="w-1/4" style={{ backgroundColor: preferences.customTheme.card }} />
                 <span className="w-1/4" style={{ backgroundColor: preferences.customTheme.accent }} />
               </span>
               <span className="mt-2 flex items-center justify-between text-[11px] font-semibold">Custom{preferences.theme === "custom" && <Check className="h-3.5 w-3.5 text-primary" />}</span>
             </button>
          </div>
           {preferences.theme === "custom" && (
             <div className="mt-4 grid grid-cols-2 gap-3 rounded-md border border-border/60 bg-background/40 p-3 sm:grid-cols-3">
               {([
                 ["background", "Canvas"], ["foreground", "Text"], ["card", "Cards"],
                 ["primary", "Accent"], ["accent", "Muted"], ["border", "Borders"],
               ] as Array<[keyof CustomTheme, string]>).map(([key, label]) => (
                 <label key={key} className="flex items-center justify-between gap-2 text-[10px] font-semibold text-muted-foreground">
                   {label}
                   <input type="color" value={preferences.customTheme[key]} onChange={(event) => updateCustomTheme(key, event.target.value)} className="h-7 w-9 cursor-pointer rounded border border-border bg-transparent p-0.5" aria-label={`${label} color`} />
                 </label>
               ))}
             </div>
           )}
        </div>
        <div className="rounded-lg border border-border/70 px-5">
           <SettingRow icon={PaletteIcon} title="Шрифт" description="Выберите шрифт для подписей, списков и элементов управления.">
            <Select value={preferences.font} onValueChange={(value) => updatePreference("font", value)}><SelectTrigger className="h-8 w-40 text-xs"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="bricolage">Bricolage Grotesque</SelectItem><SelectItem value="dm-sans">DM Sans</SelectItem><SelectItem value="plus-jakarta">Plus Jakarta Sans</SelectItem><SelectItem value="space-mono">Spline Mono</SelectItem><SelectItem value="system">Системный</SelectItem></SelectContent></Select>
          </SettingRow>
           <SettingRow icon={Sparkles} title="Цветные иконки" description="Добавьте иконкам интерфейса выразительную цветовую палитру."><Switch checked={preferences.colorfulIcons} onCheckedChange={(value) => updatePreference("colorfulIcons", value)} /></SettingRow>
           <SettingRow icon={PaletteIcon} title="Сдвиг цвета иконок" description={`Сдвигайте палитру иконок, сохраняя разноцветный вид.`}>
            <div className="flex w-44 items-center gap-3"><Slider value={[preferences.iconColorShift]} min={0} max={360} step={1} onValueChange={([value]) => updatePreference("iconColorShift", value)} /><span className="w-8 text-right font-mono text-[10px] text-muted-foreground">{preferences.iconColorShift}°</span></div>
          </SettingRow>
           <SettingRow icon={SlidersHorizontal} title="Компактное пространство" description="Уменьшите высоту строк и дополнительные отступы в списках лидов."><Switch checked={preferences.compact} onCheckedChange={(value) => updatePreference("compact", value)} /></SettingRow>
        </div>
         <div className="rounded-lg border border-border/70 px-5">
            <SettingRow icon={LayoutPanelTop} title="Навигация" description="Держите навигацию рабочего пространства под рукой.">
             <div className="grid grid-cols-2 gap-2">
                {([["labels", "Подписи", "Overview · Search"], ["icons", "Иконки", "Компактная панель"]] as const).map(([value, label, hint]) => (
                 <button key={value} type="button" onClick={() => updatePreference("topBarStyle", value)} className={cn("min-w-[92px] rounded-md border px-2.5 py-2 text-left transition-colors", preferences.topBarStyle === value ? "border-primary bg-primary/10 text-foreground" : "border-border/70 text-muted-foreground hover:border-primary/50")}>
                   <span className="block text-[10px] font-bold">{label}</span>
                   <span className="mt-1 block truncate text-[9px] opacity-70">{hint}</span>
                 </button>
               ))}
             </div>
           </SettingRow>
            <SettingRow icon={Play} title="Стартовая вкладка" description="Выберите раздел, который открывается при запуске Real.">
             <Select value={preferences.startupTab} onValueChange={(value) => updatePreference("startupTab", value)}><SelectTrigger className="h-8 w-32 text-xs"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="overview">Overview</SelectItem><SelectItem value="search">Search</SelectItem><SelectItem value="leads">Clients</SelectItem><SelectItem value="admin">Settings</SelectItem></SelectContent></Select>
           </SettingRow>
            <SettingRow icon={SlidersHorizontal} title="Положение панели" description="Выберите расположение элементов управления действиями.">
              <Select value={preferences.toolbarPosition} onValueChange={(value) => updatePreference("toolbarPosition", value as Preferences["toolbarPosition"])}><SelectTrigger className="h-8 w-32 text-xs"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="top">Сверху</SelectItem><SelectItem value="bottom">Снизу</SelectItem></SelectContent></Select>
           </SettingRow>
            <SettingRow icon={LayoutPanelTop} title="Положение навигации" description="Выберите расположение основных вкладок навигации.">
              <Select value={preferences.navbarPosition} onValueChange={(value) => updatePreference("navbarPosition", value as Preferences["navbarPosition"])}><SelectTrigger className="h-8 w-32 text-xs"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="top">Сверху</SelectItem><SelectItem value="bottom">Снизу</SelectItem></SelectContent></Select>
           </SettingRow>
         </div>
        <div className="rounded-lg border border-border/70 px-5">
           <SettingRow icon={Laptop} title="Расположение кнопок macOS" description="Используйте привычные элементы управления окном слева."><Switch checked={preferences.macButtons} onCheckedChange={(value) => updatePreference("macButtons", value)} /></SettingRow>
           <SettingRow icon={Eye} title="Версия приложения в заголовке" description="Показывать установленную версию Real рядом с названием приложения."><Switch checked={preferences.titleVersion} onCheckedChange={(value) => updatePreference("titleVersion", value)} /></SettingRow>
           {preferences.titleVersion && <SettingRow icon={Eye} title="Положение версии" description="Показывать версию слева или справа от значка Real."><Select value={preferences.versionPosition} onValueChange={(value) => updatePreference("versionPosition", value as Preferences["versionPosition"])}><SelectTrigger className="h-8 w-32 text-xs"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="left">Слева</SelectItem><SelectItem value="right">Справа</SelectItem></SelectContent></Select></SettingRow>}
           <SettingRow icon={MonitorCog} title="Радиус углов окна" description={`${preferences.radius}px скругления рамки приложения.`}><div className="flex w-44 items-center gap-3"><Slider value={[preferences.radius]} min={0} max={24} step={1} onValueChange={([value]) => updatePreference("radius", value)} /><span className="w-8 text-right font-mono text-[10px] text-muted-foreground">{preferences.radius}</span></div></SettingRow>
           <SettingRow icon={SlidersHorizontal} title="Толщина рамки окна" description={`${preferences.borderThickness}px толщины контура.`}><div className="flex w-44 items-center gap-3"><Slider value={[preferences.borderThickness]} min={0} max={3} step={0.5} onValueChange={([value]) => updatePreference("borderThickness", value)} /><span className="w-8 text-right font-mono text-[10px] text-muted-foreground">{preferences.borderThickness}</span></div></SettingRow>
           <SettingRow icon={PaletteIcon} title="Цвет рамки окна" description="Переопределите цвет рамки темы."><Select value={preferences.borderColor} onValueChange={(value) => updatePreference("borderColor", value)}><SelectTrigger className="h-8 w-32 text-xs"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="default">По умолчанию темы</SelectItem><SelectItem value="red">Красный</SelectItem><SelectItem value="blue">Синий</SelectItem><SelectItem value="green">Зелёный</SelectItem><SelectItem value="gold">Золотой</SelectItem></SelectContent></Select></SettingRow>
           <SettingRow icon={Sparkles} title="Радужная рамка" description="Анимировать контур приложения всеми цветами спектра."><Switch checked={preferences.rainbowBorder} onCheckedChange={(value) => updatePreference("rainbowBorder", value)} /></SettingRow>
        </div>
        <div className="rounded-lg border border-border/70 px-5">
           <SettingRow icon={Sparkles} title="Анимации" description="Включите или отключите движение интерфейса во всём приложении."><Switch checked={preferences.animations} onCheckedChange={(value) => updatePreference("animations", value)} /></SettingRow>
           <SettingRow icon={SlidersHorizontal} title="Скорость анимации" description={`${preferences.animationSpeed.toFixed(1)}× скорости переходов.`}><div className="flex w-44 items-center gap-3"><Slider value={[preferences.animationSpeed]} min={0.5} max={2} step={0.1} onValueChange={([value]) => updatePreference("animationSpeed", value)} /><span className="w-8 text-right font-mono text-[10px] text-muted-foreground">{preferences.animationSpeed.toFixed(1)}×</span></div></SettingRow>
            <SettingRow icon={Play} title="Стиль анимации" description="Выберите характер переходов.">
              <Select value={preferences.animationStyle} onValueChange={(value) => updatePreference("animationStyle", value as Preferences["animationStyle"])}>
                <SelectTrigger className="h-8 w-36 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="smooth">Плавный</SelectItem>
                  <SelectItem value="spring">Пружина</SelectItem>
                  <SelectItem value="slide">Сдвиг</SelectItem>
                  <SelectItem value="snappy">Быстрый</SelectItem>
                  <SelectItem value="minimal">Минимальный</SelectItem>
                </SelectContent>
              </Select>
            </SettingRow>
           <SettingRow icon={Volume2} title="Звук кнопок" description="Проигрывать короткий звук при нажатии кнопки."><Select value={preferences.buttonSound} onValueChange={(value) => updatePreference("buttonSound", value)}><SelectTrigger className="h-8 w-32 text-xs"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="off">Выкл.</SelectItem><SelectItem value="tap">Щелчок</SelectItem><SelectItem value="soft">Мягкий щелчок</SelectItem><SelectItem value="pop">Короткий звук</SelectItem></SelectContent></Select></SettingRow>
        </div>
      </div>
    </>
  );

  const renderWindow = () => (
    <>
        <SectionHeader eyebrow="Оболочка приложения" title="Window" description="Настройте поведение Real при открытии и возвращении в приложение." />
      <div className="mt-6 rounded-lg border border-border/70 px-5">
         <SettingRow icon={Laptop} title="Системная рамка приложения" description="Real использует окно без стандартной рамки с элементами управления в верхней панели.">
           <span className="text-xs font-semibold text-emerald-400">Включено</span>
        </SettingRow>
         <SettingRow icon={MonitorCog} title="Минимальный размер окна" description="Минимальный поддерживаемый размер рабочего пространства приложения.">
          <span className="font-mono text-xs text-muted-foreground">860 × 560</span>
        </SettingRow>
         <SettingRow icon={RotateCcw} title="Сбросить локальные настройки" description="Очистить настройки внешнего вида, поиска и заметки профиля на этом устройстве.">
           <Button data-testid="button-reset-preferences" type="button" variant="outline" size="sm" onClick={resetPreferences}>Сбросить настройки</Button>
        </SettingRow>
      </div>
      <div className="mt-6 rounded-lg border border-border/70 bg-background/40 p-4">
        <div className="flex items-start gap-3">
          <CircleHelp className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
           <p className="text-xs leading-5 text-muted-foreground">Настройки окна хранятся только в этой установке и не меняют учётную запись или права доступа.</p>
        </div>
      </div>
    </>
  );

  const renderWorkspace = () => (
    <>
       <SectionHeader eyebrow="Управление владельцем" title="Workspace" description="Просмотрите учётную запись владельца, которая управляет этим рабочим пространством." />
      {!isOwner ? (
        <div className="mt-6 flex items-start gap-3 rounded-lg border border-border/70 bg-background/40 p-5">
          <Shield className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
          <div>
             <p className="text-sm font-semibold text-foreground">Нужен доступ владельца</p>
             <p className="mt-1 text-xs leading-5 text-muted-foreground">Доступ команды управляется владельцем рабочего пространства.</p>
          </div>
        </div>
      ) : (
        <div className="mt-6 space-y-6">
          <div className="rounded-lg border border-border/70 p-5">
             <div className="mb-4">
              <div>
                 <p className="text-sm font-semibold text-foreground">Участники команды</p>
                  <p className="mt-1 text-xs text-muted-foreground">Управление владельцем и доступом к рабочему пространству.</p>
              </div>
            </div>
            {usersLoading ? (
              <div className="space-y-2">
               <div className="h-12 animate-pulse rounded-md bg-muted/50" />
              </div>
             ) : users?.filter((user) => user.role === "owner").length ? (
              <div className="space-y-2">
                 {users.filter((user) => user.role === "owner").map((user) => (
                  <div key={user.id} className="flex items-center justify-between rounded-md border border-border/60 bg-background/50 px-3 py-2.5">
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-primary/10 text-[11px] font-bold text-primary">{user.name.charAt(0).toUpperCase()}</div>
                      <div className="min-w-0">
                        <p className="truncate text-xs font-semibold text-foreground">{user.name}</p>
                        <p className="truncate font-mono text-[10px] text-muted-foreground">{user.login}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge variant="secondary" className="text-[9px] uppercase tracking-wider">{user.role}</Badge>
                      <span className={cn("h-1.5 w-1.5 rounded-full", user.active ? "bg-emerald-400" : "bg-muted-foreground")} title={user.active ? "Active" : "Inactive"} />
                    </div>
                  </div>
                ))}
              </div>
              ) : <p className="rounded-md border border-dashed border-border p-4 text-xs text-muted-foreground">Учётная запись владельца не найдена.</p>}
          </div>
        </div>
      )}
    </>
  );

  const renderAbout = () => (
    <>
       <SectionHeader eyebrow="Система" title="О Real" description="Сфокусированное рабочее пространство для поиска, оценки и продвижения подходящих лидов." />
      <div className="mt-6 overflow-hidden rounded-lg border border-border/70">
        <div className="flex items-center gap-4 border-b border-border/70 bg-background/50 p-5">
            <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-transparent"><img src={preferences.theme === "light" ? realMarkBlack : realMarkWhite} alt="Real app mark" className="h-full w-full object-contain" /></div>
            <div className="flex-1"><p className="text-sm font-semibold text-foreground">Real</p><p className="mt-1 text-xs text-muted-foreground">Версия для компьютера</p></div>
           <Badge variant="outline" className="font-mono text-[10px]">v{appInfo.version}</Badge>
        </div>
        <div className="px-5">
            <SettingRow icon={Info} title="Канал сборки" description="Текущая стабильная сборка приложения для вашего рабочего пространства."><span className="font-mono text-xs text-muted-foreground">{appInfo.packaged ? "стабильный" : "разработка"}</span></SettingRow>
             <SettingRow icon={Laptop} title="Среда выполнения" description="Платформа и архитектура процессора для этой сборки Real."><span className="font-mono text-xs text-muted-foreground">{appInfo.platform} · {appInfo.arch}</span></SettingRow>
            <SettingRow icon={Settings2} title="Движок приложения" description="Среда Electron, используемая установленной сборкой."><span className="font-mono text-xs text-muted-foreground">{appInfo.electronVersion}</span></SettingRow>
            <SettingRow icon={Download} title="Обновления" description="Настроен ли канал выпуска для этой установки."><span className={cn("text-xs font-semibold", appInfo.updateConfigured ? "text-emerald-400" : "text-muted-foreground")}>{appInfo.updateConfigured ? "Настроены" : "Не настроены"}</span></SettingRow>
            <SettingRow icon={CircleHelp} title="Поддержка пространства" description="Обратитесь к владельцу рабочего пространства по вопросам доступа и настройки."><span className="text-xs text-muted-foreground">Связаться с владельцем</span></SettingRow>
        </div>
      </div>
      <div className="mt-6 flex items-center justify-between rounded-lg border border-border/70 bg-background/40 p-4">
        <div><p className="text-sm font-semibold text-foreground">Восстановить локальные настройки</p><p className="mt-1 text-xs text-muted-foreground">Сбросить внешний вид, окно и поведение поиска на этом устройстве.</p></div>
        <Button type="button" variant="outline" size="sm" onClick={resetPreferences}><RotateCcw className="h-3.5 w-3.5" />Сбросить настройки</Button>
      </div>
    </>
  );

  const content = {
    profile: renderProfile,
    appearance: renderAppearance,
    window: renderWindow,
    workspace: renderWorkspace,
    about: renderAbout,
  }[activeSection]();

  return (
    <AppLayout>
       <div className="settings-workspace flex h-full min-h-0 flex-col">
        <div className="mb-6 flex items-end justify-between border-b border-border/70 pb-5">
          <div>
            <p className="mb-2 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.2em] text-primary"><Settings2 className="h-3.5 w-3.5" />Настройка рабочего пространства</p>
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">Settings</h1>
            <p className="mt-1 text-sm text-muted-foreground">Настройте рабочее пространство Real.</p>
          </div>
        </div>
         <div className="grid min-h-0 flex-1 grid-cols-1 overflow-hidden rounded-lg border border-border/70 bg-card/40 md:grid-cols-[220px_minmax(0,1fr)]">
           <aside className="min-h-0 overflow-y-auto border-b border-border/70 bg-background/40 p-3 md:border-b-0 md:border-r">
            <div className="relative mb-4">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
               <Input data-testid="input-filter-settings" value={navQuery} onChange={(event) => setNavQuery(event.target.value)} placeholder="Фильтр настроек" className="h-8 border-border/70 bg-card pl-8 text-xs" />
               {navQuery && <button type="button" onClick={() => setNavQuery("")} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground" aria-label="Очистить фильтр настроек"><X className="h-3.5 w-3.5" /></button>}
            </div>
            <nav className="space-y-1">
              {filteredSections.map((section) => {
                const Icon = section.icon;
                const isActive = activeSection === section.id;
                return (
                   <button data-testid={`button-settings-section-${section.id}`} key={section.id} type="button" onClick={() => setActiveSection(section.id)} className={cn("group flex w-full items-start gap-2.5 rounded-md px-2.5 py-2.5 text-left transition-colors", isActive ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-accent hover:text-foreground")}>
                    <Icon className={cn("mt-0.5 h-4 w-4 shrink-0", isActive ? "text-primary" : "text-muted-foreground")} />
                    <span className="min-w-0"><span className="block text-xs font-semibold">{section.label}</span><span className={cn("mt-0.5 block truncate text-[10px]", isActive ? "text-primary/70" : "text-muted-foreground/70")}>{section.description}</span></span>
                  </button>
                );
              })}
               {!filteredSections.length && <div className="px-2 py-5 text-center text-[11px] text-muted-foreground">Подходящих настроек нет</div>}
            </nav>
            <div className="mt-8 border-t border-border/60 pt-4">
               <p className="px-2 text-[9px] font-bold uppercase tracking-[0.18em] text-muted-foreground">Сеанс</p>
              <div className="mt-3 flex items-center gap-2 px-2">
                <Avatar className="h-7 w-7 rounded-md"><AvatarImage src={avatar ?? undefined} alt="" /><AvatarFallback className="rounded-md bg-muted text-[10px] font-bold">{initials}</AvatarFallback></Avatar>
                <div className="min-w-0"><p className="truncate text-[11px] font-semibold text-foreground">{userName}</p><p className="truncate font-mono text-[9px] text-muted-foreground">{session?.user?.role ?? "member"}</p></div>
              </div>
            </div>
          </aside>
           <section data-testid="settings-content" className="min-h-0 min-w-0 overflow-y-auto bg-card/20 p-6 md:p-8">
            <div className="mx-auto max-w-3xl">{content}</div>
          </section>
        </div>
      </div>
    </AppLayout>
  );
}
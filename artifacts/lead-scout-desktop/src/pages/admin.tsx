import { useEffect, useMemo, useRef, useState, type ChangeEvent, type FormEvent, type ReactNode } from "react";
import {
  Bell,
  Check,
  CircleHelp,
  Download,
  Eye,
  FileSearch,
  ImagePlus,
  Info,
  KeyRound,
  Laptop,
  LogOut,
  Map,
  MonitorCog,
  Palette,
  Plus,
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
} from "lucide-react";
import {
  getListCountriesQueryKey,
  getListUsersQueryKey,
  useCreateCountry,
  useListCountries,
  useListUsers,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { AppLayout } from "@/components/layout/app-layout";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

type SettingsSection = "profile" | "appearance" | "window" | "search" | "workspace" | "about";

type Preferences = {
  compact: boolean;
  reduceMotion: boolean;
  showUpdates: boolean;
  accent: "signal" | "slate" | "copper";
};

const defaultPreferences: Preferences = {
  compact: false,
  reduceMotion: false,
  showUpdates: true,
  accent: "signal",
};

const sections: Array<{
  id: SettingsSection;
  label: string;
  description: string;
  icon: typeof UserIcon;
}> = [
  { id: "profile", label: "Profile", description: "Identity and account access", icon: UserIcon },
  { id: "appearance", label: "Appearance", description: "Theme and interface density", icon: Palette },
  { id: "window", label: "Window", description: "Startup and window behavior", icon: MonitorCog },
  { id: "search", label: "Search", description: "Lead discovery defaults", icon: FileSearch },
  { id: "workspace", label: "Workspace", description: "Team and search geography", icon: Users },
  { id: "about", label: "About", description: "Version and support", icon: Info },
];

function readPreferences(): Preferences {
  try {
    const saved = window.localStorage.getItem("lead-scout:settings");
    return saved ? { ...defaultPreferences, ...JSON.parse(saved) } : defaultPreferences;
  } catch {
    return defaultPreferences;
  }
}

function avatarKey(login?: string) {
  return login ? `lead-scout:avatar:${login.toLowerCase()}` : "";
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
  const userName = session?.user?.name ?? "Lead Scout user";
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
  const [searchCity, setSearchCity] = useState("");
  const [searchIndustry, setSearchIndustry] = useState("");
  const [newCode, setNewCode] = useState("");
  const [newName, setNewName] = useState("");
  const [appInfo, setAppInfo] = useState({
    version: "1.0.0",
    platform: "Web preview",
    arch: "—",
    electronVersion: "—",
    packaged: false,
    updateConfigured: false,
  });
  const fileInputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: users, isLoading: usersLoading } = useListUsers({
    query: { enabled: isOwner, queryKey: getListUsersQueryKey() },
  });
  const { data: countries, isLoading: countriesLoading } = useListCountries({
    query: { enabled: isOwner, queryKey: getListCountriesQueryKey() },
  });
  const createCountry = useCreateCountry();

  useEffect(() => {
    setPreferences(readPreferences());
    window.realDesktop?.getAppInfo().then(setAppInfo).catch(() => undefined);
    if (login) {
      setAvatar(window.localStorage.getItem(avatarKey(login)));
      try {
        const savedSearch = window.localStorage.getItem(`lead-scout:search-defaults:${login.toLowerCase()}`);
        const savedNote = window.localStorage.getItem(`lead-scout:profile-note:${login.toLowerCase()}`);
        if (savedSearch) {
          const parsed = JSON.parse(savedSearch) as { city?: string; industry?: string };
          setSearchCity(parsed.city ?? "");
          setSearchIndustry(parsed.industry ?? "");
        } else {
          setSearchCity("");
          setSearchIndustry("");
        }
        setProfileNote(savedNote ?? "");
      } catch {
        setSearchCity("");
        setSearchIndustry("");
        setProfileNote("");
      }
    }
  }, [login]);

  useEffect(() => {
    document.documentElement.dataset.settingsCompact = String(preferences.compact);
    document.documentElement.dataset.settingsReduceMotion = String(preferences.reduceMotion);
    document.documentElement.dataset.settingsAccent = preferences.accent;
    return () => {
      delete document.documentElement.dataset.settingsCompact;
      delete document.documentElement.dataset.settingsReduceMotion;
      delete document.documentElement.dataset.settingsAccent;
    };
  }, [preferences.compact, preferences.reduceMotion, preferences.accent]);

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
      window.localStorage.setItem("lead-scout:settings", JSON.stringify(next));
      window.dispatchEvent(new Event("lead-scout:settings-changed"));
      return next;
    });
  };

  const handleAvatarUpload = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !login) return;
    if (!file.type.startsWith("image/")) {
      toast({ title: "Choose an image file" });
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const result = typeof reader.result === "string" ? reader.result : null;
      if (!result) return;
      try {
        window.localStorage.setItem(avatarKey(login), result);
        setAvatar(result);
        toast({ title: "Profile image updated" });
      } catch {
        toast({ title: "Image is too large", description: "Choose an image smaller than 2 MB." });
      }
    };
    if (file.size > 2 * 1024 * 1024) {
      toast({ title: "Image is too large", description: "Choose an image smaller than 2 MB." });
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
    toast({ title: "Profile image removed" });
  };

  const handleAddCountry = (event: FormEvent) => {
    event.preventDefault();
    if (!newCode.trim() || !newName.trim() || !isOwner) return;
    createCountry.mutate(
      { data: { code: newCode.trim().toUpperCase(), name: newName.trim() } },
      {
        onSuccess: () => {
          setNewCode("");
          setNewName("");
          queryClient.invalidateQueries({ queryKey: getListCountriesQueryKey() });
          toast({ title: "Country added", description: "The geography list is ready for search." });
        },
        onError: () => toast({ title: "Could not add country", description: "Try again in a moment." }),
      },
    );
  };

  const saveSearchDefaults = (event: FormEvent) => {
    event.preventDefault();
    if (login) {
      window.localStorage.setItem(
        `lead-scout:search-defaults:${login.toLowerCase()}`,
        JSON.stringify({ city: searchCity, industry: searchIndustry }),
      );
    }
    toast({ title: "Search defaults saved" });
  };

  const resetPreferences = () => {
    setPreferences(defaultPreferences);
    window.localStorage.setItem("lead-scout:settings", JSON.stringify(defaultPreferences));
    if (login) {
      const key = login.toLowerCase();
      window.localStorage.removeItem(`lead-scout:search-defaults:${key}`);
      window.localStorage.removeItem(`lead-scout:profile-note:${key}`);
    }
    setSearchCity("");
    setSearchIndustry("");
    setProfileNote("");
    window.dispatchEvent(new Event("lead-scout:settings-changed"));
    toast({ title: "Preferences reset", description: "Lead Scout is back to its default workspace behavior." });
  };

  const renderProfile = () => (
    <>
      <SectionHeader
        eyebrow="Account"
        title="Profile"
        description="Your identity is used when assigning and managing leads in this workspace."
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
              <span className="text-[11px] text-muted-foreground">Local profile image</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <input ref={fileInputRef} type="file" accept="image/*" onChange={handleAvatarUpload} className="hidden" />
            <Button type="button" variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>
              <ImagePlus className="h-3.5 w-3.5" />
              Upload
            </Button>
            {avatar && (
              <Button type="button" variant="ghost" size="sm" onClick={handleRemoveAvatar} className="text-muted-foreground hover:text-destructive">
                <Trash2 className="h-3.5 w-3.5" />
                Remove
              </Button>
            )}
          </div>
        </div>
      </div>
      <div className="mt-5 rounded-lg border border-border/70 px-5">
        <SettingRow icon={KeyRound} title="Login identity" description="Managed by your Lead Scout account. Contact an owner to change access.">
          <span className="font-mono text-xs text-muted-foreground">{login ?? "—"}</span>
        </SettingRow>
        <SettingRow icon={Shield} title="Access level" description="Your current workspace permissions are controlled by your account role.">
          <Badge variant="secondary" className="text-[10px] uppercase tracking-wider">{session?.user?.role ?? "member"}</Badge>
        </SettingRow>
        <SettingRow icon={Bell} title="Profile note" description="A private reminder stored only in this desktop profile.">
          <Input value={profileNote} onChange={(event) => {
            const value = event.target.value;
            setProfileNote(value);
            if (login) window.localStorage.setItem(`lead-scout:profile-note:${login.toLowerCase()}`, value);
          }} placeholder="Optional" className="h-8 w-44 text-xs" />
        </SettingRow>
      </div>
      <div className="mt-7 flex items-center justify-between rounded-lg border border-destructive/25 bg-destructive/5 p-4">
        <div>
          <p className="text-sm font-semibold text-foreground">End this session</p>
          <p className="mt-1 text-xs text-muted-foreground">Sign out of Lead Scout on this device.</p>
        </div>
        <Button type="button" variant="outline" onClick={logout} className="border-destructive/30 text-destructive hover:bg-destructive hover:text-destructive-foreground">
          <LogOut className="h-3.5 w-3.5" />
          Sign out
        </Button>
      </div>
    </>
  );

  const renderAppearance = () => (
    <>
      <SectionHeader
        eyebrow="Interface"
        title="Appearance"
        description="Tune the density and feedback of the workspace for long research sessions."
      />
      <div className="mt-6 rounded-lg border border-border/70 px-5">
        <SettingRow icon={SlidersHorizontal} title="Compact workspace" description="Reduce row height and secondary spacing across lead lists.">
          <Switch checked={preferences.compact} onCheckedChange={(value) => updatePreference("compact", value)} />
        </SettingRow>
        <SettingRow icon={Sparkles} title="Motion" description="Use restrained transitions when moving between workspace areas.">
          <div className="flex items-center gap-3">
            <span className="text-[11px] text-muted-foreground">{preferences.reduceMotion ? "Reduced" : "Standard"}</span>
            <Switch checked={!preferences.reduceMotion} onCheckedChange={(value) => updatePreference("reduceMotion", !value)} />
          </div>
        </SettingRow>
        <SettingRow icon={Eye} title="Update status" description="Show desktop update availability in the title bar.">
          <Switch checked={preferences.showUpdates} onCheckedChange={(value) => updatePreference("showUpdates", value)} />
        </SettingRow>
      </div>
      <div className="mt-6">
        <p className="mb-3 text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">Accent signal</p>
        <div className="grid grid-cols-3 gap-3">
          {(["Signal", "Slate", "Copper"] as const).map((name) => (
            <button
              key={name}
              type="button"
              onClick={() => updatePreference("accent", name.toLowerCase() as Preferences["accent"])}
              className="group flex items-center gap-3 rounded-lg border border-border/70 bg-background/40 p-3 text-left transition-colors hover:border-primary/50"
            >
              <span className={cn("h-5 w-5 rounded-md border border-white/10", name === "Signal" ? "bg-primary" : name === "Slate" ? "bg-slate-400" : "bg-orange-300")} />
              <span className="text-xs font-medium text-foreground">{name}</span>
              {preferences.accent === name.toLowerCase() && <Check className="ml-auto h-3.5 w-3.5 text-primary" />}
            </button>
          ))}
        </div>
      </div>
    </>
  );

  const renderWindow = () => (
    <>
      <SectionHeader eyebrow="Desktop shell" title="Window" description="Control how Lead Scout behaves when you open and return to the desktop app." />
      <div className="mt-6 rounded-lg border border-border/70 px-5">
        <SettingRow icon={Laptop} title="Native desktop frame" description="Real uses a frameless desktop window with application controls in the top bar.">
          <span className="text-xs font-semibold text-emerald-400">Enabled</span>
        </SettingRow>
        <SettingRow icon={MonitorCog} title="Minimum window size" description="The smallest supported workspace size for the desktop application.">
          <span className="font-mono text-xs text-muted-foreground">860 × 560</span>
        </SettingRow>
        <SettingRow icon={RotateCcw} title="Reset local preferences" description="Clear appearance, search defaults, and profile notes stored on this device.">
          <Button type="button" variant="outline" size="sm" onClick={resetPreferences}>Reset preferences</Button>
        </SettingRow>
      </div>
      <div className="mt-6 rounded-lg border border-border/70 bg-background/40 p-4">
        <div className="flex items-start gap-3">
          <CircleHelp className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
          <p className="text-xs leading-5 text-muted-foreground">Window preferences are local to this desktop installation and do not change your account or workspace permissions.</p>
        </div>
      </div>
    </>
  );

  const renderSearch = () => (
    <>
      <SectionHeader eyebrow="Lead discovery" title="Search" description="Set the defaults that make repeated lead discovery faster and more consistent." />
      <form onSubmit={saveSearchDefaults} className="mt-6 rounded-lg border border-border/70 p-5">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="default-city" className="text-xs text-muted-foreground">Default city</Label>
           <Input id="default-city" value={searchCity} onChange={(event) => setSearchCity(event.target.value)} placeholder="например, Красноярск" className="h-9 text-sm" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="default-industry" className="text-xs text-muted-foreground">Default industry</Label>
           <Input id="default-industry" value={searchIndustry} onChange={(event) => setSearchIndustry(event.target.value)} placeholder="например, СТО" className="h-9 text-sm" />
          </div>
        </div>
        <div className="mt-5 flex justify-end">
          <Button type="submit" size="sm"><Check className="h-3.5 w-3.5" />Save defaults</Button>
        </div>
      </form>
    </>
  );

  const renderWorkspace = () => (
    <>
      <SectionHeader eyebrow="Owner controls" title="Workspace" description="Review the people and countries available to your team. Workspace administration is restricted to owners." />
      {!isOwner ? (
        <div className="mt-6 flex items-start gap-3 rounded-lg border border-border/70 bg-background/40 p-5">
          <Shield className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
          <div>
            <p className="text-sm font-semibold text-foreground">Owner access required</p>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">Team membership and search geography are managed by the workspace owner.</p>
          </div>
        </div>
      ) : (
        <div className="mt-6 space-y-6">
          <div className="rounded-lg border border-border/70 p-5">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-foreground">Team members</p>
                <p className="mt-1 text-xs text-muted-foreground">People who can discover and claim leads.</p>
              </div>
              <Badge variant="outline" className="font-mono text-[10px]">{users?.length ?? 0} members</Badge>
            </div>
            {usersLoading ? (
              <div className="space-y-2">
                {[1, 2, 3].map((item) => <div key={item} className="h-12 animate-pulse rounded-md bg-muted/50" />)}
              </div>
            ) : users?.length ? (
              <div className="space-y-2">
                {users.map((user) => (
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
            ) : <p className="rounded-md border border-dashed border-border p-4 text-xs text-muted-foreground">No team members found.</p>}
          </div>
          <div className="rounded-lg border border-border/70 p-5">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <p className="flex items-center gap-2 text-sm font-semibold text-foreground"><Map className="h-4 w-4 text-muted-foreground" />Search geography</p>
                <p className="mt-1 text-xs text-muted-foreground">Countries enabled for lead discovery.</p>
              </div>
              <Badge variant="outline" className="font-mono text-[10px]">{countries?.length ?? 0} countries</Badge>
            </div>
            <form onSubmit={handleAddCountry} className="mb-4 flex gap-2">
              <Input value={newCode} onChange={(event) => setNewCode(event.target.value.toUpperCase())} placeholder="Code" maxLength={2} className="h-8 w-16 text-center font-mono text-xs uppercase" />
              <Input value={newName} onChange={(event) => setNewName(event.target.value)} placeholder="Country name" className="h-8 flex-1 text-xs" />
              <Button type="submit" size="icon" className="h-8 w-8" disabled={createCountry.isPending || !newCode.trim() || !newName.trim()}><Plus className="h-3.5 w-3.5" /></Button>
            </form>
            {countriesLoading ? (
              <div className="space-y-2">{[1, 2].map((item) => <div key={item} className="h-10 animate-pulse rounded-md bg-muted/50" />)}</div>
            ) : countries?.length ? (
              <div className="grid grid-cols-2 gap-2">
                {countries.map((country) => (
                  <div key={country.code} className="flex items-center justify-between rounded-md border border-border/60 bg-background/50 px-3 py-2">
                    <div className="flex items-center gap-2"><span className="rounded bg-muted px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">{country.code}</span><span className="text-xs font-medium text-foreground">{country.name}</span></div>
                    <span className={cn("text-[9px] font-bold uppercase tracking-wider", country.enabled ? "text-emerald-400" : "text-muted-foreground")}>{country.enabled ? "Enabled" : "Disabled"}</span>
                  </div>
                ))}
              </div>
            ) : <p className="rounded-md border border-dashed border-border p-4 text-xs text-muted-foreground">No countries configured.</p>}
          </div>
        </div>
      )}
    </>
  );

  const renderAbout = () => (
    <>
      <SectionHeader eyebrow="System" title="About Lead Scout" description="A focused desktop workspace for finding, qualifying, and moving the right leads forward." />
      <div className="mt-6 overflow-hidden rounded-lg border border-border/70">
        <div className="flex items-center gap-4 border-b border-border/70 bg-background/50 p-5">
          <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-primary text-primary-foreground"><Settings2 className="h-5 w-5" /></div>
          <div className="flex-1"><p className="text-sm font-semibold text-foreground">Real Lead Scout</p><p className="mt-1 text-xs text-muted-foreground">Desktop edition</p></div>
           <Badge variant="outline" className="font-mono text-[10px]">v{appInfo.version}</Badge>
        </div>
        <div className="px-5">
           <SettingRow icon={Info} title="Build channel" description="The current stable desktop build for your workspace."><span className="font-mono text-xs text-muted-foreground">{appInfo.packaged ? "stable" : "development"}</span></SettingRow>
           <SettingRow icon={Laptop} title="Runtime" description="The platform and CPU architecture hosting this Lead Scout build."><span className="font-mono text-xs text-muted-foreground">{appInfo.platform} · {appInfo.arch}</span></SettingRow>
           <SettingRow icon={Settings2} title="Desktop engine" description="Electron runtime used by the installed desktop build."><span className="font-mono text-xs text-muted-foreground">{appInfo.electronVersion}</span></SettingRow>
           <SettingRow icon={Download} title="Updates" description="Whether this installation has a configured release feed."><span className={cn("text-xs font-semibold", appInfo.updateConfigured ? "text-emerald-400" : "text-muted-foreground")}>{appInfo.updateConfigured ? "Configured" : "Not configured"}</span></SettingRow>
           <SettingRow icon={CircleHelp} title="Workspace support" description="Reach out to your workspace owner for access or configuration questions."><span className="text-xs text-muted-foreground">Contact your owner</span></SettingRow>
        </div>
      </div>
      <div className="mt-6 flex items-center justify-between rounded-lg border border-border/70 bg-background/40 p-4">
        <div><p className="text-sm font-semibold text-foreground">Restore local preferences</p><p className="mt-1 text-xs text-muted-foreground">Reset appearance, window, and search behavior on this device.</p></div>
        <Button type="button" variant="outline" size="sm" onClick={resetPreferences}><RotateCcw className="h-3.5 w-3.5" />Reset preferences</Button>
      </div>
    </>
  );

  const content = {
    profile: renderProfile,
    appearance: renderAppearance,
    window: renderWindow,
    search: renderSearch,
    workspace: renderWorkspace,
    about: renderAbout,
  }[activeSection]();

  return (
    <AppLayout>
       <div className="settings-workspace flex min-h-full flex-col">
        <div className="mb-6 flex items-end justify-between border-b border-border/70 pb-5">
          <div>
            <p className="mb-2 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.2em] text-primary"><Settings2 className="h-3.5 w-3.5" />Workspace configuration</p>
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">Settings</h1>
            <p className="mt-1 text-sm text-muted-foreground">Configure your Lead Scout desktop workspace.</p>
          </div>
          <div className="hidden items-center gap-2 rounded-md border border-border/70 bg-background/40 px-3 py-2 text-[10px] font-medium text-muted-foreground md:flex">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
            Local preferences enabled
          </div>
        </div>
        <div className="grid min-h-[640px] flex-1 grid-cols-1 overflow-hidden rounded-lg border border-border/70 bg-card/40 md:grid-cols-[220px_minmax(0,1fr)]">
          <aside className="border-b border-border/70 bg-background/40 p-3 md:border-b-0 md:border-r">
            <div className="relative mb-4">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input value={navQuery} onChange={(event) => setNavQuery(event.target.value)} placeholder="Filter settings" className="h-8 border-border/70 bg-card pl-8 text-xs" />
              {navQuery && <button type="button" onClick={() => setNavQuery("")} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground" aria-label="Clear settings filter"><X className="h-3.5 w-3.5" /></button>}
            </div>
            <nav className="space-y-1">
              {filteredSections.map((section) => {
                const Icon = section.icon;
                const isActive = activeSection === section.id;
                return (
                  <button key={section.id} type="button" onClick={() => setActiveSection(section.id)} className={cn("group flex w-full items-start gap-2.5 rounded-md px-2.5 py-2.5 text-left transition-colors", isActive ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-accent hover:text-foreground")}>
                    <Icon className={cn("mt-0.5 h-4 w-4 shrink-0", isActive ? "text-primary" : "text-muted-foreground")} />
                    <span className="min-w-0"><span className="block text-xs font-semibold">{section.label}</span><span className={cn("mt-0.5 block truncate text-[10px]", isActive ? "text-primary/70" : "text-muted-foreground/70")}>{section.description}</span></span>
                  </button>
                );
              })}
              {!filteredSections.length && <div className="px-2 py-5 text-center text-[11px] text-muted-foreground">No matching settings</div>}
            </nav>
            <div className="mt-8 border-t border-border/60 pt-4">
              <p className="px-2 text-[9px] font-bold uppercase tracking-[0.18em] text-muted-foreground">Session</p>
              <div className="mt-3 flex items-center gap-2 px-2">
                <Avatar className="h-7 w-7 rounded-md"><AvatarImage src={avatar ?? undefined} alt="" /><AvatarFallback className="rounded-md bg-muted text-[10px] font-bold">{initials}</AvatarFallback></Avatar>
                <div className="min-w-0"><p className="truncate text-[11px] font-semibold text-foreground">{userName}</p><p className="truncate font-mono text-[9px] text-muted-foreground">{session?.user?.role ?? "member"}</p></div>
              </div>
            </div>
          </aside>
          <section className="min-w-0 overflow-y-auto bg-card/20 p-6 md:p-8">
            <div className="mx-auto max-w-3xl">{content}</div>
          </section>
        </div>
      </div>
    </AppLayout>
  );
}
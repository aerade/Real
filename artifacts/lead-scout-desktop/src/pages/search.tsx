import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchLeads } from "@workspace/api-client-react";
import { AppLayout } from "@/components/layout/app-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverAnchor, PopoverContent } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Search as SearchIcon, AlertTriangle, Building2, Globe, MapPin, Target, Check, LockKeyhole, ArrowUpDown, Filter, Database, RotateCcw, AlertCircle, History } from "lucide-react";
import { Link } from "wouter";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/use-auth";

const POPULAR_CITIES = [
  { value: "Москва", aliases: ["msk", "moskva", "москв", "мск"] },
  { value: "Санкт-Петербург", aliases: ["spb", "piter", "санкт петербург", "питер", "спб"] },
  { value: "Новосибирск", aliases: ["nsk", "novosib", "новосиб", "нск"] },
  { value: "Екатеринбург", aliases: ["ekb", "екат", "екб"] },
  { value: "Казань", aliases: ["kzn", "казан", "каз"] },
  { value: "Нижний Новгород", aliases: ["nn", "nizhny", "нижний", "нн"] },
  { value: "Красноярск", aliases: ["krsk", "краснояр", "крас"] },
  { value: "Самара", aliases: ["samara", "самар"] },
];
const CITIES_BY_COUNTRY: Record<string, typeof POPULAR_CITIES> = { россия: POPULAR_CITIES, russia: POPULAR_CITIES };
const POPULAR_INDUSTRIES = [
  { value: "СТО", aliases: ["car service", "автосервис", "авто сервис", "ремонт авто", "шин"] },
  { value: "Стоматология", aliases: ["dental", "стоматолог", "стоматол", "зубной", "зубы"] },
  { value: "Салон красоты", aliases: ["salon", "spa", "красот", "спа", "парикмахерская"] },
  { value: "Ресторан", aliases: ["cafe", "food", "ресторан", "кафе", "еда", "общепит"] },
  { value: "Недвижимость", aliases: ["property", "недвиж", "риэлтор", "риелтор", "агентство недвижимости"] },
  { value: "Строительство", aliases: ["build", "строит", "стройка", "ремонт"] },
  { value: "Мебель", aliases: ["furniture", "мебел", "мебельный"] },
  { value: "Юридические услуги", aliases: ["lawyer", "legal", "юрист", "адвокат", "юрид"] },
  { value: "Фитнес", aliases: ["gym", "fitness", "фитнес", "тренажерный зал", "спортзал"] },
  { value: "Отель", aliases: ["hotel", "hostel", "отел", "гостиница", "хостел"] },
];

function editDistance(a: string, b: string) {
  const row = Array.from({ length: b.length + 1 }, (_, index) => index);
  for (let i = 1; i <= a.length; i++) {
    let previous = row[0]; row[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const current = row[j];
      row[j] = a[i - 1] === b[j - 1] ? previous : Math.min(previous + 1, row[j - 1] + 1, current + 1);
      previous = current;
    }
  }
  return row[b.length];
}

function SuggestionInput({ value, onChange, options, placeholder, icon: Icon, disabled = false }: {
  value: string; onChange: (value: string) => void; options: typeof POPULAR_CITIES; placeholder: string; icon: React.ElementType; disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [inputVal, setInputVal] = useState(value);
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => setInputVal(value), [value]);
  const filteredOptions = [...options].filter((option) => {
    if (!inputVal.trim()) return true;
    const query = inputVal.toLowerCase().trim();
    return [option.value, ...option.aliases].some((candidate) => candidate.toLowerCase().includes(query) || query.includes(candidate.toLowerCase()) || editDistance(candidate.toLowerCase(), query) <= Math.max(1, Math.floor(query.length * 0.34)));
  });
  const select = (next: string) => { setInputVal(next); onChange(next); setOpen(false); };
  return (
    <Popover open={open && !disabled} onOpenChange={setOpen}>
      <PopoverAnchor asChild><div className="relative"><Icon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input ref={inputRef} value={inputVal} onChange={(event) => { setInputVal(event.target.value); onChange(event.target.value); }} onKeyDown={(event) => { if (event.key === "Enter" || event.key === "Escape") setOpen(false); }} onClick={() => setOpen(true)} onFocus={() => setOpen(true)} className="h-10 rounded-md border-border/60 bg-background pl-9 text-sm shadow-none" placeholder={placeholder} disabled={disabled} /></div></PopoverAnchor>
      <PopoverContent className="w-[var(--radix-popover-trigger-width)] rounded-md border-border/60 p-1" align="start">
        {filteredOptions.length ? <div className="max-h-52 overflow-y-auto">{filteredOptions.map((option) => <button type="button" key={option.value} onClick={() => select(option.value)} className="flex w-full items-center justify-between rounded px-3 py-2 text-left text-sm hover:bg-accent"><span>{option.value}</span>{value === option.value && <Check className="h-4 w-4 text-primary" />}</button>)}</div> : <button type="button" className="w-full rounded px-3 py-2 text-left text-sm hover:bg-accent" onClick={() => select(inputVal.trim())}>Use “{inputVal.trim()}”</button>}
      </PopoverContent>
    </Popover>
  );
}

export function SearchPage() {
  const country = "Россия";
  const [city, setCity] = useState("");
  const [industry, setIndustry] = useState("");
  const [hasSearched, setHasSearched] = useState(false);
  const [sortBy, setSortBy] = useState("score");
  const [minimumScore, setMinimumScore] = useState("all");
  const [showPreviouslyFound, setShowPreviouslyFound] = useState(false);
  const [searchPreferencesLoaded, setSearchPreferencesLoaded] = useState(false);
  const searchMutation = useSearchLeads();
  const { session } = useAuth();
  useEffect(() => {
    const login = session?.user?.login;
    if (!login) return;
    try {
      const saved = window.localStorage.getItem(`real:search-defaults:${login.toLowerCase()}`) ?? window.localStorage.getItem(`lead-scout:search-defaults:${login.toLowerCase()}`);
      const defaults = saved ? JSON.parse(saved) as { city?: string; industry?: string; showPreviouslyFound?: boolean } : {};
      setCity(defaults.city ?? ""); setIndustry(defaults.industry ?? "");
      setShowPreviouslyFound(defaults.showPreviouslyFound ?? false);
      setSearchPreferencesLoaded(true);
    } catch { setCity(""); setIndustry(""); setShowPreviouslyFound(false); setSearchPreferencesLoaded(true); }
  }, [session?.user?.login]);
  useEffect(() => {
    const login = session?.user?.login;
    if (!login || !searchPreferencesLoaded) return;
    const key = `real:search-defaults:${login.toLowerCase()}`;
    try {
      const existing = JSON.parse(window.localStorage.getItem(key) ?? "{}") as { city?: string; industry?: string };
      window.localStorage.setItem(key, JSON.stringify({ ...existing, city, industry, showPreviouslyFound }));
    } catch { /* local preferences are optional */ }
  }, [city, industry, showPreviouslyFound, searchPreferencesLoaded, session?.user?.login]);
  const runSearch = () => {
    if (!city.trim() || !industry.trim()) return;
    setHasSearched(true);
    searchMutation.mutate({ data: { country, city: city.trim(), industry: industry.trim(), showPreviouslyFound } });
  };
  const handleSearch = (event: React.FormEvent) => { event.preventDefault(); runSearch(); };
  const results = searchMutation.data || [];
  const visibleResults = useMemo(() => {
    const threshold = minimumScore === "all" ? 0 : Number(minimumScore);
    return [...results].filter((lead) => lead.score >= threshold).sort((a, b) => sortBy === "name" ? a.name.localeCompare(b.name, "ru") : sortBy === "issues" ? b.issues.length - a.issues.length : b.score - a.score);
  }, [results, sortBy, minimumScore]);
  const summary = useMemo(() => results.length ? {
    average: Math.round(results.reduce((sum, lead) => sum + lead.score, 0) / results.length),
    websiteRate: Math.round(results.filter((lead) => Boolean(lead.website)).length / results.length * 100),
    issues: results.reduce((sum, lead) => sum + lead.issues.length, 0),
  } : { average: 0, websiteRate: 0, issues: 0 }, [results]);

  return (
    <AppLayout>
      <div className="flex h-full flex-col space-y-5">
        <div className="flex shrink-0 items-end justify-between border-b border-border/70 pb-5">
          <div><p className="mb-2 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.2em] text-primary"><SearchIcon className="h-3.5 w-3.5" />Lead discovery</p><h1 className="text-2xl font-semibold tracking-tight text-foreground">Search</h1><p className="mt-1 text-sm text-muted-foreground">Find businesses worth a closer look, then open the lead record.</p></div>
          {hasSearched && <div className="hidden text-right sm:block"><p className="font-mono text-2xl font-semibold text-foreground">{results.length}</p><p className="text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground">returned</p></div>}
        </div>
        <div className="relative shrink-0 overflow-hidden rounded-lg border border-border/70 bg-card/60 p-5">
          <form onSubmit={handleSearch} className="relative z-10 grid grid-cols-1 items-end gap-4 md:grid-cols-[.7fr_1fr_1fr_auto]">
            <div className="flex flex-col gap-2"><Label className="text-[10px] font-bold uppercase tracking-[0.15em] text-muted-foreground">Country</Label><div className="flex h-10 items-center gap-2 rounded-md border border-border/60 bg-background px-3 text-sm font-semibold text-foreground"><LockKeyhole className="h-4 w-4 text-muted-foreground" />Россия</div></div>
            <div className="flex flex-col gap-2"><Label className="text-[10px] font-bold uppercase tracking-[0.15em] text-muted-foreground">City</Label><SuggestionInput value={city} onChange={setCity} options={CITIES_BY_COUNTRY.россия} placeholder="например, Красноярск" icon={MapPin} /></div>
            <div className="flex flex-col gap-2"><Label className="text-[10px] font-bold uppercase tracking-[0.15em] text-muted-foreground">Industry</Label><SuggestionInput value={industry} onChange={setIndustry} options={POPULAR_INDUSTRIES} placeholder="например, Стоматология" icon={Building2} /></div>
            <Button type="submit" disabled={searchMutation.isPending || !city.trim() || !industry.trim()} className="h-10 rounded-md font-semibold"><SearchIcon className="mr-2 h-4 w-4" />Search</Button>
            <div className="flex items-center justify-between gap-3 rounded-md border border-border/60 bg-background/60 px-3 py-2.5 md:col-span-4">
              <div className="flex items-center gap-2.5"><History className="h-4 w-4 text-muted-foreground" /><div><p className="text-xs font-semibold text-foreground">Показывать ранее найденные компании</p><p className="text-[11px] text-muted-foreground">По умолчанию повторно показанные компании скрываются</p></div></div>
              <Switch checked={showPreviouslyFound} onCheckedChange={setShowPreviouslyFound} aria-label="Показывать ранее найденные компании" />
            </div>
          </form>
        </div>
        {hasSearched && <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-lg border border-border/70 bg-card/40">
          <div className="shrink-0 border-b border-border/70 bg-background/30">
            <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
              <div className="flex items-center gap-3"><h2 className="flex items-center gap-2 text-sm font-semibold text-foreground"><Target className="h-4 w-4 text-primary" />Results</h2><span className="rounded bg-primary/10 px-2 py-1 font-mono text-[11px] font-semibold text-primary">{results.length}</span><span className="flex items-center gap-1.5 text-[11px] text-muted-foreground"><Database className="h-3.5 w-3.5" />{results[0]?.source ? `Source: ${results[0].source}` : "Source: search service"}</span></div>
              <div className="flex items-center gap-2"><div className="hidden items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground sm:flex"><ArrowUpDown className="h-3.5 w-3.5" />Sort</div><Select value={sortBy} onValueChange={setSortBy}><SelectTrigger className="h-8 w-32 text-xs"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="score">Score</SelectItem><SelectItem value="issues">Issues</SelectItem><SelectItem value="name">Name</SelectItem></SelectContent></Select><div className="hidden items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground sm:flex"><Filter className="h-3.5 w-3.5" />Filter</div><Select value={minimumScore} onValueChange={setMinimumScore}><SelectTrigger className="h-8 w-28 text-xs"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">All scores</SelectItem><SelectItem value="80">80+ score</SelectItem><SelectItem value="60">60+ score</SelectItem></SelectContent></Select></div>
            </div>
            {!searchMutation.isPending && results.length > 0 && <div className="grid grid-cols-3 border-t border-border/60 sm:grid-cols-4"><div className="px-4 py-2.5"><p className="font-mono text-base font-semibold text-foreground">{summary.average}</p><p className="text-[9px] font-bold uppercase tracking-[0.14em] text-muted-foreground">avg score</p></div><div className="border-l border-border/60 px-4 py-2.5"><p className="font-mono text-base font-semibold text-foreground">{summary.websiteRate}%</p><p className="text-[9px] font-bold uppercase tracking-[0.14em] text-muted-foreground">with website</p></div><div className="border-l border-border/60 px-4 py-2.5"><p className="font-mono text-base font-semibold text-foreground">{summary.issues}</p><p className="text-[9px] font-bold uppercase tracking-[0.14em] text-muted-foreground">signals found</p></div><div className="hidden border-l border-border/60 px-4 py-2.5 sm:block"><p className="font-mono text-base font-semibold text-foreground">{visibleResults.length}</p><p className="text-[9px] font-bold uppercase tracking-[0.14em] text-muted-foreground">shown</p></div></div>}
          </div>
          <div className="flex-1 overflow-y-auto">
            {searchMutation.isPending ? <div className="space-y-3 p-4">{[1, 2, 3, 4].map((row) => <div key={row} className="h-20 animate-pulse rounded-md bg-muted/50" />)}<p className="pt-2 text-center text-xs text-muted-foreground">Searching the connected source…</p></div>
              : searchMutation.isError ? <div className="flex h-full min-h-64 flex-col items-center justify-center p-8 text-center"><div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10"><AlertCircle className="h-6 w-6 text-destructive" /></div><h3 className="text-base font-semibold text-foreground">Search could not be completed</h3><p className="mt-2 max-w-sm text-sm text-muted-foreground">The source did not return a usable response. Keep your criteria and try once more.</p><Button type="button" variant="outline" size="sm" className="mt-5" onClick={runSearch}><RotateCcw className="mr-2 h-3.5 w-3.5" />Try again</Button></div>
              : results.length === 0 ? <div className="flex h-full min-h-64 flex-col items-center justify-center p-8 text-center"><div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full border border-border bg-muted/50"><SearchIcon className="h-6 w-6 text-muted-foreground/60" /></div><h3 className="text-base font-semibold text-foreground">No businesses matched</h3><p className="mt-2 max-w-sm text-sm text-muted-foreground">Try a broader city or a neighboring industry. Your search accepts any text, not only the suggestions.</p><Button type="button" variant="ghost" size="sm" className="mt-3" onClick={() => { setCity(""); setIndustry(""); }}>Clear criteria</Button></div>
              : visibleResults.length === 0 ? <div className="flex min-h-64 flex-col items-center justify-center p-8 text-center"><Filter className="mb-3 h-6 w-6 text-muted-foreground" /><h3 className="text-sm font-semibold text-foreground">No results pass this filter</h3><p className="mt-1 text-xs text-muted-foreground">Lower the minimum score to see the full response.</p></div>
              : <div className="divide-y divide-border/50">{visibleResults.map((lead) => <Link key={lead.id} href={`/leads/${lead.id}`} className="group flex flex-col gap-4 p-4 transition-colors hover:bg-accent/40 md:flex-row md:items-center"><div className="min-w-0 flex-1"><div className="mb-2 flex items-center gap-3"><span className="truncate text-sm font-semibold text-foreground">{lead.name}</span><span className="shrink-0 rounded bg-muted px-2 py-1 text-[9px] font-bold uppercase tracking-wider text-muted-foreground">{lead.industry}</span></div><div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[11px] text-muted-foreground"><span className="flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5" />{lead.city}, {lead.country}</span><span className="flex items-center gap-1.5"><Database className="h-3.5 w-3.5" />{lead.source}</span>{lead.website ? <span className="flex items-center gap-1.5 text-primary"><Globe className="h-3.5 w-3.5" />{(() => { try { return new URL(lead.website).hostname.replace("www.", ""); } catch { return lead.website; } })()}</span> : <span className="flex items-center gap-1.5 text-amber-500"><AlertTriangle className="h-3.5 w-3.5" />No website</span>}</div></div><div className="flex items-center gap-4 md:w-64 md:justify-end"><div className="flex min-w-0 flex-1 flex-wrap gap-1.5 md:max-w-44">{lead.issues.slice(0, 2).map((issue, index) => <span key={`${lead.id}-${index}`} className="max-w-full truncate rounded border border-border/60 bg-background px-2 py-1 text-[10px] text-muted-foreground">{issue}</span>)}{lead.issues.length > 2 && <span className="rounded border border-border/60 bg-background px-2 py-1 font-mono text-[10px] text-muted-foreground">+{lead.issues.length - 2}</span>}</div><div className="border-l border-border/60 pl-4 text-right"><span className={cn("font-mono text-lg font-semibold", lead.score >= 80 ? "text-emerald-500" : lead.score >= 50 ? "text-amber-500" : "text-rose-500")}>{lead.score}</span><div className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">score</div></div><span className="text-lg text-muted-foreground transition-transform group-hover:translate-x-0.5">→</span></div></Link>)}</div>}
          </div>
        </div>}
      </div>
    </AppLayout>
  );
}
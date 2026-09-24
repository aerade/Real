import { useEffect, useMemo, useRef, useState, type ElementType, type FormEvent } from "react";
import { useSearchLeads } from "@workspace/api-client-react";
import { AppLayout } from "@/components/layout/app-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverAnchor, PopoverContent } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useAuth } from "@/hooks/use-auth";
import { cn } from "@/lib/utils";
import { Link } from "wouter";
import {
  AlertCircle, AlertTriangle, ArrowUpDown, Building2, Check, CheckCircle2, Database,
  ExternalLink, Filter, Globe2, History, MapPin, RotateCcw, Search as SearchIcon,
  Target, XCircle,
} from "lucide-react";

const POPULAR_CITIES = [
  { value: "Москва", aliases: ["msk", "moskva", "москв", "мск"] },
  { value: "Санкт-Петербург", aliases: ["spb", "piter", "санкт петербург", "питер", "спб"] },
  { value: "Новосибирск", aliases: ["nsk", "novosib", "новосиб", "нск"] },
  { value: "Екатеринбург", aliases: ["ekb", "екат", "екб"] },
  { value: "Казань", aliases: ["kzn", "казан", "каз"] },
  { value: "Нижний Новгород", aliases: ["nn", "nizhny", "нижний", "нн"] },
  { value: "Красноярск", aliases: ["krsk", "краснояр", "крас"] },
  { value: "Самара", aliases: ["samara", "самар"] },
  { value: "Омск", aliases: ["omsk", "омск"] },
  { value: "Челябинск", aliases: ["chel", "челябин", "челяба"] },
  { value: "Ростов-на-Дону", aliases: ["rostov", "ростов", "рнд"] },
  { value: "Уфа", aliases: ["ufa", "уф"] },
  { value: "Волгоград", aliases: ["volgograd", "волгоград"] },
  { value: "Пермь", aliases: ["perm", "перм"] },
  { value: "Краснодар", aliases: ["krasnodar", "краснодар"] },
  { value: "Воронеж", aliases: ["voronezh", "воронеж"] },
  { value: "Саратов", aliases: ["saratov", "саратов"] },
  { value: "Тюмень", aliases: ["tumen", "тюмен"] },
  { value: "Тольятти", aliases: ["tolyatti", "тольят"] },
  { value: "Ижевск", aliases: ["izhevsk", "ижевск"] },
  { value: "Барнаул", aliases: ["barnaul", "барнаул"] },
  { value: "Иркутск", aliases: ["irkutsk", "иркутск"] },
  { value: "Хабаровск", aliases: ["khabarovsk", "хабаровск"] },
  { value: "Ярославль", aliases: ["yaroslavl", "ярослав"] },
  { value: "Владивосток", aliases: ["vladivostok", "владивосток"] },
  { value: "Томск", aliases: ["tomsk", "томск"] },
  { value: "Оренбург", aliases: ["orenburg", "оренбург"] },
  { value: "Кемерово", aliases: ["kemerovo", "кемеров"] },
  { value: "Рязань", aliases: ["ryazan", "рязан"] },
  { value: "Астрахань", aliases: ["astrakhan", "астрахан"] },
  { value: "Пенза", aliases: ["penza", "пенз"] },
  { value: "Калининград", aliases: ["kaliningrad", "калининград"] },
  { value: "Сочи", aliases: ["sochi", "сочи"] },
  { value: "Ставрополь", aliases: ["stavropol", "ставропол"] },
  { value: "Белгород", aliases: ["belgorod", "белгород"] },
  { value: "Владимир", aliases: ["vladimir", "владимир"] },
  { value: "Архангельск", aliases: ["arkhangelsk", "архангел"] },
  { value: "Мурманск", aliases: ["murmansk", "мурманск"] },
  { value: "Сургут", aliases: ["surgut", "сургут"] },
  { value: "Нижневартовск", aliases: ["nizhnevartovsk", "нижневартовск"] },
];
const CITIES_BY_COUNTRY: Record<string, Array<{ value: string; aliases: string[] }>> = {
  "Россия": POPULAR_CITIES,
  "Казахстан": ["Алматы", "Астана", "Шымкент", "Караганда", "Актобе", "Атырау", "Актау", "Павлодар"].map((value) => ({ value, aliases: [] })),
};
const SEARCH_COUNTRIES = [
  { value: "Россия", label: "Россия" },
  { value: "Казахстан", label: "Казахстан" },
];
const POPULAR_INDUSTRIES = [
  { value: "СТО", aliases: ["car service", "автосервис", "авто сервис", "ремонт авто", "шин"] },
  { value: "Стоматология", aliases: ["dental", "стоматолог", "зубной", "зубы"] },
  { value: "Салон красоты", aliases: ["salon", "spa", "красот", "парикмахерская"] },
  { value: "Ресторан", aliases: ["cafe", "food", "ресторан", "кафе", "еда"] },
  { value: "Недвижимость", aliases: ["property", "недвиж", "риэлтор", "агентство недвижимости"] },
  { value: "Строительство", aliases: ["build", "строит", "стройка", "ремонт"] },
  { value: "Мебель", aliases: ["furniture", "мебел", "мебельный"] },
  { value: "Юридические услуги", aliases: ["lawyer", "legal", "юрист", "адвокат", "юрид"] },
  { value: "Фитнес", aliases: ["gym", "fitness", "фитнес", "тренажерный зал"] },
  { value: "Отель", aliases: ["hotel", "hostel", "отел", "гостиница"] },
  { value: "Кафе и кофейня", aliases: ["cafe", "coffee", "кофе", "кофейня"] },
  { value: "Автомойка", aliases: ["car wash", "автомой", "мойка"] },
  { value: "Автозапчасти", aliases: ["автозапчаст", "запчасти", "auto parts"] },
  { value: "Грузоперевозки", aliases: ["cargo", "перевозки", "груз"] },
  { value: "Логистика", aliases: ["logistics", "склад", "доставка"] },
  { value: "Ремонт техники", aliases: ["сервисный центр", "ремонт телефонов", "ремонт техники"] },
  { value: "Клининг", aliases: ["cleaning", "клининг", "уборка"] },
  { value: "Медицинская клиника", aliases: ["медицина", "клиника", "медцентр"] },
  { value: "Ветеринарная клиника", aliases: ["ветеринар", "ветклиника", "животные"] },
  { value: "Детский сад", aliases: ["садик", "дошкольный", "детский центр"] },
  { value: "Образовательный центр", aliases: ["education", "курсы", "учебный центр"] },
  { value: "Интернет-магазин", aliases: ["ecommerce", "онлайн магазин", "магазин"] },
  { value: "Производство", aliases: ["factory", "завод", "производитель"] },
  { value: "Оптовая торговля", aliases: ["опт", "торговая компания", "дистрибьютор"] },
  { value: "Дизайн интерьера", aliases: ["interior", "дизайнер", "интерьер"] },
  { value: "Архитектурное бюро", aliases: ["архитектор", "архитектура", "проектирование"] },
  { value: "Бухгалтерские услуги", aliases: ["бухгалтер", "аутсорсинг", "налоги"] },
  { value: "Рекламное агентство", aliases: ["marketing", "реклама", "агентство"] },
  { value: "Туристическое агентство", aliases: ["туризм", "турагентство", "путешествия"] },
  { value: "Фото и видеостудия", aliases: ["фотостудия", "видеостудия", "фото"] },
  { value: "Барбершоп", aliases: ["barber", "барбер", "мужская парикмахерская"] },
  { value: "Пекарня", aliases: ["bakery", "выпечка", "кондитерская"] },
  { value: "Доставка еды", aliases: ["food delivery", "доставка", "еда на заказ"] },
  { value: "Магазин одежды", aliases: ["fashion", "одежда", "бутик"] },
  { value: "Мебельный салон", aliases: ["мебель", "кухни", "шкафы"] },
  { value: "Оконная компания", aliases: ["окна", "пластиковые окна", "остекление"] },
  { value: "Электромонтаж", aliases: ["электрик", "электрика", "монтаж"] },
  { value: "Сервис кондиционеров", aliases: ["кондиционер", "вентиляция", "климат"] },
  { value: "Тату-студия", aliases: ["tattoo", "тату", "пирсинг"] },
];

function editDistance(a: string, b: string) {
  const row = Array.from({ length: b.length + 1 }, (_, index) => index);
  for (let i = 1; i <= a.length; i += 1) {
    let previous = row[0];
    row[0] = i;
    for (let j = 1; j <= b.length; j += 1) {
      const current = row[j];
      row[j] = a[i - 1] === b[j - 1] ? previous : Math.min(previous + 1, row[j - 1] + 1, current + 1);
      previous = current;
    }
  }
  return row[b.length];
}

function SuggestionInput({ value, onChange, options, placeholder, anyLabel, anyTestId, icon: Icon, disabled = false }: {
  value: string;
  onChange: (value: string) => void;
  options: Array<{ value: string; aliases: string[] }>;
  placeholder: string;
  anyLabel?: string;
  anyTestId?: string;
  icon: ElementType;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [inputValue, setInputValue] = useState(value);
  useEffect(() => setInputValue(value), [value]);
  const filtered = options.filter((option) => {
    const query = inputValue.trim().toLowerCase();
    if (!query) return true;
    return [option.value, ...option.aliases].some((candidate) => {
      const normalized = candidate.toLowerCase();
      return normalized.includes(query) || query.includes(normalized) ||
        editDistance(normalized, query) <= Math.max(1, Math.floor(query.length * 0.34));
    });
  });
  const normalizedInput = inputValue.trim().toLowerCase();
  const canUseCustomValue = Boolean(normalizedInput) &&
    !options.some((option) => option.value.toLowerCase() === normalizedInput);
  const choose = (next: string) => {
    setInputValue(next);
    onChange(next);
    setOpen(false);
  };
  return (
    <Popover open={open && !disabled} onOpenChange={setOpen}>
      <PopoverAnchor asChild>
        <div className="relative">
          <Icon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            data-testid={`input-${placeholder}`}
            value={inputValue}
            onChange={(event) => { setInputValue(event.target.value); onChange(event.target.value); }}
            onFocus={() => setOpen(true)}
            onKeyDown={(event) => { if (event.key === "Escape" || event.key === "Enter") setOpen(false); }}
            placeholder={placeholder}
            disabled={disabled}
            className="h-11 border-border/70 bg-background pl-9 shadow-none"
          />
        </div>
      </PopoverAnchor>
      <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-1" align="start">
        <div className="max-h-52 overflow-y-auto">
          {anyLabel && anyTestId && <button data-testid={anyTestId} type="button" onClick={() => choose("")} className="flex w-full items-center justify-between rounded bg-primary/10 px-3 py-2 text-left text-sm font-semibold text-primary hover:bg-primary/15">
            {anyLabel}
            {!value && <Check className="h-4 w-4" />}
          </button>}
          {canUseCustomValue && <button data-testid="button-use-search-value" type="button" onClick={() => choose(inputValue.trim())} className="flex w-full items-center gap-2 rounded bg-primary/10 px-3 py-2 text-left text-sm font-medium text-primary hover:bg-primary/15">
            Искать «{inputValue.trim()}»
          </button>}
          {filtered.map((option) => (
            <button data-testid={`suggestion-${option.value}`} type="button" key={option.value} onClick={() => choose(option.value)} className="flex w-full items-center justify-between rounded px-3 py-2 text-left text-sm hover:bg-accent">
              {option.value}
              {value === option.value && <Check className="h-4 w-4 text-primary" />}
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}

function websiteHost(value?: string | null) {
  if (!value) return null;
  try { return new URL(value).hostname.replace(/^www\./, ""); } catch { return value; }
}

function safeWebsiteUrl(value?: string | null) {
  if (!value) return null;
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:" ? url.href : null;
  } catch {
    return null;
  }
}

function searchErrorMessage(error: unknown): string {
  if (error && typeof error === "object") {
    const response = (error as { response?: { data?: unknown } }).response;
    if (response?.data && typeof response.data === "object") {
      const message = (response.data as { error?: unknown }).error;
      if (typeof message === "string" && message.trim()) return message;
    }
  }
  return "Не удалось подключиться к источнику. Проверьте настройки и повторите поиск.";
}

function auditSummary(lead: { websiteAudit?: { status: string; qualityScore: number | null; checks: unknown[] } | null; website?: string | null }) {
  if (!lead.websiteAudit || lead.websiteAudit.status === "not_provided") return { label: "Аудит не проводился", tone: "muted" };
  if (lead.websiteAudit.status === "unavailable") return { label: "Сайт недоступен", tone: "warn" };
  return {
    label: lead.websiteAudit.qualityScore != null ? `Аудит сайта · ${lead.websiteAudit.qualityScore}/100` : "Аудит сайта завершён",
    tone: "good",
  };
}

export function SearchPage() {
  const { session } = useAuth();
  const [country, setCountry] = useState("Россия");
  const [city, setCity] = useState("");
  const [industry, setIndustry] = useState("");
  const [hasSearched, setHasSearched] = useState(false);
  const [sortBy, setSortBy] = useState("score");
  const [minimumScore, setMinimumScore] = useState("all");
  const [showPreviouslyFound, setShowPreviouslyFound] = useState(false);
  const [preferencesLoaded, setPreferencesLoaded] = useState(false);
  const searchMutation = useSearchLeads();
  const usesTwoGis = country === "Россия" || country === "Казахстан";
  const missingTwoGisFilters = usesTwoGis && (!city.trim() || !industry.trim());

  useEffect(() => {
    const login = session?.user?.login;
    if (!login) return;
    try {
      const raw = window.localStorage.getItem(`real:search-defaults:${login.toLowerCase()}`) ?? window.localStorage.getItem(`lead-scout:search-defaults:${login.toLowerCase()}`);
      const defaults = raw ? JSON.parse(raw) as { country?: string; city?: string; industry?: string; showPreviouslyFound?: boolean } : {};
      setCountry(defaults.country === "Казахстан" ? "Казахстан" : "Россия");
      setCity(defaults.city ?? "");
      setIndustry(defaults.industry ?? "");
      setShowPreviouslyFound(defaults.showPreviouslyFound ?? false);
    } catch {
      setCountry("Россия");
      setCity("");
      setIndustry("");
    } finally {
      setPreferencesLoaded(true);
    }
  }, [session?.user?.login]);

  useEffect(() => {
    const login = session?.user?.login;
    if (!login || !preferencesLoaded) return;
    const key = `real:search-defaults:${login.toLowerCase()}`;
    try {
      const existing = JSON.parse(window.localStorage.getItem(key) ?? "{}") as object;
      window.localStorage.setItem(key, JSON.stringify({ ...existing, country, city, industry, showPreviouslyFound }));
    } catch { /* local preferences are optional */ }
  }, [country, city, industry, showPreviouslyFound, preferencesLoaded, session?.user?.login]);

  const runSearch = () => {
    if (missingTwoGisFilters) return;
    setHasSearched(true);
    searchMutation.mutate({ data: { country, city: city.trim(), industry: industry.trim(), showPreviouslyFound } });
  };
  const handleSearch = (event: FormEvent) => { event.preventDefault(); runSearch(); };
  const results = searchMutation.data ?? [];
  const visibleResults = useMemo(() => {
    const threshold = minimumScore === "all" ? 0 : Number(minimumScore);
    return [...results].filter((lead) => lead.score >= threshold).sort((a, b) =>
      sortBy === "name" ? a.name.localeCompare(b.name, "ru") :
        sortBy === "issues" ? b.issues.length - a.issues.length : b.score - a.score);
  }, [results, sortBy, minimumScore]);
  const summary = useMemo(() => ({
    average: results.length ? Math.round(results.reduce((sum, lead) => sum + lead.score, 0) / results.length) : 0,
    withWebsite: results.filter((lead) => lead.websiteStatus === "present").length,
    withoutWebsite: results.filter((lead) => lead.websiteStatus === "missing").length,
    audited: results.filter((lead) => lead.websiteAudit?.status === "checked").length,
  }), [results]);

  return (
    <AppLayout>
      <div className="flex h-full min-h-0 flex-col gap-5">
         <header className="shrink-0 border-b border-border/70 pb-5">
           <p className="mb-2 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.2em] text-primary"><SearchIcon className="h-3.5 w-3.5" />Поиск лидов</p>
          <div className="flex items-end justify-between gap-4">
            <div><h1 className="text-2xl font-semibold tracking-tight">Найдите следующий разговор</h1><p className="mt-1 text-sm text-muted-foreground">Поиск через 2ГИС доступен для России и Казахстана. Укажите город и отрасль.</p></div>
             {hasSearched && <div className="hidden text-right sm:block"><p data-testid="text-search-result-count" className="font-mono text-2xl font-semibold">{results.length}</p><p className="text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground">найдено компаний</p></div>}
          </div>
        </header>

        <form onSubmit={handleSearch} className="shrink-0 rounded-xl border border-border/70 bg-card p-4 shadow-sm md:p-5">
         <div className="grid grid-cols-1 gap-4 md:grid-cols-[.8fr_1fr_1fr_auto]">
             <div className="space-y-2"><Label className="text-[10px] font-bold uppercase tracking-[0.15em] text-muted-foreground">Страна</Label><Select value={country} onValueChange={(value) => { setCountry(value); setCity(""); }}><SelectTrigger data-testid="select-search-country" className="h-11 border-border/70 bg-background text-sm"><SelectValue /></SelectTrigger><SelectContent className="max-h-72">{SEARCH_COUNTRIES.map((item) => <SelectItem data-testid={`country-${item.value}`} key={item.value} value={item.value}>{item.label}</SelectItem>)}</SelectContent></Select></div>
               <div className="space-y-2"><Label className="text-[10px] font-bold uppercase tracking-[0.15em] text-muted-foreground">Город</Label><SuggestionInput value={city} onChange={setCity} options={CITIES_BY_COUNTRY[country] ?? []} placeholder="Выберите или введите город" anyLabel="Любой" anyTestId="any-city" icon={MapPin} /></div>
               <div className="space-y-2"><Label className="text-[10px] font-bold uppercase tracking-[0.15em] text-muted-foreground">Отрасль</Label><SuggestionInput value={industry} onChange={setIndustry} options={POPULAR_INDUSTRIES} placeholder="Выберите или введите отрасль" anyLabel="Любая" anyTestId="any-industry" icon={Building2} /></div>
              <Button data-testid="button-search-leads" type="submit" disabled={searchMutation.isPending || missingTwoGisFilters} className="h-11 font-semibold md:mt-[18px]"><SearchIcon className="mr-2 h-4 w-4" />Искать</Button>
          </div>
          <div className="mt-4 flex items-center justify-between gap-3 rounded-md border border-border/60 bg-background/50 px-3 py-2.5">
             <div className="flex items-center gap-2.5"><History className="h-4 w-4 text-muted-foreground" /><div><p className="text-xs font-semibold">Включать ранее найденные компании</p><p className="text-[11px] text-muted-foreground">История поиска доступна только вам.</p></div></div>
             <Switch data-testid="switch-include-previous" checked={showPreviouslyFound} onCheckedChange={setShowPreviouslyFound} aria-label="Включать ранее найденные компании" />
          </div>
        </form>

        {hasSearched && (
           <section className="flex min-h-[24rem] flex-1 flex-col overflow-hidden rounded-xl border border-border/70 bg-card/45 shadow-sm">
            <div className="shrink-0 border-b border-border/70">
              <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
                  <div className="flex items-center gap-3"><h2 className="flex items-center gap-2 text-sm font-semibold"><Target className="h-4 w-4 text-primary" />Результаты поиска</h2><span data-testid="status-result-count" className="rounded bg-primary/10 px-2 py-1 font-mono text-[11px] font-semibold text-primary">{results.length}</span><span className="hidden items-center gap-1.5 text-[11px] text-muted-foreground sm:flex"><Database className="h-3.5 w-3.5" />До 10 компаний · 2ГИС</span></div>
                 <div className="flex items-center gap-2"><span className="hidden items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground sm:flex"><ArrowUpDown className="h-3.5 w-3.5" />Сортировка</span><Select value={sortBy} onValueChange={setSortBy}><SelectTrigger data-testid="select-sort-results" className="h-8 w-32 text-xs"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="score">Приоритет</SelectItem><SelectItem value="issues">Сигналы</SelectItem><SelectItem value="name">Название</SelectItem></SelectContent></Select><span className="hidden items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground sm:flex"><Filter className="h-3.5 w-3.5" />Фильтр</span><Select value={minimumScore} onValueChange={setMinimumScore}><SelectTrigger data-testid="select-score-filter" className="h-8 w-28 text-xs"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">Все оценки</SelectItem><SelectItem value="80">Оценка от 80</SelectItem><SelectItem value="60">Оценка от 60</SelectItem></SelectContent></Select></div>
              </div>
                {!searchMutation.isPending && results.length > 0 && <div className="grid grid-cols-2 border-t border-border/60 sm:grid-cols-5"><div className="px-4 py-2.5"><p data-testid="text-average-score" className="font-mono text-base font-semibold">{summary.average}</p><p className="text-[9px] font-bold uppercase tracking-[0.14em] text-muted-foreground">средний приоритет</p></div><div className="border-l border-border/60 px-4 py-2.5"><p data-testid="text-website-count" className="font-mono text-base font-semibold">{summary.withWebsite}</p><p className="text-[9px] font-bold uppercase tracking-[0.14em] text-muted-foreground">с сайтом</p></div><div className="border-l border-border/60 px-4 py-2.5"><p data-testid="text-no-website-count" className="font-mono text-base font-semibold">{summary.withoutWebsite}</p><p className="text-[9px] font-bold uppercase tracking-[0.14em] text-muted-foreground">без сайта</p></div><div className="border-l border-border/60 px-4 py-2.5"><p data-testid="text-audited-count" className="font-mono text-base font-semibold">{summary.audited}</p><p className="text-[9px] font-bold uppercase tracking-[0.14em] text-muted-foreground">аудитов завершено</p></div><div className="hidden border-l border-border/60 px-4 py-2.5 sm:block"><p className="font-mono text-base font-semibold">{visibleResults.length}</p><p className="text-[9px] font-bold uppercase tracking-[0.14em] text-muted-foreground">показано сейчас</p></div></div>}
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto">
               {searchMutation.isPending ? <div className="space-y-3 p-4">{[1, 2, 3, 4].map((row) => <div key={row} className="h-24 animate-pulse rounded-lg bg-muted/50" />)}<p className="text-center text-xs text-muted-foreground">Проверяем подключённый источник…</p></div>
                 : searchMutation.isError ? <div className="flex min-h-64 flex-col items-center justify-center p-8 text-center"><AlertCircle className="mb-3 h-7 w-7 text-destructive" /><h3 className="text-base font-semibold">Не удалось завершить поиск</h3><p className="mt-2 max-w-sm text-sm text-muted-foreground">{searchErrorMessage(searchMutation.error)}</p><Button data-testid="button-retry-search" type="button" variant="outline" size="sm" className="mt-5" onClick={runSearch}><RotateCcw className="mr-2 h-3.5 w-3.5" />Повторить</Button></div>
                 : results.length === 0 ? <div className="flex min-h-64 flex-col items-center justify-center p-8 text-center"><SearchIcon className="mb-3 h-7 w-7 text-muted-foreground/60" /><h3 className="text-base font-semibold">Компании не найдены</h3><p className="mt-2 max-w-sm text-sm text-muted-foreground">Попробуйте расширить город или соседнюю отрасль. Поиск принимает любой текст, не только подсказки.</p><Button data-testid="button-clear-search" type="button" variant="ghost" size="sm" className="mt-3" onClick={() => { setCity(""); setIndustry(""); }}>Очистить критерии</Button></div>
                 : visibleResults.length === 0 ? <div className="flex min-h-64 flex-col items-center justify-center p-8 text-center"><Filter className="mb-3 h-6 w-6 text-muted-foreground" /><h3 className="text-sm font-semibold">Нет результатов по этому фильтру</h3><p className="mt-1 text-xs text-muted-foreground">Снизьте минимальный приоритет, чтобы увидеть весь ответ.</p></div>
                : <div className="divide-y divide-border/55">{visibleResults.map((lead) => {
                  const audit = auditSummary(lead);
                  return <Link data-testid={`link-search-result-${lead.id}`} key={lead.id} href={`/leads/${lead.id}`} className="group block p-4 transition-colors hover:bg-accent/35">
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
                        <div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2.5"><span data-testid={`text-result-name-${lead.id}`} className="truncate text-sm font-semibold">{lead.name}</span><span className="rounded bg-muted px-2 py-1 text-[9px] font-bold uppercase tracking-wider text-muted-foreground">{lead.industry}</span></div><div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[11px] text-muted-foreground"><span className="flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5" />{lead.city}</span>{lead.websiteStatus === "present" ? <a href={safeWebsiteUrl(lead.website) ?? undefined} target="_blank" rel="noopener noreferrer" onClick={(event) => event.stopPropagation()} className="flex items-center gap-1.5 text-emerald-300 hover:underline"><CheckCircle2 className="h-3.5 w-3.5" />Есть сайт · {websiteHost(lead.website)}<ExternalLink className="h-3 w-3 opacity-60" /></a> : <span className="flex items-center gap-1.5 text-cyan-400"><AlertTriangle className="h-3.5 w-3.5" />Сайта нет</span>}</div></div>
                       <div className="flex flex-wrap items-center gap-2 lg:w-[390px] lg:justify-end"><span data-testid={`status-audit-${lead.id}`} className={cn("inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px]", audit.tone === "good" ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300" : audit.tone === "warn" ? "border-cyan-500/30 bg-cyan-500/10 text-cyan-300" : "border-border/70 bg-background text-muted-foreground")}>{audit.tone === "good" ? <CheckCircle2 className="h-3 w-3" /> : audit.tone === "warn" ? <XCircle className="h-3 w-3" /> : <Globe2 className="h-3 w-3" />}{audit.label}</span>{lead.issues.slice(0, 1).map((issue, index) => <span key={`${lead.id}-${index}`} className="max-w-44 truncate rounded border border-border/60 bg-background px-2 py-1 text-[10px] text-muted-foreground">{issue}</span>)}<span className={cn("border-l border-border/60 pl-3 font-mono text-lg font-semibold", lead.score >= 80 ? "text-emerald-300" : lead.score >= 50 ? "text-cyan-300" : "text-rose-300")}>{lead.score}<span className="ml-1 text-[9px] font-bold uppercase tracking-wider text-muted-foreground">приоритет</span></span><span className="text-lg text-muted-foreground transition-transform group-hover:translate-x-0.5">→</span></div>
                    </div>
                  </Link>;
                })}</div>}
            </div>
          </section>
        )}
      </div>
    </AppLayout>
  );
}
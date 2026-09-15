import { useState, useRef, useEffect } from "react";
import { useSearchLeads } from "@workspace/api-client-react";
import { AppLayout } from "@/components/layout/app-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverAnchor, PopoverContent } from "@/components/ui/popover";
import { Search as SearchIcon, AlertTriangle, Building2, Globe, MapPin, Target, Check, LockKeyhole } from "lucide-react";
import { Link } from "wouter";
import { cn } from "@/lib/utils";

// Static local suggestions catalog
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

const CITIES_BY_COUNTRY: Record<string, typeof POPULAR_CITIES> = {
  россия: POPULAR_CITIES.filter(({ value }) => [
    "Москва", "Санкт-Петербург", "Новосибирск", "Екатеринбург",
    "Казань", "Нижний Новгород", "Красноярск", "Самара",
  ].includes(value)),
  russia: POPULAR_CITIES.filter(({ value }) => [
    "Москва", "Санкт-Петербург", "Новосибирск", "Екатеринбург",
    "Казань", "Нижний Новгород", "Красноярск", "Самара",
  ].includes(value)),
};

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
  { value: "Отель", aliases: ["hotel", "hostel", "отел", "гостиница", "хостел"] }
];

function editDistance(a: string, b: string) {
  const row = Array.from({ length: b.length + 1 }, (_, index) => index);
  for (let i = 1; i <= a.length; i++) {
    let previous = row[0];
    row[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const current = row[j];
      row[j] = a[i - 1] === b[j - 1]
        ? previous
        : Math.min(previous + 1, row[j - 1] + 1, current + 1);
      previous = current;
    }
  }
  return row[b.length];
}

function SuggestionInput({ 
  value, 
  onChange, 
  options, 
  placeholder, 
  icon: Icon,
  disabled = false
}: { 
  value: string; 
  onChange: (v: string) => void; 
  options: typeof POPULAR_CITIES; 
  placeholder: string;
  icon: React.ElementType;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [inputVal, setInputVal] = useState(value);
  const inputRef = useRef<HTMLInputElement>(null);

  // Sync prop value to input state
  useEffect(() => {
    setInputVal(value);
  }, [value]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputVal(e.target.value);
    onChange(e.target.value); // keep parent state in sync for free text
  };

  const handleSelect = (selectedValue: string) => {
    setInputVal(selectedValue);
    onChange(selectedValue);
    setOpen(false);
  };

  // Typo-tolerant and abbreviation-aware filtering
  const filteredOptions = [...options].filter(opt => {
    if (!inputVal.trim()) return true;
    const lowerInput = inputVal.toLowerCase().trim();
    const candidates = [opt.value, ...opt.aliases].map((item) => item.toLowerCase());
    return candidates.some((candidate) =>
      candidate.includes(lowerInput) ||
      lowerInput.includes(candidate) ||
      editDistance(candidate, lowerInput) <= Math.max(1, Math.floor(lowerInput.length * 0.34))
    );
  }).sort((a, b) => {
    if (!inputVal.trim()) return 0;
    const query = inputVal.toLowerCase().trim();
    const rank = (option: typeof options[number]) => Math.min(...[option.value, ...option.aliases].map((item) => {
      const candidate = item.toLowerCase();
      return candidate.includes(query) || query.includes(candidate) ? 0 : editDistance(candidate, query);
    }));
    return rank(a) - rank(b);
  });

  return (
    <Popover open={open && !disabled} onOpenChange={setOpen}>
      <PopoverAnchor asChild>
        <div className="relative">
          <Icon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input 
            ref={inputRef}
            value={inputVal} 
            onChange={handleInputChange} 
            onClick={() => setOpen(true)}
            onFocus={() => setOpen(true)}
            className="pl-9 h-11 text-sm bg-background border-border/50 rounded-xl shadow-sm"
            placeholder={placeholder}
            disabled={disabled}
          />
        </div>
      </PopoverAnchor>
      <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-1 rounded-xl shadow-lg border-border/50" align="start">
        {filteredOptions.length === 0 ? (
          <div className="p-2 text-xs text-muted-foreground text-center">Press Enter to use "{inputVal}"</div>
        ) : (
          <div className="max-h-[200px] overflow-y-auto">
            {filteredOptions.map((opt) => (
              <div 
                key={opt.value} 
                onClick={() => handleSelect(opt.value)}
                className="px-3 py-2 text-sm font-medium hover:bg-accent rounded-lg cursor-pointer flex items-center justify-between group"
              >
                <span>{opt.value}</span>
                {value === opt.value && <Check className="w-4 h-4 text-primary" />}
              </div>
            ))}
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}

export function SearchPage() {
  const country = "Россия";
  const [city, setCity] = useState("");
  const [industry, setIndustry] = useState("");
  const [hasSearched, setHasSearched] = useState(false);

  const searchMutation = useSearchLeads();

  const cityOptions = CITIES_BY_COUNTRY.россия;

  useEffect(() => {
    if (city && cityOptions.length > 0 &&
      !cityOptions.some((option) => option.value.toLowerCase() === city.toLowerCase())) {
      setCity("");
    }
  }, [city, cityOptions]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!country && !city && !industry) return;
    
    setHasSearched(true);
    searchMutation.mutate({
      data: { country, city, industry }
    });
  };

  const results = searchMutation.data || [];
  const cityDisabled = false;

  return (
    <AppLayout>
      <div className="space-y-6 flex flex-col h-full">
        <div className="flex items-center justify-between pb-2 shrink-0">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">Search</h1>
            <p className="text-sm font-medium text-muted-foreground mt-1">Discover new clients and opportunities</p>
          </div>
        </div>

        <div className="bg-card border border-card-border rounded-2xl p-5 shrink-0 shadow-sm relative overflow-hidden">
          <form onSubmit={handleSearch} className="relative z-10 grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
            <div className="flex flex-col gap-2">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Country</Label>
              <div className="flex h-11 items-center gap-2 rounded-xl border border-border/50 bg-background px-3 text-sm font-bold text-foreground shadow-sm">
                <LockKeyhole className="h-4 w-4 text-muted-foreground" />
                Россия
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">City</Label>
              <SuggestionInput 
                value={city}
                onChange={setCity}
                options={cityOptions}
                placeholder="например, Красноярск"
                icon={MapPin}
                disabled={cityDisabled}
              />
            </div>

            <div className="flex flex-col gap-2">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Industry</Label>
              <SuggestionInput 
                value={industry}
                onChange={setIndustry}
                options={POPULAR_INDUSTRIES}
                placeholder="e.g. Dentistry"
                icon={Building2}
              />
            </div>

            <Button type="submit" disabled={searchMutation.isPending} className="h-11 rounded-xl font-bold bg-primary text-primary-foreground w-full shadow-md">
              <SearchIcon className="w-4 h-4 mr-2" />
              Find Clients
            </Button>
          </form>
        </div>

        {hasSearched && (
          <div className="flex-1 flex flex-col min-h-0 overflow-hidden bg-card border border-card-border rounded-2xl shadow-sm">
            <div className="flex items-center justify-between p-4 border-b border-border/40 shrink-0 bg-muted/30">
              <h2 className="text-sm font-bold uppercase tracking-widest text-foreground/80 flex items-center gap-2">
                <Target className="w-4 h-4 text-primary" />
                Results {results.length > 0 && <span className="bg-primary/10 text-primary px-2 py-0.5 rounded-full text-xs">{results.length}</span>}
              </h2>
            </div>

            <div className="flex-1 overflow-y-auto">
              {searchMutation.isPending ? (
                <div className="h-full flex flex-col items-center justify-center text-sm font-medium text-muted-foreground p-8 space-y-4">
                  <div className="w-8 h-8 rounded-full border-4 border-primary/30 border-t-primary animate-spin" />
                  <p>Searching for opportunities...</p>
                </div>
              ) : results.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center p-8 text-center max-w-sm mx-auto">
                  <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
                    <SearchIcon className="w-8 h-8 text-muted-foreground/50" />
                  </div>
                  <h3 className="text-lg font-bold text-foreground mb-2">No clients found</h3>
                  <p className="text-sm font-medium text-muted-foreground">Try adjusting your search criteria. Selecting a broader geography or industry might yield more results.</p>
                </div>
              ) : (
                <div className="divide-y divide-border/40 p-2 space-y-2">
                  {results.slice(0, 5).map((lead) => (
                    <Link key={lead.id} href={`/leads/${lead.id}`} className="flex items-center p-4 rounded-xl cursor-pointer border border-transparent">
                      <div className="flex-1 min-w-0 pr-4">
                        <div className="flex items-center gap-3 mb-2">
                          <span className="text-base font-bold text-foreground truncate">{lead.name}</span>
                          <span className="text-[10px] px-2 py-1 rounded-full bg-muted font-bold text-muted-foreground shrink-0 uppercase tracking-wider">
                            {lead.industry}
                          </span>
                        </div>
                        <div className="flex items-center gap-5 text-xs font-medium text-muted-foreground">
                          <span className="flex items-center gap-1.5">
                            <MapPin className="w-3.5 h-3.5 opacity-70" />
                            {lead.city}, {lead.country}
                          </span>
                          {lead.website ? (
                            <span className="flex items-center gap-1.5 text-blue-500">
                              <Globe className="w-3.5 h-3.5 opacity-70" />
                              {new URL(lead.website).hostname.replace('www.', '')}
                            </span>
                          ) : (
                            <span className="flex items-center gap-1.5 text-orange-500">
                              <AlertTriangle className="w-3.5 h-3.5 opacity-70" />
                              No website
                            </span>
                          )}
                        </div>
                      </div>
                      
                      <div className="w-48 shrink-0 pr-6">
                        <div className="flex flex-wrap gap-1.5">
                          {lead.issues.slice(0, 2).map((issue, i) => (
                            <span key={i} className="text-[10px] px-2 py-1 rounded-md bg-background border border-border/50 font-medium text-muted-foreground truncate max-w-full">
                              {issue}
                            </span>
                          ))}
                          {lead.issues.length > 2 && (
                            <span className="text-[10px] px-2 py-1 rounded-md bg-background border border-border/50 font-bold text-muted-foreground">
                              +{lead.issues.length - 2}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="w-20 shrink-0 flex flex-col items-end pr-4 border-r border-border/40 mr-4">
                        <span className={cn(
                          "font-mono text-xl font-black",
                          lead.score >= 80 ? "text-emerald-500" : lead.score >= 50 ? "text-amber-500" : "text-rose-500"
                        )}>
                          {lead.score}
                        </span>
                        <div className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest mt-0.5">Score</div>
                      </div>
                      
                      <div className="w-10 shrink-0 flex justify-end">
                        <div className="w-8 h-8 rounded-full bg-background border border-border/50 flex items-center justify-center text-muted-foreground">
                          <span className="font-bold">→</span>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}

import { useState } from "react";
import { useSearchLeads, useListCountries } from "@workspace/api-client-react";
import { AppLayout } from "@/components/layout/app-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search as SearchIcon, AlertTriangle, Building2, Globe, MapPin } from "lucide-react";
import { Link } from "wouter";
import { cn } from "@/lib/utils";

export function SearchPage() {
  const [country, setCountry] = useState("");
  const [city, setCity] = useState("");
  const [industry, setIndustry] = useState("");
  const [hasSearched, setHasSearched] = useState(false);

  const { data: countries } = useListCountries();
  const searchMutation = useSearchLeads();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!country && !city && !industry) return;
    
    setHasSearched(true);
    searchMutation.mutate({
      data: { country, city, industry }
    });
  };

  const results = searchMutation.data || [];

  return (
    <AppLayout>
      <div className="space-y-6 flex flex-col h-full">
        <div className="flex items-center justify-between border-b border-border/40 pb-4 shrink-0">
          <div>
            <h1 className="text-lg font-bold tracking-tight">Поиск</h1>
            <p className="text-xs text-muted-foreground mt-0.5">Поиск потенциальных клиентов</p>
          </div>
        </div>

        <div className="bg-card border border-card-border rounded-xl p-4 shrink-0 shadow-sm">
          <form onSubmit={handleSearch} className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
            <div className="space-y-1.5">
              <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Страна</Label>
              <Select value={country} onValueChange={setCountry}>
                <SelectTrigger className="h-8 text-xs bg-background/50 border-border/50">
                  <SelectValue placeholder="Любая" />
                </SelectTrigger>
                <SelectContent className="text-xs">
                  <SelectItem value="any">Любая</SelectItem>
                  {countries?.filter(c => c.enabled).map(c => (
                    <SelectItem key={c.code} value={c.name}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Город</Label>
              <div className="relative">
                <MapPin className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input 
                  value={city} 
                  onChange={e => setCity(e.target.value)} 
                  className="pl-8 h-8 text-xs bg-background/50 border-border/50" 
                  placeholder="Например: Москва" 
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Отрасль</Label>
              <div className="relative">
                <Building2 className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input 
                  value={industry} 
                  onChange={e => setIndustry(e.target.value)} 
                  className="pl-8 h-8 text-xs bg-background/50 border-border/50" 
                  placeholder="Например: Стоматология" 
                />
              </div>
            </div>

            <Button type="submit" disabled={searchMutation.isPending} className="h-8 text-xs bg-foreground text-background hover:bg-foreground/90 w-full shadow-sm">
              <SearchIcon className="w-3.5 h-3.5 mr-1.5" />
              Найти
            </Button>
          </form>
        </div>

        {hasSearched && (
          <div className="flex-1 flex flex-col min-h-0 overflow-hidden bg-card border border-card-border rounded-xl shadow-sm">
            <div className="flex items-center justify-between p-3 border-b border-border/40 shrink-0 bg-accent/10">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Результаты {results.length > 0 && <span>({results.length})</span>}
              </h2>
            </div>

            <div className="flex-1 overflow-y-auto">
              {searchMutation.isPending ? (
                <div className="h-full flex items-center justify-center text-xs text-muted-foreground p-8">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full border-2 border-primary/30 border-t-primary animate-spin" />
                    Поиск компаний...
                  </div>
                </div>
              ) : results.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center p-8">
                  <SearchIcon className="w-6 h-6 text-muted-foreground/30 mb-3" />
                  <p className="text-xs text-muted-foreground">Ничего не найдено</p>
                </div>
              ) : (
                <div className="divide-y divide-border/40">
                  {results.map((lead) => (
                    <Link key={lead.id} href={`/leads/${lead.id}`} className="flex items-center p-3 hover:bg-accent/40 transition-colors group cursor-default">
                      <div className="flex-1 min-w-0 pr-4">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs font-medium text-foreground truncate">{lead.name}</span>
                          <span className="text-[10px] px-1.5 py-0.5 rounded-sm bg-accent text-muted-foreground border border-border/50 shrink-0">
                            {lead.industry}
                          </span>
                        </div>
                        <div className="flex items-center gap-4 text-[10px] text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <MapPin className="w-3 h-3 opacity-70" />
                            {lead.city}, {lead.country}
                          </span>
                          {lead.website ? (
                            <span className="flex items-center gap-1 text-blue-400/80">
                              <Globe className="w-3 h-3 opacity-70" />
                              {new URL(lead.website).hostname.replace('www.', '')}
                            </span>
                          ) : (
                            <span className="flex items-center gap-1 text-orange-400/80">
                              <AlertTriangle className="w-3 h-3 opacity-70" />
                              Нет сайта
                            </span>
                          )}
                        </div>
                      </div>
                      
                      <div className="w-32 shrink-0 pr-4">
                        <div className="flex flex-wrap gap-1">
                          {lead.issues.slice(0, 1).map((issue, i) => (
                            <span key={i} className="text-[9px] px-1.5 py-0.5 rounded-sm bg-background border border-border/50 text-muted-foreground truncate max-w-full">
                              {issue}
                            </span>
                          ))}
                          {lead.issues.length > 1 && (
                            <span className="text-[9px] px-1.5 py-0.5 rounded-sm bg-background border border-border/50 text-muted-foreground">
                              +{lead.issues.length - 1}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="w-16 shrink-0 text-right pr-2">
                        <span className={cn(
                          "font-mono text-xs font-semibold",
                          lead.score >= 80 ? "text-emerald-400" : lead.score >= 50 ? "text-amber-400" : "text-rose-400"
                        )}>
                          {lead.score}
                        </span>
                        <div className="text-[9px] text-muted-foreground uppercase tracking-wider mt-0.5">Score</div>
                      </div>
                      
                      <div className="w-8 shrink-0 flex justify-end">
                        <div className="w-6 h-6 rounded-md bg-accent/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                          <span className="text-xs">→</span>
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

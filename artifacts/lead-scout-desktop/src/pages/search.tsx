import { useState } from "react";
import { useSearchLeads, useListCountries } from "@workspace/api-client-react";
import { AppLayout } from "@/components/layout/app-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Search as SearchIcon, AlertTriangle, Building2, Globe, MapPin, ArrowRight } from "lucide-react";
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
      <div className="p-8 max-w-7xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Поиск лидов</h1>
          <p className="text-muted-foreground mt-2">Поиск и ранжирование компаний со слабым сайтом.</p>
        </div>

        <Card className="border-border/50 shadow-sm bg-card">
          <CardContent className="p-6">
            <form onSubmit={handleSearch} className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
              <div className="space-y-2">
                <Label>Страна</Label>
                <Select value={country} onValueChange={setCountry}>
                  <SelectTrigger>
                    <SelectValue placeholder="Любая" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="any">Любая</SelectItem>
                    {countries?.filter(c => c.enabled).map(c => (
                      <SelectItem key={c.code} value={c.name}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Город</Label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input 
                    value={city} 
                    onChange={e => setCity(e.target.value)} 
                    className="pl-9" 
                    placeholder="Например: Москва" 
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Отрасль</Label>
                <div className="relative">
                  <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input 
                    value={industry} 
                    onChange={e => setIndustry(e.target.value)} 
                    className="pl-9" 
                    placeholder="Например: Стоматология" 
                  />
                </div>
              </div>

              <Button type="submit" disabled={searchMutation.isPending} className="w-full">
                <SearchIcon className="w-4 h-4" />
                Найти
              </Button>
            </form>
          </CardContent>
        </Card>

        {hasSearched && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold">
                Результаты {results.length > 0 && <span className="text-muted-foreground font-normal ml-2">({results.length})</span>}
              </h2>
            </div>

            {searchMutation.isPending ? (
              <div className="py-20 text-center text-muted-foreground border rounded-lg bg-card">
                Ищем подходящие компании...
              </div>
            ) : results.length === 0 ? (
              <div className="py-20 text-center border rounded-lg bg-card flex flex-col items-center">
                <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
                  <SearchIcon className="w-8 h-8 text-muted-foreground/50" />
                </div>
                <h3 className="text-lg font-medium text-foreground">Ничего не найдено</h3>
                <p className="text-muted-foreground mt-1 max-w-sm">Попробуйте изменить параметры поиска или расширить географию.</p>
              </div>
            ) : (
              <Card className="border-border/50 shadow-sm overflow-hidden">
                <Table>
                  <TableHeader className="bg-muted/30">
                    <TableRow>
                      <TableHead>Компания</TableHead>
                      <TableHead>Локация</TableHead>
                      <TableHead>Сайт</TableHead>
                      <TableHead className="w-[200px]">Проблемы</TableHead>
                      <TableHead className="text-right w-[120px]">Оценка (0-100)</TableHead>
                      <TableHead className="w-[100px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {results.map((lead) => (
                      <TableRow key={lead.id} className="hover:bg-muted/50 cursor-pointer group">
                        <TableCell className="font-medium">
                          {lead.name}
                          <div className="text-xs text-muted-foreground font-normal mt-0.5">{lead.industry}</div>
                        </TableCell>
                        <TableCell>
                          <span className="text-foreground/80">{lead.city}, {lead.country}</span>
                        </TableCell>
                        <TableCell>
                          {lead.website ? (
                            <a href={lead.website} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline text-sm flex items-center gap-1">
                              <Globe className="w-3 h-3" />
                              {new URL(lead.website).hostname.replace('www.', '')}
                            </a>
                          ) : (
                            <span className="text-muted-foreground text-sm flex items-center gap-1">
                              <AlertTriangle className="w-3 h-3 text-warning" />
                              Нет сайта
                            </span>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {lead.issues.slice(0, 2).map((issue, i) => (
                              <Badge key={i} variant="secondary" className="text-[10px] px-1.5 py-0">
                                {issue}
                              </Badge>
                            ))}
                            {lead.issues.length > 2 && (
                              <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                                +{lead.issues.length - 2}
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          <span className={cn(
                            "font-bold text-lg",
                            lead.score >= 80 ? "text-success" : lead.score >= 50 ? "text-warning" : "text-destructive"
                          )}>
                            {lead.score}
                          </span>
                        </TableCell>
                        <TableCell>
                          <Link href={`/leads/${lead.id}`} className="inline-flex h-8 items-center justify-center rounded-md bg-secondary text-secondary-foreground px-3 text-xs font-medium shadow-sm transition-colors hover:bg-secondary/80 w-full opacity-0 group-hover:opacity-100">
                            Открыть
                          </Link>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Card>
            )}
          </div>
        )}
      </div>
    </AppLayout>
  );
}

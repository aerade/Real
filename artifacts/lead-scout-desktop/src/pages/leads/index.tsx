import { useMemo, useState } from "react";
import { useListLeads } from "@workspace/api-client-react";
import { AppLayout } from "@/components/layout/app-layout";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { statusMap } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { Link } from "wouter";
import { ArrowRight, BriefcaseBusiness, Filter, Search, Target, TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";

function websiteHost(value?: string | null) {
  if (!value) return null;
  try { return new URL(value).hostname.replace(/^www\./, ""); } catch { return value; }
}

export function LeadsPage() {
  const [status, setStatus] = useState("all");
  const [query, setQuery] = useState("");
  const { data: leads, isLoading, isError, refetch } = useListLeads({ assignedToMe: true });
  const allLeads = leads ?? [];
  const counts = useMemo(() => Object.keys(statusMap).reduce<Record<string, number>>((acc, key) => { acc[key] = allLeads.filter((lead) => lead.status === key).length; return acc; }, {}), [allLeads]);
  const visibleLeads = useMemo(() => allLeads.filter((lead) => {
    const matchesStatus = status === "all" || lead.status === status;
    const needle = query.trim().toLowerCase();
    return matchesStatus && (!needle || `${lead.name} ${lead.city} ${lead.industry}`.toLowerCase().includes(needle));
  }), [allLeads, query, status]);
  const activeCount = allLeads.filter((lead) => !["rejected", "deal"].includes(lead.status)).length;
  const averageScore = allLeads.length ? Math.round(allLeads.reduce((sum, lead) => sum + lead.score, 0) / allLeads.length) : 0;

  return (
    <AppLayout>
      <div className="flex h-full min-h-0 flex-col gap-5">
         <header className="shrink-0 border-b border-border/70 pb-5"><p className="mb-2 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.2em] text-primary"><BriefcaseBusiness className="h-3.5 w-3.5" />Личное рабочее пространство</p><div><h1 className="text-2xl font-semibold tracking-tight">Ваша воронка</h1><p className="mt-1 text-sm text-muted-foreground">Компании в вашей работе, а не весь каталог.</p></div></header>
        <section className="grid grid-cols-2 gap-3 md:grid-cols-4"><SummaryCard label="Всего клиентов" value={allLeads.length} detail="Назначено вам" /><SummaryCard label="Активная воронка" value={activeCount} detail="Требует движения" accent /><SummaryCard label="Средний приоритет" value={averageScore} detail="По вашим записям" /><SummaryCard label="Выигранные сделки" value={counts.deal ?? 0} detail="Успешно закрыто" /></section>
        <section className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-border/70 bg-card shadow-sm">
          <div className="shrink-0 border-b border-border/70 p-4"><div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between"><div><p className="text-[10px] font-bold uppercase tracking-[0.16em] text-primary">Рабочая очередь</p><h2 className="mt-1 text-base font-semibold">Компании в вашей работе</h2></div><div className="flex flex-col gap-2 sm:flex-row"><div className="relative"><Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" /><Input data-testid="input-filter-clients" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Фильтр по компании, городу, отрасли" className="h-9 w-full bg-background pl-8 text-xs sm:w-64" /></div><Select value={status} onValueChange={setStatus}><SelectTrigger data-testid="select-client-status" className="h-9 w-full text-xs sm:w-40"><Filter className="mr-2 h-3.5 w-3.5 text-muted-foreground" /><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">Все этапы</SelectItem>{Object.entries(statusMap).map(([key, item]) => <SelectItem key={key} value={key}>{item.label} · {counts[key] ?? 0}</SelectItem>)}</SelectContent></Select></div></div></div>
           <div className="min-h-[22rem] flex-1 overflow-y-auto">
            {isLoading ? <div className="space-y-3 p-4">{[1, 2, 3, 4].map((item) => <div key={item} className="h-20 animate-pulse rounded-lg bg-muted/50" />)}</div>
              : isError ? <div className="flex min-h-64 flex-col items-center justify-center p-8 text-center"><TriangleAlert className="mb-3 h-7 w-7 text-destructive" /><h3 className="text-sm font-semibold">Не удалось загрузить воронку</h3><p className="mt-1 max-w-sm text-xs text-muted-foreground">Попробуйте ещё раз, чтобы восстановить рабочее пространство.</p><Button data-testid="button-retry-clients" type="button" variant="outline" size="sm" className="mt-4" onClick={() => refetch()}>Повторить</Button></div>
              : visibleLeads.length === 0 ? <div className="flex min-h-64 flex-col items-center justify-center p-8 text-center"><Target className="mb-3 h-8 w-8 text-muted-foreground/40" /><h3 className="text-sm font-semibold">{allLeads.length ? "Клиенты не соответствуют этому виду" : "Ваша воронка пуста"}</h3><p className="mt-1 max-w-xs text-xs leading-5 text-muted-foreground">{allLeads.length ? "Измените этап или поисковый запрос, чтобы увидеть другую часть очереди." : "Найдите компании и возьмите в работу первую запись, которая подходит для разговора."}</p><Link data-testid="link-empty-clients-search" href="/search" className="mt-4 inline-flex h-8 items-center gap-2 rounded-md bg-primary px-3 text-xs font-semibold text-primary-foreground">Перейти к поиску<ArrowRight className="h-3.5 w-3.5" /></Link></div>
             : <div className="divide-y divide-border/50"><div className="sticky top-0 z-10 hidden grid-cols-[2fr_1.2fr_1fr_1fr_70px] gap-4 border-b border-border/60 bg-card/95 px-5 py-3 text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground backdrop-blur sm:grid"><span>Компания</span><span>Контекст</span><span>Этап</span><span>Обновлено</span><span className="text-right">Приоритет</span></div>{visibleLeads.map((lead) => { const leadStatus = statusMap[lead.status] ?? { label: lead.status, variant: "neutral" }; const website = lead.website ? (() => { try { const url = new URL(lead.website); return url.protocol === "http:" || url.protocol === "https:" ? url.href : null; } catch { return null; } })() : null; return <Link data-testid={`link-client-${lead.id}`} key={lead.id} href={`/leads/${lead.id}`} className="group grid gap-3 px-5 py-5 transition-colors hover:bg-accent/35 sm:grid-cols-[2fr_1.2fr_1fr_1fr_70px] sm:items-center sm:gap-4"><div className="min-w-0"><p data-testid={`text-client-name-${lead.id}`} className="truncate text-xs font-semibold">{lead.name}</p>{website ? <a href={website} target="_blank" rel="noopener noreferrer" onClick={(event) => event.stopPropagation()} className="mt-1 block truncate text-[10px] text-primary hover:underline">{websiteHost(lead.website)}</a> : <p className="mt-1 truncate text-[10px] text-muted-foreground">Сайт не указан</p>}</div><div className="min-w-0"><p className="truncate text-xs text-foreground/85">{lead.industry}</p><p className="mt-1 truncate text-[10px] text-muted-foreground">{lead.city}</p></div><div><span data-testid={`status-client-${lead.id}`} className="inline-flex rounded-full border border-border/70 bg-background px-2 py-1 text-[10px] text-muted-foreground">{leadStatus.label}</span></div><div className="text-[10px] text-muted-foreground">{new Date(lead.updatedAt).toLocaleDateString("ru-RU", { day: "numeric", month: "short" })}</div><div className={cn("text-left font-mono text-sm font-semibold sm:text-right", lead.score >= 80 ? "text-emerald-300" : lead.score >= 50 ? "text-cyan-300" : "text-rose-300")}>{lead.score}</div></Link>; })}</div>}
          </div>
        </section>
      </div>
    </AppLayout>
  );
}

function SummaryCard({ label, value, detail, accent = false }: { label: string; value: number; detail: string; accent?: boolean }) {
  return <div className={cn("rounded-xl border border-border/70 bg-card p-4 shadow-sm", accent && "border-primary/30")}><p className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">{label}</p><p data-testid={`text-pipeline-${label.toLowerCase().replaceAll(" ", "-")}`} className={cn("mt-3 font-mono text-2xl font-semibold", accent && "text-primary")}>{value}</p><p className="mt-1 text-[10px] text-muted-foreground">{detail}</p></div>;
}
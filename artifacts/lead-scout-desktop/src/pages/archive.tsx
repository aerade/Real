import { useMemo, useState } from "react";
import { useListLeadArchive } from "@workspace/api-client-react";
import { Link } from "wouter";
import { Archive, ArrowLeft, ArrowRight, Filter, History, Search, Target, TriangleAlert } from "lucide-react";
import { AppLayout } from "@/components/layout/app-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { statusMap } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { useLocation } from "wouter";

function formatUpdatedAt(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Дата не указана";
  return date.toLocaleDateString("ru-RU", { day: "numeric", month: "short", year: "numeric" });
}

export function ArchivePage() {
  const [, setLocation] = useLocation();
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");
  const archiveParams = useMemo(
    () => ({
      query: query.trim() || undefined,
      status: status === "all" ? undefined : status,
    }),
    [query, status],
  );
  const { data: leads, isLoading, isError, refetch } = useListLeadArchive(archiveParams);
  const archive = leads ?? [];

  return (
    <AppLayout>
      <div className="flex h-full min-h-0 flex-col gap-5">
        <header className="shrink-0 border-b border-border/70 pb-5">
          <Button type="button" variant="ghost" size="sm" onClick={() => setLocation("/")} className="mb-4 -ml-2 h-8 gap-1.5 px-2 text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
            <ArrowLeft className="h-3.5 w-3.5" />
            Выйти из архива
          </Button>
          <p className="mb-2 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.2em] text-primary">
            <Archive className="h-3.5 w-3.5" />
            Полная история
          </p>
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h1 className="text-2xl font-semibold tracking-tight">Архив клиентов</h1>
              <p className="mt-1 max-w-xl text-sm text-muted-foreground">
                Все компании, которые команда когда-либо находила. История остается доступной для повторного контакта.
              </p>
            </div>
            <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
              <History className="h-3.5 w-3.5" />
              <span data-testid="text-archive-count">{isLoading ? "Загрузка" : `${archive.length} записей`}</span>
            </div>
          </div>
        </header>

        <section className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-border/70 bg-card shadow-sm">
          <div className="shrink-0 border-b border-border/70 p-4">
            <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-primary">Поиск по истории</p>
                <h2 className="mt-1 text-base font-semibold">Найти компанию в архиве</h2>
              </div>
              <div className="flex w-full flex-col gap-2 sm:flex-row lg:w-auto">
                <div className="relative w-full sm:w-72">
                  <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    data-testid="input-archive-search"
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder="Компания, город, отрасль или сайт"
                    className="h-9 bg-background pl-8 text-xs"
                    aria-label="Поиск по архиву клиентов"
                  />
                </div>
                <Select value={status} onValueChange={setStatus}>
                  <SelectTrigger data-testid="select-archive-status" className="h-9 w-full text-xs sm:w-44">
                    <Filter className="mr-2 h-3.5 w-3.5 text-muted-foreground" />
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Все этапы</SelectItem>
                    {Object.entries(statusMap).map(([key, item]) => (
                      <SelectItem key={key} value={key}>
                        {item.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <div className="min-h-[22rem] flex-1 overflow-y-auto">
            {isLoading ? (
              <div data-testid="archive-loading-state" className="space-y-3 p-4">
                {[1, 2, 3, 4, 5].map((item) => (
                  <div key={item} className="h-[4.8rem] animate-pulse rounded-lg bg-muted/50" />
                ))}
              </div>
            ) : isError ? (
              <div data-testid="archive-error-state" className="flex min-h-64 flex-col items-center justify-center p-8 text-center">
                <TriangleAlert className="mb-3 h-7 w-7 text-destructive" />
                <h3 className="text-sm font-semibold">Не удалось загрузить архив</h3>
                <p className="mt-1 max-w-sm text-xs text-muted-foreground">
                  Проверьте соединение и повторите запрос, чтобы восстановить историю клиентов.
                </p>
                <Button
                  data-testid="button-retry-archive"
                  type="button"
                  variant="outline"
                  size="sm"
                  className="mt-4"
                  onClick={() => refetch()}
                >
                  Повторить
                </Button>
              </div>
            ) : archive.length === 0 ? (
              <div data-testid="archive-empty-state" className="flex min-h-64 flex-col items-center justify-center p-8 text-center">
                <Target className="mb-3 h-8 w-8 text-muted-foreground/40" />
                <h3 className="text-sm font-semibold">
                  {query.trim() || status !== "all" ? "В архиве ничего не найдено" : "Архив пока пуст"}
                </h3>
                <p className="mt-1 max-w-sm text-xs leading-5 text-muted-foreground">
                  {query.trim() || status !== "all"
                    ? "Измените поисковый запрос или этап, чтобы увидеть другие записи."
                    : "Найденные компании появятся здесь и останутся доступны всей команде."}
                </p>
              </div>
            ) : (
              <div className="divide-y divide-border/50">
                <div className="sticky top-0 z-10 hidden grid-cols-[2fr_1.2fr_1.1fr_1fr_70px] gap-4 border-b border-border/60 bg-card/95 px-5 py-3 text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground backdrop-blur sm:grid">
                  <span>Компания</span>
                  <span>Контекст</span>
                  <span>Этап</span>
                  <span>Обновлено</span>
                  <span className="text-right">Приоритет</span>
                </div>
                {archive.map((lead) => {
                  const leadStatus = statusMap[lead.status] ?? { label: lead.status, variant: "neutral" };
                  return (
                    <Link
                      data-testid={`link-archive-client-${lead.id}`}
                      key={lead.id}
                      href={`/leads/${lead.id}`}
                      className="group grid gap-3 px-5 py-4 transition-colors hover:bg-accent/35 sm:grid-cols-[2fr_1.2fr_1.1fr_1fr_70px] sm:items-center sm:gap-4"
                    >
                      <div className="min-w-0">
                        <p data-testid={`text-archive-company-${lead.id}`} className="truncate text-xs font-semibold">
                          {lead.name}
                        </p>
                        <p className="mt-1 truncate text-[10px] text-muted-foreground">ID клиента · {lead.id}</p>
                      </div>
                      <div className="min-w-0">
                        <p data-testid={`text-archive-industry-${lead.id}`} className="truncate text-xs text-foreground/85">
                          {lead.industry}
                        </p>
                        <p data-testid={`text-archive-city-${lead.id}`} className="mt-1 truncate text-[10px] text-muted-foreground">
                          {lead.city}
                        </p>
                      </div>
                      <div>
                        <span
                          data-testid={`status-archive-client-${lead.id}`}
                          className="inline-flex rounded-full border border-border/70 bg-background px-2 py-1 text-[10px] text-muted-foreground"
                        >
                          {leadStatus.label}
                        </span>
                      </div>
                      <div data-testid={`text-archive-updated-${lead.id}`} className="text-[10px] text-muted-foreground">
                        {formatUpdatedAt(lead.updatedAt)}
                      </div>
                      <div
                        data-testid={`text-archive-score-${lead.id}`}
                        className={cn(
                          "text-left font-mono text-sm font-semibold sm:text-right",
                          lead.score >= 80 ? "text-emerald-300" : lead.score >= 50 ? "text-cyan-300" : "text-rose-300",
                        )}
                      >
                        {lead.score}
                        <ArrowRight className="ml-2 inline-block h-3.5 w-3.5 opacity-0 transition-opacity group-hover:opacity-70" />
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        </section>
      </div>
    </AppLayout>
  );
}
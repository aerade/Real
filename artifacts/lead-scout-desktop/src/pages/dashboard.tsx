import { useGetDashboard } from "@workspace/api-client-react";
import { AppLayout } from "@/components/layout/app-layout";
import { Button } from "@/components/ui/button";
import { statusMap } from "@/lib/constants";
import { ArrowRight, BriefcaseBusiness, CheckCircle2, Inbox, Search, Target, TriangleAlert } from "lucide-react";
import { Link } from "wouter";

export function Dashboard() {
  const { data, isLoading, isError, refetch } = useGetDashboard();
  if (isLoading) return <AppLayout><div className="space-y-5 animate-pulse"><div className="h-5 w-32 rounded bg-muted" /><div className="h-12 w-2/3 rounded bg-muted" /><div className="grid gap-3 md:grid-cols-4">{[1, 2, 3, 4].map((item) => <div key={item} className="h-28 rounded-xl bg-muted" />)}</div><div className="h-80 rounded-xl bg-muted" /></div></AppLayout>;
  if (isError || !data) return <AppLayout><div className="flex min-h-[60vh] flex-col items-center justify-center text-center"><TriangleAlert className="mb-3 h-7 w-7 text-destructive" /><h1 className="text-base font-semibold">Обзор недоступен</h1><p className="mt-2 max-w-sm text-sm text-muted-foreground">Не удалось загрузить обзор. Попробуйте ещё раз — рабочее пространство не изменится.</p><Button data-testid="button-retry-dashboard" type="button" variant="outline" size="sm" className="mt-5" onClick={() => refetch()}>Повторить</Button></div></AppLayout>;

  const stats = [
    { label: "Доступно для взятия", value: data.available, icon: Target, tone: "text-foreground", href: "/search", action: "Найти лиды" },
    { label: "В вашей воронке", value: data.inWork, icon: BriefcaseBusiness, tone: "text-foreground", href: "/leads", action: "Открыть клиентов" },
    { label: "Ответы", value: data.replies, icon: Inbox, tone: "text-foreground", href: "/leads", action: "Проверить ответы" },
    { label: "Сделки", value: data.deals, icon: CheckCircle2, tone: "text-foreground", href: "/leads", action: "Посмотреть сделки" },
  ];
  const maxStage = Math.max(...data.stages.map((stage) => stage.count), 1);
  return (
    <AppLayout>
      <div className="space-y-6">
        <header className="flex flex-col justify-between gap-4 border-b border-border/70 pb-5 sm:flex-row sm:items-end">
          <div><p className="mb-2 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.2em] text-primary"><Target className="h-3.5 w-3.5" />Обзор рабочего пространства</p><h1 className="text-2xl font-semibold tracking-tight">Доброе утро, найдём нужный сигнал.</h1><p className="mt-1 text-sm text-muted-foreground">Ваша воронка, передача лидов и следующие важные действия.</p></div>
          <Link data-testid="link-dashboard-search" href="/search" className="inline-flex h-9 items-center justify-center gap-2 rounded-md bg-primary px-3 text-xs font-semibold text-primary-foreground transition-colors hover:bg-primary/90"><Search className="h-3.5 w-3.5" />Начать поиск</Link>
        </header>
        <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {stats.map((stat) => <Link data-testid={`card-dashboard-${stat.label.toLowerCase().replaceAll(" ", "-")}`} key={stat.label} href={stat.href} className="group rounded-xl border border-border/70 bg-card p-4 shadow-sm transition-colors hover:border-primary/40"><div className="flex items-center justify-between"><span className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">{stat.label}</span><stat.icon className={`h-4 w-4 ${stat.tone}`} /></div><p data-testid={`text-dashboard-${stat.label.toLowerCase().replaceAll(" ", "-")}`} className="mt-4 font-mono text-3xl font-semibold">{stat.value}</p><p className="mt-2 flex items-center gap-1 text-[11px] text-muted-foreground group-hover:text-primary">{stat.action}<ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5" /></p></Link>)}
        </section>
        <div className="grid gap-5 lg:grid-cols-[1.2fr_.8fr]">
          <section className="rounded-xl border border-border/70 bg-card p-5 shadow-sm"><div className="mb-5 flex items-start justify-between"><div><p className="text-[10px] font-bold uppercase tracking-[0.16em] text-primary">Воронка</p><h2 className="mt-1 text-base font-semibold">Где находятся ваши лиды</h2></div><Link data-testid="link-dashboard-pipeline" href="/leads" className="text-[11px] font-semibold text-primary hover:underline">Открыть воронку</Link></div><div className="space-y-4">{data.stages.map((stage) => { const status = statusMap[stage.status] ?? { label: stage.status, variant: "neutral" }; return <div data-testid={`row-stage-${stage.status}`} key={stage.status} className="grid grid-cols-[112px_1fr_32px] items-center gap-3"><span className="truncate text-xs font-medium text-muted-foreground">{status.label}</span><div className="h-2 overflow-hidden rounded-full bg-accent"><div className="h-full rounded-full bg-primary transition-all" style={{ width: `${(stage.count / maxStage) * 100}%` }} /></div><span className="text-right font-mono text-xs font-semibold">{stage.count}</span></div>; })}{data.stages.length === 0 && <p className="rounded-lg border border-dashed border-border p-5 text-xs text-muted-foreground">В активности пока нет этапов воронки.</p>}</div></section>
          <section className="rounded-xl border border-border/70 bg-card p-5 shadow-sm"><div className="mb-5 flex items-start justify-between"><div><p className="text-[10px] font-bold uppercase tracking-[0.16em] text-primary">Следующие действия</p><h2 className="mt-1 text-base font-semibold">Сохраняйте темп</h2></div><Target className="h-4 w-4 text-primary" /></div><div className="space-y-2"><Link data-testid="link-action-available" href="/search" className="flex items-center justify-between rounded-lg border border-border/60 bg-background/45 p-3 transition-colors hover:border-primary/40"><div><p className="text-xs font-semibold">Найти новые возможности</p><p className="mt-1 text-[11px] text-muted-foreground">{data.available} доступно для взятия</p></div><ArrowRight className="h-4 w-4 text-muted-foreground" /></Link><Link data-testid="link-action-pipeline" href="/leads" className="flex items-center justify-between rounded-lg border border-border/60 bg-background/45 p-3 transition-colors hover:border-primary/40"><div><p className="text-xs font-semibold">Проверить вашу воронку</p><p className="mt-1 text-[11px] text-muted-foreground">{data.inWork} лидов в работе</p></div><ArrowRight className="h-4 w-4 text-muted-foreground" /></Link><div className="rounded-lg border border-primary/20 bg-primary/5 p-3"><p className="text-xs font-semibold">Сфокусированная работа лучше переполненной очереди.</p><p className="mt-1 text-[11px] leading-4 text-muted-foreground">Изучите аудит сайта и детализацию оценки перед следующим звонком.</p></div></div></section>
        </div>
      </div>
    </AppLayout>
  );
}
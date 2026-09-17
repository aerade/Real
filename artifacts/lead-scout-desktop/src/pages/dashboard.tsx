import { useGetDashboard } from "@workspace/api-client-react";
import { AppLayout } from "@/components/layout/app-layout";
import { Spinner } from "@/components/ui/spinner";
import { Briefcase, Inbox, Target, Activity } from "lucide-react";
import { statusMap } from "@/lib/constants";

export function Dashboard() {
  const { data, isLoading } = useGetDashboard();

  if (isLoading || !data) {
    return (
      <AppLayout>
        <div className="flex h-full items-center justify-center">
          <Spinner className="h-5 w-5 text-muted-foreground" />
        </div>
      </AppLayout>
    );
  }

  const statCards = [
    { title: "Доступно клиентов", value: data.available, icon: Target },
    { title: "В работе", value: data.inWork, icon: Briefcase },
    { title: "Ответили", value: data.replies, icon: Inbox },
    { title: "Сделки", value: data.deals, icon: Activity },
  ];

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between pb-2">
          <div>
            <h1 className="text-lg font-bold tracking-tight">Рабочий обзор</h1>
            <p className="mt-0.5 text-xs text-muted-foreground">Сводка показателей и активность</p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
          {statCards.map((stat, index) => (
            <div key={index} className="relative flex flex-col gap-3 overflow-hidden rounded-xl border border-card-border bg-card p-4">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">{stat.title}</span>
                <stat.icon className="h-3.5 w-3.5 text-muted-foreground/50" />
              </div>
              <div className="text-2xl font-semibold tracking-tight">{stat.value}</div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 gap-3">
          <div className="rounded-xl border border-card-border bg-card p-5">
            <h3 className="mb-5 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              <Activity className="h-3.5 w-3.5" /> Воронка клиентов
            </h3>
            <div className="space-y-4">
              {data.stages.map((stage) => {
                const maxCount = Math.max(...data.stages.map((item) => item.count), 1);
                const percentage = (stage.count / maxCount) * 100;
                const statusInfo = statusMap[stage.status] || { label: stage.status, variant: "neutral" };

                return (
                  <div key={stage.status} className="flex items-center gap-3">
                    <div className="w-24 text-[11px] font-medium text-muted-foreground">{statusInfo.label}</div>
                    <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-accent">
                      <div className="h-full rounded-full bg-foreground/80" style={{ width: `${percentage}%` }} />
                    </div>
                    <div className="w-8 text-right font-mono text-xs text-foreground/90">{stage.count}</div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
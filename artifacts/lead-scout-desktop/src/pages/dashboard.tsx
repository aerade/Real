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
          <Spinner className="w-5 h-5 text-muted-foreground" />
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
            <p className="text-xs text-muted-foreground mt-0.5">Сводка показателей и активность</p>
          </div>
          
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          {statCards.map((stat, i) => (
            <div key={i} className="bg-card border border-card-border rounded-xl p-4 flex flex-col gap-3 relative overflow-hidden">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">{stat.title}</span>
                <stat.icon className="w-3.5 h-3.5 text-muted-foreground/50" />
              </div>
              <div className="text-2xl font-semibold tracking-tight">{stat.value}</div>
              
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
          <div className="lg:col-span-2 bg-card border border-card-border rounded-xl p-5">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-5 flex items-center gap-2">
              <Activity className="w-3.5 h-3.5" /> Воронка клиентов
            </h3>
            
            <div className="space-y-4">
              {data.stages.map((stage) => {
                const maxCount = Math.max(...data.stages.map(s => s.count), 1);
                const percentage = (stage.count / maxCount) * 100;
                const statusInfo = statusMap[stage.status] || { label: stage.status, variant: 'neutral' };
                
                return (
                  <div key={stage.status} className="flex items-center gap-3">
                    <div className="w-24 text-[11px] font-medium text-muted-foreground">{statusInfo.label}</div>
                    <div className="flex-1 h-1.5 bg-accent rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-foreground/80 rounded-full" 
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                    <div className="w-8 text-right font-mono text-xs text-foreground/90">{stage.count}</div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="bg-card border border-card-border rounded-xl p-5 flex flex-col">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-5 flex items-center gap-2">
              <Inbox className="w-3.5 h-3.5" /> Последние действия
            </h3>
            
            <div className="flex-1 overflow-y-auto pr-2 -mr-2 space-y-4">
              {data.recent.length === 0 ? (
                <div className="text-[11px] text-muted-foreground/50 py-8 text-center">
                  Нет действий
                </div>
              ) : (
                data.recent.map((activity) => (
                  <div key={activity.id} className="relative flex gap-3 group">
                    <div className="mt-1.5 w-1.5 h-1.5 rounded-full bg-border shrink-0" />
                    <div>
                      <p className="text-[11px] leading-tight text-foreground/80 mb-0.5">{activity.text}</p>
                      <p className="text-[9px] text-muted-foreground/60 font-mono">
                        {new Date(activity.at).toLocaleString('ru-RU', { 
                          hour: '2-digit', minute:'2-digit', day: 'numeric', month: 'short' 
                        })}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}

import { useGetDashboard } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AppLayout } from "@/components/layout/app-layout";
import { Spinner } from "@/components/ui/spinner";
import { Activity, Briefcase, Inbox, Target, Users } from "lucide-react";
import { statusMap } from "@/lib/constants";
import { Badge } from "@/components/ui/badge";

export function Dashboard() {
  const { data, isLoading } = useGetDashboard();

  if (isLoading || !data) {
    return (
      <AppLayout>
        <div className="flex h-full items-center justify-center">
          <Spinner className="w-8 h-8 text-primary" />
        </div>
      </AppLayout>
    );
  }

  const statCards = [
    { title: "Доступно лидов", value: data.available, icon: Target, color: "text-blue-500", bg: "bg-blue-500/10" },
    { title: "В работе", value: data.inWork, icon: Briefcase, color: "text-warning", bg: "bg-warning/10" },
    { title: "Ответили", value: data.replies, icon: Inbox, color: "text-primary", bg: "bg-primary/10" },
    { title: "Сделки", value: data.deals, icon: Activity, color: "text-success", bg: "bg-success/10" },
  ];

  return (
    <AppLayout>
      <div className="p-8 max-w-7xl mx-auto space-y-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Рабочий обзор</h1>
          <p className="text-muted-foreground mt-2">Ключевые показатели и последние действия команды.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {statCards.map((stat, i) => (
            <Card key={i} className="border-border/50 shadow-sm hover:shadow-md transition-shadow">
              <CardContent className="p-6 flex items-center gap-4">
                <div className={`p-4 rounded-xl ${stat.bg}`}>
                  <stat.icon className={`w-6 h-6 ${stat.color}`} />
                </div>
                <div>
                  <div className="text-3xl font-bold font-mono tracking-tight">{stat.value}</div>
                  <div className="text-sm font-medium text-muted-foreground">{stat.title}</div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-2 border-border/50 shadow-sm">
            <CardHeader>
              <CardTitle>Воронка лидов</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {data.stages.map((stage) => {
                  const maxCount = Math.max(...data.stages.map(s => s.count), 1);
                  const percentage = (stage.count / maxCount) * 100;
                  const statusInfo = statusMap[stage.status] || { label: stage.status, variant: 'neutral' };
                  
                  return (
                    <div key={stage.status} className="flex items-center gap-4">
                      <div className="w-32 text-sm font-medium">{statusInfo.label}</div>
                      <div className="flex-1 h-3 bg-muted rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-primary rounded-full" 
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                      <div className="w-12 text-right font-mono text-sm font-bold">{stage.count}</div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/50 shadow-sm">
            <CardHeader>
              <CardTitle>Последние действия</CardTitle>
            </CardHeader>
            <CardContent>
              {data.recent.length === 0 ? (
                <div className="text-sm text-muted-foreground py-8 text-center">
                  Нет недавних действий
                </div>
              ) : (
                <div className="space-y-6">
                  {data.recent.map((activity) => (
                    <div key={activity.id} className="relative flex gap-4">
                      <div className="mt-1 w-2 h-2 rounded-full bg-accent shrink-0" />
                      <div>
                        <p className="text-sm text-foreground/90">{activity.text}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {new Date(activity.at).toLocaleString('ru-RU', { 
                            hour: '2-digit', minute:'2-digit', day: 'numeric', month: 'short' 
                          })}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
}

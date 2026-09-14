import { useState } from "react";
import { useListLeads } from "@workspace/api-client-react";
import { AppLayout } from "@/components/layout/app-layout";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Target } from "lucide-react";
import { statusMap } from "@/lib/constants";
import { Link } from "wouter";
import { format } from "date-fns";
import { ru } from "date-fns/locale";

export function LeadsPage() {
  const [status, setStatus] = useState<string>("all");
  
  const { data: leads, isLoading } = useListLeads({
    assignedToMe: true,
    ...(status !== "all" ? { status } : {})
  });

  return (
    <AppLayout>
      <div className="space-y-6 flex flex-col h-full">
        <div className="flex items-center justify-between border-b border-border/40 pb-4 shrink-0">
          <div>
            <h1 className="text-lg font-bold tracking-tight">Мои лиды</h1>
            <p className="text-xs text-muted-foreground mt-0.5">Ваши компании в работе</p>
          </div>
          
          <div className="w-48">
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger className="h-8 text-xs bg-card border-border/50 shadow-sm">
                <SelectValue placeholder="Все статусы" />
              </SelectTrigger>
              <SelectContent className="text-xs">
                <SelectItem value="all">Все статусы</SelectItem>
                {Object.entries(statusMap).map(([key, { label }]) => (
                  <SelectItem key={key} value={key}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex-1 flex flex-col min-h-0 overflow-hidden bg-card border border-card-border rounded-xl shadow-sm">
          {isLoading ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <div className="w-3 h-3 rounded-full border-2 border-foreground/30 border-t-foreground animate-spin" />
                Загрузка лидов...
              </div>
            </div>
          ) : !leads || leads.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
              <Target className="w-8 h-8 text-muted-foreground/30 mb-3" />
              <h3 className="text-sm font-medium">Нет лидов</h3>
              <p className="text-xs text-muted-foreground mt-1 mb-4 max-w-[250px]">
                У вас нет лидов с выбранными фильтрами.
              </p>
              <Link href="/search" className="h-8 inline-flex items-center justify-center rounded-lg bg-foreground px-4 text-xs font-medium text-background hover:bg-foreground/90 transition-colors shadow-sm">
                Перейти к поиску
              </Link>
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto">
              <div className="grid grid-cols-[2fr_1fr_1fr_1fr_80px] gap-4 px-4 py-2.5 bg-accent/10 border-b border-border/40 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground sticky top-0 backdrop-blur-sm z-10">
                <div>Компания</div>
                <div>Локация</div>
                <div>Статус</div>
                <div>Обновлено</div>
                <div className="text-right">Оценка</div>
              </div>
              
              <div className="divide-y divide-border/40">
                {leads.map((lead) => {
                  const leadStatus = statusMap[lead.status] || { label: lead.status, variant: 'neutral' };
                  return (
                    <Link key={lead.id} href={`/leads/${lead.id}`} className="grid grid-cols-[2fr_1fr_1fr_1fr_80px] gap-4 px-4 py-3 items-center group">
                      <div className="min-w-0 pr-2">
                        <div className="font-medium text-xs text-foreground truncate">{lead.name}</div>
                        {lead.website && (
                          <div className="text-[10px] text-muted-foreground mt-0.5 truncate">{new URL(lead.website).hostname.replace('www.', '')}</div>
                        )}
                      </div>
                      
                      <div className="min-w-0 pr-2 text-[10px]">
                        <div className="text-foreground/90 truncate">{lead.industry}</div>
                        <div className="text-muted-foreground mt-0.5 truncate">{lead.city}</div>
                      </div>
                      
                      <div>
                        <span className="text-[10px] px-2 py-0.5 rounded-sm bg-background border border-border/50 text-foreground shadow-sm whitespace-nowrap">
                          {leadStatus.label}
                        </span>
                      </div>
                      
                      <div className="text-[10px] text-muted-foreground truncate">
                        {format(new Date(lead.updatedAt), 'd MMM, HH:mm', { locale: ru })}
                      </div>
                      
                      <div className="text-right font-mono text-xs font-semibold">
                        {lead.score}
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}

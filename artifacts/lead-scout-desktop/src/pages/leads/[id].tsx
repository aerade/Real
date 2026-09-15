import { useState, useRef, useEffect } from "react";
import { useGetLead, useUpdateLead, useClaimLead, getGetLeadQueryKey, LeadUpdateStatus } from "@workspace/api-client-react";
import { AppLayout } from "@/components/layout/app-layout";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/hooks/use-auth";
import { statusMap } from "@/lib/constants";
import { Globe, MapPin, Building2, Phone, Mail, FileText, AlertTriangle, ArrowLeft, ArrowRight } from "lucide-react";
import { Link, useParams } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

export function LeadDetailsPage() {
  const { id } = useParams();
  const leadId = Number(id);
  const { session } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  const { data: lead, isLoading } = useGetLead(leadId, {
    query: { enabled: !!leadId, queryKey: getGetLeadQueryKey(leadId) }
  });

  const updateLead = useUpdateLead();
  const claimLead = useClaimLead();

  const [note, setNote] = useState("");
  const initializedForId = useRef<number | null>(null);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (lead && initializedForId.current !== leadId) {
      initializedForId.current = leadId;
      setNote(lead.note || "");
    }
  }, [lead, leadId]);

  const handleNoteChange = (val: string) => {
    setNote(val);
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    
    saveTimeoutRef.current = setTimeout(() => {
      updateLead.mutate({ id: leadId, data: { note: val } }, {
        onSuccess: (data) => {
          queryClient.setQueryData(getGetLeadQueryKey(leadId), (old: any) => 
            old ? { ...old, note: data.note } : old
          );
        }
      });
    }, 1000);
  };

  const handleStatusChange = (newStatus: string) => {
    updateLead.mutate({ id: leadId, data: { status: newStatus as LeadUpdateStatus } }, {
      onSuccess: (data) => {
        queryClient.setQueryData(getGetLeadQueryKey(leadId), (old: any) => 
          old ? { ...old, status: data.status, updatedAt: data.updatedAt } : old
        );
        toast({ title: "Статус обновлен", description: statusMap[newStatus].label });
      }
    });
  };

  const handleClaim = () => {
    claimLead.mutate({ id: leadId }, {
      onSuccess: (data) => {
        queryClient.setQueryData(getGetLeadQueryKey(leadId), data);
        toast({ title: "Клиент взят в работу" });
      }
    });
  };

  if (isLoading || !lead) {
    return (
      <AppLayout>
        <div className="flex h-full items-center justify-center">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <div className="w-3 h-3 rounded-full border-2 border-foreground/30 border-t-foreground animate-spin" />
            Загрузка данных...
          </div>
        </div>
      </AppLayout>
    );
  }

  const isAssignedToMe = lead.assignee?.id === session?.user?.id;
  const canClaim = !lead.assignee && lead.status === 'new';
  const leadStatus = statusMap[lead.status] || { label: lead.status, variant: 'neutral' };

  return (
    <AppLayout>
      <div className="space-y-4 max-w-4xl mx-auto flex flex-col h-full overflow-y-auto pr-2 pb-10">
        <Link href="/leads" className="inline-flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground transition-colors uppercase tracking-wider mb-2">
          <ArrowLeft className="w-3 h-3" />
          Назад
        </Link>

        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 pb-2">
          <div>
            <h1 className="text-xl font-bold tracking-tight">{lead.name}</h1>
            <div className="flex flex-wrap items-center gap-3 mt-1.5 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 opacity-70" /> {lead.city}, {lead.country}
              </span>
              <span className="flex items-center gap-1">
                <Building2 className="w-3.5 h-3.5 opacity-70" /> {lead.industry}
              </span>
              {lead.website && (
                <a href={lead.website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-blue-400/80 hover:underline">
                  <Globe className="w-3.5 h-3.5 opacity-70" /> {new URL(lead.website).hostname.replace('www.', '')}
                </a>
              )}
            </div>
          </div>
          
          <div className="flex items-center gap-3 bg-card p-2.5 rounded-lg border border-card-border shadow-sm shrink-0">
            <div className="text-center px-3 border-r border-border/50">
              <div className={cn(
                "text-xl font-mono font-semibold",
                lead.score >= 80 ? "text-emerald-400" : lead.score >= 50 ? "text-amber-400" : "text-rose-400"
              )}>
                {lead.score}
              </div>
              <div className="text-[9px] uppercase tracking-wider text-muted-foreground mt-0.5">Оценка</div>
            </div>
            <div className="px-2">
              <div className="text-[10px] px-2 py-0.5 rounded-sm bg-background border border-border/50 text-foreground text-center shadow-sm">
                {leadStatus.label}
              </div>
              {lead.assignee && (
                <div className="text-[9px] text-muted-foreground mt-1.5 font-medium text-center truncate w-24">
                  {lead.assignee.name}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 bg-accent/20 p-3 rounded-lg border border-border/40">
          {canClaim ? (
            <>
              <p className="text-[11px] flex-1 text-muted-foreground">Клиент свободен. Закрепите его за собой.</p>
              <Button onClick={handleClaim} disabled={claimLead.isPending} className="h-7 text-xs bg-foreground text-background hover:bg-foreground/90 shrink-0">
                Взять в работу
              </Button>
            </>
          ) : isAssignedToMe ? (
            <>
              <p className="text-[11px] flex-1 font-medium text-foreground/80">Ваш клиент. Обновите статус:</p>
              <Select value={lead.status} onValueChange={handleStatusChange}>
                <SelectTrigger className="w-40 h-7 text-[11px] bg-background border-border/50 shadow-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="text-[11px]">
                  {Object.entries(statusMap).filter(([k]) => k !== 'new').map(([key, { label }]) => (
                    <SelectItem key={key} value={key}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </>
          ) : (
            <p className="text-[11px] text-muted-foreground w-full text-center">Клиент в работе: {lead.assignee?.name}</p>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-4">
            <div className="bg-card border border-card-border rounded-xl p-4 shadow-sm">
              <h3 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2 mb-4">
                <AlertTriangle className="w-3.5 h-3.5" /> Причины низкой оценки
              </h3>
              
              {lead.scoreReasons.length > 0 ? (
                <ul className="space-y-2">
                  {lead.scoreReasons.map((reason, i) => (
                    <li key={i} className="flex gap-2 text-[11px]">
                      <div className="w-1 h-1 rounded-full bg-border mt-1.5 shrink-0" />
                      <span className="text-foreground/80 leading-snug">{reason}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-[11px] text-muted-foreground">Нет явных причин.</p>
              )}
              
              {lead.issues.length > 0 && (
                <div className="pt-3 mt-3 border-t border-border/40">
                  <h4 className="text-[9px] uppercase tracking-wider text-muted-foreground mb-2">Проблемы сайта</h4>
                  <div className="flex flex-wrap gap-1.5">
                    {lead.issues.map((issue, i) => (
                      <span key={i} className="text-[9px] px-1.5 py-0.5 rounded-sm bg-background border border-border/50 text-muted-foreground">
                        {issue}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="bg-card border border-card-border rounded-xl p-4 shadow-sm flex flex-col min-h-[220px]">
              <h3 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2 mb-3">
                <FileText className="w-3.5 h-3.5" /> Заметка
              </h3>
              <Textarea 
                placeholder="Заметки о звонках и договоренностях..." 
                className="flex-1 resize-none bg-background/50 border-border/50 text-[11px] leading-relaxed focus-visible:ring-1 focus-visible:ring-ring/50 p-3"
                value={note}
                onChange={(e) => handleNoteChange(e.target.value)}
                disabled={!isAssignedToMe}
              />
              <div className="text-[9px] text-muted-foreground mt-2 flex justify-between items-center h-3">
                <span>Автосохранение</span>
                {updateLead.isPending && (
                  <span className="flex items-center gap-1 text-foreground/50">
                    <div className="w-2 h-2 rounded-full border border-foreground/30 border-t-foreground animate-spin" />
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="bg-card border border-card-border rounded-xl p-4 shadow-sm">
              <h3 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2 mb-4">
                <Globe className="w-3.5 h-3.5" /> Контакты
              </h3>
              
              {lead.contacts.length === 0 ? (
                <p className="text-[11px] text-muted-foreground">Не найдены</p>
              ) : (
                <ul className="space-y-3">
                  {lead.contacts.map((contact, i) => {
                    const Icon = contact.type === 'phone' ? Phone : contact.type === 'email' ? Mail : Globe;
                    return (
                      <li key={i} className="flex items-start gap-2.5 text-[11px]">
                        <Icon className="w-3.5 h-3.5 text-muted-foreground/60 shrink-0 mt-0.5" />
                        <div className="break-all">
                          {contact.url ? (
                            <a href={contact.url} target="_blank" rel="noopener noreferrer" className="text-blue-400/80 hover:underline font-medium">
                              {contact.value}
                            </a>
                          ) : (
                            <span className="font-medium text-foreground/90">{contact.value}</span>
                          )}
                          <div className="text-[9px] text-muted-foreground mt-0.5 capitalize">{contact.type}</div>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>

            <div className="bg-card border border-card-border rounded-xl p-4 shadow-sm">
              <h3 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2 mb-4">
                <ArrowRight className="w-3.5 h-3.5" /> Справочная информация
              </h3>
              <div className="space-y-2.5">
                <div className="flex justify-between items-center text-[11px] border-b border-border/30 pb-2">
                  <span className="text-muted-foreground">Рейтинг</span>
                  <span className="font-semibold">{lead.rating ? `${lead.rating} / 5` : 'Нет'}</span>
                </div>
                <div className="flex justify-between items-center text-[11px] border-b border-border/30 pb-2">
                  <span className="text-muted-foreground">Отзывов</span>
                  <span className="font-semibold">{lead.reviewsCount}</span>
                </div>
                <div className="flex justify-between items-center text-[11px] border-b border-border/30 pb-2">
                  <span className="text-muted-foreground">Филиалов</span>
                  <span className="font-semibold">{lead.branchesCount}</span>
                </div>
                <div className="flex justify-between items-center text-[11px]">
                  <span className="text-muted-foreground">Источник</span>
                  <span className="text-[9px] px-1.5 py-0.5 rounded-sm bg-background border border-border/50 font-mono text-muted-foreground uppercase tracking-wider">
                    {lead.source}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}

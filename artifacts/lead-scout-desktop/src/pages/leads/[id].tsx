import { useState, useRef, useEffect } from "react";
import { useGetLead, useUpdateLead, useClaimLead, getGetLeadQueryKey, LeadUpdateStatus } from "@workspace/api-client-react";
import { AppLayout } from "@/components/layout/app-layout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import { useAuth } from "@/hooks/use-auth";
import { statusMap } from "@/lib/constants";
import { Globe, MapPin, Building2, Phone, Mail, FileText, CheckCircle2, AlertTriangle, ArrowLeft } from "lucide-react";
import { Link, useParams } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

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
        toast({ title: "Лид взят в работу" });
      }
    });
  };

  if (isLoading || !lead) {
    return (
      <AppLayout>
        <div className="flex h-full items-center justify-center">
          <Spinner className="w-8 h-8 text-primary" />
        </div>
      </AppLayout>
    );
  }

  const isAssignedToMe = lead.assignee?.id === session?.user?.id;
  const canClaim = !lead.assignee && lead.status === 'new';
  const leadStatus = statusMap[lead.status] || { label: lead.status, variant: 'neutral' };

  return (
    <AppLayout>
      <div className="p-8 max-w-5xl mx-auto space-y-6">
        <div className="flex items-center gap-4 text-sm text-muted-foreground mb-4">
          <Link href="/leads" className="hover:text-foreground flex items-center gap-1 transition-colors">
            <ArrowLeft className="w-4 h-4" />
            Назад к списку
          </Link>
        </div>

        <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">{lead.name}</h1>
            <div className="flex flex-wrap items-center gap-3 mt-3 text-sm text-muted-foreground">
              <span className="flex items-center gap-1"><MapPin className="w-4 h-4" /> {lead.city}, {lead.country}</span>
              <span className="flex items-center gap-1"><Building2 className="w-4 h-4" /> {lead.industry}</span>
              {lead.website && (
                <a href={lead.website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-primary hover:underline">
                  <Globe className="w-4 h-4" /> {new URL(lead.website).hostname}
                </a>
              )}
            </div>
          </div>
          
          <div className="flex items-center gap-4 bg-card p-4 rounded-xl border border-border/50 shadow-sm">
            <div className="text-center px-4 border-r border-border">
              <div className="text-3xl font-mono font-bold text-foreground">{lead.score}</div>
              <div className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground mt-1">Оценка</div>
            </div>
            <div className="px-4">
              <Badge variant={leadStatus.variant} className="text-sm px-3 py-1">
                {leadStatus.label}
              </Badge>
              {lead.assignee && (
                <div className="text-xs text-muted-foreground mt-2 font-medium">
                  Менеджер: {lead.assignee.name}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4 bg-muted/30 p-4 rounded-lg border border-border border-dashed">
          {canClaim ? (
            <>
              <p className="text-sm flex-1">Этот лид свободен. Закрепите его за собой, чтобы начать работу.</p>
              <Button onClick={handleClaim} disabled={claimLead.isPending} className="shrink-0">
                Взять в работу
              </Button>
            </>
          ) : isAssignedToMe ? (
            <>
              <p className="text-sm flex-1 font-medium text-primary">Ваш лид. Измените статус после контакта.</p>
              <Select value={lead.status} onValueChange={handleStatusChange}>
                <SelectTrigger className="w-[200px] bg-background">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(statusMap).filter(([k]) => k !== 'new').map(([key, { label }]) => (
                    <SelectItem key={key} value={key}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">Лид закреплен за пользователем {lead.assignee?.name}</p>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <Card className="border-border/50 shadow-sm">
              <CardHeader className="pb-3 border-b border-border/50 mb-4 bg-muted/10">
                <CardTitle className="text-lg flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-warning" />
                  Причины низкой оценки
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {lead.scoreReasons.length > 0 ? (
                  <ul className="space-y-3">
                    {lead.scoreReasons.map((reason, i) => (
                      <li key={i} className="flex gap-3 text-sm">
                        <div className="w-1.5 h-1.5 rounded-full bg-destructive mt-1.5 shrink-0" />
                        <span className="leading-relaxed">{reason}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-muted-foreground">Нет явных причин.</p>
                )}
                
                {lead.issues.length > 0 && (
                  <div className="pt-4 mt-4 border-t border-border/50">
                    <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Выявленные технические проблемы</h4>
                    <div className="flex flex-wrap gap-2">
                      {lead.issues.map((issue, i) => (
                        <Badge key={i} variant="outline" className="bg-muted/30">
                          {issue}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="border-border/50 shadow-sm">
              <CardHeader className="pb-3 border-b border-border/50 mb-4 bg-muted/10">
                <CardTitle className="text-lg flex items-center gap-2">
                  <FileText className="w-5 h-5 text-primary" />
                  Рабочая заметка
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Textarea 
                  placeholder="Добавьте информацию о компании, контактах или договоренностях..." 
                  className="min-h-[200px] resize-y bg-muted/10 border-border/50 focus-visible:bg-background"
                  value={note}
                  onChange={(e) => handleNoteChange(e.target.value)}
                  disabled={!isAssignedToMe}
                />
                <div className="text-xs text-muted-foreground mt-2 flex justify-between items-center px-1">
                  <span>Сохраняется автоматически</span>
                  {updateLead.isPending && <span className="text-primary flex items-center gap-1"><Spinner className="w-3 h-3" /> Сохранение...</span>}
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            <Card className="border-border/50 shadow-sm">
              <CardHeader className="pb-3 border-b border-border/50 mb-4 bg-muted/10">
                <CardTitle className="text-lg">Контакты</CardTitle>
              </CardHeader>
              <CardContent>
                {lead.contacts.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Контакты не найдены</p>
                ) : (
                  <ul className="space-y-4">
                    {lead.contacts.map((contact, i) => {
                      const Icon = contact.type === 'phone' ? Phone : 
                                  contact.type === 'email' ? Mail : Globe;
                      return (
                        <li key={i} className="flex items-start gap-3 text-sm">
                          <Icon className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
                          <div className="break-all">
                            {contact.url ? (
                              <a href={contact.url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline font-medium">
                                {contact.value}
                              </a>
                            ) : (
                              <span className="font-medium text-foreground/90">{contact.value}</span>
                            )}
                            <div className="text-xs text-muted-foreground mt-0.5 capitalize">{contact.type}</div>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </CardContent>
            </Card>

            <Card className="border-border/50 shadow-sm">
              <CardHeader className="pb-3 border-b border-border/50 mb-4 bg-muted/10">
                <CardTitle className="text-lg">Справочная информация</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center text-sm border-b border-border/50 pb-2">
                  <span className="text-muted-foreground">Рейтинг</span>
                  <span className="font-bold">{lead.rating ? `${lead.rating} / 5` : 'Нет'}</span>
                </div>
                <div className="flex justify-between items-center text-sm border-b border-border/50 pb-2">
                  <span className="text-muted-foreground">Отзывов</span>
                  <span className="font-bold">{lead.reviewsCount}</span>
                </div>
                <div className="flex justify-between items-center text-sm border-b border-border/50 pb-2">
                  <span className="text-muted-foreground">Филиалов</span>
                  <span className="font-bold">{lead.branchesCount}</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-muted-foreground">Источник</span>
                  <Badge variant="outline" className="font-mono text-[10px]">{lead.source}</Badge>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}

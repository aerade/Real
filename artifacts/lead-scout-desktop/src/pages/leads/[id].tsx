import { useEffect, useRef, useState } from "react";
import { getGetLeadQueryKey, LeadUpdateStatus, useAuditLead, useClaimLead, useGetLead, useUpdateLead } from "@workspace/api-client-react";
import { AppLayout } from "@/components/layout/app-layout";
import { CommunicationGuide } from "@/components/communication-guide";
import { OutreachMessagePanel } from "@/components/outreach-message-panel";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { statusMap } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { useLocation, useParams } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import {
  AlertCircle, ArrowLeft, Building2, CheckCircle2, CircleHelp, Copy, ExternalLink,
  FileText, Globe2, Mail, MapPin, Phone, ShieldAlert, Users, XCircle,
  RefreshCw,
} from "lucide-react";

function safeUrl(value?: string | null) {
  if (!value) return null;
  try {
    const normalized = /^(https?:\/\/|mailto:|tel:)/i.test(value) ? value : `https://${value}`;
    const url = new URL(normalized);
      return ["http:", "https:", "mailto:", "tel:"].includes(url.protocol) ? url.href : null;
  } catch { return null; }
}

function websiteHost(value?: string | null) {
  const url = safeUrl(value);
  return url ? new URL(url).hostname.replace(/^www\./, "") : value;
}

function scoreTone(score: number) {
  return score >= 80 ? "text-emerald-300" : score >= 50 ? "text-cyan-300" : "text-rose-300";
}

function auditCheckClass(status: string) {
  return status === "pass" ? "border-emerald-500/25 bg-emerald-500/10" : status === "warn" ? "border-cyan-500/25 bg-cyan-500/10" : status === "fail" ? "border-rose-500/25 bg-rose-500/10" : "border-border/60 bg-background/50";
}

export function LeadDetailsPage() {
  const { id } = useParams();
  const leadId = Number(id);
  const [, setLocation] = useLocation();
  const { session } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: lead, isLoading, isError, refetch } = useGetLead(leadId, { query: { enabled: !!leadId, queryKey: getGetLeadQueryKey(leadId) } });
  const updateLead = useUpdateLead();
  const auditLead = useAuditLead();
  const claimLead = useClaimLead();
  const [note, setNote] = useState("");
  const [rejectReason, setRejectReason] = useState("");
  const [isRejecting, setIsRejecting] = useState(false);
  const initializedForId = useRef<number | null>(null);
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (lead && initializedForId.current !== leadId) {
      initializedForId.current = leadId;
      setNote(lead.note ?? "");
    }
  }, [lead, leadId]);

  const saveNote = (value: string) => {
    setNote(value);
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(() => {
      updateLead.mutate({ id: leadId, data: { note: value } }, {
        onSuccess: (updated) => queryClient.setQueryData(getGetLeadQueryKey(leadId), (old) => old ? { ...old, note: updated.note } : old),
      });
    }, 900);
  };
  const updateStatus = (status: string) => {
    updateLead.mutate({ id: leadId, data: { status: status as LeadUpdateStatus } }, {
      onSuccess: (updated) => {
        queryClient.setQueryData(getGetLeadQueryKey(leadId), (old) => old ? { ...old, status: updated.status, updatedAt: updated.updatedAt } : old);
         toast({ title: "Статус обновлён", description: statusMap[status]?.label ?? status });
      },
    });
  };
  const rejectLead = () => {
    const reason = rejectReason.trim();
    if (!reason) return;
    updateLead.mutate({ id: leadId, data: { status: "rejected", note: `Отказ: ${reason}` } }, {
      onSuccess: (updated) => {
        queryClient.setQueryData(getGetLeadQueryKey(leadId), updated);
        setNote(updated.note ?? "");
        setRejectReason("");
        setIsRejecting(false);
         toast({ title: "Лид отмечен как отклонённый" });
      },
    });
  };
  const runAudit = () => {
    auditLead.mutate({ id: leadId }, {
      onSuccess: (updated) => {
        queryClient.setQueryData(getGetLeadQueryKey(leadId), updated);
        toast({ title: updated.websiteAudit?.status === "checked" ? "Аудит сайта обновлён" : "Аудит завершён", description: updated.websiteAudit?.error ?? undefined });
      },
      onError: () => toast({ title: "Не удалось запустить аудит", description: "Попробуйте повторить проверку через несколько секунд." }),
    });
  };

  const copyLeadValue = async (value: string, successMessage: string) => {
    try {
      await navigator.clipboard.writeText(value);
      toast({ title: successMessage });
    } catch {
      toast({
        title: "Не удалось скопировать",
        description: "Проверьте разрешение на доступ к буферу обмена и попробуйте ещё раз.",
      });
    }
  };

  const back = () => { if (window.history.length > 1) window.history.back(); else setLocation("/search"); };
  if (!leadId) return <AppLayout><EmptyState title="Лид не найден" copy="Идентификатор компании недействителен." action="Назад к поиску" onAction={() => setLocation("/search")} /></AppLayout>;
  if (isLoading) return <AppLayout><div className="mx-auto max-w-5xl space-y-5 animate-pulse"><div className="h-4 w-24 rounded bg-muted" /><div className="h-12 w-2/3 rounded bg-muted" /><div className="h-24 rounded-xl bg-muted" /><div className="grid gap-4 md:grid-cols-2"><div className="h-72 rounded-xl bg-muted" /><div className="h-72 rounded-xl bg-muted" /></div></div></AppLayout>;
  if (isError || !lead) return <AppLayout><EmptyState title="Не удалось загрузить компанию" copy="Лид может быть временно недоступен. Попробуйте ещё раз или вернитесь к поиску." action="Повторить" onAction={() => refetch()} secondaryAction="Назад к поиску" onSecondaryAction={back} /></AppLayout>;

  const isAssignedToMe = lead.assignee?.id === session?.user?.id;
  const canClaim = !lead.assignee && lead.status === "new";
  const status = statusMap[lead.status] ?? { label: lead.status, variant: "neutral" };
  const audit = lead.websiteAudit;
  const auditChecks = audit && Array.isArray(audit.checks) ? audit.checks : [];
  const scoreBreakdown = Array.isArray(lead.scoreBreakdown) ? lead.scoreBreakdown : [];
  const contacts = Array.isArray(lead.contacts)
    ? lead.contacts.filter((contact) => contact && typeof contact.type === "string" && typeof contact.value === "string")
    : [];
  if (!Array.isArray(lead.scoreBreakdown)) lead.scoreBreakdown = scoreBreakdown;
  const website = safeUrl(lead.website);
  const addressToCopy = lead.address?.trim() || [lead.city, lead.country].filter(Boolean).join(", ");
  const addressLabel = lead.address?.trim() ? "Адрес компании" : "Город и страна";
  const addressCopiedMessage = lead.address?.trim()
    ? "Адрес компании скопирован"
    : "Город и страна скопированы";
  const groupedFactors = scoreBreakdown.reduce<Record<string, typeof scoreBreakdown>>((groups, factor) => {
    (groups[factor.category] ??= []).push(factor);
    return groups;
  }, {});
   const categoryLabels: Record<string, string> = { market: "Соответствие рынку", contactability: "Доступность контакта", opportunity: "Возможность", website: "Сайт" };

  const scorePercent = Math.max(0, Math.min(100, lead.score));

  return (
    <AppLayout>
      <div className="mx-auto flex min-h-full w-full max-w-6xl flex-col gap-5 overflow-y-auto pb-10 pr-1">
        <button data-testid="button-back-to-search" type="button" onClick={back} className="inline-flex w-fit items-center gap-1 text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground transition-colors hover:text-foreground"><ArrowLeft className="h-3.5 w-3.5" />Назад к поиску</button>
        <header className="flex flex-col justify-between gap-5 border-b border-border/70 pb-5 lg:flex-row lg:items-start">
          <div className="min-w-0">
             <div className="mb-2 flex flex-wrap items-center gap-2"><span className="rounded-full border border-primary/30 bg-primary/10 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-primary">Карточка компании</span><span data-testid="status-lead" className="rounded-full border border-border/70 bg-card px-2 py-1 text-[10px] text-muted-foreground">{status.label}</span><span data-testid="status-website" className={cn("rounded-full border px-2 py-1 text-[10px]", lead.websiteStatus === "present" ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300" : "border-cyan-500/30 bg-cyan-500/10 text-cyan-300")}>{lead.websiteStatus === "present" ? "Есть сайт" : "Сайта нет"}</span></div>
             <div className="flex min-w-0 items-center gap-2">
               <h1 data-testid="text-lead-name" className="truncate text-2xl font-semibold tracking-tight">{lead.name}</h1>
               <Button data-testid="button-copy-lead-name" type="button" variant="ghost" size="icon" className="h-7 w-7 shrink-0" aria-label="Скопировать название компании" title="Скопировать название компании" onClick={() => void copyLeadValue(lead.name, "Название компании скопировано")}><Copy className="h-3.5 w-3.5" /></Button>
             </div>
             <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-muted-foreground">
               <span data-testid="text-lead-address" className="flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5" />{lead.address?.trim() || `${lead.city}, ${lead.country}`}</span>
               <Button data-testid="button-copy-lead-address" type="button" variant="ghost" size="icon" className="h-7 w-7" aria-label={`Скопировать: ${addressLabel.toLowerCase()}`} title={`Скопировать: ${addressLabel.toLowerCase()}`} disabled={!addressToCopy} onClick={() => void copyLeadValue(addressToCopy, addressCopiedMessage)}><Copy className="h-3.5 w-3.5" /></Button>
               <span className="flex items-center gap-1.5"><Building2 className="h-3.5 w-3.5" />{lead.industry}</span>
               {website && <a data-testid="link-lead-website" href={website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-primary hover:underline"><Globe2 className="h-3.5 w-3.5" />{websiteHost(lead.website)}<ExternalLink className="h-3 w-3" /></a>}
               {lead.sourceUrl && <Button data-testid="button-open-lead-2gis" asChild type="button" variant="outline" size="sm" className="h-7 gap-1.5 px-2 text-[10px]"><a href={lead.sourceUrl} target="_blank" rel="noopener noreferrer">Открыть в 2ГИС<ExternalLink className="h-3 w-3" /></a></Button>}
             </div>
          </div>
          <div className="w-full max-w-md rounded-2xl border border-border/70 bg-card p-4 shadow-sm">
            <div className="flex items-center gap-4">
              <div className="min-w-20 text-center"><p data-testid="text-lead-score" className={cn("font-mono text-4xl font-semibold leading-none", scoreTone(lead.score))}>{lead.score}</p><p className="mt-1 text-[9px] font-bold uppercase tracking-[0.16em] text-muted-foreground">приоритет / 100</p></div>
               <div className="min-w-0 flex-1"><div className="flex items-center justify-between gap-3"><p className="text-xs font-semibold">Приоритет для обращения</p><CircleHelp className="h-4 w-4 shrink-0 text-primary" /></div><p className="mt-1 text-[11px] leading-4 text-muted-foreground">Рынок — 40, прямые контакты — 20, потенциал сайта — 40 баллов. Чем выше итог, тем перспективнее обращение.</p></div>
            </div>
            <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-muted"><div className={cn("h-full rounded-full", lead.score >= 80 ? "bg-emerald-400" : lead.score >= 50 ? "bg-cyan-400" : "bg-rose-400")} style={{ width: `${scorePercent}%` }} /></div>
          </div>
        </header>

        <div className="flex flex-wrap items-center gap-3 rounded-xl border border-border/70 bg-card/70 p-3">
          {canClaim ? <><div className="flex-1"><p className="text-xs font-semibold">Лид не назначен</p><p className="mt-0.5 text-[11px] text-muted-foreground">Возьмите его, чтобы добавить компанию в личную воронку.</p></div><Button data-testid="button-claim-lead" onClick={() => claimLead.mutate({ id: leadId }, { onSuccess: (updated) => { queryClient.setQueryData(getGetLeadQueryKey(leadId), updated); toast({ title: "Лид добавлен в вашу воронку" }); } })} disabled={claimLead.isPending} className="h-8 text-xs">Взять лид</Button></>
            : isAssignedToMe ? <><div className="flex-1"><p className="text-xs font-semibold">Ваш лид</p><p className="mt-0.5 text-[11px] text-muted-foreground">Обновляйте этап, чтобы воронка отражала следующее действие.</p></div><Select value={lead.status} onValueChange={updateStatus}><SelectTrigger data-testid="select-lead-status" className="h-8 w-44 text-xs"><SelectValue /></SelectTrigger><SelectContent>{Object.entries(statusMap).filter(([key]) => key !== "new").map(([key, item]) => <SelectItem key={key} value={key}>{item.label}</SelectItem>)}</SelectContent></Select><Button data-testid="button-reject-lead" type="button" variant="outline" onClick={() => setIsRejecting((current) => !current)} disabled={updateLead.isPending} className="h-8 border-destructive/40 text-xs text-destructive">Отклонить</Button></>
            : <p className="w-full text-center text-xs text-muted-foreground">В работе у {lead.assignee?.name ?? "другого сотрудника"}.</p>}
        </div>
        {isRejecting && isAssignedToMe && <div className="rounded-xl border border-destructive/25 bg-destructive/5 p-4"><label htmlFor="reject-reason" className="text-xs font-semibold">Почему лид не подходит?</label><Textarea data-testid="textarea-reject-reason" id="reject-reason" value={rejectReason} onChange={(event) => setRejectReason(event.target.value)} placeholder="Добавьте короткую причину для команды." className="mt-2 min-h-16 resize-none text-xs" /><div className="mt-3 flex justify-end gap-2"><Button data-testid="button-cancel-reject" type="button" variant="ghost" size="sm" onClick={() => setIsRejecting(false)}>Отмена</Button><Button data-testid="button-confirm-reject" type="button" variant="destructive" size="sm" disabled={updateLead.isPending || !rejectReason.trim()} onClick={rejectLead}>Подтвердить отказ</Button></div></div>}

         <section className="rounded-xl border border-border/70 bg-card p-5 shadow-sm"><div className="mb-4 flex items-start justify-between gap-4"><div><p className="text-[10px] font-bold uppercase tracking-[0.16em] text-primary">Информация о сайте</p><h2 className="mt-1 text-base font-semibold">Что показывает сайт</h2></div><div className="flex items-center gap-2">{lead.websiteStatus === "present" && <Button type="button" variant="outline" size="sm" onClick={runAudit} disabled={auditLead.isPending} className="h-8 gap-1.5 text-[10px]"><RefreshCw className={cn("h-3.5 w-3.5", auditLead.isPending && "animate-spin")} />{auditLead.isPending ? "Проверка…" : "Запустить аудит"}</Button>}<Globe2 className="h-5 w-5 text-primary" /></div></div>{lead.websiteStatus === "missing" ? <div className="rounded-lg border border-dashed border-cyan-500/30 bg-cyan-500/5 p-4"><p className="text-xs font-semibold text-cyan-200">Сайта нет</p><p className="mt-1 text-[11px] leading-4 text-muted-foreground">Компания получила максимальный сигнал возможности для предложения первого сайта.</p></div> : !audit || audit.status === "not_provided" ? <div className="rounded-lg border border-dashed border-border/70 p-4"><p className="text-xs font-semibold">Аудит не проводился</p><p className="mt-1 text-[11px] leading-4 text-muted-foreground">Нажмите «Запустить аудит», чтобы проверить сайт вручную.</p></div> : <><div className="flex flex-col gap-3 rounded-lg border border-border/60 bg-background/45 p-3 sm:flex-row sm:items-center sm:justify-between"><div><p className="text-xs font-semibold">{audit.status === "checked" ? "Аудит завершён" : "Сайт недоступен"}</p><p className="mt-1 text-[11px] text-muted-foreground">{audit.error ?? (audit.checkedAt ? `Проверено ${new Date(audit.checkedAt).toLocaleString("ru-RU")}` : "Время проверки не указано")}</p></div>{audit.qualityScore != null && <span data-testid="text-website-quality-score" className={cn("font-mono text-2xl font-semibold", scoreTone(audit.qualityScore))}>{audit.qualityScore}<span className="text-xs text-muted-foreground">/100</span></span>}</div><div className="mt-3 grid grid-cols-2 gap-2 text-[11px]">{audit.statusCode != null && <Metric label="HTTP-статус" value={String(audit.statusCode)} />}{audit.responseTimeMs != null && <Metric label="Ответ" value={`${audit.responseTimeMs} мс`} />}{audit.pageSizeKb != null && <Metric label="Размер страницы" value={`${audit.pageSizeKb} КБ`} />}{audit.hasMobileViewport != null && <Metric label="Мобильная версия" value={audit.hasMobileViewport ? "Есть" : "Нет"} />}</div>{audit.title && <div className="mt-3 rounded-lg border border-border/60 bg-background/45 p-3"><p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Заголовок страницы</p><p className="mt-1 text-xs">{audit.title}</p>{audit.metaDescription && <p className="mt-2 text-[11px] leading-4 text-muted-foreground">{audit.metaDescription}</p>}</div>}<div className="mt-3 grid gap-2 md:grid-cols-2">{auditChecks.map((check) => <div data-testid={`audit-check-${check.key}`} key={check.key} className={cn("rounded-lg border p-3", auditCheckClass(check.status))}><div className="flex items-center gap-2">{check.status === "pass" ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-300" /> : check.status === "fail" ? <XCircle className="h-3.5 w-3.5 text-rose-300" /> : <AlertCircle className="h-3.5 w-3.5 text-cyan-300" />}<p className="text-xs font-semibold">{check.label}</p></div><p className="mt-1 text-[11px] leading-4 text-muted-foreground">{check.evidence}</p></div>)}</div></>}</section>

         <div className="grid gap-5 lg:grid-cols-[1.15fr_.85fr]">
            <section className="rounded-xl border border-border/70 bg-card p-5 shadow-sm"><div className="mb-4 flex items-start justify-between gap-4"><div><p className="text-[10px] font-bold uppercase tracking-[0.16em] text-primary">Сигналы</p><h2 className="mt-1 text-base font-semibold">Почему это перспективный лид</h2><p className="mt-1 text-xs leading-5 text-muted-foreground">Приоритет показывает перспективность обращения: 40 баллов за рынок, 20 за прямые контакты и 40 за потенциал сайта.</p></div><ShieldAlert className="h-5 w-5 text-primary" /></div><div className="space-y-4">{Object.entries(groupedFactors).map(([category, factors]) => <div key={category}><div className="mb-2 flex items-center justify-between"><span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{categoryLabels[category] ?? category}</span><span className="font-mono text-[10px] text-muted-foreground">{factors.reduce((sum, factor) => sum + factor.points, 0)} / {factors.reduce((sum, factor) => sum + factor.maxPoints, 0)}</span></div><div className="space-y-2">{factors.map((factor) => <div data-testid={`score-factor-${factor.key}`} key={factor.key} className="rounded-lg border border-border/60 bg-background/45 p-3"><div className="flex items-center justify-between gap-3"><p className="text-xs font-semibold">{factor.label}</p><span className="font-mono text-[10px] text-primary">+{factor.points}</span></div><p className="mt-1 text-[11px] leading-4 text-muted-foreground">{factor.evidence}</p></div>)}</div></div>)}{scoreBreakdown.length === 0 && <p className="text-xs text-muted-foreground">Для этой записи нет детализации оценки.</p>}</div></section>
           <div className="space-y-5">
             <section className="rounded-xl border border-border/70 bg-card p-5 shadow-sm"><p className="mb-4 text-[10px] font-bold uppercase tracking-[0.16em] text-primary">Факты</p><div className="space-y-3">{lead.rating != null && <Fact icon={CircleHelp} label="Рейтинг" value={`${lead.rating} / 5`} />}{lead.reviewsCount > 0 && <Fact icon={FileText} label="Отзывы" value={String(lead.reviewsCount)} />}{<Fact icon={Building2} label="Филиалы" value={String(lead.branchesCount)} />}{<Fact icon={Users} label="Источник" value={lead.source} />}</div></section>
             <section className="rounded-xl border border-border/70 bg-card p-5 shadow-sm"><p className="mb-3 text-[10px] font-bold uppercase tracking-[0.16em] text-primary">Контакты</p>{contacts.length ? <div className="space-y-3">{contacts.map((contact, index) => { const type = contact.type.toLowerCase(); const Icon = type.includes("phone") || type.includes("телефон") ? Phone : type.includes("email") || type.includes("почт") ? Mail : Globe2; const url = safeUrl(contact.url); return <div data-testid={`contact-${lead.id}-${index}`} key={`${contact.type}-${contact.value}-${index}`} className="flex items-start gap-2.5"><Icon className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" /><div className="min-w-0 break-all"><p className="text-xs font-semibold">{url ? <a href={url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">{contact.value}</a> : contact.value}</p><p className="mt-0.5 text-[10px] text-muted-foreground">{contact.type}</p></div></div>; })}</div> : <p className="text-xs text-muted-foreground">Контакты не найдены.</p>}</section>
           </div>
         </div>

         <div className="space-y-3">
           <OutreachMessagePanel lead={lead} />
           <CommunicationGuide compact />
         </div>

        <section className="rounded-xl border border-border/70 bg-card p-5 shadow-sm"><div className="mb-3 flex items-center justify-between"><div><p className="text-[10px] font-bold uppercase tracking-[0.16em] text-primary">Следующее действие</p><h2 className="mt-1 text-base font-semibold">Заметки по компании</h2></div><FileText className="h-4 w-4 text-primary" /></div><Textarea data-testid="textarea-lead-note" value={note} onChange={(event) => saveNote(event.target.value)} disabled={!isAssignedToMe} placeholder={isAssignedToMe ? "Добавьте заметки о звонке, возражениях или следующем обязательстве…" : "Возьмите лид в работу, чтобы добавлять личные заметки."} className="min-h-32 resize-none bg-background/50 text-xs leading-5" /><div className="mt-2 flex items-center justify-between text-[10px] text-muted-foreground"><span>{isAssignedToMe ? "Заметки сохраняются автоматически" : "Только назначенный владелец может редактировать заметки"}</span>{updateLead.isPending && <span data-testid="status-note-saving">Сохранение…</span>}</div></section>

      </div>
    </AppLayout>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return <div className="rounded-lg border border-border/60 bg-background/45 p-2.5"><p className="text-[10px] text-muted-foreground">{label}</p><p className="mt-1 font-mono text-xs font-semibold">{value}</p></div>;
}
function Fact({ icon: Icon, label, value }: { icon: typeof CircleHelp; label: string; value: string }) {
  return <div className="flex items-center justify-between border-b border-border/50 pb-2.5 last:border-0 last:pb-0"><span className="flex items-center gap-2 text-xs text-muted-foreground"><Icon className="h-3.5 w-3.5" />{label}</span><span data-testid={`text-fact-${label.toLowerCase()}`} className="text-xs font-semibold">{value}</span></div>;
}
function EmptyState({ title, copy, action, onAction, secondaryAction, onSecondaryAction }: { title: string; copy: string; action: string; onAction: () => void; secondaryAction?: string; onSecondaryAction?: () => void }) {
  return <div className="mx-auto flex max-w-xl flex-col items-center justify-center gap-3 py-24 text-center"><AlertCircle className="h-7 w-7 text-muted-foreground" /><p className="text-sm font-semibold">{title}</p><p className="text-xs text-muted-foreground">{copy}</p><div className="flex gap-2"><Button data-testid="button-empty-action" type="button" variant="outline" size="sm" onClick={onAction}>{action}</Button>{secondaryAction && onSecondaryAction && <Button data-testid="button-empty-secondary" type="button" size="sm" onClick={onSecondaryAction}>{secondaryAction}</Button>}</div></div>;
}
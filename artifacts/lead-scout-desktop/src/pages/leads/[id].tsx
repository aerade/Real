import { useEffect, useRef, useState } from "react";
import { getGetLeadQueryKey, LeadUpdateStatus, useClaimLead, useGetLead, useUpdateLead } from "@workspace/api-client-react";
import { AppLayout } from "@/components/layout/app-layout";
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
  AlertCircle, ArrowLeft, Building2, CheckCircle2, CircleHelp, ExternalLink,
  FileText, Globe2, Mail, MapPin, Phone, ShieldAlert, Users, XCircle,
} from "lucide-react";

function safeUrl(value?: string | null) {
  if (!value) return null;
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:" ? url.href : null;
  } catch { return null; }
}

function websiteHost(value?: string | null) {
  const url = safeUrl(value);
  return url ? new URL(url).hostname.replace(/^www\./, "") : value;
}

function scoreTone(score: number) {
  return score >= 80 ? "text-emerald-300" : score >= 50 ? "text-amber-300" : "text-rose-300";
}

function auditCheckClass(status: string) {
  return status === "pass" ? "border-emerald-500/25 bg-emerald-500/10" : status === "warn" ? "border-amber-500/25 bg-amber-500/10" : status === "fail" ? "border-rose-500/25 bg-rose-500/10" : "border-border/60 bg-background/50";
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
        toast({ title: "Status updated", description: statusMap[status]?.label ?? status });
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
        toast({ title: "Lead marked as rejected" });
      },
    });
  };

  const back = () => { if (window.history.length > 1) window.history.back(); else setLocation("/search"); };
  if (!leadId) return <AppLayout><EmptyState title="Lead not found" copy="The company identifier is not valid." action="Back to search" onAction={() => setLocation("/search")} /></AppLayout>;
  if (isLoading) return <AppLayout><div className="mx-auto max-w-5xl space-y-5 animate-pulse"><div className="h-4 w-24 rounded bg-muted" /><div className="h-12 w-2/3 rounded bg-muted" /><div className="h-24 rounded-xl bg-muted" /><div className="grid gap-4 md:grid-cols-2"><div className="h-72 rounded-xl bg-muted" /><div className="h-72 rounded-xl bg-muted" /></div></div></AppLayout>;
  if (isError || !lead) return <AppLayout><EmptyState title="Could not load this company" copy="The lead may be unavailable right now. Try again or return to search." action="Try again" onAction={() => refetch()} secondaryAction="Back to search" onSecondaryAction={back} /></AppLayout>;

  const isAssignedToMe = lead.assignee?.id === session?.user?.id;
  const canClaim = !lead.assignee && lead.status === "new";
  const status = statusMap[lead.status] ?? { label: lead.status, variant: "neutral" };
  const audit = lead.websiteAudit;
  const website = safeUrl(lead.website);
  const groupedFactors = lead.scoreBreakdown.reduce<Record<string, typeof lead.scoreBreakdown>>((groups, factor) => {
    (groups[factor.category] ??= []).push(factor);
    return groups;
  }, {});
  const categoryLabels: Record<string, string> = { market: "Market fit", contactability: "Reachability", opportunity: "Opportunity", website: "Website" };

  return (
    <AppLayout>
      <div className="mx-auto flex h-full min-h-0 max-w-5xl flex-col gap-5 overflow-y-auto pb-10 pr-1">
        <button data-testid="button-back-to-search" type="button" onClick={back} className="inline-flex w-fit items-center gap-1 text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground transition-colors hover:text-foreground"><ArrowLeft className="h-3.5 w-3.5" />Back to search</button>
        <header className="flex flex-col justify-between gap-5 border-b border-border/70 pb-5 lg:flex-row lg:items-start">
          <div className="min-w-0"><div className="mb-2 flex flex-wrap items-center gap-2"><span className="rounded-full border border-primary/30 bg-primary/10 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-primary">Company record</span><span data-testid="status-lead" className="rounded-full border border-border/70 bg-card px-2 py-1 text-[10px] text-muted-foreground">{status.label}</span></div><h1 data-testid="text-lead-name" className="truncate text-2xl font-semibold tracking-tight">{lead.name}</h1><div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-muted-foreground"><span className="flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5" />{lead.city}, {lead.country}</span><span className="flex items-center gap-1.5"><Building2 className="h-3.5 w-3.5" />{lead.industry}</span>{website && <a data-testid="link-lead-website" href={website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-primary hover:underline"><Globe2 className="h-3.5 w-3.5" />{websiteHost(lead.website)}<ExternalLink className="h-3 w-3" /></a>}</div></div>
          <div className="flex items-center gap-3 rounded-xl border border-border/70 bg-card px-4 py-3 shadow-sm"><div className="border-r border-border/70 pr-4 text-right"><p data-testid="text-lead-score" className={cn("font-mono text-3xl font-semibold", scoreTone(lead.score))}>{lead.score}</p><p className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">priority / 100</p></div><div className="max-w-36"><p className="text-xs font-semibold">Why this score?</p><p className="mt-1 text-[11px] leading-4 text-muted-foreground">A higher score means more signals point to a timely sales conversation.</p></div><CircleHelp className="h-4 w-4 shrink-0 text-primary" /></div>
        </header>

        <div className="flex flex-wrap items-center gap-3 rounded-xl border border-border/70 bg-card/70 p-3">
          {canClaim ? <><div className="flex-1"><p className="text-xs font-semibold">This lead is unassigned</p><p className="mt-0.5 text-[11px] text-muted-foreground">Claim it to add the company to your personal pipeline.</p></div><Button data-testid="button-claim-lead" onClick={() => claimLead.mutate({ id: leadId }, { onSuccess: (updated) => { queryClient.setQueryData(getGetLeadQueryKey(leadId), updated); toast({ title: "Lead added to your pipeline" }); } })} disabled={claimLead.isPending} className="h-8 text-xs">Claim lead</Button></>
            : isAssignedToMe ? <><div className="flex-1"><p className="text-xs font-semibold">Your lead</p><p className="mt-0.5 text-[11px] text-muted-foreground">Keep the stage current so your pipeline reflects the next action.</p></div><Select value={lead.status} onValueChange={updateStatus}><SelectTrigger data-testid="select-lead-status" className="h-8 w-44 text-xs"><SelectValue /></SelectTrigger><SelectContent>{Object.entries(statusMap).filter(([key]) => key !== "new").map(([key, item]) => <SelectItem key={key} value={key}>{item.label}</SelectItem>)}</SelectContent></Select><Button data-testid="button-reject-lead" type="button" variant="outline" onClick={() => setIsRejecting((current) => !current)} disabled={updateLead.isPending} className="h-8 border-destructive/40 text-xs text-destructive">Reject</Button></>
            : <p className="w-full text-center text-xs text-muted-foreground">In progress with {lead.assignee?.name ?? "another teammate"}.</p>}
        </div>
        {isRejecting && isAssignedToMe && <div className="rounded-xl border border-destructive/25 bg-destructive/5 p-4"><label htmlFor="reject-reason" className="text-xs font-semibold">Why is this lead not a fit?</label><Textarea data-testid="textarea-reject-reason" id="reject-reason" value={rejectReason} onChange={(event) => setRejectReason(event.target.value)} placeholder="Add a short reason for your team." className="mt-2 min-h-16 resize-none text-xs" /><div className="mt-3 flex justify-end gap-2"><Button data-testid="button-cancel-reject" type="button" variant="ghost" size="sm" onClick={() => setIsRejecting(false)}>Cancel</Button><Button data-testid="button-confirm-reject" type="button" variant="destructive" size="sm" disabled={updateLead.isPending || !rejectReason.trim()} onClick={rejectLead}>Confirm rejection</Button></div></div>}

        <div className="grid gap-5 lg:grid-cols-[1.15fr_.85fr]">
          <div className="space-y-5">
            <section className="rounded-xl border border-border/70 bg-card p-5 shadow-sm"><div className="mb-4 flex items-start justify-between gap-4"><div><p className="text-[10px] font-bold uppercase tracking-[0.16em] text-primary">Signals</p><h2 className="mt-1 text-base font-semibold">What makes this a lead</h2><p className="mt-1 text-xs leading-5 text-muted-foreground">The priority combines market context, reachability, opportunity, and website signals returned by the scoring service.</p></div><ShieldAlert className="h-5 w-5 text-primary" /></div><div className="space-y-4">{Object.entries(groupedFactors).map(([category, factors]) => <div key={category}><div className="mb-2 flex items-center justify-between"><span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{categoryLabels[category] ?? category}</span><span className="font-mono text-[10px] text-muted-foreground">{factors.reduce((sum, factor) => sum + factor.points, 0)} / {factors.reduce((sum, factor) => sum + factor.maxPoints, 0)}</span></div><div className="space-y-2">{factors.map((factor) => <div data-testid={`score-factor-${factor.key}`} key={factor.key} className="rounded-lg border border-border/60 bg-background/45 p-3"><div className="flex items-center justify-between gap-3"><p className="text-xs font-semibold">{factor.label}</p><span className="font-mono text-[10px] text-primary">+{factor.points}</span></div><p className="mt-1 text-[11px] leading-4 text-muted-foreground">{factor.evidence}</p></div>)}</div></div>)}{lead.scoreBreakdown.length === 0 && <p className="text-xs text-muted-foreground">No score breakdown was returned for this record.</p>}</div></section>
            <section className="rounded-xl border border-border/70 bg-card p-5 shadow-sm"><div className="mb-3 flex items-center justify-between"><div><p className="text-[10px] font-bold uppercase tracking-[0.16em] text-primary">Next action</p><h2 className="mt-1 text-base font-semibold">Keep the context close</h2></div><FileText className="h-4 w-4 text-primary" /></div><Textarea data-testid="textarea-lead-note" value={note} onChange={(event) => saveNote(event.target.value)} disabled={!isAssignedToMe} placeholder={isAssignedToMe ? "Add call notes, objections, or the next commitment…" : "Claim this lead to add private notes."} className="min-h-32 resize-none bg-background/50 text-xs leading-5" /><div className="mt-2 flex items-center justify-between text-[10px] text-muted-foreground"><span>{isAssignedToMe ? "Notes save automatically" : "Only the assigned owner can edit notes"}</span>{updateLead.isPending && <span data-testid="status-note-saving">Saving…</span>}</div></section>
          </div>
          <div className="space-y-5">
            <section className="rounded-xl border border-border/70 bg-card p-5 shadow-sm"><div className="mb-4 flex items-start justify-between gap-4"><div><p className="text-[10px] font-bold uppercase tracking-[0.16em] text-primary">Website audit</p><h2 className="mt-1 text-base font-semibold">What the site says</h2></div><Globe2 className="h-5 w-5 text-primary" /></div>{!audit || audit.status === "not_provided" ? <div className="rounded-lg border border-dashed border-border/70 p-4"><p className="text-xs font-semibold">No audit was returned</p><p className="mt-1 text-[11px] leading-4 text-muted-foreground">The search service did not provide a website audit for this company.</p></div> : <><div className="flex items-center justify-between rounded-lg border border-border/60 bg-background/45 p-3"><div><p className="text-xs font-semibold">{audit.status === "checked" ? "Audit completed" : "Audit unavailable"}</p><p className="mt-1 text-[11px] text-muted-foreground">{audit.error ?? (audit.checkedAt ? `Checked ${new Date(audit.checkedAt).toLocaleString("ru-RU")}` : "No check timestamp returned")}</p></div>{audit.qualityScore != null && <span data-testid="text-website-quality-score" className={cn("font-mono text-2xl font-semibold", scoreTone(audit.qualityScore))}>{audit.qualityScore}<span className="text-xs text-muted-foreground">/100</span></span>}</div><div className="mt-3 grid grid-cols-2 gap-2 text-[11px]">{audit.statusCode != null && <Metric label="HTTP status" value={String(audit.statusCode)} />}{audit.responseTimeMs != null && <Metric label="Response" value={`${audit.responseTimeMs} ms`} />}{audit.pageSizeKb != null && <Metric label="Page size" value={`${audit.pageSizeKb} KB`} />}{audit.hasMobileViewport != null && <Metric label="Mobile viewport" value={audit.hasMobileViewport ? "Present" : "Missing"} />}</div>{audit.title && <div className="mt-3 rounded-lg border border-border/60 bg-background/45 p-3"><p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Page title</p><p className="mt-1 text-xs">{audit.title}</p>{audit.metaDescription && <p className="mt-2 text-[11px] leading-4 text-muted-foreground">{audit.metaDescription}</p>}</div>}<div className="mt-3 space-y-2">{audit.checks.map((check) => <div data-testid={`audit-check-${check.key}`} key={check.key} className={cn("rounded-lg border p-3", auditCheckClass(check.status))}><div className="flex items-center gap-2">{check.status === "pass" ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-300" /> : check.status === "fail" ? <XCircle className="h-3.5 w-3.5 text-rose-300" /> : <AlertCircle className="h-3.5 w-3.5 text-amber-300" />}<p className="text-xs font-semibold">{check.label}</p></div><p className="mt-1 text-[11px] leading-4 text-muted-foreground">{check.evidence}</p></div>)}</div></>}</section>
            <section className="rounded-xl border border-border/70 bg-card p-5 shadow-sm"><p className="mb-4 text-[10px] font-bold uppercase tracking-[0.16em] text-primary">Facts</p><div className="space-y-3">{lead.rating != null && <Fact icon={CircleHelp} label="Rating" value={`${lead.rating} / 5`} />}{lead.reviewsCount > 0 && <Fact icon={FileText} label="Reviews" value={String(lead.reviewsCount)} />}{<Fact icon={Building2} label="Branches" value={String(lead.branchesCount)} />}{<Fact icon={Users} label="Source" value={lead.source} />}</div></section>
            <section className="rounded-xl border border-border/70 bg-card p-5 shadow-sm"><p className="mb-3 text-[10px] font-bold uppercase tracking-[0.16em] text-primary">Contact points</p>{lead.contacts.length ? <div className="space-y-3">{lead.contacts.map((contact, index) => { const type = contact.type.toLowerCase(); const Icon = type.includes("phone") || type.includes("телефон") ? Phone : type.includes("email") || type.includes("почт") ? Mail : Globe2; const url = safeUrl(contact.url); return <div data-testid={`contact-${lead.id}-${index}`} key={`${contact.type}-${contact.value}-${index}`} className="flex items-start gap-2.5"><Icon className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" /><div className="min-w-0 break-all"><p className="text-xs font-semibold">{url ? <a href={url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">{contact.value}</a> : contact.value}</p><p className="mt-0.5 text-[10px] text-muted-foreground">{contact.type}</p></div></div>; })}</div> : <p className="text-xs text-muted-foreground">No contacts were returned.</p>}</section>
          </div>
        </div>
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
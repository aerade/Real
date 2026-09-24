import { useEffect, useState } from "react";
import type { Lead } from "@workspace/api-client-react";
import { Check, Copy, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { createOutreachMessage } from "@/lib/outreach-messages";

export function OutreachMessagePanel({ lead }: { lead: Lead }) {
  const { toast } = useToast();
  const message = createOutreachMessage(lead);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setCopied(false);
  }, [lead.id]);

  const copyMessage = async () => {
    try {
      await navigator.clipboard.writeText(message);
      setCopied(true);
      toast({ title: "Сообщение скопировано" });
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      toast({ title: "Не удалось скопировать сообщение", description: "Выделите текст вручную и скопируйте его." });
    }
  };

  return (
    <section className="rounded-xl border border-border/70 bg-card p-5 shadow-sm">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="mb-2 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.16em] text-primary">
            <MessageSquare className="h-3.5 w-3.5" />
            Сообщение для первого контакта
          </p>
          <h2 className="text-base font-semibold">
            {lead.websiteStatus === "present" ? "Предложение по улучшению сайта" : "Предложение создать сайт"}
          </h2>
          <p className="mt-1 max-w-3xl text-xs leading-5 text-muted-foreground">
            Шаблон общий для всех компаний. Подставлены только название и тип компании.
          </p>
        </div>
        <Button type="button" variant="outline" size="sm" onClick={copyMessage} className="h-8 shrink-0 text-xs">
          {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
          {copied ? "Скопировано" : "Копировать"}
        </Button>
      </div>
      <Textarea
        value={message}
        readOnly
        aria-label="Готовое сообщение"
        className="min-h-64 resize-y bg-background/35 text-xs leading-5"
      />
    </section>
  );
}
import { useEffect, useState } from "react";
import type { Lead } from "@workspace/api-client-react";
import { Check, Copy, MessageSquare, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { createOutreachMessages } from "@/lib/outreach-messages";

export function OutreachMessagePanel({ lead }: { lead: Lead }) {
  const { toast } = useToast();
  const families = createOutreachMessages(lead);
  const [selectedFamilyId, setSelectedFamilyId] = useState(families[0]?.id ?? "");
  const [variantIndex, setVariantIndex] = useState(0);
  const [editedText, setEditedText] = useState<string | undefined>();
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const family = families.find((item) => item.id === selectedFamilyId) ?? families[0];
  const messageId = `${family?.id ?? "message"}-${variantIndex}`;
  const generatedText = family?.variants[variantIndex] ?? "";
  const text = editedText ?? generatedText;

  useEffect(() => {
    setSelectedFamilyId(families[0]?.id ?? "");
    setVariantIndex(0);
    setEditedText(undefined);
    setCopiedId(null);
  }, [lead.id]);

  const copyMessage = async (id: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      toast({ title: "Сообщение скопировано" });
      window.setTimeout(() => setCopiedId((current) => current === id ? null : current), 1800);
    } catch {
      toast({ title: "Не удалось скопировать сообщение", description: "Выделите текст вручную и скопируйте его." });
    }
  };

  const selectFamily = (value: string) => {
    setSelectedFamilyId(value);
    setVariantIndex(0);
    setEditedText(undefined);
    setCopiedId(null);
  };

  const selectVariant = (value: string) => {
    setVariantIndex(Number(value));
    setEditedText(undefined);
    setCopiedId(null);
  };

  return (
    <section className="rounded-xl border border-border/70 bg-card p-5 shadow-sm">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="mb-2 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.16em] text-primary">
            <MessageSquare className="h-3.5 w-3.5" />
            Генератор сообщений
          </p>
          <h2 className="text-base font-semibold">Сообщение о вашем сайте</h2>
          <p className="mt-1 max-w-3xl text-xs leading-5 text-muted-foreground">
            Выберите тип и вариант, затем отредактируйте текст перед отправкой.
          </p>
        </div>
         <div className="flex min-w-0 w-full gap-2 sm:w-auto">
          <Select value={family?.id ?? ""} onValueChange={selectFamily}>
             <SelectTrigger aria-label="Тип сообщения" className="h-8 min-w-0 flex-1 text-xs sm:w-48 sm:flex-none">
               <SelectValue className="min-w-0 truncate" placeholder="Тип сообщения" />
            </SelectTrigger>
            <SelectContent>
              {families.map((item) => <SelectItem key={item.id} value={item.id}>{item.title}</SelectItem>)}
            </SelectContent>
          </Select>
           <Select value={String(variantIndex)} onValueChange={selectVariant}>
              <SelectTrigger aria-label="Вариант сообщения" className="h-8 w-28 min-w-0 shrink-0 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {(family?.variants ?? []).map((_, index) => <SelectItem key={index} value={String(index)}>Вариант {index + 1}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="rounded-lg border border-border/70 bg-background/35 p-3">
        <p className="mb-2 text-[11px] leading-4 text-muted-foreground">{family?.description}</p>
        <Textarea
          value={text}
          onChange={(event) => {
            setEditedText(event.target.value);
            setCopiedId(null);
          }}
          aria-label="Текст сообщения"
          className="min-h-48 resize-y bg-card/70 text-xs leading-5"
        />
        <div className="mt-3 flex items-center justify-between gap-3">
          <span className="text-[10px] text-muted-foreground">Текст можно изменить перед отправкой.</span>
          <div className="flex shrink-0 items-center gap-2">
            {editedText !== undefined && (
              <Button type="button" variant="ghost" size="sm" onClick={() => { setEditedText(undefined); setCopiedId(null); }} className="h-8 px-2 text-[10px] text-muted-foreground">
                <RotateCcw className="h-3.5 w-3.5" />
                Вернуть
              </Button>
            )}
            <Button type="button" variant="outline" size="sm" onClick={() => copyMessage(messageId, text)} className="h-8 text-xs">
              {copiedId === messageId ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
              {copiedId === messageId ? "Скопировано" : "Копировать"}
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
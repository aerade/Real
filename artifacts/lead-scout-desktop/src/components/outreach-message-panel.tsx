import { useEffect, useState } from "react";
import type { Lead } from "@workspace/api-client-react";
import { Check, Copy, MessageSquare, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { createOutreachMessages } from "@/lib/outreach-messages";

export function OutreachMessagePanel({ lead }: { lead: Lead }) {
  const { toast } = useToast();
  const [selectedVariants, setSelectedVariants] = useState<Record<string, number>>({});
  const [editedTexts, setEditedTexts] = useState<Record<string, string>>({});
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const families = createOutreachMessages(lead);

  useEffect(() => {
    setSelectedVariants({});
    setEditedTexts({});
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

  return (
    <section className="rounded-xl border border-border/70 bg-card p-5 shadow-sm">
      <div className="mb-5 flex items-start justify-between gap-4">
        <div>
          <p className="mb-2 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.16em] text-primary">
            <MessageSquare className="h-3.5 w-3.5" />
            Готовые сообщения
          </p>
          <h2 className="text-base font-semibold">Сообщения для первого контакта</h2>
          <p className="mt-1 max-w-3xl text-xs leading-5 text-muted-foreground">
            Несколько подходов и по пять вариантов каждого. Тексты собираются по правилам из данных карточки и не добавляют неподтверждённых фактов.
          </p>
        </div>
        <span className="hidden rounded-full border border-border/70 bg-background px-2.5 py-1 text-[10px] font-semibold text-muted-foreground sm:inline-flex">
          Без ИИ
        </span>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        {families.map((family) => {
          const variantIndex = selectedVariants[family.id] ?? 0;
          const messageId = `${family.id}-${variantIndex}`;
          const generatedText = family.variants[variantIndex];
          const text = editedTexts[messageId] ?? generatedText;
          return (
            <article key={family.id} className="rounded-lg border border-border/70 bg-background/35 p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-sm font-semibold">{family.title}</h3>
                  <p className="mt-1 text-[11px] leading-4 text-muted-foreground">{family.description}</p>
                </div>
                <span className="shrink-0 font-mono text-[10px] text-muted-foreground">
                  {variantIndex + 1}/5
                </span>
              </div>

              <div className="mt-3 flex flex-wrap gap-1.5" aria-label={`Варианты: ${family.title}`}>
                {family.variants.map((_, index) => (
                  <button
                    key={index}
                    type="button"
                    aria-label={`Вариант ${index + 1}`}
                    aria-pressed={variantIndex === index}
                    onClick={() => {
                      setSelectedVariants((current) => ({ ...current, [family.id]: index }));
                      setCopiedId(null);
                    }}
                    className={cn(
                      "flex h-7 min-w-7 items-center justify-center rounded-md border px-2 text-[10px] font-bold transition-colors",
                      variantIndex === index
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border/70 text-muted-foreground hover:border-primary/50 hover:text-foreground",
                    )}
                  >
                    {index + 1}
                  </button>
                ))}
              </div>

              <Textarea
                value={text}
                onChange={(event) => {
                  setEditedTexts((current) => ({ ...current, [messageId]: event.target.value }));
                  setCopiedId(null);
                }}
                aria-label={`${family.title}, вариант ${variantIndex + 1}`}
                className="mt-3 min-h-36 resize-y bg-card/70 text-xs leading-5"
              />
              <div className="mt-3 flex items-center justify-between gap-3">
                <span className="text-[10px] text-muted-foreground">Измените текст перед отправкой или скопируйте как есть</span>
                <div className="flex shrink-0 items-center gap-2">
                  {editedTexts[messageId] !== undefined && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setEditedTexts((current) => {
                          const next = { ...current };
                          delete next[messageId];
                          return next;
                        });
                        setCopiedId(null);
                      }}
                      className="h-8 px-2 text-[10px] text-muted-foreground"
                    >
                      <RotateCcw className="h-3.5 w-3.5" />
                      Вернуть
                    </Button>
                  )}
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => copyMessage(messageId, text)}
                    className="h-8 text-xs"
                  >
                    {copiedId === messageId ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                    {copiedId === messageId ? "Скопировано" : "Копировать"}
                  </Button>
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
import { ShieldAlert } from "lucide-react";

export function CommunicationGuide({ compact = false }: { compact?: boolean }) {
  return (
    <aside className={`rounded-xl border border-primary/20 bg-primary/[0.04] ${compact ? "p-3" : "p-4"}`}>
      <div className="flex items-start gap-3">
        <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs font-semibold">Памятка для общения с потенциальным заказчиком</p>
            <span className="rounded-full border border-primary/25 bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary">
              Минимальный заказ: 10 000 ₽
            </span>
          </div>
          <div className={`mt-3 grid gap-3 text-[11px] leading-4 text-muted-foreground ${compact ? "" : "sm:grid-cols-2"}`}>
             <p><span className="font-semibold text-foreground">Нужно:</span> представиться, опираться на известные факты, уточнить задачу, говорить о пользе и договориться о следующем шаге.</p>
             <p><span className="font-semibold text-foreground">Не нужно:</span> давить, спамить, обещать результат без согласования или утверждать то, чего вы не проверяли на сайте.</p>
          </div>
        </div>
      </div>
    </aside>
  );
}
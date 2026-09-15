import { useEffect, useState } from "react";
import { Check, Download, Loader2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

type UpdateStatus = {
  configured: boolean;
  status: string;
  percent?: number;
  message?: string;
};

function mergeUpdateStatus(previous: UpdateStatus | null, patch: Partial<UpdateStatus>): UpdateStatus {
  return {
    configured: patch.configured ?? previous?.configured ?? true,
    status: patch.status ?? previous?.status ?? "idle",
    percent: patch.percent ?? previous?.percent,
    message: patch.message ?? previous?.message,
  };
}

function statusLabel(update: UpdateStatus) {
  if (update.status === "downloaded") return "Restart to update";
  if (update.status === "downloading") {
    return `Downloading${typeof update.percent === "number" ? ` ${Math.round(update.percent)}%` : "..."}`;
  }
  if (update.status === "available") return "Update available";
  if (update.status === "checking") return "Checking...";
  if (update.status === "current") return "Up to date";
  if (update.status === "error") return "Retry update check";
  return "Check for updates";
}

export function UpdateStatus() {
  const [update, setUpdate] = useState<UpdateStatus | null>(null);

  useEffect(() => {
    const desktop = window.realDesktop;
    if (!desktop?.getUpdateStatus) return;

    let active = true;
    const unsubscribe = desktop.onUpdateStatus?.((value) => {
      if (!active) return;
      if (typeof value === "string") {
        setUpdate((previous) => mergeUpdateStatus(previous, { status: value }));
      } else if (value && typeof value === "object") {
        setUpdate((previous) => mergeUpdateStatus(previous, value as Partial<UpdateStatus>));
      }
    });

    desktop.getUpdateStatus().then((value) => {
      if (active) setUpdate(value);
    }).catch(() => undefined);

    desktop.checkForUpdates().then((value) => {
      if (active && value) setUpdate((previous) => mergeUpdateStatus(previous, value));
    }).catch(() => {
      if (active) setUpdate((previous) => ({ ...(previous ?? { configured: true }), status: "error" }));
    });

    return () => {
      active = false;
      unsubscribe?.();
    };
  }, []);

  if (!update?.configured) return null;

  const isBusy = update.status === "checking" || update.status === "downloading";
  const isReady = update.status === "downloaded";
  const Icon = isReady ? Download : update.status === "current" ? Check : isBusy ? Loader2 : RefreshCw;

  const handleClick = async () => {
    if (isReady) {
      await window.realDesktop?.installUpdate();
      return;
    }
    await window.realDesktop?.checkForUpdates();
  };

  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      disabled={isBusy}
      onClick={handleClick}
      title={update.message || statusLabel(update)}
      className="h-8 max-w-[178px] gap-1.5 rounded-lg px-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground"
    >
      <Icon className={`h-3.5 w-3.5 shrink-0 ${isBusy ? "animate-spin" : ""}`} />
      <span className="truncate">{statusLabel(update)}</span>
    </Button>
  );
}
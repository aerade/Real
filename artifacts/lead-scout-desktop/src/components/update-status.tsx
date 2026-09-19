import { useEffect, useState } from "react";
import { Check, Download, Loader2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

type UpdateStatus = {
  configured: boolean;
  status: string;
  percent?: number;
  message?: string;
  currentVersion?: string;
  latestVersion?: string;
  releaseName?: string;
  installerUrl?: string;
};

function mergeUpdateStatus(previous: UpdateStatus | null, patch: Partial<UpdateStatus>): UpdateStatus {
  return {
    ...previous,
    configured: patch.configured ?? previous?.configured ?? true,
    status: patch.status ?? previous?.status ?? "idle",
    percent: patch.percent ?? previous?.percent,
    message: patch.message ?? previous?.message,
    currentVersion: patch.currentVersion ?? previous?.currentVersion,
    latestVersion: patch.latestVersion ?? previous?.latestVersion,
    releaseName: patch.releaseName ?? previous?.releaseName,
    installerUrl: patch.installerUrl ?? previous?.installerUrl,
  };
}

function statusLabel(update: UpdateStatus) {
  if (update.status === "downloaded") return `Перезапустить для v${update.latestVersion ?? "обновления"}`;
  if (update.status === "downloading") {
    return `Загрузка${typeof update.percent === "number" ? ` ${Math.round(update.percent)}%` : "…"}`;
  }
  if (update.status === "available") return `Обновить до v${update.latestVersion ?? "последней версии"}`;
  if (update.status === "checking") return "Проверка…";
  if (update.status === "current") return "Установлена последняя версия";
  if (update.status === "error") return "Повторить проверку";
  return "Проверить обновления";
}

export function UpdateStatus() {
  const [update, setUpdate] = useState<UpdateStatus | null>(null);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const desktop = window.realDesktop;
    if (!desktop?.getUpdateStatus) return;

    let active = true;
    const syncVisibility = () => {
      try {
        const saved = window.localStorage.getItem("real:settings") ?? window.localStorage.getItem("lead-scout:settings");
        const settings = saved ? JSON.parse(saved) as { showUpdates?: boolean } : {};
        setVisible(settings.showUpdates !== false);
      } catch {
        setVisible(true);
      }
    };
    syncVisibility();
    window.addEventListener("real:settings-changed", syncVisibility);
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
      window.removeEventListener("real:settings-changed", syncVisibility);
      unsubscribe?.();
    };
  }, []);

  if (!visible || !update?.configured) return null;

  const isBusy = update.status === "checking" || update.status === "downloading";
  const isReady = update.status === "downloaded";
  const Icon = isReady ? Download : update.status === "current" ? Check : isBusy ? Loader2 : RefreshCw;

  const handleClick = async () => {
    const desktop = window.realDesktop;
    if (!desktop) return;
    if (isReady) {
      await desktop.installUpdate();
      return;
    }
    if (update.status === "available") {
      const downloaded = await desktop.downloadUpdate();
      setUpdate((previous) => downloaded ? mergeUpdateStatus(previous, downloaded) : previous);
    } else {
      setUpdate((previous) => mergeUpdateStatus(previous, { status: "checking" }));
      try {
        const checked = await desktop.checkForUpdates();
        if (checked) setUpdate((previous) => mergeUpdateStatus(previous, checked));
      } catch (error) {
        setUpdate((previous) => mergeUpdateStatus(previous, {
          status: "error",
          message: error instanceof Error ? error.message : "Не удалось проверить обновления",
        }));
      }
    }
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
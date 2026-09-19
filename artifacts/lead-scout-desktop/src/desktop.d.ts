type DesktopRequest = {
  path: string;
  method: string;
  headers: Record<string, string>;
  body?: string;
};

type DesktopResponse = {
  status: number;
  statusText?: string;
  headers: Record<string, string>;
  body: string;
};

declare const __REAL_APP_VERSION__: string;

interface Window {
  realDesktop?: {
    request(request: DesktopRequest): Promise<DesktopResponse>;
    getConfig(): Promise<{ apiBaseUrl: string; updateUrl: string }>;
    getAppInfo(): Promise<{
      version: string;
      platform: string;
      arch: string;
      electronVersion: string;
      packaged: boolean;
      updateConfigured: boolean;
    }>;
    getUpdateStatus(): Promise<{
      configured: boolean;
      status: string;
      percent?: number;
      message?: string;
      currentVersion?: string;
      latestVersion?: string;
      releaseName?: string;
      installerUrl?: string;
    }>;
    checkForUpdates(): Promise<{
      configured: boolean;
      status?: string;
      percent?: number;
      message?: string;
      currentVersion?: string;
      latestVersion?: string;
      installerUrl?: string;
      releaseName?: string;
    }>;
    downloadUpdate(): Promise<{
      configured: boolean;
      status?: string;
      percent?: number;
      message?: string;
      currentVersion?: string;
      latestVersion?: string;
      releaseName?: string;
      installerUrl?: string;
    }>;
    installUpdate(): Promise<{ started: boolean }>;
    windowControl(action: "minimize" | "maximize" | "close"): Promise<void>;
    onUpdateStatus(listener: (status: unknown) => void): () => void;
  };
}
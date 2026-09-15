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

interface Window {
  realDesktop?: {
    request(request: DesktopRequest): Promise<DesktopResponse>;
    getConfig(): Promise<{ apiBaseUrl: string; updateUrl: string }>;
    getUpdateStatus(): Promise<{
      configured: boolean;
      status: string;
      percent?: number;
      message?: string;
    }>;
    checkForUpdates(): Promise<{
      configured: boolean;
      status?: string;
      percent?: number;
      message?: string;
    }>;
    installUpdate(): Promise<{ started: boolean }>;
    windowControl(action: "minimize" | "maximize" | "close"): Promise<void>;
    onUpdateStatus(listener: (status: unknown) => void): () => void;
  };
}
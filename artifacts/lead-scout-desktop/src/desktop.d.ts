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
    checkForUpdates(): Promise<{ configured: boolean }>;
    onUpdateStatus(listener: (status: unknown) => void): () => void;
  };
}
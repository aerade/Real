import { useState, useEffect, type ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ErrorBoundary } from '@/components/error-boundary';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import NotFound from '@/pages/not-found';
import {
  Route,
  Switch,
  useLocation,
  Router as WouterRouter,
} from 'wouter';
import { useHashLocation } from 'wouter/use-hash-location';
import { AuthProvider, ProtectedRoute } from '@/hooks/use-auth';
import { Login } from '@/pages/login';
import { Dashboard } from '@/pages/dashboard';
import { ArchivePage } from '@/pages/archive';
import { SearchPage } from '@/pages/search';
import { LeadsPage } from '@/pages/leads/index';
import { LeadDetailsPage } from '@/pages/leads/[id]';
import { AdminPage } from '@/pages/admin';
import { StartupScreen } from '@/components/startup-screen';

const queryClient = new QueryClient();

// Track startup screen execution per process
let hasRunStartupScreen = false;

function Router() {
  return (
    <RoutedErrorBoundary>
      <Switch>
        <Route path="/login" component={Login} />
        
        <Route path="/">
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        </Route>
        
        <Route path="/search">
          <ProtectedRoute>
            <SearchPage />
          </ProtectedRoute>
        </Route>

        <Route path="/archive">
          <ProtectedRoute>
            <ArchivePage />
          </ProtectedRoute>
        </Route>
        
        <Route path="/leads">
          <ProtectedRoute>
            <LeadsPage />
          </ProtectedRoute>
        </Route>
        
        <Route path="/leads/:id">
          <ProtectedRoute>
            <LeadDetailsPage />
          </ProtectedRoute>
        </Route>

        <Route path="/admin">
          <ProtectedRoute>
            <AdminPage />
          </ProtectedRoute>
        </Route>

        <Route component={NotFound} />
      </Switch>
    </RoutedErrorBoundary>
  );
}

function RoutedErrorBoundary({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  return <ErrorBoundary resetKey={location}>{children}</ErrorBoundary>;
}

function App() {
  const [startupComplete, setStartupComplete] = useState(hasRunStartupScreen);

  useEffect(() => {
    let audioContext: AudioContext | null = null;
    const playButtonSound = (event: MouseEvent) => {
      const target = event.target;
      if (!(target instanceof Element)) return;
      const button = target.closest("button,[role='button']");
      if (!(button instanceof HTMLElement) || button.getAttribute("aria-disabled") === "true" || button.hasAttribute("disabled")) return;
      let sound = "off";
      try {
        const raw = window.localStorage.getItem("real:settings");
        sound = raw ? JSON.parse(raw).buttonSound ?? "off" : "off";
      } catch {
        sound = "off";
      }
      if (sound === "off") return;
      const AudioContextConstructor = window.AudioContext;
      if (!AudioContextConstructor) return;
      audioContext ??= new AudioContextConstructor();
      const oscillator = audioContext.createOscillator();
      const gain = audioContext.createGain();
      const now = audioContext.currentTime;
      const frequency = sound === "pop" ? 640 : sound === "soft" ? 420 : 520;
      oscillator.type = sound === "pop" ? "sine" : "triangle";
      oscillator.frequency.setValueAtTime(frequency, now);
      oscillator.frequency.exponentialRampToValueAtTime(frequency * 0.72, now + (sound === "tap" ? 0.06 : 0.11));
      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.exponentialRampToValueAtTime(sound === "pop" ? 0.045 : 0.025, now + 0.008);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + (sound === "tap" ? 0.07 : 0.13));
      oscillator.connect(gain).connect(audioContext.destination);
      oscillator.start(now);
      oscillator.stop(now + (sound === "tap" ? 0.08 : 0.14));
    };
    document.addEventListener("click", playButtonSound);
    return () => {
      document.removeEventListener("click", playButtonSound);
      audioContext?.close().catch(() => undefined);
    };
  }, []);

  useEffect(() => {
    if (startupComplete) {
      hasRunStartupScreen = true;
    }
  }, [startupComplete]);

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        {!startupComplete ? (
          <StartupScreen onComplete={() => setStartupComplete(true)} />
        ) : (
          <WouterRouter
            base={window.realDesktop ? "" : import.meta.env.BASE_URL.replace(/\/$/, '')}
            hook={window.realDesktop ? useHashLocation : undefined}
          >
            <AuthProvider>
              <Router />
            </AuthProvider>
          </WouterRouter>
        )}
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;

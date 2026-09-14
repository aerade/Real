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

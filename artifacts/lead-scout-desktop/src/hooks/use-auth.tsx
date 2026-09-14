import { createContext, useContext, ReactNode, useEffect } from "react";
import { useGetSession, useLogout } from "@workspace/api-client-react";
import { useLocation } from "wouter";
import { Spinner } from "@/components/ui/spinner";
import type { Session } from "@workspace/api-client-react";

interface AuthContextType {
  session: Session | null;
  isLoading: boolean;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const { data: session, isLoading } = useGetSession();
  const logoutMutation = useLogout();
  const [, setLocation] = useLocation();

  const logout = () => {
    logoutMutation.mutate(undefined, {
      onSuccess: () => {
        setLocation("/login");
        window.location.reload();
      },
    });
  };

  return (
    <AuthContext.Provider value={{ session: session ?? null, isLoading, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

export function ProtectedRoute({ children }: { children: ReactNode }) {
  const { session, isLoading } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (!isLoading && !session?.authenticated) {
      setLocation("/login");
    }
  }, [isLoading, session?.authenticated, setLocation]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <Spinner className="w-8 h-8 text-primary" />
      </div>
    );
  }

  if (!session?.authenticated) {
    return null;
  }

  return <>{children}</>;
}

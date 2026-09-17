import { useState, useEffect, useRef } from "react";
import { getGetSessionQueryKey, useLogin } from "@workspace/api-client-react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AlertCircle } from "lucide-react";
import realMarkWhite from "@/assets/real-mark-white.svg";
import { WindowControls } from "@/components/layout/window-controls";
import { useQueryClient } from "@tanstack/react-query";

export function Login() {
  const [login, setLogin] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [showError, setShowError] = useState(false);
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const errorTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  
  const loginMutation = useLogin();

  useEffect(() => {
    return () => {
      if (errorTimer.current) clearTimeout(errorTimer.current);
    };
  }, []);

  const showValidationError = (message: string) => {
    if (errorTimer.current) clearTimeout(errorTimer.current);
    setError(message);
    setShowError(true);
    errorTimer.current = setTimeout(() => {
      setShowError(false);
      errorTimer.current = setTimeout(() => setError(""), 300);
    }, 1500);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (errorTimer.current) clearTimeout(errorTimer.current);
    setShowError(false);
    
    if (!login || !password) {
      showValidationError("Введите логин и пароль");
      return;
    }

    loginMutation.mutate({ data: { login, password } }, {
      onSuccess: (session) => {
        queryClient.setQueryData(getGetSessionQueryKey(), session);
        setLocation("/");
      },
      onError: () => {
        showValidationError("Неверный логин или пароль");
      }
    });
  };

  return (
    <div className="h-full w-full flex flex-col bg-background text-foreground relative select-none rounded-2xl overflow-hidden border border-border/20 shadow-2xl">
      {/* Top Bar Decorative */}
      <header className="relative z-50 h-14 flex items-center px-4 shrink-0 absolute top-0 left-0 w-full pointer-events-auto" style={{ WebkitAppRegion: "drag" } as React.CSSProperties}>
        <div className="pointer-events-auto h-full" style={{ WebkitAppRegion: "no-drag" } as React.CSSProperties}>
          <WindowControls />
        </div>
      </header>

      <div className="flex-1 flex flex-col items-center justify-center p-6 relative z-10">
        <div className="w-full max-w-[340px] flex flex-col items-center">
          
          {/* Logo & Header */}
          <div className="flex flex-col items-center mb-10 text-center space-y-4">
            <img src={realMarkWhite} alt="Real" className="w-[72px] h-[72px] object-contain opacity-95" />
            <div className="space-y-1.5 mt-2">
               <h1 className="text-2xl font-bold tracking-tight text-foreground">С возвращением в Real</h1>
               <p className="text-sm font-medium text-muted-foreground">Находите компании. Находите возможности.</p>
            </div>
          </div>
          
          <form onSubmit={handleSubmit} className="w-full flex flex-col items-center space-y-4">
            <div className="w-full space-y-3">
               <Input
                id="login" 
                autoComplete="username"
                value={login}
                onChange={(e) => setLogin(e.target.value)}
                 placeholder="Логин"
                className="w-full h-12 rounded-xl bg-card border-border/50 text-center px-4 placeholder:text-muted-foreground/70 shadow-sm"
                disabled={loginMutation.isPending}
              />
              <Input 
                id="password" 
                autoComplete="current-password"
                type="password" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                 placeholder="Пароль"
                 className="w-full h-12 rounded-xl bg-card border-border/50 text-center px-4 placeholder:text-muted-foreground/70 shadow-sm"
                disabled={loginMutation.isPending}
              />
            </div>
            
            <Button 
              type="submit" 
              className="w-[200px] h-12 rounded-xl bg-primary text-primary-foreground text-sm font-bold mt-4 shadow-md"
              disabled={loginMutation.isPending}
            >
              {loginMutation.isPending ? "Выполняется вход…" : "Войти"}
            </Button>
          </form>

          {/* Error Message */}
          <div className={`absolute bottom-4 left-1/2 -translate-x-1/2 w-[calc(100%_-_3rem)] max-w-[340px] p-3 text-sm font-medium text-destructive bg-destructive/10 rounded-xl flex items-center gap-2 justify-center transition-all duration-300 transform ${showError ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 translate-y-3 scale-95 pointer-events-none'}`}>
            <AlertCircle className="w-4 h-4 shrink-0" />
            {error || " "}
          </div>
        </div>
      </div>
    </div>
  );
}

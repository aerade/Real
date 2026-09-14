import { useState } from "react";
import { useLogin } from "@workspace/api-client-react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AlertCircle } from "lucide-react";
import realMarkWhite from "@/assets/real-mark-white.svg";
import { WindowControls } from "@/components/layout/window-controls";

export function Login() {
  const [login, setLogin] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [, setLocation] = useLocation();
  
  const loginMutation = useLogin();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    
    if (!login || !password) {
      setError("Введите логин и пароль");
      return;
    }

    loginMutation.mutate({ data: { login, password } }, {
      onSuccess: () => {
        setLocation("/");
        window.location.reload();
      },
      onError: () => {
        setError("Неверный логин или пароль");
      }
    });
  };

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground relative select-none">
      {/* Top Bar Decorative */}
      <header className="h-12 border-b border-border/10 flex items-center px-4 shrink-0 absolute top-0 left-0 w-full z-10" style={{ WebkitAppRegion: "drag" } as React.CSSProperties}>
        <WindowControls />
        <div className="absolute right-4 flex items-center gap-1.5 opacity-80" style={{ WebkitAppRegion: "no-drag" } as React.CSSProperties}>
          <img src={realMarkWhite} alt="Real" className="h-4 w-4 object-contain" />
        </div>
      </header>

      <div className="flex-1 flex flex-col items-center justify-center p-6 mt-12">
        <div className="w-full max-w-[340px] flex flex-col items-center">
          
          {/* Logo & Header */}
          <div className="flex flex-col items-center mb-8 text-center space-y-4">
            <img src={realMarkWhite} alt="Real" className="h-12 w-12 object-contain opacity-90" />
            <div className="space-y-1">
              <h1 className="text-xl font-semibold tracking-tight">Welcome to Real</h1>
              <p className="text-sm text-muted-foreground">The best way to find clients</p>
            </div>
          </div>
          
          <form onSubmit={handleSubmit} className="w-full flex flex-col items-center space-y-4">
            {error && (
              <div className="w-full p-3 text-xs text-destructive-foreground bg-destructive/90 rounded-2xl flex items-center gap-2 justify-center mb-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                {error}
              </div>
            )}
            
            <div className="w-full space-y-3">
              <Input 
                id="login" 
                autoComplete="username"
                value={login}
                onChange={(e) => setLogin(e.target.value)}
                placeholder="Имя пользователя" 
                className="w-full h-12 rounded-2xl bg-transparent border-border/50 text-center px-4 placeholder:text-muted-foreground focus-visible:ring-1 focus-visible:ring-ring/50"
                disabled={loginMutation.isPending}
              />
              <Input 
                id="password" 
                autoComplete="current-password"
                type="password" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Пароль"
                className="w-full h-12 rounded-2xl bg-transparent border-border/50 text-center px-4 placeholder:text-muted-foreground focus-visible:ring-1 focus-visible:ring-ring/50"
                disabled={loginMutation.isPending}
              />
            </div>
            
            <Button 
              type="submit" 
              className="w-[200px] h-10 rounded-2xl bg-foreground text-background hover:bg-foreground/90 text-sm font-semibold transition-all mt-4"
              disabled={loginMutation.isPending}
            >
              {loginMutation.isPending ? "Вход..." : "Войти в систему"}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}

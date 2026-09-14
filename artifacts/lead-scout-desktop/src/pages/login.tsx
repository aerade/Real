import { useState } from "react";
import { useLogin } from "@workspace/api-client-react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AlertCircle } from "lucide-react";

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
      <header className="h-12 border-b border-border/10 flex items-center px-4 shrink-0 absolute top-0 left-0 w-full z-10">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-[#FF5F56] border border-[#E0443E]/50" />
          <div className="w-3 h-3 rounded-full bg-[#FFBD2E] border border-[#DEA123]/50" />
          <div className="w-3 h-3 rounded-full bg-[#27C93F] border border-[#1AAB29]/50" />
        </div>
        <div className="absolute right-4 flex items-center gap-1.5 opacity-80">
          <img src="/real-mark-white.svg" alt="Real" className="h-4 w-4 object-contain" />
          <span className="font-semibold text-xs tracking-wide">Real</span>
        </div>
      </header>

      <div className="flex-1 flex flex-col items-center justify-center p-6 mt-12">
        <div className="w-full max-w-[340px] flex flex-col items-center">
          
          {/* Logo & Header */}
          <div className="flex flex-col items-center mb-8 text-center space-y-4">
            <img src="/real-mark-white.svg" alt="Real" className="h-12 w-12 object-contain opacity-90" />
            <div className="space-y-1">
              <h1 className="text-xl font-semibold tracking-tight">Добро пожаловать в Real</h1>
              <p className="text-sm text-muted-foreground">Компактная CRM для вашей команды</p>
            </div>
          </div>
          
          <form onSubmit={handleSubmit} className="w-full space-y-4">
            {error && (
              <div className="p-3 text-xs text-destructive-foreground bg-destructive/90 rounded-2xl flex items-center gap-2 justify-center mb-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                {error}
              </div>
            )}
            
            <div className="space-y-3">
              <Input 
                id="login" 
                autoComplete="username"
                value={login}
                onChange={(e) => setLogin(e.target.value)}
                placeholder="Имя пользователя" 
                className="h-12 rounded-2xl bg-transparent border-border/50 text-center px-4 placeholder:text-muted-foreground focus-visible:ring-1 focus-visible:ring-ring/50"
                disabled={loginMutation.isPending}
              />
              <Input 
                id="password" 
                autoComplete="current-password"
                type="password" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Пароль"
                className="h-12 rounded-2xl bg-transparent border-border/50 text-center px-4 placeholder:text-muted-foreground focus-visible:ring-1 focus-visible:ring-ring/50"
                disabled={loginMutation.isPending}
              />
            </div>
            
            <Button 
              type="submit" 
              className="w-full h-12 rounded-2xl bg-foreground text-background hover:bg-foreground/90 text-sm font-semibold transition-all mt-2"
              disabled={loginMutation.isPending}
            >
              {loginMutation.isPending ? "Вход..." : "Войти в систему"}
            </Button>
            
            <div className="pt-4 text-center">
              <a href="#" className="text-[11px] font-medium text-muted-foreground hover:text-foreground underline underline-offset-4 decoration-muted-foreground/30 transition-colors">
                Запросить доступ
              </a>
            </div>
          </form>
        </div>
      </div>
      
      {/* Bottom Footer Icons Decorative */}
      <div className="absolute bottom-6 w-full flex justify-center gap-6 opacity-40 pointer-events-none">
         <div className="w-4 h-4 rounded bg-muted-foreground/30" />
         <div className="w-4 h-4 rounded-full bg-muted-foreground/30" />
         <div className="w-4 h-4 rounded bg-muted-foreground/30" />
      </div>
    </div>
  );
}

import { useState } from "react";
import { useLogin } from "@workspace/api-client-react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Target, AlertCircle } from "lucide-react";

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
    <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
      <div className="w-full max-w-md">
        <div className="flex justify-center mb-8">
          <div className="flex items-center gap-2 font-bold text-3xl tracking-tight text-primary">
            <Target className="w-8 h-8 text-accent" />
            <span>Lead Scout</span>
          </div>
        </div>
        
        <Card className="border-border/50 shadow-lg">
          <CardHeader className="space-y-2 text-center pb-8">
            <CardTitle className="text-2xl">Вход в систему</CardTitle>
            <CardDescription>
              Введите свои учетные данные для доступа
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {error && (
                <div className="p-3 text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-md flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  {error}
                </div>
              )}
              
              <div className="space-y-2">
                <Label htmlFor="login">Логин</Label>
                <Input 
                  id="login" 
                  autoComplete="username"
                  value={login}
                  onChange={(e) => setLogin(e.target.value)}
                  placeholder="name@company.com" 
                  className="h-11"
                  disabled={loginMutation.isPending}
                />
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password">Пароль</Label>
                </div>
                <Input 
                  id="password" 
                  autoComplete="current-password"
                  type="password" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="h-11"
                  disabled={loginMutation.isPending}
                />
              </div>
              
              <Button 
                type="submit" 
                className="w-full h-11 text-base font-semibold"
                disabled={loginMutation.isPending}
              >
                {loginMutation.isPending ? "Вход..." : "Войти"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

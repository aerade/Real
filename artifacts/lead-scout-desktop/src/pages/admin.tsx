import { useState } from "react";
import { useListUsers, useListCountries, useCreateCountry, getListCountriesQueryKey } from "@workspace/api-client-react";
import { AppLayout } from "@/components/layout/app-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Shield, Map, Plus, Check, X } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

export function AdminPage() {
  const { data: users, isLoading: usersLoading } = useListUsers();
  const { data: countries, isLoading: countriesLoading } = useListCountries();
  const createCountry = useCreateCountry();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [newCode, setNewCode] = useState("");
  const [newName, setNewName] = useState("");

  const handleAddCountry = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCode || !newName) return;

    createCountry.mutate({ data: { code: newCode, name: newName } }, {
      onSuccess: () => {
        setNewCode("");
        setNewName("");
        queryClient.invalidateQueries({ queryKey: getListCountriesQueryKey() });
        toast({ title: "Страна добавлена" });
      }
    });
  };

  return (
    <AppLayout>
      <div className="space-y-6 flex flex-col h-full">
        <div className="flex items-center justify-between border-b border-border/40 pb-4 shrink-0">
          <div>
            <h1 className="text-lg font-bold tracking-tight">Настройки</h1>
            <p className="text-xs text-muted-foreground mt-0.5">Управление доступом и географией</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-card border border-card-border rounded-xl p-4 shadow-sm flex flex-col h-[500px]">
            <h3 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2 mb-4 shrink-0">
              <Shield className="w-3.5 h-3.5" /> Команда
            </h3>
            
            <div className="flex-1 overflow-y-auto">
              {usersLoading ? (
                <div className="h-full flex items-center justify-center">
                  <div className="w-3 h-3 rounded-full border-2 border-foreground/30 border-t-foreground animate-spin" />
                </div>
              ) : (
                <div className="space-y-2">
                  {users?.map(user => (
                    <div key={user.id} className="flex items-center justify-between p-3 rounded-lg bg-accent/20 border border-border/40">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-8 h-8 rounded-full bg-background border border-border flex items-center justify-center text-xs font-semibold shrink-0">
                          {user.name.charAt(0)}
                        </div>
                        <div className="min-w-0">
                          <div className="text-xs font-medium text-foreground truncate">{user.name}</div>
                          <div className="text-[10px] text-muted-foreground truncate">{user.login}</div>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-3 shrink-0">
                        <span className="text-[9px] px-1.5 py-0.5 rounded bg-background border border-border/50 uppercase tracking-wider">
                          {user.role}
                        </span>
                        {user.active ? (
                          <div className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.5)]" title="Активен" />
                        ) : (
                          <div className="w-2 h-2 rounded-full bg-muted-foreground" title="Отключен" />
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="bg-card border border-card-border rounded-xl p-4 shadow-sm flex flex-col h-[500px]">
            <h3 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2 mb-4 shrink-0">
              <Map className="w-3.5 h-3.5" /> География поиска
            </h3>
            
            <form onSubmit={handleAddCountry} className="flex gap-2 mb-4 shrink-0">
              <Input 
                value={newCode} 
                onChange={e => setNewCode(e.target.value)} 
                placeholder="Код (KZ)" 
                maxLength={2}
                className="w-16 h-8 text-xs uppercase bg-background border-border/50 focus-visible:ring-1 focus-visible:ring-ring/50 px-2 text-center"
              />
              <Input 
                value={newName} 
                onChange={e => setNewName(e.target.value)} 
                placeholder="Название страны" 
                className="flex-1 h-8 text-xs bg-background border-border/50 focus-visible:ring-1 focus-visible:ring-ring/50 px-3"
              />
              <Button type="submit" disabled={createCountry.isPending || !newCode || !newName} className="h-8 w-8 p-0 bg-foreground text-background shrink-0 hover:bg-foreground/90">
                <Plus className="w-4 h-4" />
              </Button>
            </form>

            <div className="flex-1 overflow-y-auto">
              {countriesLoading ? (
                <div className="h-full flex items-center justify-center">
                  <div className="w-3 h-3 rounded-full border-2 border-foreground/30 border-t-foreground animate-spin" />
                </div>
              ) : (
                <div className="space-y-1.5">
                  {countries?.map(country => (
                    <div key={country.code} className="flex items-center justify-between p-2.5 rounded-lg bg-accent/10 border border-border/30 hover:bg-accent/30 transition-colors">
                      <div className="flex items-center gap-3">
                        <span className="font-mono text-[10px] text-muted-foreground uppercase">{country.code}</span>
                        <span className="text-xs font-medium text-foreground/90">{country.name}</span>
                      </div>
                      
                      {country.enabled ? (
                        <span className="text-[9px] px-1.5 py-0.5 rounded text-emerald-400 bg-emerald-400/10 uppercase tracking-wider">
                          Доступна
                        </span>
                      ) : (
                        <span className="text-[9px] px-1.5 py-0.5 rounded text-muted-foreground bg-muted/20 uppercase tracking-wider">
                          Отключена
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}

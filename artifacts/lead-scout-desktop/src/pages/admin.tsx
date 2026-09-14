import { useState } from "react";
import { getListCountriesQueryKey, getListUsersQueryKey, useCreateCountry, useListCountries, useListUsers } from "@workspace/api-client-react";
import { AppLayout } from "@/components/layout/app-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Shield, Map, Plus, Check, X, LogOut, User as UserIcon, Settings } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";

export function AdminPage() {
  const { session, logout } = useAuth();
  const isOwner = session?.user?.role === 'owner';
  
  const { data: users, isLoading: usersLoading } = useListUsers({ query: { enabled: isOwner, queryKey: getListUsersQueryKey() } });
  const { data: countries, isLoading: countriesLoading } = useListCountries({ query: { enabled: isOwner, queryKey: getListCountriesQueryKey() } });
  const createCountry = useCreateCountry();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [newCode, setNewCode] = useState("");
  const [newName, setNewName] = useState("");

  const handleAddCountry = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCode || !newName || !isOwner) return;

    createCountry.mutate({ data: { code: newCode, name: newName } }, {
      onSuccess: () => {
        setNewCode("");
        setNewName("");
        queryClient.invalidateQueries({ queryKey: getListCountriesQueryKey() });
        toast({ title: "Country added successfully" });
      }
    });
  };

  return (
    <AppLayout>
      <div className="space-y-6 flex flex-col h-full">
        <div className="flex items-center justify-between pb-2 shrink-0">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
            <p className="text-sm font-medium text-muted-foreground mt-1">Manage your account and preferences</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-6">
          {/* Account Area - Visible to all */}
          <div className="bg-card border border-card-border rounded-xl p-5 shadow-sm flex flex-col h-[280px]">
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2 mb-6 shrink-0">
              <UserIcon className="w-4 h-4" /> Account
            </h3>
            
            <div className="flex flex-col items-center justify-center flex-1 space-y-4">
              <div className="w-20 h-20 rounded-full bg-primary/10 border-2 border-primary/20 flex items-center justify-center text-3xl font-black text-primary shrink-0 shadow-inner">
                {session?.user?.name.charAt(0).toUpperCase()}
              </div>
              <div className="text-center space-y-1">
                <div className="text-lg font-bold text-foreground">{session?.user?.name}</div>
                <div className="text-sm text-muted-foreground font-medium">{session?.user?.login}</div>
                <div className="mt-2 inline-flex">
                  <Badge variant="secondary" className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest bg-accent">
                    {session?.user?.role}
                  </Badge>
                </div>
              </div>
            </div>
            
            <Button 
              onClick={logout} 
              variant="outline" 
              className="w-full mt-4 h-10 border-destructive/20 text-destructive hover:bg-destructive hover:text-destructive-foreground transition-colors font-bold rounded-xl"
            >
              <LogOut className="w-4 h-4 mr-2" />
              Sign Out
            </Button>
          </div>

          {/* Placeholder for non-owners */}
          {!isOwner && (
            <div className="bg-card/50 border border-dashed border-card-border rounded-xl p-5 shadow-sm flex flex-col h-[280px] items-center justify-center text-center">
              <Settings className="w-10 h-10 text-muted-foreground/30 mb-4" />
              <h4 className="text-sm font-bold text-foreground mb-1">More settings coming soon</h4>
              <p className="text-xs text-muted-foreground max-w-[200px]">Workspace configuration is managed by your team owner.</p>
            </div>
          )}

          {/* Owner-only sections */}
          {isOwner && (
            <>
              <div className="bg-card border border-card-border rounded-xl p-5 shadow-sm flex flex-col h-[400px]">
                <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2 mb-4 shrink-0">
                  <Shield className="w-4 h-4" /> Team
                </h3>
                
                <div className="flex-1 overflow-y-auto pr-2">
                  {usersLoading ? (
                    <div className="h-full flex items-center justify-center">
                      <div className="w-4 h-4 rounded-full border-2 border-primary/30 border-t-primary animate-spin" />
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {users?.map(user => (
                        <div key={user.id} className="flex items-center justify-between p-3 rounded-xl bg-background border border-border/60 shadow-sm hover:border-primary/30 transition-colors">
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-9 h-9 rounded-full bg-accent text-accent-foreground flex items-center justify-center text-sm font-bold shrink-0">
                              {user.name.charAt(0)}
                            </div>
                            <div className="min-w-0">
                              <div className="text-sm font-bold text-foreground truncate">{user.name}</div>
                              <div className="text-xs font-medium text-muted-foreground truncate">{user.login}</div>
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-3 shrink-0">
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground font-bold uppercase tracking-wider">
                              {user.role}
                            </span>
                            {user.active ? (
                              <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.4)]" title="Active" />
                            ) : (
                              <div className="w-2.5 h-2.5 rounded-full bg-muted-foreground" title="Disabled" />
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="bg-card border border-card-border rounded-xl p-5 shadow-sm flex flex-col h-[400px]">
                <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2 mb-4 shrink-0">
                  <Map className="w-4 h-4" /> Search Geography
                </h3>
                
                <form onSubmit={handleAddCountry} className="flex gap-2 mb-4 shrink-0">
                  <Input 
                    value={newCode} 
                    onChange={e => setNewCode(e.target.value)} 
                    placeholder="Code" 
                    maxLength={2}
                    className="w-16 h-9 text-xs uppercase font-bold bg-background border-border/50 text-center rounded-lg"
                  />
                  <Input 
                    value={newName} 
                    onChange={e => setNewName(e.target.value)} 
                    placeholder="Country Name" 
                    className="flex-1 h-9 text-xs font-medium bg-background border-border/50 px-3 rounded-lg"
                  />
                  <Button type="submit" disabled={createCountry.isPending || !newCode || !newName} className="h-9 w-9 p-0 bg-primary text-primary-foreground shrink-0 hover:bg-primary/90 rounded-lg">
                    <Plus className="w-4 h-4" />
                  </Button>
                </form>

                <div className="flex-1 overflow-y-auto pr-2">
                  {countriesLoading ? (
                    <div className="h-full flex items-center justify-center">
                      <div className="w-4 h-4 rounded-full border-2 border-primary/30 border-t-primary animate-spin" />
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {countries?.map(country => (
                        <div key={country.code} className="flex items-center justify-between p-3 rounded-xl bg-background border border-border/60 shadow-sm hover:border-primary/30 transition-colors">
                          <div className="flex items-center gap-3">
                            <span className="font-mono text-[11px] font-bold text-muted-foreground uppercase bg-muted px-1.5 py-0.5 rounded">{country.code}</span>
                            <span className="text-sm font-bold text-foreground">{country.name}</span>
                          </div>
                          
                          {country.enabled ? (
                            <span className="text-[10px] px-2 py-0.5 rounded-full text-emerald-600 bg-emerald-500/10 font-bold uppercase tracking-wider">
                              Enabled
                            </span>
                          ) : (
                            <span className="text-[10px] px-2 py-0.5 rounded-full text-muted-foreground bg-muted font-bold uppercase tracking-wider">
                              Disabled
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </AppLayout>
  );
}

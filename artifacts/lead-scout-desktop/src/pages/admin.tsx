import { useState } from "react";
import { useListUsers, useListCountries, useCreateCountry, getListCountriesQueryKey } from "@workspace/api-client-react";
import { AppLayout } from "@/components/layout/app-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/spinner";
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
      <div className="p-8 max-w-7xl mx-auto space-y-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
            <Shield className="w-8 h-8 text-primary" />
            Панель владельца
          </h1>
          <p className="text-muted-foreground mt-2">Управление командой и географией поиска.</p>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
          <Card className="border-border/50 shadow-sm flex flex-col">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                Команда
              </CardTitle>
            </CardHeader>
            <CardContent className="flex-1">
              {usersLoading ? (
                <div className="flex justify-center p-8"><Spinner /></div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Имя</TableHead>
                      <TableHead>Логин</TableHead>
                      <TableHead>Роль</TableHead>
                      <TableHead className="text-right">Статус</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {users?.map(user => (
                      <TableRow key={user.id}>
                        <TableCell className="font-medium">{user.name}</TableCell>
                        <TableCell className="text-muted-foreground">{user.login}</TableCell>
                        <TableCell>
                          <Badge variant={user.role === 'owner' ? 'default' : 'secondary'} className="capitalize">
                            {user.role}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          {user.active ? (
                            <span className="inline-flex items-center gap-1 text-sm text-success font-medium">
                              <Check className="w-4 h-4" /> Активен
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-sm text-muted-foreground font-medium">
                              <X className="w-4 h-4" /> Отключен
                            </span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          <Card className="border-border/50 shadow-sm flex flex-col">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Map className="w-5 h-5 text-muted-foreground" />
                География поиска
              </CardTitle>
            </CardHeader>
            <CardContent className="flex-1 space-y-6">
              <form onSubmit={handleAddCountry} className="flex items-end gap-3 bg-muted/20 p-4 rounded-lg border border-border border-dashed">
                <div className="space-y-2 flex-1">
                  <label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Код страны (напр. KZ)</label>
                  <Input 
                    value={newCode} 
                    onChange={e => setNewCode(e.target.value)} 
                    placeholder="Код (2 буквы)" 
                    maxLength={2}
                    className="uppercase"
                  />
                </div>
                <div className="space-y-2 flex-[2]">
                  <label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Название страны</label>
                  <Input 
                    value={newName} 
                    onChange={e => setNewName(e.target.value)} 
                    placeholder="Название" 
                  />
                </div>
                <Button type="submit" disabled={createCountry.isPending || !newCode || !newName}>
                  <Plus className="w-4 h-4 mr-2" /> Добавить
                </Button>
              </form>

              {countriesLoading ? (
                <div className="flex justify-center p-8"><Spinner /></div>
              ) : (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader className="bg-muted/30">
                      <TableRow>
                        <TableHead className="w-[100px]">Код</TableHead>
                        <TableHead>Название</TableHead>
                        <TableHead className="text-right">Статус в поиске</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {countries?.map(country => (
                        <TableRow key={country.code}>
                          <TableCell className="font-mono text-muted-foreground uppercase">{country.code}</TableCell>
                          <TableCell className="font-medium">{country.name}</TableCell>
                          <TableCell className="text-right">
                            {country.enabled ? (
                              <Badge variant="success">Включено</Badge>
                            ) : (
                              <Badge variant="secondary">Отключено</Badge>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
}

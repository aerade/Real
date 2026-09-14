import { useState } from "react";
import { useListLeads } from "@workspace/api-client-react";
import { AppLayout } from "@/components/layout/app-layout";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/spinner";
import { statusMap } from "@/lib/constants";
import { Link } from "wouter";
import { format } from "date-fns";
import { ru } from "date-fns/locale";

export function LeadsPage() {
  const [status, setStatus] = useState<string>("all");
  
  const { data: leads, isLoading } = useListLeads({
    assignedToMe: true,
    ...(status !== "all" ? { status } : {})
  });

  return (
    <AppLayout>
      <div className="p-8 max-w-7xl mx-auto space-y-6 flex flex-col h-full">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Мои лиды</h1>
            <p className="text-muted-foreground mt-2">Компании, закрепленные за вами.</p>
          </div>
          
          <div className="w-64">
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger>
                <SelectValue placeholder="Все статусы" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Все статусы</SelectItem>
                {Object.entries(statusMap).map(([key, { label }]) => (
                  <SelectItem key={key} value={key}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <Card className="border-border/50 shadow-sm flex-1 flex flex-col min-h-0 overflow-hidden">
          {isLoading ? (
            <div className="flex-1 flex items-center justify-center">
              <Spinner className="w-8 h-8 text-primary" />
            </div>
          ) : !leads || leads.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
              <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
                <Target className="w-8 h-8 text-muted-foreground/50" />
              </div>
              <h3 className="text-lg font-medium">Нет лидов</h3>
              <p className="text-muted-foreground mt-1 max-w-sm">
                У вас нет лидов с выбранными фильтрами. Найдите новые компании в разделе "Поиск".
              </p>
              <Link href="/search" className="mt-4 inline-flex h-9 items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow transition-colors hover:bg-primary/90">
                Перейти к поиску
              </Link>
            </div>
          ) : (
            <div className="overflow-auto flex-1">
              <Table>
                <TableHeader className="bg-muted/30 sticky top-0 z-10 shadow-sm">
                  <TableRow>
                    <TableHead>Компания</TableHead>
                    <TableHead>Отрасль / Город</TableHead>
                    <TableHead>Статус</TableHead>
                    <TableHead>Обновлено</TableHead>
                    <TableHead className="text-right">Оценка</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {leads.map((lead) => {
                    const leadStatus = statusMap[lead.status] || { label: lead.status, variant: 'neutral' };
                    return (
                      <TableRow key={lead.id} className="hover:bg-muted/50 cursor-pointer group">
                        <TableCell>
                          <Link href={`/leads/${lead.id}`} className="block w-full">
                            <span className="font-medium">{lead.name}</span>
                            {lead.website && (
                              <div className="text-xs text-primary mt-0.5">{new URL(lead.website).hostname.replace('www.', '')}</div>
                            )}
                          </Link>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">{lead.industry}</div>
                          <div className="text-xs text-muted-foreground mt-0.5">{lead.city}</div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={leadStatus.variant}>{leadStatus.label}</Badge>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {format(new Date(lead.updatedAt), 'd MMM yyyy, HH:mm', { locale: ru })}
                        </TableCell>
                        <TableCell className="text-right font-mono font-bold">
                          {lead.score}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </Card>
      </div>
    </AppLayout>
  );
}

// Add Target import
import { Target } from "lucide-react";

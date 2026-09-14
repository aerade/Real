export const statusMap: Record<string, { label: string, variant: 'default'|'secondary'|'success'|'warning'|'destructive'|'neutral'|'info' }> = {
  new: { label: 'Новый', variant: 'info' },
  claimed: { label: 'Взят в работу', variant: 'warning' },
  contacted: { label: 'Контакт установлен', variant: 'default' },
  replied: { label: 'Ответил', variant: 'secondary' },
  rejected: { label: 'Отказ', variant: 'destructive' },
  no_reply: { label: 'Нет ответа', variant: 'neutral' },
  deal: { label: 'Сделка', variant: 'success' },
};

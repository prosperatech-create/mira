/** Formatação pt-BR. */
export function formatDate(d: string | Date | null | undefined): string {
  if (!d) return '—';
  const date = typeof d === 'string' ? new Date(d.length === 10 ? `${d}T12:00:00` : d) : d;
  return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}
export function formatDateTime(d: string | Date | null | undefined): string {
  if (!d) return '—';
  const date = typeof d === 'string' ? new Date(d) : d;
  return date.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}
export function formatShortDate(d: string | Date): string {
  const date = typeof d === 'string' ? new Date(d.length === 10 ? `${d}T12:00:00` : d) : d;
  return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
}
export function todayISO(): string {
  const d = new Date();
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
}

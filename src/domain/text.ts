/** Normaliza texto em português para comparação (minúsculas, sem acentos). */
export function normalize(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase();
}

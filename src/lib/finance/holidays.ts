/**
 * Feriados nacionais brasileiros relevantes para a contagem de dias
 * úteis ANBIMA (2024–2030). Inclui:
 *   - Confraternização Universal (01/01)
 *   - Carnaval (segunda + terça)
 *   - Sexta-feira Santa
 *   - Tiradentes (21/04)
 *   - Dia do Trabalho (01/05)
 *   - Corpus Christi
 *   - Independência (07/09)
 *   - Padroeira do Brasil (12/10)
 *   - Finados (02/11)
 *   - Proclamação da República (15/11)
 *   - Consciência Negra (20/11) — feriado nacional a partir de 2024
 *   - Natal (25/12)
 *
 * As datas móveis (Carnaval, Sexta Santa, Corpus Christi) seguem o
 * calendário litúrgico para 2024–2030.
 */
const ANBIMA_HOLIDAYS_RAW: string[] = [
  // 2024
  "2024-01-01",
  "2024-02-12", // Carnaval seg
  "2024-02-13", // Carnaval ter
  "2024-03-29", // Sexta Santa
  "2024-04-21",
  "2024-05-01",
  "2024-05-30", // Corpus Christi
  "2024-09-07",
  "2024-10-12",
  "2024-11-02",
  "2024-11-15",
  "2024-11-20",
  "2024-12-25",
  // 2025
  "2025-01-01",
  "2025-03-03", // Carnaval seg
  "2025-03-04", // Carnaval ter
  "2025-04-18", // Sexta Santa
  "2025-04-21",
  "2025-05-01",
  "2025-06-19", // Corpus Christi
  "2025-09-07",
  "2025-10-12",
  "2025-11-02",
  "2025-11-15",
  "2025-11-20",
  "2025-12-25",
  // 2026
  "2026-01-01",
  "2026-02-16", // Carnaval seg
  "2026-02-17", // Carnaval ter
  "2026-04-03", // Sexta Santa
  "2026-04-21",
  "2026-05-01",
  "2026-06-04", // Corpus Christi
  "2026-09-07",
  "2026-10-12",
  "2026-11-02",
  "2026-11-15",
  "2026-11-20",
  "2026-12-25",
  // 2027
  "2027-01-01",
  "2027-02-08", // Carnaval seg
  "2027-02-09", // Carnaval ter
  "2027-03-26", // Sexta Santa
  "2027-04-21",
  "2027-05-01",
  "2027-05-27", // Corpus Christi
  "2027-09-07",
  "2027-10-12",
  "2027-11-02",
  "2027-11-15",
  "2027-11-20",
  "2027-12-25",
  // 2028
  "2028-01-01",
  "2028-02-28", // Carnaval seg
  "2028-02-29", // Carnaval ter
  "2028-04-14", // Sexta Santa
  "2028-04-21",
  "2028-05-01",
  "2028-06-15", // Corpus Christi
  "2028-09-07",
  "2028-10-12",
  "2028-11-02",
  "2028-11-15",
  "2028-11-20",
  "2028-12-25",
  // 2029
  "2029-01-01",
  "2029-02-12", // Carnaval seg
  "2029-02-13", // Carnaval ter
  "2029-03-30", // Sexta Santa
  "2029-04-21",
  "2029-05-01",
  "2029-05-31", // Corpus Christi
  "2029-09-07",
  "2029-10-12",
  "2029-11-02",
  "2029-11-15",
  "2029-11-20",
  "2029-12-25",
  // 2030
  "2030-01-01",
  "2030-03-04", // Carnaval seg
  "2030-03-05", // Carnaval ter
  "2030-04-19", // Sexta Santa
  "2030-04-21",
  "2030-05-01",
  "2030-06-20", // Corpus Christi
  "2030-09-07",
  "2030-10-12",
  "2030-11-02",
  "2030-11-15",
  "2030-11-20",
  "2030-12-25",
];

/** Set lookup-friendly de feriados (chaves no formato yyyy-mm-dd). */
export const ANBIMA_HOLIDAYS: ReadonlySet<string> = new Set(ANBIMA_HOLIDAYS_RAW);

function toKey(d: Date): string {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function startOfUTCDay(input: Date | string): Date {
  const d = typeof input === "string" ? new Date(input) : new Date(input);
  return new Date(
    Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()),
  );
}

/** True se a data é fim de semana (sábado/domingo) em UTC. */
export function isWeekend(d: Date): boolean {
  const dow = d.getUTCDay();
  return dow === 0 || dow === 6;
}

/** True se a data é feriado ANBIMA. */
export function isHoliday(d: Date): boolean {
  return ANBIMA_HOLIDAYS.has(toKey(d));
}

/** True se a data é dia útil (não fds e não feriado). */
export function isBusinessDay(d: Date): boolean {
  return !isWeekend(d) && !isHoliday(d);
}

/**
 * Conta dias úteis entre `inicio` (inclusivo) e `fim` (exclusivo).
 * Convenção ANBIMA: o próprio dia da operação não é remunerado.
 * Datas no passado retornam 0 (não negativo).
 */
export function diasUteis(inicio: Date | string, fim: Date | string): number {
  const start = startOfUTCDay(inicio);
  const end = startOfUTCDay(fim);
  if (end.getTime() <= start.getTime()) return 0;

  let count = 0;
  const cur = new Date(start);
  while (cur.getTime() < end.getTime()) {
    if (isBusinessDay(cur)) count++;
    cur.setUTCDate(cur.getUTCDate() + 1);
  }
  return count;
}

/** Conta dias corridos entre datas (fim exclusivo). */
export function diasCorridos(
  inicio: Date | string,
  fim: Date | string,
): number {
  const start = startOfUTCDay(inicio);
  const end = startOfUTCDay(fim);
  return Math.max(
    0,
    Math.round((end.getTime() - start.getTime()) / 86_400_000),
  );
}

/** Avança `n` dias úteis a partir de `data`. */
export function addBusinessDays(data: Date | string, n: number): Date {
  const cur = startOfUTCDay(data);
  let remaining = n;
  while (remaining > 0) {
    cur.setUTCDate(cur.getUTCDate() + 1);
    if (isBusinessDay(cur)) remaining--;
  }
  return cur;
}

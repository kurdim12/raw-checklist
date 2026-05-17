import { formatInTimeZone } from 'date-fns-tz';
import { format } from 'date-fns';

export const CAFE_TZ = 'Asia/Amman';

/** Today's date in Asia/Amman, as 'YYYY-MM-DD'. */
export function todayAmman(): string {
  return formatInTimeZone(new Date(), CAFE_TZ, 'yyyy-MM-dd');
}

/** Pretty-format a date-only string ('YYYY-MM-DD') for display. */
export function formatDate(iso: string, pattern = 'EEE, d MMM yyyy'): string {
  // construct as local midnight on the cafe day to avoid TZ drift in display
  const [y, m, d] = iso.split('-').map(Number);
  const dt = new Date(y, m - 1, d, 0, 0, 0, 0);
  return format(dt, pattern);
}

/** Hour ":" minute, drops seconds. '14:30:00' -> '14:30'. */
export function shortTime(t: string | null | undefined): string {
  if (!t) return '';
  return t.slice(0, 5);
}

/** Mon=1 ... Sun=7 in ISO terms — matches Postgres extract(isodow). */
export function isoWeekday(iso: string): number {
  const [y, m, d] = iso.split('-').map(Number);
  const js = new Date(Date.UTC(y, m - 1, d)).getUTCDay();
  return js === 0 ? 7 : js;
}

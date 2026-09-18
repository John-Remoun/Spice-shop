export const APP_TIMEZONE = process.env.APP_TIMEZONE || 'Africa/Cairo';

/**
 * Formats a Date object or timestamp into YYYY-MM-DD in the store's operational timezone.
 */
export function formatToDateStr(date: Date | string | number, timeZone = APP_TIMEZONE): string {
  const d = typeof date === 'object' && date instanceof Date ? date : new Date(date);
  return new Intl.DateTimeFormat('en-CA', { timeZone }).format(d);
}

/**
 * Calculates the millisecond offset between UTC and the specified timezone for a given date.
 */
export function getTimezoneOffsetMs(date: Date, timeZone = APP_TIMEZONE): number {
  const utcDate = new Date(date.toLocaleString('en-US', { timeZone: 'UTC' }));
  const tzDate = new Date(date.toLocaleString('en-US', { timeZone }));
  return tzDate.getTime() - utcDate.getTime();
}

/**
 * Returns the exact UTC startOfDay and endOfDay Date objects for a given YYYY-MM-DD in the store timezone.
 */
export function getDayRange(dateStr: string, timeZone = APP_TIMEZONE): { startOfDay: Date; endOfDay: Date } {
  const approx = new Date(dateStr + 'T12:00:00Z');
  const offsetMs = getTimezoneOffsetMs(approx, timeZone);
  const startOfDay = new Date(new Date(dateStr + 'T00:00:00Z').getTime() - offsetMs);
  const endOfDay = new Date(new Date(dateStr + 'T23:59:59.999Z').getTime() - offsetMs);
  return { startOfDay, endOfDay };
}

/**
 * Returns the exact UTC startOfMonth and endOfMonth Date objects for a given year & month in the store timezone.
 */
export function getMonthRange(year: number, month: number, timeZone = APP_TIMEZONE): { startOfMonth: Date; endOfMonth: Date; daysInMonth: number; datePrefix: string } {
  const monthStr = month < 10 ? `0${month}` : `${month}`;
  const datePrefix = `${year}-${monthStr}`;
  const daysInMonth = new Date(year, month, 0).getDate();
  const dayStr = daysInMonth < 10 ? `0${daysInMonth}` : `${daysInMonth}`;
  
  const { startOfDay: startOfMonth } = getDayRange(`${datePrefix}-01`, timeZone);
  const { endOfDay: endOfMonth } = getDayRange(`${datePrefix}-${dayStr}`, timeZone);
  
  return { startOfMonth, endOfMonth, daysInMonth, datePrefix };
}

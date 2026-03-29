const LOCAL_DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

export function isLocalDateString(value: string): boolean {
  return LOCAL_DATE_REGEX.test(value);
}

export function getBrowserLocalDate(): string {
  const now = new Date();
  const year = String(now.getFullYear());
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function parseLocalDateToDate(value: string): Date | undefined {
  if (!isLocalDateString(value)) return undefined;

  const [year, month, day] = value.split("-").map(Number);
  const parsed = new Date(year, month - 1, day);
  if (Number.isNaN(parsed.getTime())) return undefined;
  return parsed;
}

export function toLocalDateString(date: Date): string {
  const year = String(date.getFullYear());
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function coerceLocalDateString(value: string): string | undefined {
  if (isLocalDateString(value)) return value;

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return undefined;
  return toLocalDateString(parsed);
}

export function formatLocalDateForDisplay(
  value: string,
  locale = "en-US"
): string {
  const normalized = coerceLocalDateString(value);
  if (!normalized) return value;
  const date = parseLocalDateToDate(normalized);
  if (!date) return value;
  return new Intl.DateTimeFormat(locale, { dateStyle: "medium" }).format(date);
}

export function formatDateForDisplay(
  value: string | Date,
  locale = "en-US"
): string {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return new Intl.DateTimeFormat(locale, { dateStyle: "medium" }).format(date);
}

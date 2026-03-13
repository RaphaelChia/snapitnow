type DateParts = {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
};

const CLOSE_POLICY_DAYS_AFTER_WEDDING = 1;

function parseLocalDate(input: string): { year: number; month: number; day: number } {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(input);
  if (!match) {
    throw new Error("Invalid local date format. Expected YYYY-MM-DD.");
  }

  return {
    year: Number(match[1]),
    month: Number(match[2]),
    day: Number(match[3]),
  };
}

function formatLocalDate(year: number, month: number, day: number): string {
  const y = String(year).padStart(4, "0");
  const m = String(month).padStart(2, "0");
  const d = String(day).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function addDaysToLocalDate(
  localDate: string,
  daysToAdd: number
): { year: number; month: number; day: number; value: string } {
  const parsed = parseLocalDate(localDate);
  const utc = new Date(Date.UTC(parsed.year, parsed.month - 1, parsed.day));
  utc.setUTCDate(utc.getUTCDate() + daysToAdd);

  const year = utc.getUTCFullYear();
  const month = utc.getUTCMonth() + 1;
  const day = utc.getUTCDate();

  return {
    year,
    month,
    day,
    value: formatLocalDate(year, month, day),
  };
}

function nowInTimezone(now: Date, timezone: string): DateParts {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  });

  const parts = formatter.formatToParts(now);
  const get = (type: Intl.DateTimeFormatPartTypes): number => {
    const part = parts.find((p) => p.type === type);
    if (!part) {
      throw new Error(`Missing "${type}" from timezone date parts.`);
    }
    return Number(part.value);
  };

  return {
    year: get("year"),
    month: get("month"),
    day: get("day"),
    hour: get("hour"),
    minute: get("minute"),
    second: get("second"),
  };
}

function compareDateParts(a: DateParts, b: DateParts): number {
  const fields: Array<keyof DateParts> = [
    "year",
    "month",
    "day",
    "hour",
    "minute",
    "second",
  ];

  for (const field of fields) {
    if (a[field] < b[field]) return -1;
    if (a[field] > b[field]) return 1;
  }
  return 0;
}

export type SessionCloseEvaluation = {
  due: boolean;
  cutoffLocalDate: string;
  cutoffLocalTime: "23:59:59";
  cutoffDescription: string;
};

export function evaluateSessionCloseDue(input: {
  weddingDateLocal: string | null;
  eventTimezone: string | null;
  now?: Date;
}): SessionCloseEvaluation | null {
  if (!input.weddingDateLocal || !input.eventTimezone) {
    return null;
  }

  const now = input.now ?? new Date();
  const cutoffDate = addDaysToLocalDate(
    input.weddingDateLocal,
    CLOSE_POLICY_DAYS_AFTER_WEDDING
  );

  const nowLocal = nowInTimezone(now, input.eventTimezone);
  const cutoff: DateParts = {
    year: cutoffDate.year,
    month: cutoffDate.month,
    day: cutoffDate.day,
    hour: 23,
    minute: 59,
    second: 59,
  };

  return {
    due: compareDateParts(nowLocal, cutoff) >= 0,
    cutoffLocalDate: cutoffDate.value,
    cutoffLocalTime: "23:59:59",
    cutoffDescription: `${cutoffDate.value}T23:59:59[${input.eventTimezone}]`,
  };
}

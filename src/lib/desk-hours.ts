export type DeskHours = {
  timeZone: string;
  openHour: number;
  closeHour: number;
};

export const DEFAULT_DESK_HOURS: DeskHours = {
  timeZone: "America/Chicago",
  openHour: 7,
  closeHour: 17,
};

export function readDeskHours(): DeskHours {
  const timeZone = process.env.WIDGET_TIMEZONE?.trim() || DEFAULT_DESK_HOURS.timeZone;
  const openHour = parseHour(process.env.WIDGET_OPEN_HOUR, DEFAULT_DESK_HOURS.openHour);
  const closeHour = parseHour(process.env.WIDGET_CLOSE_HOUR, DEFAULT_DESK_HOURS.closeHour);
  return { timeZone, openHour, closeHour };
}

function parseHour(value: string | undefined, fallback: number): number {
  if (value == null || value.trim() === "") return fallback;
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed < 0 || parsed > 23) return fallback;
  return parsed;
}

export type ZonedParts = {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
};

export function zonedParts(date: Date, timeZone: string): ZonedParts {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
  const map = Object.fromEntries(
    formatter.formatToParts(date).map((part) => [part.type, part.value]),
  ) as Record<string, string>;
  return {
    year: Number(map.year),
    month: Number(map.month),
    day: Number(map.day),
    hour: Number(map.hour),
    minute: Number(map.minute),
    second: Number(map.second),
  };
}

export function zonedTimeToUtc(
  timeZone: string,
  year: number,
  month: number,
  day: number,
  hour: number,
  minute = 0,
  second = 0,
): Date {
  const wallAsUtc = Date.UTC(year, month - 1, day, hour, minute, second);
  let instant = new Date(wallAsUtc);
  for (let i = 0; i < 2; i += 1) {
    const offset = wallOffsetMs(instant, timeZone);
    instant = new Date(wallAsUtc - offset);
  }
  return instant;
}

function wallOffsetMs(instant: Date, timeZone: string): number {
  const parts = zonedParts(instant, timeZone);
  const asUtc = Date.UTC(
    parts.year,
    parts.month - 1,
    parts.day,
    parts.hour,
    parts.minute,
    parts.second,
  );
  return asUtc - instant.getTime();
}

export function isDeskOpen(now: Date, hours: DeskHours = DEFAULT_DESK_HOURS): boolean {
  const parts = zonedParts(now, hours.timeZone);
  const minutes = parts.hour * 60 + parts.minute;
  return minutes >= hours.openHour * 60 && minutes < hours.closeHour * 60;
}

export function nextDeskOpenAt(now: Date, hours: DeskHours = DEFAULT_DESK_HOURS): Date {
  const parts = zonedParts(now, hours.timeZone);
  const openToday = zonedTimeToUtc(
    hours.timeZone,
    parts.year,
    parts.month,
    parts.day,
    hours.openHour,
  );
  if (now.getTime() < openToday.getTime()) return openToday;
  const tomorrow = addCalendarDays(parts.year, parts.month, parts.day, 1);
  return zonedTimeToUtc(hours.timeZone, tomorrow.year, tomorrow.month, tomorrow.day, hours.openHour);
}

export function deskCloseAt(now: Date, hours: DeskHours = DEFAULT_DESK_HOURS): Date {
  const parts = zonedParts(now, hours.timeZone);
  return zonedTimeToUtc(hours.timeZone, parts.year, parts.month, parts.day, hours.closeHour);
}

const HOUR_MS = 60 * 60 * 1000;

export function nextWidgetRefreshAt(now: Date, hours: DeskHours = DEFAULT_DESK_HOURS): Date {
  if (!isDeskOpen(now, hours)) {
    return nextDeskOpenAt(now, hours);
  }
  const proposed = new Date(now.getTime() + HOUR_MS);
  const close = deskCloseAt(now, hours);
  if (proposed.getTime() >= close.getTime()) {
    return nextDeskOpenAt(close, hours);
  }
  return proposed;
}

function addCalendarDays(year: number, month: number, day: number, days: number) {
  const utc = new Date(Date.UTC(year, month - 1, day + days));
  return {
    year: utc.getUTCFullYear(),
    month: utc.getUTCMonth() + 1,
    day: utc.getUTCDate(),
  };
}

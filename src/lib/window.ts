import type { CityId } from "./types.ts";

/** 15 minutes of grace after each peak-window end, for a late cron. Not an extra planned slot. */
const GRACE_MINUTES = 15;

export interface PeakWindows {
  amStart: number;
  amEnd: number;
  pmStart: number;
  pmEnd: number;
  label: string;
}

/** Weekday AM/PM rush windows in local minutes past midnight. Inclusive of endpoints. */
export const CITY_WINDOWS: Record<CityId, PeakWindows> = {
  "las-vegas": {
    amStart: 6 * 60 + 30,
    amEnd: 9 * 60 + 30,
    pmStart: 15 * 60 + 30,
    pmEnd: 18 * 60 + 30,
    label: "weekdays 6:30–9:30 a.m. and 3:30–6:30 p.m. PT",
  },
  nashville: {
    amStart: 7 * 60,
    amEnd: 9 * 60 + 30,
    pmStart: 15 * 60 + 30,
    pmEnd: 18 * 60 + 30,
    label: "weekdays 7:00–9:30 a.m. and 3:30–6:30 p.m. CT",
  },
  orlando: {
    amStart: 7 * 60,
    amEnd: 9 * 60 + 30,
    pmStart: 16 * 60,
    pmEnd: 18 * 60 + 30,
    label: "weekdays 7:00–9:30 a.m. and 4:00–6:30 p.m. ET",
  },
};

export function localMinutes(timeZone: string, at: Date): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour: "numeric",
    minute: "numeric",
    hourCycle: "h23",
  }).formatToParts(at);
  const hour = Number(parts.find((part) => part.type === "hour")?.value);
  const minute = Number(parts.find((part) => part.type === "minute")?.value);
  if (!Number.isFinite(hour) || !Number.isFinite(minute)) {
    throw new Error(`Could not read local time for ${timeZone}`);
  }
  return hour * 60 + minute;
}

export function isLocalWeekday(timeZone: string, at: Date): boolean {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    weekday: "short",
  }).formatToParts(at);
  const weekday = parts.find((part) => part.type === "weekday")?.value;
  return weekday !== "Sat" && weekday !== "Sun";
}

export function windowLabel(city: CityId): string {
  return CITY_WINDOWS[city].label;
}

export function isWithinSampleWindow(
  city: CityId,
  timeZone: string,
  at = new Date(),
): boolean {
  if (!isLocalWeekday(timeZone, at)) return false;
  const minutes = localMinutes(timeZone, at);
  const windows = CITY_WINDOWS[city];
  const inAm =
    minutes >= windows.amStart && minutes <= windows.amEnd + GRACE_MINUTES;
  const inPm =
    minutes >= windows.pmStart && minutes <= windows.pmEnd + GRACE_MINUTES;
  return inAm || inPm;
}

export function formatLocalTime(timeZone: string, at: Date): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone,
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
    timeZoneName: "short",
  }).format(at);
}

/** Local calendar month as YYYY-MM, for CSV folder names. */
export function yearMonth(timeZone: string, at: Date): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
  }).formatToParts(at);
  const year = parts.find((part) => part.type === "year")?.value;
  const month = parts.find((part) => part.type === "month")?.value;
  if (!year || !month) {
    throw new Error(`Could not read local year-month for ${timeZone}`);
  }
  return `${year}-${month}`;
}

/** Local timestamp with numeric offset, e.g. 2026-11-27T10:04:05-08:00. */
export function formatLocalIso(timeZone: string, at: Date): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
    timeZoneName: "longOffset",
  }).formatToParts(at);
  const get = (type: Intl.DateTimeFormatPartTypes): string => {
    const value = parts.find((part) => part.type === type)?.value;
    if (!value) {
      throw new Error(`Could not read ${type} for ${timeZone}`);
    }
    return value;
  };
  const offsetRaw = get("timeZoneName");
  const match = offsetRaw.match(/([+-])(\d{1,2})(?::?(\d{2}))?/);
  const sign = match?.[1];
  const hours = match?.[2];
  const offset =
    sign && hours ? `${sign}${hours.padStart(2, "0")}:${match[3] ?? "00"}` : "+00:00";
  return `${get("year")}-${get("month")}-${get("day")}T${get("hour")}:${get("minute")}:${get("second")}${offset}`;
}

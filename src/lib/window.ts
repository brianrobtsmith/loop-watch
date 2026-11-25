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

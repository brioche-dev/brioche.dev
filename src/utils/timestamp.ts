import { Temporal } from "temporal-polyfill";

const DISPLAY_TIMEZONE =
  "America/Los_Angeles" as const satisfies Temporal.TimeZoneLike;

export function machineTimestamp(timestamp: Date): string {
  const instant = Temporal.Instant.fromEpochMilliseconds(timestamp.getTime());
  return instant.toString({ timeZone: DISPLAY_TIMEZONE });
}

export function humanTimestamp(timestamp: Date): string {
  return machineTimestamp(timestamp).slice(0, 10);
}

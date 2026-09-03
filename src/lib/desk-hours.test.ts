import { describe, expect, it } from "vitest";
import {
  DEFAULT_DESK_HOURS,
  isDeskOpen,
  nextWidgetRefreshAt,
  zonedTimeToUtc,
} from "./desk-hours";

const chicago = DEFAULT_DESK_HOURS;

describe("desk hours (America/Chicago)", () => {
  it("opens at 7:00 AM Central and closes at 5:00 PM", () => {
    const justBefore = zonedTimeToUtc("America/Chicago", 2026, 9, 3, 6, 59);
    const open = zonedTimeToUtc("America/Chicago", 2026, 9, 3, 7, 0);
    const lastMinute = zonedTimeToUtc("America/Chicago", 2026, 9, 3, 16, 59);
    const closed = zonedTimeToUtc("America/Chicago", 2026, 9, 3, 17, 0);
    expect(isDeskOpen(justBefore, chicago)).toBe(false);
    expect(isDeskOpen(open, chicago)).toBe(true);
    expect(isDeskOpen(lastMinute, chicago)).toBe(true);
    expect(isDeskOpen(closed, chicago)).toBe(false);
  });

  it("respects Central Standard Time in January", () => {
    const openCst = zonedTimeToUtc("America/Chicago", 2026, 1, 15, 7, 0);
    expect(openCst.toISOString()).toBe("2026-01-15T13:00:00.000Z");
    expect(isDeskOpen(openCst, chicago)).toBe(true);
    expect(isDeskOpen(new Date("2026-01-15T12:59:00.000Z"), chicago)).toBe(false);
  });

  it("schedules the next pull in 60 minutes while the desk is open", () => {
    const now = zonedTimeToUtc("America/Chicago", 2026, 9, 3, 9, 15);
    const next = nextWidgetRefreshAt(now, chicago);
    expect(next.toISOString()).toBe(new Date(now.getTime() + 60 * 60 * 1000).toISOString());
  });

  it("does not schedule another pull after 5:00 PM", () => {
    const now = zonedTimeToUtc("America/Chicago", 2026, 9, 3, 16, 30);
    const next = nextWidgetRefreshAt(now, chicago);
    expect(next.toISOString()).toBe(
      zonedTimeToUtc("America/Chicago", 2026, 9, 4, 7, 0).toISOString(),
    );
  });

  it("points overnight traffic at tomorrow's 7:00 AM open", () => {
    const evening = zonedTimeToUtc("America/Chicago", 2026, 9, 3, 20, 0);
    const early = zonedTimeToUtc("America/Chicago", 2026, 9, 4, 5, 0);
    expect(nextWidgetRefreshAt(evening, chicago).toISOString()).toBe(
      zonedTimeToUtc("America/Chicago", 2026, 9, 4, 7, 0).toISOString(),
    );
    expect(nextWidgetRefreshAt(early, chicago).toISOString()).toBe(
      zonedTimeToUtc("America/Chicago", 2026, 9, 4, 7, 0).toISOString(),
    );
  });
});

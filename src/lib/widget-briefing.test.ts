import { describe, expect, it } from "vitest";
import { seedProspects, demoStages, DEMO_PIPELINE_ID } from "./demo-data";
import { authorizeWidget } from "./widget-auth";
import { buildWidgetBriefing, DESK_CLOSED_HEADLINE } from "./widget-briefing";

describe("widget briefing", () => {
  it("leads with households behind schedule from the sample drawing", () => {
    const prospects = seedProspects(Date.parse("2026-09-03T12:00:00.000Z"));
    const briefing = buildWidgetBriefing({
      source: "demo",
      connected: false,
      pipeline: { id: DEMO_PIPELINE_ID, name: "Life Insurance · Client Process" },
      pipelines: [{ id: DEMO_PIPELINE_ID, name: "Life Insurance · Client Process" }],
      stages: demoStages,
      prospects,
      syncedAt: "2026-09-03T12:00:00.000Z",
    });
    expect(briefing.stuck).toBeGreaterThan(0);
    expect(briefing.headline).toMatch(/behind schedule/i);
    expect(briefing.items[0]?.stuck).toBe(true);
    expect(briefing.items[0]?.next).toBeTruthy();
    expect(briefing.items.length).toBeLessThanOrEqual(4);
  });

  it("reports an on-pace board when nobody is late", () => {
    const prospects = seedProspects(Date.parse("2026-09-03T12:00:00.000Z")).map((row) => ({
      ...row,
      stuck: false,
      daysInStage: Math.min(row.daysInStage, 2),
    }));
    const briefing = buildWidgetBriefing({
      source: "demo",
      connected: true,
      pipeline: { id: DEMO_PIPELINE_ID, name: "Life Insurance · Client Process" },
      pipelines: [],
      stages: demoStages,
      prospects,
      syncedAt: "2026-09-03T12:00:00.000Z",
    });
    expect(briefing.stuck).toBe(0);
    expect(briefing.headline).toMatch(/on pace/i);
  });
});

describe("widget token", () => {
  it("allows every request when no token is configured", () => {
    const request = new Request("https://example.com/api/widget");
    expect(authorizeWidget(request, undefined)).toBe(true);
  });

  it("accepts query, bearer, or header tokens", () => {
    expect(
      authorizeWidget(new Request("https://example.com/api/widget?token=desk-1"), "desk-1"),
    ).toBe(true);
    expect(
      authorizeWidget(
        new Request("https://example.com/api/widget", {
          headers: { authorization: "Bearer desk-1" },
        }),
        "desk-1",
      ),
    ).toBe(true);
    expect(
      authorizeWidget(
        new Request("https://example.com/api/widget", {
          headers: { "x-widget-token": "desk-1" },
        }),
        "desk-1",
      ),
    ).toBe(true);
    expect(authorizeWidget(new Request("https://example.com/api/widget"), "desk-1")).toBe(false);
  });
});

describe("closed copy", () => {
  it("keeps a stable after-hours headline", () => {
    expect(DESK_CLOSED_HEADLINE).toMatch(/7:00/i);
  });
});

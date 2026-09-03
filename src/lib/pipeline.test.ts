import { describe, expect, it } from "vitest";
import { daysBetween, overlayForIndex, stuckThresholdForIndex } from "./architecture";
import { decorateStages, nextStepsForStage, summaryForStage } from "./next-steps";
import { mapOpportunity } from "./pipeline-service";
import { authorizeWebhook, parseWebhookOpportunityId, shouldIgnoreInboundWebhook } from "./webhooks";
import { markOutbound } from "./ghl";
import { moveDemoProspect, resetDemoProspects, seedProspects } from "./demo-data";

describe("architecture overlay", () => {
  it("names the seven bays of the life-insurance process", () => {
    const names = Array.from({ length: 7 }, (_, index) => overlayForIndex(index, 7).architecturalName);
    expect(names).toEqual([
      "Site Survey",
      "Foundation",
      "Schematic Design",
      "Construction Documents",
      "Inspection",
      "Certificate of Occupancy",
      "Stewardship",
    ]);
  });

  it("falls back to numbered bays when a CRM pipeline is longer", () => {
    expect(overlayForIndex(7, 9).drawingCode).toBe("A-108");
  });

  it("tightens stuck thresholds at the front of the pipeline", () => {
    expect(stuckThresholdForIndex(0, 7)).toBe(7);
    expect(stuckThresholdForIndex(6, 7)).toBe(21);
  });
});

describe("next-step playbooks", () => {
  it("books a conversation from inquiry-like stage names", () => {
    expect(summaryForStage("New Leads")).toMatch(/cash flow conversation/i);
    expect(nextStepsForStage({ id: "s1", name: "Inquiry" })[0].label).toMatch(/Book/i);
  });

  it("clears underwriting requirements for inspection-like names", () => {
    expect(summaryForStage("Pending Medical")).toMatch(/underwriting/i);
  });

  it("decorates CRM stages with drawing codes and playbooks", () => {
    const stages = decorateStages(
      [
        { id: "a", name: "Lead In", position: 2 },
        { id: "b", name: "Discovery Call", position: 1 },
      ],
      overlayForIndex,
    );
    expect(stages[0].id).toBe("b");
    expect(stages[0].drawingCode).toBe("A-101");
    expect(stages[0].nextStepSummary).toMatch(/discovery/i);
  });
});

describe("opportunity mapping", () => {
  it("computes days in stage and next steps from Hub payloads", () => {
    const stages = decorateStages(
      [{ id: "uw", name: "Underwriting", position: 0 }],
      overlayForIndex,
    );
    const now = Date.parse("2026-09-03T12:00:00.000Z");
    const prospect = mapOpportunity(
      {
        id: "opp_1",
        name: "James Okonkwo",
        pipelineStageId: "uw",
        pipelineId: "pipe",
        status: "open",
        lastStageChangeAt: "2026-08-19T12:00:00.000Z",
        contact: { email: "james@oakline.example", companyName: "Oakline Capital" },
      },
      stages,
      now,
    );
    expect(prospect.daysInStage).toBe(15);
    expect(prospect.stuck).toBe(true);
    expect(prospect.company).toBe("Oakline Capital");
    expect(prospect.nextSteps[0].label).toMatch(/outstanding requirements/i);
  });
});

describe("demo store", () => {
  it("moves a household to the next bay and refreshes next steps", () => {
    resetDemoProspects(Date.parse("2026-09-03T12:00:00.000Z"));
    const moved = moveDemoProspect("demo-maya", "demo-discovery", Date.parse("2026-09-03T12:00:00.000Z"));
    expect(moved.stageId).toBe("demo-discovery");
    expect(moved.daysInStage).toBe(0);
    expect(moved.nextSteps[0].label).toMatch(/DEFINE/i);
  });

  it("seeds stuck households in discovery", () => {
    const seeded = seedProspects(Date.parse("2026-09-03T12:00:00.000Z"));
    const samir = seeded.find((row) => row.id === "demo-samir");
    expect(samir?.stuck).toBe(true);
  });
});

describe("webhooks", () => {
  it("reads opportunity ids from common Hub payload shapes", () => {
    expect(parseWebhookOpportunityId({ opportunityId: "abc" })).toBe("abc");
    expect(parseWebhookOpportunityId({ extras: { opportunityId: "def" } })).toBe("def");
  });

  it("ignores echoes of moves this app just wrote", () => {
    markOutbound("opp_echo", 1_000);
    expect(
      shouldIgnoreInboundWebhook({ opportunityId: "opp_echo" }, 1_500),
    ).toBe(true);
    expect(
      shouldIgnoreInboundWebhook({ opportunityId: "opp_other" }, 1_500),
    ).toBe(false);
  });

  it("authorizes shared-secret webhooks", () => {
    const request = new Request("https://example.com/api/webhooks/ghl?secret=blueprint", {
      headers: { authorization: "Bearer nope" },
    });
    expect(authorizeWebhook(request, "blueprint")).toBe(true);
    expect(authorizeWebhook(request, "other")).toBe(false);
    expect(authorizeWebhook(request, undefined)).toBe(true);
  });
});

describe("daysBetween", () => {
  it("returns zero for missing timestamps", () => {
    expect(daysBetween(undefined)).toBe(0);
    expect(daysBetween("not-a-date")).toBe(0);
  });
});

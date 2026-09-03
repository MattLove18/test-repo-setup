import { describe, expect, it } from "vitest";
import { daysBetween, isStuck, overlayForIndex, stuckThresholdForIndex } from "./architecture";
import { decorateStages, nextStepsForStage, summaryForStage } from "./next-steps";
import { mapOpportunity } from "./pipeline-service";
import { authorizeWebhook, inboundWebhookUrl, parseWebhookOpportunityId, shouldIgnoreInboundWebhook } from "./webhooks";
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

  it("flags any stage after more than 10 days, including clients", () => {
    expect(stuckThresholdForIndex(0, 7)).toBe(10);
    expect(stuckThresholdForIndex(6, 7)).toBe(10);
    expect(isStuck({ daysInStage: 10, status: "open" })).toBe(false);
    expect(isStuck({ daysInStage: 11, status: "open" })).toBe(true);
    expect(isStuck({ daysInStage: 40, status: "won" })).toBe(true);
    expect(isStuck({ daysInStage: 90, status: "won" })).toBe(true);
    expect(isStuck({ daysInStage: 40, status: "lost" })).toBe(false);
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

  it("uses Hub stage names as bay titles", () => {
    const stages = decorateStages(
      [
        { id: "a", name: "Lead In", position: 2 },
        { id: "b", name: "Discovery Call", position: 1 },
      ],
      overlayForIndex,
    );
    expect(stages[0].id).toBe("b");
    expect(stages[0].name).toBe("Discovery Call");
    expect(stages[0].architecturalName).toBe("Discovery Call");
    expect(stages[0].bayLabel).toBe("Discovery Call");
    expect(stages[0].drawingCode).toBe("A-101");
    expect(stages[0].nextStepSummary).toMatch(/discovery/i);
  });
});

describe("opportunity mapping", () => {
  it("computes days in stage and next steps from Hub payloads", () => {
    const stages = decorateStages(
      [
        { id: "inq", name: "Inquiry", position: 0 },
        { id: "disc", name: "Discovery", position: 1 },
        { id: "des", name: "Design", position: 2 },
        { id: "app", name: "Application", position: 3 },
        { id: "uw", name: "Underwriting", position: 4 },
        { id: "iss", name: "Issued", position: 5 },
        { id: "cli", name: "Client", position: 6 },
      ],
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

  it("seeds yellow dwell after 10 days, including seated clients", () => {
    const seeded = seedProspects(Date.parse("2026-09-03T12:00:00.000Z"));
    const samir = seeded.find((row) => row.id === "demo-samir");
    const ruiz = seeded.find((row) => row.id === "demo-ruiz");
    const james = seeded.find((row) => row.id === "demo-james");
    const marcus = seeded.find((row) => row.id === "demo-marcus");
    const hartwell = seeded.find((row) => row.id === "demo-hartwell");
    expect(ruiz?.daysInStage).toBe(9);
    expect(ruiz?.stuck).toBe(false);
    expect(samir?.stuck).toBe(true);
    expect(james?.stuck).toBe(true);
    expect(marcus?.stuck).toBe(true);
    expect(hartwell?.stuck).toBe(true);
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

  it("builds the inbound Hub webhook URL for this origin", () => {
    expect(inboundWebhookUrl("https://temporary-rapid-mandolin-elhp7wz.vercel.app")).toBe(
      "https://temporary-rapid-mandolin-elhp7wz.vercel.app/api/webhooks/ghl",
    );
    expect(inboundWebhookUrl("https://example.com/", "blueprint")).toBe(
      "https://example.com/api/webhooks/ghl?secret=blueprint",
    );
  });
});

describe("daysBetween", () => {
  it("returns zero for missing timestamps", () => {
    expect(daysBetween(undefined)).toBe(0);
    expect(daysBetween("not-a-date")).toBe(0);
  });
});

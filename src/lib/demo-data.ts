import { daysBetween, isStuck, overlayForIndex } from "./architecture";
import { decorateStages, nextStepsForStage } from "./next-steps";
import type { OpportunityStatus, PipelineStage, Prospect } from "./types";

export const DEMO_PIPELINE_ID = "demo-life-insurance";

const STAGE_DEFS = [
  { id: "demo-inquiry", name: "Inquiry", position: 0 },
  { id: "demo-discovery", name: "Discovery", position: 1 },
  { id: "demo-design", name: "Design", position: 2 },
  { id: "demo-application", name: "Application", position: 3 },
  { id: "demo-underwriting", name: "Underwriting", position: 4 },
  { id: "demo-issued", name: "Issued", position: 5 },
  { id: "demo-client", name: "Client", position: 6 },
];

export const demoStages: PipelineStage[] = decorateStages(STAGE_DEFS, overlayForIndex);

type Seed = {
  id: string;
  name: string;
  company?: string;
  email?: string;
  phone?: string;
  stageId: string;
  value?: number;
  status?: OpportunityStatus;
  daysAgo: number;
  notes?: string;
};

const SEED: Seed[] = [
  {
    id: "demo-maya",
    name: "Maya Langford",
    company: "Langford Group",
    email: "maya@langford.example",
    phone: "(615) 555-0142",
    stageId: "demo-inquiry",
    value: 24000,
    daysAgo: 3,
    notes: "Referred by a client's CPA. Wants to stop parking surplus in a brokerage account.",
  },
  {
    id: "demo-brooke",
    name: "Brooke Ellison",
    company: "Ellison Media",
    email: "brooke@ellison.example",
    stageId: "demo-inquiry",
    value: 18000,
    daysAgo: 1,
  },
  {
    id: "demo-derek",
    name: "Derek Cho",
    company: "Cho Logistics",
    email: "derek@chologistics.example",
    phone: "(629) 555-0190",
    stageId: "demo-discovery",
    value: 36000,
    daysAgo: 6,
    notes: "S-corp. High income, inconsistent cash. Spouse should join the next meeting.",
  },
  {
    id: "demo-samir",
    name: "Samir Patel",
    company: "Patel Dental",
    email: "samir@pateldental.example",
    stageId: "demo-discovery",
    value: 42000,
    daysAgo: 18,
    notes: "Went quiet after sending the DEFINE worksheet. Follow up this week.",
  },
  {
    id: "demo-pendleton",
    name: "The Pendletons",
    company: "Pendleton Properties",
    email: "hello@pendleton.example",
    stageId: "demo-discovery",
    value: 54000,
    daysAgo: 4,
  },
  {
    id: "demo-priya",
    name: "Priya Raman",
    company: "Raman Advisors",
    email: "priya@raman.example",
    stageId: "demo-design",
    value: 31000,
    daysAgo: 5,
    notes: "Illustration ready. Present guaranteed vs non-guaranteed side by side.",
  },
  {
    id: "demo-ruiz",
    name: "Nathan & Claire Ruiz",
    company: "Ruiz Hospitality",
    email: "nathan@ruiz.example",
    stageId: "demo-design",
    value: 48000,
    daysAgo: 9,
  },
  {
    id: "demo-whitmore",
    name: "The Whitmore Family",
    company: "Whitmore Holdings",
    email: "family@whitmore.example",
    stageId: "demo-application",
    value: 72000,
    daysAgo: 4,
    notes: "Entity-owned case. Waiting on operating agreement.",
  },
  {
    id: "demo-owen",
    name: "Owen Briggs",
    company: "Briggs Fabrication",
    email: "owen@briggsfab.example",
    stageId: "demo-application",
    value: 22000,
    daysAgo: 2,
  },
  {
    id: "demo-james",
    name: "James Okonkwo",
    company: "Oakline Capital",
    email: "james@oakline.example",
    stageId: "demo-underwriting",
    value: 65000,
    daysAgo: 12,
    notes: "APS requested from cardiologist. Carrier: Mutual of Omaha.",
  },
  {
    id: "demo-lila",
    name: "Lila Chen",
    company: "Chen Studio",
    email: "lila@chenstudio.example",
    stageId: "demo-underwriting",
    value: 19000,
    daysAgo: 8,
  },
  {
    id: "demo-elena",
    name: "Elena Voss",
    company: "Voss & Co.",
    email: "elena@voss.example",
    stageId: "demo-issued",
    value: 28000,
    daysAgo: 3,
    notes: "Issued as applied. Delivery meeting Thursday.",
  },
  {
    id: "demo-hartwell",
    name: "The Hartwells",
    company: "Hartwell Farms",
    email: "family@hartwell.example",
    stageId: "demo-client",
    value: 41000,
    daysAgo: 40,
    status: "won",
  },
  {
    id: "demo-marcus",
    name: "Marcus Hale",
    company: "Hale Construction",
    email: "marcus@hale.example",
    stageId: "demo-client",
    value: 33000,
    daysAgo: 90,
    status: "won",
  },
];

export function seedProspects(now = Date.now()): Prospect[] {
  const stageById = new Map(demoStages.map((stage) => [stage.id, stage]));
  return SEED.map((row) => {
    const stage = stageById.get(row.stageId) ?? demoStages[0];
    const lastStageChangeAt = new Date(now - row.daysAgo * 86_400_000).toISOString();
    const daysInStage = daysBetween(lastStageChangeAt, now);
    const stageIndex = demoStages.findIndex((item) => item.id === stage.id);
    return {
      id: row.id,
      contactId: row.id,
      name: row.name,
      email: row.email,
      phone: row.phone,
      company: row.company,
      stageId: stage.id,
      pipelineId: DEMO_PIPELINE_ID,
      value: row.value,
      status: row.status ?? "open",
      lastStageChangeAt,
      createdAt: lastStageChangeAt,
      daysInStage,
      stuck: isStuck({
        daysInStage,
        stageIndex,
        stageCount: demoStages.length,
        status: row.status ?? "open",
      }),
      nextSteps: nextStepsForStage(stage),
      notes: row.notes,
    };
  });
}

let demoProspects = seedProspects();

export function getDemoProspects(): Prospect[] {
  return demoProspects.map((prospect) => ({ ...prospect }));
}

export function resetDemoProspects(now = Date.now()): Prospect[] {
  demoProspects = seedProspects(now);
  return getDemoProspects();
}

export function moveDemoProspect(id: string, stageId: string, now = Date.now()): Prospect {
  const stage = demoStages.find((item) => item.id === stageId);
  if (!stage) {
    throw new Error(`Unknown stage ${stageId}`);
  }
  const index = demoProspects.findIndex((item) => item.id === id);
  if (index < 0) {
    throw new Error(`Unknown prospect ${id}`);
  }
  const stageIndex = demoStages.findIndex((item) => item.id === stage.id);
  const daysInStage = 0;
  const next: Prospect = {
    ...demoProspects[index],
    stageId: stage.id,
    lastStageChangeAt: new Date(now).toISOString(),
    updatedAt: new Date(now).toISOString(),
    daysInStage,
    stuck: false,
    nextSteps: nextStepsForStage(stage),
    status: stage.id === "demo-client" ? "won" : demoProspects[index].status === "won" && stage.id !== "demo-client" ? "open" : demoProspects[index].status,
  };
  void stageIndex;
  demoProspects[index] = next;
  return { ...next };
}

export function updateDemoStatus(id: string, status: OpportunityStatus, now = Date.now()): Prospect {
  const index = demoProspects.findIndex((item) => item.id === id);
  if (index < 0) {
    throw new Error(`Unknown prospect ${id}`);
  }
  const next = {
    ...demoProspects[index],
    status,
    updatedAt: new Date(now).toISOString(),
  };
  demoProspects[index] = next;
  return { ...next };
}

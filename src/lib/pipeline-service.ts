import { daysBetween, overlayForIndex, stuckThresholdForIndex } from "./architecture";
import {
  DEMO_PIPELINE_ID,
  demoStages,
  getDemoProspects,
  moveDemoProspect,
  resetDemoProspects,
  updateDemoStatus,
} from "./demo-data";
import {
  listPipelines,
  pickPipeline,
  preferredPipelineId,
  readGhlConfig,
  searchOpportunities,
  updateOpportunityStage,
  updateOpportunityStatus,
  markOutbound,
  type GhlOpportunity,
  type GhlPipeline,
} from "./ghl";
import { decorateStages, nextStepsForStage } from "./next-steps";
import type {
  MoveResult,
  OpportunityStatus,
  PipelineSnapshot,
  PipelineStage,
  Prospect,
} from "./types";

function asStatus(value: string | undefined): OpportunityStatus {
  if (value === "won" || value === "lost" || value === "abandoned" || value === "open") {
    return value;
  }
  return "open";
}

export function mapOpportunity(
  opportunity: GhlOpportunity,
  stages: PipelineStage[],
  now = Date.now(),
): Prospect {
  const stage =
    stages.find((item) => item.id === opportunity.pipelineStageId) ?? stages[0];
  const contact = opportunity.contact;
  const lastChange =
    opportunity.lastStageChangeAt ??
    opportunity.lastStatusChangeAt ??
    opportunity.updatedAt ??
    opportunity.createdAt;
  const daysInStage = daysBetween(lastChange, now);
  const stageIndex = Math.max(
    0,
    stages.findIndex((item) => item.id === stage?.id),
  );
  const displayName =
    opportunity.name?.trim() ||
    contact?.name?.trim() ||
    contact?.email?.trim() ||
    "Untitled opportunity";
  return {
    id: opportunity.id,
    contactId: opportunity.contactId ?? contact?.id,
    name: displayName,
    email: contact?.email,
    phone: contact?.phone,
    company: contact?.companyName,
    stageId: stage?.id ?? opportunity.pipelineStageId ?? "",
    pipelineId: opportunity.pipelineId ?? "",
    value: opportunity.monetaryValue,
    status: asStatus(opportunity.status),
    assignedTo: opportunity.assignedTo,
    lastStageChangeAt: lastChange,
    createdAt: opportunity.createdAt,
    updatedAt: opportunity.updatedAt,
    daysInStage,
    stuck: daysInStage >= stuckThresholdForIndex(stageIndex, stages.length),
    nextSteps: stage ? nextStepsForStage(stage) : [],
    notes: opportunity.notes,
  };
}

function demoSnapshot(message?: string): PipelineSnapshot {
  return {
    source: "demo",
    connected: false,
    pipeline: { id: DEMO_PIPELINE_ID, name: "Life Insurance · Client Process" },
    pipelines: [{ id: DEMO_PIPELINE_ID, name: "Life Insurance · Client Process" }],
    stages: demoStages,
    prospects: getDemoProspects(),
    syncedAt: new Date().toISOString(),
    message:
      message ??
      "Blueprint is running on sample households. Add GHL_API_KEY and GHL_LOCATION_ID to two-way sync Captivation Hub.",
  };
}

function stagesFromPipeline(pipeline: GhlPipeline): PipelineStage[] {
  const raw = (pipeline.stages ?? []).map((stage, index) => ({
    id: stage.id,
    name: stage.name,
    position: stage.position ?? index,
  }));
  return decorateStages(raw, overlayForIndex);
}

export async function loadPipeline(pipelineId?: string): Promise<PipelineSnapshot> {
  const config = readGhlConfig();
  if (!config) {
    return demoSnapshot();
  }
  try {
    const pipelines = await listPipelines(config);
    const selected = pickPipeline(pipelines, pipelineId ?? preferredPipelineId());
    if (!selected) {
      return demoSnapshot("Captivation Hub is connected, but this location has no pipelines yet.");
    }
    const stages = stagesFromPipeline(selected);
    const opportunities = await searchOpportunities(config, selected.id);
    const prospects = opportunities
      .map((opportunity) => mapOpportunity(opportunity, stages))
      .filter((prospect) => prospect.status !== "lost" && prospect.status !== "abandoned");
    return {
      source: "ghl",
      connected: true,
      pipeline: { id: selected.id, name: selected.name },
      pipelines: pipelines.map((item) => ({ id: item.id, name: item.name })),
      stages,
      prospects,
      syncedAt: new Date().toISOString(),
    };
  } catch (error) {
    const detail = error instanceof Error ? error.message : "Unknown error";
    return demoSnapshot(`Captivation Hub sync failed, showing the blueprint sample. ${detail}`);
  }
}

export async function moveProspect(id: string, stageId: string): Promise<MoveResult> {
  const config = readGhlConfig();
  if (!config) {
    return { source: "demo", prospect: moveDemoProspect(id, stageId) };
  }
  const snapshot = await loadPipeline();
  const stage = snapshot.stages.find((item) => item.id === stageId);
  if (!stage) {
    throw new Error("Unknown pipeline stage");
  }
  markOutbound(id);
  const updated = await updateOpportunityStage(config, id, {
    pipelineId: snapshot.pipeline.id,
    pipelineStageId: stageId,
  });
  const mapped = mapOpportunity(
    {
      ...updated,
      id,
      pipelineId: snapshot.pipeline.id,
      pipelineStageId: stageId,
      lastStageChangeAt: new Date().toISOString(),
    },
    snapshot.stages,
  );
  return { source: "ghl", prospect: mapped };
}

export async function setProspectStatus(
  id: string,
  status: OpportunityStatus,
): Promise<MoveResult> {
  const config = readGhlConfig();
  if (!config) {
    return { source: "demo", prospect: updateDemoStatus(id, status) };
  }
  markOutbound(id);
  await updateOpportunityStatus(config, id, status);
  const snapshot = await loadPipeline();
  const prospect = snapshot.prospects.find((item) => item.id === id);
  if (!prospect) {
    throw new Error("Opportunity updated in Captivation Hub but is no longer on this pipeline");
  }
  return { source: "ghl", prospect: { ...prospect, status } };
}

export function resetDemo(): PipelineSnapshot {
  resetDemoProspects();
  return demoSnapshot("Sample households restored.");
}

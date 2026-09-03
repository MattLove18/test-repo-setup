import { formatDays } from "./format";
import type { PipelineSnapshot, Prospect } from "./types";

export type WidgetItem = {
  id: string;
  name: string;
  company?: string;
  bay: string;
  next: string;
  daysInStage: number;
  age: string;
  stuck: boolean;
};

export type WidgetBriefing = {
  headline: string;
  summary: string;
  inProcess: number;
  stuck: number;
  clients: number;
  items: WidgetItem[];
  pipelineName: string;
  source: PipelineSnapshot["source"];
  connected: boolean;
  message?: string;
};

const MAX_ITEMS = 4;

export function isClientHousehold(prospect: Prospect, lastStageId: string | undefined): boolean {
  return prospect.status === "won" || Boolean(lastStageId && prospect.stageId === lastStageId);
}

export function buildWidgetBriefing(snapshot: PipelineSnapshot): WidgetBriefing {
  const lastStageId = snapshot.stages.at(-1)?.id;
  const stageById = new Map(snapshot.stages.map((stage) => [stage.id, stage]));
  const clients = snapshot.prospects.filter((prospect) => isClientHousehold(prospect, lastStageId));
  const inProcess = snapshot.prospects.filter(
    (prospect) => !isClientHousehold(prospect, lastStageId),
  );
  const stuck = inProcess.filter((prospect) => prospect.stuck);
  const ranked = [...inProcess].sort((a, b) => {
    if (a.stuck !== b.stuck) return a.stuck ? -1 : 1;
    return b.daysInStage - a.daysInStage;
  });
  const items = ranked.slice(0, MAX_ITEMS).map((prospect) => toItem(prospect, stageById));
  const headline = headlineFor(stuck.length, inProcess.length);
  const summary = summaryFor(stuck, inProcess, stageById);
  return {
    headline,
    summary,
    inProcess: inProcess.length,
    stuck: stuck.length,
    clients: clients.length,
    items,
    pipelineName: snapshot.pipeline.name,
    source: snapshot.source,
    connected: snapshot.connected,
    message: snapshot.message,
  };
}

function toItem(
  prospect: Prospect,
  stageById: Map<string, PipelineSnapshot["stages"][number]>,
): WidgetItem {
  const stage = stageById.get(prospect.stageId);
  return {
    id: prospect.id,
    name: prospect.name,
    company: prospect.company,
    bay: stage?.bayLabel ?? stage?.name ?? "Unknown bay",
    next: prospect.nextSteps[0]?.label ?? stage?.nextStepSummary ?? "Check the drawing",
    daysInStage: prospect.daysInStage,
    age: formatDays(prospect.daysInStage),
    stuck: prospect.stuck,
  };
}

function headlineFor(stuckCount: number, inProcessCount: number): string {
  if (stuckCount === 1) return "1 household behind schedule";
  if (stuckCount > 1) return `${stuckCount} households behind schedule`;
  if (inProcessCount === 1) return "1 household in process — on pace";
  if (inProcessCount > 1) return `Pipeline on pace — ${inProcessCount} in process`;
  return "No households in process";
}

function summaryFor(
  stuck: Prospect[],
  inProcess: Prospect[],
  stageById: Map<string, PipelineSnapshot["stages"][number]>,
): string {
  if (stuck.length > 0) {
    const first = stuck[0];
    const bay = stageById.get(first.stageId)?.bayLabel ?? "this bay";
    const next = first.nextSteps[0]?.label ?? "the next committed step";
    if (stuck.length === 1) {
      return `${first.name} has sat in ${bay} for ${formatDays(first.daysInStage)}. Next: ${next}.`;
    }
    return `${first.name} is the longest sit (${formatDays(first.daysInStage)} in ${bay}). ${stuck.length} cards need a chase today.`;
  }
  if (inProcess.length === 0) {
    return "The drawing is clear. New inquiries will show here during desk hours.";
  }
  const oldest = [...inProcess].sort((a, b) => b.daysInStage - a.daysInStage)[0];
  const bay = stageById.get(oldest.stageId)?.bayLabel ?? "their bay";
  return `Oldest open card is ${oldest.name} in ${bay} (${formatDays(oldest.daysInStage)}).`;
}

export const DESK_CLOSED_HEADLINE = "Desk closed until 7:00 AM";

export function closedWidgetBriefing(): Pick<WidgetBriefing, "headline" | "summary" | "items"> {
  return {
    headline: DESK_CLOSED_HEADLINE,
    summary: "No new briefing until the desk opens. Yesterday's drawing still lives on the full board.",
    items: [],
  };
}

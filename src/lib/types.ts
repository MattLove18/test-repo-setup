export type OpportunityStatus = "open" | "won" | "lost" | "abandoned";

export type StepOwner = "advisor" | "prospect" | "carrier";

export type NextStep = {
  id: string;
  label: string;
  owner: StepOwner;
  detail: string;
};

export type PipelineStage = {
  id: string;
  name: string;
  position: number;
  architecturalName: string;
  drawingCode: string;
  bayLabel: string;
  nextStepSummary: string;
};

export type Prospect = {
  id: string;
  contactId?: string;
  name: string;
  email?: string;
  phone?: string;
  company?: string;
  stageId: string;
  pipelineId: string;
  value?: number;
  status: OpportunityStatus;
  assignedTo?: string;
  lastStageChangeAt?: string;
  createdAt?: string;
  updatedAt?: string;
  daysInStage: number;
  stuck: boolean;
  nextSteps: NextStep[];
  notes?: string;
};

export type PipelineInfo = {
  id: string;
  name: string;
};

export type PipelineSnapshot = {
  source: "ghl" | "demo";
  connected: boolean;
  pipeline: PipelineInfo;
  pipelines: PipelineInfo[];
  stages: PipelineStage[];
  prospects: Prospect[];
  syncedAt: string;
  message?: string;
};

export type MoveResult = {
  prospect: Prospect;
  source: "ghl" | "demo";
};

export type WidgetPayload = {
  deskOpen: boolean;
  generatedAt: string;
  nextRefreshAt: string;
  window: { start: string; end: string; timeZone: string };
  refreshMinutes: number;
  headline: string;
  summary: string;
  inProcess: number;
  stuck: number;
  clients: number;
  items: Array<{
    id: string;
    name: string;
    company?: string;
    bay: string;
    next: string;
    daysInStage: number;
    age: string;
    stuck: boolean;
  }>;
  pipelineName: string;
  source: PipelineSnapshot["source"] | "closed";
  connected: boolean;
  message?: string;
  error?: string;
};

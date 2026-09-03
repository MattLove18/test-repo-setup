const API_BASE = "https://services.leadconnectorhq.com";
const API_VERSION = "2021-07-28";

export type GhlStage = {
  id: string;
  name: string;
  position?: number;
};

export type GhlPipeline = {
  id: string;
  name: string;
  stages?: GhlStage[];
};

export type GhlContact = {
  id?: string;
  name?: string;
  email?: string;
  phone?: string;
  companyName?: string;
};

export type GhlOpportunity = {
  id: string;
  name?: string;
  monetaryValue?: number;
  pipelineId?: string;
  pipelineStageId?: string;
  status?: string;
  assignedTo?: string;
  contactId?: string;
  contact?: GhlContact;
  lastStatusChangeAt?: string;
  lastStageChangeAt?: string;
  createdAt?: string;
  updatedAt?: string;
  notes?: string;
};

export type GhlConfig = {
  apiKey: string;
  locationId: string;
  pipelineId?: string;
};

export function readGhlConfig(): GhlConfig | null {
  const apiKey = process.env.GHL_API_KEY?.trim();
  const locationId = process.env.GHL_LOCATION_ID?.trim();
  if (!apiKey || !locationId) return null;
  return {
    apiKey,
    locationId,
    pipelineId: process.env.GHL_PIPELINE_ID?.trim() || undefined,
  };
}

export function preferredPipelineId(config?: GhlConfig | null): string | undefined {
  return config?.pipelineId || process.env.GHL_PIPELINE_ID?.trim() || undefined;
}

export function explainHubError(error: unknown): string {
  const message = error instanceof Error ? error.message : "Unknown error";
  if (/\(401\)/.test(message)) {
    return "Captivation Hub rejected the token. Create a new Private Integration and paste the token immediately — Hub only shows it once.";
  }
  if (/\(403\)/.test(message)) {
    return "The token is missing permission. Edit the Private Integration and enable Opportunities (view + edit) and Contacts (view).";
  }
  if (/\(422\)/.test(message)) {
    return "The Location ID does not match this token. Copy the ID from the sub-account URL after /location/.";
  }
  return message;
}

async function ghlFetch<T>(
  config: GhlConfig,
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${config.apiKey}`,
      Version: API_VERSION,
      Accept: "application/json",
      "Content-Type": "application/json",
      ...(init.headers ?? {}),
    },
    cache: "no-store",
  });
  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(`Captivation Hub request failed (${response.status}): ${body.slice(0, 400)}`);
  }
  if (response.status === 204) {
    return {} as T;
  }
  return (await response.json()) as T;
}

export async function listPipelines(config: GhlConfig): Promise<GhlPipeline[]> {
  const data = await ghlFetch<{ pipelines?: GhlPipeline[] }>(
    config,
    `/opportunities/pipelines?locationId=${encodeURIComponent(config.locationId)}`,
  );
  return data.pipelines ?? [];
}

export function pickPipeline(pipelines: GhlPipeline[], preferredId?: string): GhlPipeline | null {
  if (pipelines.length === 0) return null;
  if (preferredId) {
    const exact = pipelines.find((pipeline) => pipeline.id === preferredId);
    if (exact) return exact;
  }
  const named = pipelines.find((pipeline) =>
    /life|insurance|client|design|prospect|sales/i.test(pipeline.name),
  );
  return named ?? pipelines[0];
}

export async function searchOpportunities(
  config: GhlConfig,
  pipelineId: string,
): Promise<GhlOpportunity[]> {
  const opportunities: GhlOpportunity[] = [];
  let startAfterId: string | undefined;
  for (let page = 0; page < 20; page += 1) {
    const params = new URLSearchParams({
      location_id: config.locationId,
      pipeline_id: pipelineId,
      limit: "100",
    });
    if (startAfterId) params.set("startAfterId", startAfterId);
    const data = await ghlFetch<{
      opportunities?: GhlOpportunity[];
      meta?: { startAfterId?: string; nextPage?: string };
    }>(config, `/opportunities/search?${params.toString()}`);
    const batch = data.opportunities ?? [];
    opportunities.push(...batch);
    const nextId = data.meta?.startAfterId;
    if (!nextId || batch.length === 0) break;
    startAfterId = nextId;
  }
  return opportunities;
}

export async function updateOpportunityStage(
  config: GhlConfig,
  opportunityId: string,
  input: { pipelineId: string; pipelineStageId: string },
): Promise<GhlOpportunity> {
  const data = await ghlFetch<{ opportunity?: GhlOpportunity }>(
    config,
    `/opportunities/${encodeURIComponent(opportunityId)}`,
    {
      method: "PUT",
      body: JSON.stringify({
        pipelineId: input.pipelineId,
        pipelineStageId: input.pipelineStageId,
      }),
    },
  );
  return data.opportunity ?? { id: opportunityId, ...input };
}

export async function updateOpportunityStatus(
  config: GhlConfig,
  opportunityId: string,
  status: string,
): Promise<void> {
  await ghlFetch(
    config,
    `/opportunities/${encodeURIComponent(opportunityId)}/status`,
    {
      method: "PUT",
      body: JSON.stringify({ status }),
    },
  );
}

const recentlyPushed = new Map<string, number>();

export function markOutbound(opportunityId: string, at = Date.now()): void {
  recentlyPushed.set(opportunityId, at);
}

export function wasRecentlyPushed(opportunityId: string, at = Date.now(), windowMs = 15_000): boolean {
  const stamped = recentlyPushed.get(opportunityId);
  if (!stamped) return false;
  if (at - stamped > windowMs) {
    recentlyPushed.delete(opportunityId);
    return false;
  }
  return true;
}

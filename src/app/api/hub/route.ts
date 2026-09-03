import { NextResponse } from "next/server";
import { explainHubError, listPipelines, pickPipeline, type GhlConfig } from "@/lib/ghl";
import {
  HUB_COOKIE,
  HUB_COOKIE_OPTIONS,
  connectionSource,
  extractLocationId,
  resolveHubConfig,
} from "@/lib/hub-session";

export const dynamic = "force-dynamic";

function applyHubCookies(response: NextResponse, config: GhlConfig) {
  response.cookies.set(HUB_COOKIE.pit, config.apiKey, HUB_COOKIE_OPTIONS);
  response.cookies.set(HUB_COOKIE.location, config.locationId, HUB_COOKIE_OPTIONS);
  if (config.pipelineId) {
    response.cookies.set(HUB_COOKIE.pipeline, config.pipelineId, HUB_COOKIE_OPTIONS);
  } else {
    response.cookies.set(HUB_COOKIE.pipeline, "", { ...HUB_COOKIE_OPTIONS, maxAge: 0 });
  }
}

export async function GET(request: Request) {
  const source = connectionSource(request);
  const config = resolveHubConfig(request);
  if (!config) {
    return NextResponse.json({ connected: false, source });
  }
  try {
    const pipelines = await listPipelines(config);
    const selected = pickPipeline(pipelines, config.pipelineId);
    return NextResponse.json({
      connected: true,
      source,
      locationId: config.locationId,
      pipelineCount: pipelines.length,
      pipeline: selected ? { id: selected.id, name: selected.name } : null,
      pipelines: pipelines.map((pipeline) => ({ id: pipeline.id, name: pipeline.name })),
    });
  } catch (error) {
    return NextResponse.json({
      connected: false,
      source,
      error: explainHubError(error),
    });
  }
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as {
    apiKey?: string;
    locationId?: string;
    pipelineId?: string;
  };
  const apiKey = body.apiKey?.trim() ?? "";
  const locationId = extractLocationId(body.locationId ?? "");
  const pipelineId = body.pipelineId?.trim() || undefined;
  if (!apiKey || !locationId) {
    return NextResponse.json(
      { error: "Paste the Private Integration token and the Location ID." },
      { status: 400 },
    );
  }
  const config: GhlConfig = { apiKey, locationId, pipelineId };
  try {
    const pipelines = await listPipelines(config);
    const selected = pickPipeline(pipelines, pipelineId);
    const response = NextResponse.json({
      ok: true,
      locationId,
      pipelineCount: pipelines.length,
      pipeline: selected ? { id: selected.id, name: selected.name } : null,
      pipelines: pipelines.map((pipeline) => ({ id: pipeline.id, name: pipeline.name })),
    });
    applyHubCookies(response, {
      ...config,
      pipelineId: selected?.id ?? pipelineId,
    });
    return response;
  } catch (error) {
    return NextResponse.json({ error: explainHubError(error) }, { status: 401 });
  }
}

export async function PATCH(request: Request) {
  const current = resolveHubConfig(request);
  if (!current) {
    return NextResponse.json({ error: "Connect Captivation Hub first." }, { status: 401 });
  }
  const body = (await request.json().catch(() => ({}))) as { pipelineId?: string };
  const pipelineId = body.pipelineId?.trim();
  const response = NextResponse.json({ ok: true, pipelineId: pipelineId ?? null });
  applyHubCookies(response, { ...current, pipelineId });
  return response;
}

export async function DELETE() {
  const response = NextResponse.json({ ok: true });
  for (const name of Object.values(HUB_COOKIE)) {
    response.cookies.set(name, "", { ...HUB_COOKIE_OPTIONS, maxAge: 0 });
  }
  return response;
}

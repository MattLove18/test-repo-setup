import { NextResponse } from "next/server";
import { loadPipeline, resetDemo } from "@/lib/pipeline-service";
import { resolveHubConfig } from "@/lib/hub-session";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const pipelineId = url.searchParams.get("pipelineId") ?? undefined;
  if (url.searchParams.get("reset") === "demo") {
    return NextResponse.json(resetDemo());
  }
  const snapshot = await loadPipeline(pipelineId, resolveHubConfig(request));
  return NextResponse.json(snapshot);
}

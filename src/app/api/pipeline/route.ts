import { NextResponse } from "next/server";
import { loadPipeline, resetDemo } from "@/lib/pipeline-service";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const pipelineId = url.searchParams.get("pipelineId") ?? undefined;
  if (url.searchParams.get("reset") === "demo") {
    return NextResponse.json(resetDemo());
  }
  const snapshot = await loadPipeline(pipelineId);
  return NextResponse.json(snapshot);
}

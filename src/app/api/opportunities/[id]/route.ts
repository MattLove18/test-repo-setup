import { NextResponse } from "next/server";
import { moveProspect, setProspectStatus } from "@/lib/pipeline-service";
import { resolveHubConfig } from "@/lib/hub-session";
import type { OpportunityStatus } from "@/lib/types";

export const dynamic = "force-dynamic";

const STATUSES = new Set<OpportunityStatus>(["open", "won", "lost", "abandoned"]);

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const body = (await request.json()) as {
    stageId?: string;
    status?: OpportunityStatus;
  };
  const config = resolveHubConfig(request);
  try {
    if (body.stageId) {
      const result = await moveProspect(id, body.stageId, config);
      return NextResponse.json(result);
    }
    if (body.status && STATUSES.has(body.status)) {
      const result = await setProspectStatus(id, body.status, config);
      return NextResponse.json(result);
    }
    return NextResponse.json({ error: "Provide stageId or status" }, { status: 400 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Update failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

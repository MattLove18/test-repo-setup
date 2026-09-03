import { NextResponse } from "next/server";
import { authorizeWebhook, shouldIgnoreInboundWebhook, type GhlWebhookPayload } from "@/lib/webhooks";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  if (!authorizeWebhook(request, process.env.GHL_WEBHOOK_SECRET)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const payload = (await request.json().catch(() => ({}))) as GhlWebhookPayload;
  if (shouldIgnoreInboundWebhook(payload)) {
    return NextResponse.json({ ok: true, ignored: true });
  }
  return NextResponse.json({
    ok: true,
    ignored: false,
    opportunityId: payload.opportunityId ?? payload.id ?? null,
  });
}

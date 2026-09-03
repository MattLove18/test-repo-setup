import { wasRecentlyPushed } from "./ghl";

export type GhlWebhookPayload = {
  type?: string;
  event?: string;
  locationId?: string;
  id?: string;
  opportunityId?: string;
  pipelineId?: string;
  pipelineStageId?: string;
  extras?: { opportunityId?: string };
};

export function parseWebhookOpportunityId(payload: GhlWebhookPayload): string | null {
  return (
    payload.opportunityId ||
    payload.extras?.opportunityId ||
    (payload.id && /opportunity/i.test(payload.type ?? payload.event ?? "") ? payload.id : null) ||
    payload.id ||
    null
  );
}

export function shouldIgnoreInboundWebhook(payload: GhlWebhookPayload, now = Date.now()): boolean {
  const id = parseWebhookOpportunityId(payload);
  if (!id) return true;
  return wasRecentlyPushed(id, now);
}

export function authorizeWebhook(request: Request, secret: string | undefined): boolean {
  if (!secret) return true;
  const header = request.headers.get("authorization") ?? "";
  const bearer = header.toLowerCase().startsWith("bearer ") ? header.slice(7).trim() : "";
  const url = new URL(request.url);
  const querySecret = url.searchParams.get("secret") ?? "";
  const headerSecret = request.headers.get("x-webhook-secret") ?? "";
  return bearer === secret || querySecret === secret || headerSecret === secret;
}

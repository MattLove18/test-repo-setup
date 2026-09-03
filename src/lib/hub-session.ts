import type { GhlConfig } from "./ghl";
import { readGhlConfig } from "./ghl";

export const HUB_COOKIE = {
  pit: "hub_pit",
  location: "hub_location",
  pipeline: "hub_pipeline",
} as const;

export const HUB_COOKIE_OPTIONS = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
  maxAge: 60 * 60 * 24 * 180,
};

export function extractLocationId(input: string): string {
  const trimmed = input.trim();
  if (!trimmed) return "";
  const fromPath = trimmed.match(/\/location(?:s)?\/([A-Za-z0-9]+)/i);
  if (fromPath?.[1]) return fromPath[1];
  try {
    const url = new URL(trimmed);
    const fromQuery = url.searchParams.get("locationId") ?? url.searchParams.get("location_id");
    if (fromQuery) return fromQuery.trim();
  } catch {
    // not a URL
  }
  return trimmed;
}

export function parseCookieHeader(header: string | null): Record<string, string> {
  const out: Record<string, string> = {};
  if (!header) return out;
  for (const part of header.split(";")) {
    const [rawName, ...rest] = part.split("=");
    const name = rawName?.trim();
    if (!name) continue;
    out[name] = decodeURIComponent(rest.join("=").trim());
  }
  return out;
}

export function configFromRequest(request: Request): GhlConfig | null {
  const cookies = parseCookieHeader(request.headers.get("cookie"));
  const apiKey = cookies[HUB_COOKIE.pit]?.trim();
  const locationId = cookies[HUB_COOKIE.location]?.trim();
  if (!apiKey || !locationId) return null;
  const pipelineId = cookies[HUB_COOKIE.pipeline]?.trim() || undefined;
  return { apiKey, locationId, pipelineId };
}

export function resolveHubConfig(request: Request): GhlConfig | null {
  const env = readGhlConfig();
  const session = configFromRequest(request);
  if (env) {
    return {
      ...env,
      pipelineId: env.pipelineId || session?.pipelineId,
    };
  }
  return session;
}

export function connectionSource(request: Request): "env" | "session" | "none" {
  if (readGhlConfig()) return "env";
  if (configFromRequest(request)) return "session";
  return "none";
}

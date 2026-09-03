import { NextResponse } from "next/server";
import { isDeskOpen, nextWidgetRefreshAt, readDeskHours } from "@/lib/desk-hours";
import { resolveHubConfig } from "@/lib/hub-session";
import { loadPipeline } from "@/lib/pipeline-service";
import { authorizeWidget, readWidgetToken } from "@/lib/widget-auth";
import { buildWidgetBriefing, closedWidgetBriefing } from "@/lib/widget-briefing";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  if (!authorizeWidget(request, readWidgetToken())) {
    return NextResponse.json({ error: "Widget token required." }, { status: 401 });
  }

  const url = new URL(request.url);
  const forceLive = url.searchParams.get("live") === "1";
  const hours = readDeskHours();
  const now = new Date();
  const deskOpen = isDeskOpen(now, hours);
  const nextRefreshAt = nextWidgetRefreshAt(now, hours).toISOString();
  const window = {
    start: `${String(hours.openHour).padStart(2, "0")}:00`,
    end: `${String(hours.closeHour).padStart(2, "0")}:00`,
    timeZone: hours.timeZone,
  };

  if (!deskOpen && !forceLive) {
    return NextResponse.json({
      deskOpen: false,
      generatedAt: now.toISOString(),
      nextRefreshAt,
      window,
      refreshMinutes: 60,
      ...closedWidgetBriefing(),
      inProcess: 0,
      stuck: 0,
      clients: 0,
      pipelineName: "",
      source: "closed",
      connected: false,
    });
  }

  const snapshot = await loadPipeline(undefined, resolveHubConfig(request));
  const briefing = buildWidgetBriefing(snapshot);
  return NextResponse.json({
    deskOpen,
    generatedAt: snapshot.syncedAt,
    nextRefreshAt,
    window,
    refreshMinutes: 60,
    ...briefing,
  });
}

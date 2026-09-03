"use client";

import { useCallback, useEffect, useState } from "react";
import type { WidgetPayload } from "@/lib/types";

function widgetQuery(): string {
  if (typeof window === "undefined") return "";
  const token = new URLSearchParams(window.location.search).get("token");
  return token ? `?token=${encodeURIComponent(token)}` : "";
}

async function fetchBriefing(forceLive = false): Promise<WidgetPayload> {
  const params = new URLSearchParams(typeof window === "undefined" ? "" : window.location.search);
  const token = params.get("token");
  const query = new URLSearchParams();
  if (token) query.set("token", token);
  if (forceLive) query.set("live", "1");
  const suffix = query.toString() ? `?${query.toString()}` : "";
  const response = await fetch(`/api/widget${suffix}`, { cache: "no-store" });
  const payload = (await response.json()) as WidgetPayload;
  if (!response.ok) {
    throw new Error(payload.error ?? "Could not load the desk briefing");
  }
  return payload;
}

function formatClock(iso: string, timeZone: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString("en-US", {
    timeZone,
    hour: "numeric",
    minute: "2-digit",
    weekday: "short",
  });
}

export function DeskWidget() {
  const [payload, setPayload] = useState<WidgetPayload | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const data = await fetchBriefing();
      setPayload(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Load failed");
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!payload?.nextRefreshAt) return;
    const wait = Math.max(5_000, Date.parse(payload.nextRefreshAt) - Date.now());
    const timer = window.setTimeout(() => {
      void load();
    }, wait);
    return () => window.clearTimeout(timer);
  }, [payload?.nextRefreshAt, load]);

  if (error && !payload) {
    return (
      <section className="desk-card">
        <p className="desk-kicker">Desk briefing</p>
        <h1>Cannot load the widget</h1>
        <p className="desk-summary">{error}</p>
        <p className="desk-help">
          If you set <code>WIDGET_TOKEN</code>, open this page as{" "}
          <code>/widget?token=…</code>
          {widgetQuery() ? null : "."}
        </p>
      </section>
    );
  }

  if (!payload) {
    return (
      <section className="desk-card">
        <p className="desk-kicker">Desk briefing</p>
        <h1>Unrolling…</h1>
      </section>
    );
  }

  return (
    <section className={payload.deskOpen ? "desk-card" : "desk-card is-closed"}>
      <p className="desk-kicker">
        {payload.deskOpen ? "Desk briefing · 60 min" : "Desk closed"}
      </p>
      <h1>{payload.headline}</h1>
      <p className="desk-summary">{payload.summary}</p>
      {payload.deskOpen ? (
        <ul className="desk-stats">
          <li>
            <strong>{payload.inProcess}</strong>
            <span>in process</span>
          </li>
          <li>
            <strong>{payload.stuck}</strong>
            <span>behind</span>
          </li>
          <li>
            <strong>{payload.clients}</strong>
            <span>clients</span>
          </li>
        </ul>
      ) : null}
      {payload.items.length > 0 ? (
        <ol className="desk-items">
          {payload.items.map((item) => (
            <li key={item.id} className={item.stuck ? "is-stuck" : undefined}>
              <div>
                <strong>{item.name}</strong>
                <span>
                  {item.bay} · {item.next}
                </span>
              </div>
              <em>{item.age}</em>
            </li>
          ))}
        </ol>
      ) : null}
      <footer className="desk-foot">
        <span>
          {payload.deskOpen
            ? `Next pull ${formatClock(payload.nextRefreshAt, payload.window.timeZone)}`
            : `Opens ${formatClock(payload.nextRefreshAt, payload.window.timeZone)}`}
        </span>
        <span>
          {payload.window.start}–{payload.window.end} {payload.window.timeZone.replace("_", " ")}
        </span>
      </footer>
      {payload.message && payload.source === "demo" ? (
        <p className="desk-help">{payload.message}</p>
      ) : null}
    </section>
  );
}

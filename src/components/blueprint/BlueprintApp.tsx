"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { drawingDate, formatCurrency } from "@/lib/format";
import type { OpportunityStatus, PipelineSnapshot, Prospect } from "@/lib/types";
import { SpecSheet } from "./SpecSheet";
import { StageBay } from "./StageBay";

type Filter = "all" | "process" | "stuck" | "clients";

async function fetchSnapshot(pipelineId?: string): Promise<PipelineSnapshot> {
  const query = pipelineId ? `?pipelineId=${encodeURIComponent(pipelineId)}` : "";
  const response = await fetch(`/api/pipeline${query}`, { cache: "no-store" });
  if (!response.ok) {
    throw new Error("Could not load the pipeline drawing");
  }
  return (await response.json()) as PipelineSnapshot;
}

export function BlueprintApp() {
  const [snapshot, setSnapshot] = useState<PipelineSnapshot | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dropStageId, setDropStageId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const pipelineIdRef = useRef<string | undefined>(undefined);

  const load = useCallback(async (pipelineId?: string) => {
    try {
      const data = await fetchSnapshot(pipelineId ?? pipelineIdRef.current);
      pipelineIdRef.current = data.pipeline.id;
      setSnapshot(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Load failed");
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!snapshot?.connected) return;
    const timer = window.setInterval(() => {
      void load();
    }, 45_000);
    return () => window.clearInterval(timer);
  }, [snapshot?.connected, load]);

  const selected = snapshot?.prospects.find((item) => item.id === selectedId) ?? null;
  const selectedStage = snapshot?.stages.find((item) => item.id === selected?.stageId);
  const selectedIndex = snapshot?.stages.findIndex((item) => item.id === selected?.stageId) ?? -1;
  const nextStage =
    snapshot && selectedIndex >= 0 ? snapshot.stages[selectedIndex + 1] : undefined;

  const visible = useMemo(() => {
    if (!snapshot) return [];
    const needle = query.trim().toLowerCase();
    return snapshot.prospects.filter((prospect) => {
      const last = snapshot.stages.at(-1);
      const isClient = prospect.status === "won" || Boolean(last && prospect.stageId === last.id);
      if (filter === "process" && isClient) return false;
      if (filter === "stuck" && !prospect.stuck) return false;
      if (filter === "clients" && !isClient) return false;
      if (!needle) return true;
      return [prospect.name, prospect.company, prospect.email]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(needle);
    });
  }, [snapshot, query, filter]);

  async function patchProspect(id: string, body: { stageId?: string; status?: OpportunityStatus }) {
    setSaving(true);
    setNotice(null);
    try {
      const response = await fetch(`/api/opportunities/${encodeURIComponent(id)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const payload = (await response.json()) as { prospect?: Prospect; error?: string };
      if (!response.ok || !payload.prospect) {
        throw new Error(payload.error ?? "Update failed");
      }
      setSnapshot((current) => {
        if (!current) return current;
        return {
          ...current,
          prospects: current.prospects.map((item) => (item.id === id ? payload.prospect! : item)),
          syncedAt: new Date().toISOString(),
        };
      });
      setNotice(
        body.stageId
          ? "Bay updated. Captivation Hub will show the same stage."
          : "Status updated in the drawing and the CRM.",
      );
    } catch (err) {
      setNotice(err instanceof Error ? err.message : "Update failed");
    } finally {
      setSaving(false);
      setDraggingId(null);
      setDropStageId(null);
    }
  }

  function handleDrop(stageId: string) {
    const id = draggingId;
    setDropStageId(null);
    if (!id || !snapshot) return;
    const current = snapshot.prospects.find((item) => item.id === id);
    if (!current || current.stageId === stageId) {
      setDraggingId(null);
      return;
    }
    void patchProspect(id, { stageId });
  }

  if (error && !snapshot) {
    return <p className="boot-error">{error}</p>;
  }
  if (!snapshot) {
    return <p className="boot-loading">Unrolling the drawing…</p>;
  }

  const inProcess = snapshot.prospects.filter((item) => {
    const last = snapshot.stages.at(-1);
    return item.status === "open" && last && item.stageId !== last.id;
  }).length;
  const stuck = snapshot.prospects.filter((item) => item.stuck).length;
  const pipelineValue = snapshot.prospects
    .filter((item) => item.status === "open")
    .reduce((sum, item) => sum + (item.value ?? 0), 0);

  return (
    <div className="drawing">
      <header className="title-block">
        <div className="firm">
          <svg className="compass" viewBox="0 0 64 64" aria-hidden>
            <circle cx="32" cy="32" r="28" />
            <path d="M32 8 L36 32 L32 56 L28 32 Z" />
            <path d="M8 32 L32 28 L56 32 L32 36 Z" />
          </svg>
          <div>
            <p className="firm-name">Cash Flow Architects</p>
            <p className="firm-loc">Franklin, Tennessee · Lifestyle by D.E.S.I.G.N.</p>
          </div>
        </div>
        <div className="sheet-meta">
          <h1>Client Pipeline</h1>
          <p>People in process of life insurance and becoming a client</p>
        </div>
        <dl className="title-fields">
          <div>
            <dt>Drawing</dt>
            <dd>A-100</dd>
          </div>
          <div>
            <dt>Scale</dt>
            <dd>1 household : 1 bay</dd>
          </div>
          <div>
            <dt>Rev</dt>
            <dd>{drawingDate(snapshot.syncedAt)}</dd>
          </div>
          <div>
            <dt>Source</dt>
            <dd>{snapshot.connected ? "Captivation Hub" : "Blueprint sample"}</dd>
          </div>
        </dl>
      </header>

      <div className="toolbar">
        <label className="search">
          <span>Find</span>
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Name, company, email"
          />
        </label>
        <div className="filters" role="tablist" aria-label="Filter households">
          {(
            [
              ["all", "All bays"],
              ["process", "In process"],
              ["stuck", "Behind schedule"],
              ["clients", "Clients"],
            ] as const
          ).map(([key, label]) => (
            <button
              key={key}
              type="button"
              role="tab"
              aria-selected={filter === key}
              className={filter === key ? "is-on" : ""}
              onClick={() => setFilter(key)}
            >
              {label}
            </button>
          ))}
        </div>
        <ul className="stats">
          <li>
            <strong>{inProcess}</strong>
            <span>in process</span>
          </li>
          <li>
            <strong>{stuck}</strong>
            <span>behind</span>
          </li>
          <li>
            <strong>{formatCurrency(pipelineValue)}</strong>
            <span>open value</span>
          </li>
        </ul>
        {snapshot.connected && snapshot.pipelines.length > 1 ? (
          <label className="search">
            <span>Pipeline</span>
            <select
              value={snapshot.pipeline.id}
              onChange={(event) => {
                pipelineIdRef.current = event.target.value;
                void load(event.target.value);
              }}
            >
              {snapshot.pipelines.map((pipeline) => (
                <option key={pipeline.id} value={pipeline.id}>
                  {pipeline.name}
                </option>
              ))}
            </select>
          </label>
        ) : null}
        <button type="button" className="ghost-btn" onClick={() => void load()}>
          Refresh drawing
        </button>
        <a className="ghost-btn" href="/connect">
          {snapshot.connected ? "Hub settings" : "Connect Captivation Hub"}
        </a>
      </div>

      {snapshot.message ? (
        <p className="sync-banner">
          {snapshot.message}{" "}
          {snapshot.connected ? null : (
            <a href="/connect">Connect Captivation Hub</a>
          )}
        </p>
      ) : null}
      {notice ? <p className="sync-banner is-notice">{notice}</p> : null}

      <div className="section-cut">
        <div className="roof" aria-hidden>
          <span />
        </div>
        <div className="bays">
          {snapshot.stages.map((stage) => (
            <StageBay
              key={stage.id}
              stage={stage}
              prospects={visible.filter((item) => item.stageId === stage.id)}
              selectedId={selectedId}
              dropTarget={dropStageId === stage.id}
              onSelect={setSelectedId}
              onDragStart={setDraggingId}
              onDrop={handleDrop}
              onDragEnter={setDropStageId}
              onDragLeave={(id) => {
                if (dropStageId === id) setDropStageId(null);
              }}
            />
          ))}
        </div>
        <div className="foundation">
          <span>Foundation line · protect the family, control cash flow, keep liquidity</span>
          <span>N</span>
        </div>
      </div>

      {selected ? (
        <SpecSheet
          prospect={selected}
          stage={selectedStage}
          nextStage={nextStage}
          stages={snapshot.stages}
          saving={saving}
          onClose={() => setSelectedId(null)}
          onAdvance={() => {
            if (nextStage) void patchProspect(selected.id, { stageId: nextStage.id });
          }}
          onMove={(stageId) => void patchProspect(selected.id, { stageId })}
          onStatus={(status) => void patchProspect(selected.id, { status })}
        />
      ) : null}
    </div>
  );
}

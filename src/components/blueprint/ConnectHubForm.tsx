"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type PipelineOption = { id: string; name: string };

type Status = {
  connected: boolean;
  source?: "env" | "session" | "none";
  locationId?: string;
  pipeline?: PipelineOption | null;
  pipelines?: PipelineOption[];
  error?: string;
};

export function ConnectHubForm() {
  const router = useRouter();
  const [apiKey, setApiKey] = useState("");
  const [locationId, setLocationId] = useState("");
  const [pipelineId, setPipelineId] = useState("");
  const [status, setStatus] = useState<Status | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    void fetch("/api/hub", { cache: "no-store" })
      .then((response) => response.json())
      .then((data: Status) => {
        setStatus(data);
        if (data.pipeline?.id) setPipelineId(data.pipeline.id);
        if (data.locationId) setLocationId(data.locationId);
      })
      .catch(() => setStatus({ connected: false }));
  }, []);

  async function connect(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setMessage(null);
    try {
      const response = await fetch("/api/hub", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ apiKey, locationId, pipelineId: pipelineId || undefined }),
      });
      const payload = (await response.json()) as Status & { error?: string; ok?: boolean };
      if (!response.ok) {
        throw new Error(payload.error ?? "Could not connect");
      }
      setStatus({
        connected: true,
        source: "session",
        locationId: payload.locationId,
        pipeline: payload.pipeline,
        pipelines: payload.pipelines,
      });
      setApiKey("");
      if (payload.pipeline?.id) setPipelineId(payload.pipeline.id);
      setMessage(
        payload.pipelines?.length
          ? `Connected. Loaded ${payload.pipelines.length} pipeline${payload.pipelines.length === 1 ? "" : "s"} from Captivation Hub.`
          : "Connected. This location has no pipelines yet — add one in Hub Opportunities.",
      );
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not connect");
    } finally {
      setBusy(false);
    }
  }

  async function choosePipeline(nextId: string) {
    setPipelineId(nextId);
    await fetch("/api/hub", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pipelineId: nextId }),
    });
  }

  async function disconnect() {
    setBusy(true);
    await fetch("/api/hub", { method: "DELETE" });
    setStatus({ connected: false, source: "none" });
    setMessage("Disconnected. The drawing is back on sample households.");
    setBusy(false);
  }

  const envLocked = status?.source === "env";

  return (
    <div className="connect-layout">
      <ol className="connect-steps">
        <li>
          <span>01</span>
          <div>
            <h2>Open your sub-account</h2>
            <p>
              Log into Captivation Hub and click into the location that holds your life-insurance
              pipeline — not the agency overview.
            </p>
          </div>
        </li>
        <li>
          <span>02</span>
          <div>
            <h2>Copy the Location ID</h2>
            <p>
              In the browser address bar, copy the value after <code>/location/</code>. Example:{" "}
              <code>…/v2/location/ve9EPM428h8vShlRW1KT/dashboard</code> →{" "}
              <code>ve9EPM428h8vShlRW1KT</code>. You can paste the whole URL below.
            </p>
          </div>
        </li>
        <li>
          <span>03</span>
          <div>
            <h2>Create a Private Integration</h2>
            <p>
              Settings → Private Integrations → Create new Integration. Name it{" "}
              <strong>Cash Flow Blueprint</strong>. Turn on:
            </p>
            <ul>
              <li>Opportunities — View</li>
              <li>Opportunities — Edit</li>
              <li>Contacts — View</li>
            </ul>
            <p>
              Copy the token immediately. Hub will not show it again. If Private Integrations is
              missing, open Settings → Labs and enable it, or switch from agency view into the
              sub-account.
            </p>
          </div>
        </li>
        <li>
          <span>04</span>
          <div>
            <h2>Paste and test</h2>
            <p>
              We call Hub’s pipeline API. If it works, the drawing stores an httpOnly session cookie
              and starts two-way sync. We never show the token again.
            </p>
          </div>
        </li>
      </ol>

      <form className="connect-form" onSubmit={connect}>
        <p className="spec-kicker">Connection sheet</p>
        <h2>{status?.connected ? "Captivation Hub is linked" : "Connect Captivation Hub"}</h2>
        {envLocked ? (
          <p className="sync-banner">
            This deploy already has Hub credentials in the server environment. Disconnect is
            disabled until those env vars are removed.
          </p>
        ) : null}
        {status?.connected && status.locationId ? (
          <p className="spec-contact">
            Location {status.locationId}
            {status.pipeline ? ` · ${status.pipeline.name}` : ""}
          </p>
        ) : null}

        <label className="move-label">
          Private Integration token
          <input
            type="password"
            autoComplete="off"
            value={apiKey}
            onChange={(event) => setApiKey(event.target.value)}
            placeholder="pit-…"
            disabled={busy || envLocked}
            required
          />
        </label>
        <label className="move-label">
          Location ID or Hub URL
          <input
            value={locationId}
            onChange={(event) => setLocationId(event.target.value)}
            placeholder="Paste URL or id after /location/"
            disabled={busy || envLocked}
            required
          />
        </label>
        {status?.pipelines && status.pipelines.length > 1 ? (
          <label className="move-label">
            Pipeline to draw
            <select
              value={pipelineId}
              onChange={(event) => void choosePipeline(event.target.value)}
              disabled={busy}
            >
              {status.pipelines.map((pipeline) => (
                <option key={pipeline.id} value={pipeline.id}>
                  {pipeline.name}
                </option>
              ))}
            </select>
          </label>
        ) : null}

        {message ? <p className="sync-banner is-notice">{message}</p> : null}
        {status?.error ? <p className="sync-banner">{status.error}</p> : null}

        <div className="spec-actions">
          <button type="submit" className="gold-btn" disabled={busy || envLocked}>
            {status?.connected ? "Reconnect and test" : "Test connection"}
          </button>
          {status?.connected ? (
            <button
              type="button"
              className="gold-btn"
              onClick={() => router.push("/")}
              disabled={busy}
            >
              Open the drawing
            </button>
          ) : null}
          {status?.connected && !envLocked ? (
            <button type="button" className="ghost-btn" onClick={() => void disconnect()} disabled={busy}>
              Disconnect Hub
            </button>
          ) : null}
        </div>
      </form>
    </div>
  );
}

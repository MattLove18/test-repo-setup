"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { inboundWebhookUrl } from "@/lib/webhooks";

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
  const [webhookUrl, setWebhookUrl] = useState("");
  const [copied, setCopied] = useState<"webhook" | "env" | null>(null);

  useEffect(() => {
    setWebhookUrl(inboundWebhookUrl(window.location.origin));
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
          ? `Connected. Loaded ${payload.pipelines.length} pipeline${payload.pipelines.length === 1 ? "" : "s"} from Captivation Hub. Open the drawing to see live households.`
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

  async function copy(kind: "webhook" | "env", text: string) {
    await navigator.clipboard.writeText(text);
    setCopied(kind);
    window.setTimeout(() => setCopied(null), 2000);
  }

  const envLocked = status?.source === "env";
  const envSnippet = [
    "GHL_API_KEY=pit-…",
    "GHL_LOCATION_ID=your-location-id",
    "GHL_PIPELINE_ID=optional-pipeline-id",
    "GHL_WEBHOOK_SECRET=optional-shared-secret",
  ].join("\n");

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
              Paste the token only on this page — never in chat. We call Hub’s pipeline API. If it
              works, the drawing stores an httpOnly session cookie and loads your real opportunities.
            </p>
          </div>
        </li>
        <li>
          <span>05</span>
          <div>
            <h2>Keep it live</h2>
            <p>
              This browser stays connected for 180 days. Drag or Advance writes the stage back to Hub
              immediately. The drawing re-pulls Hub every 20 seconds. For always-on (every browser,
              after a new deploy), put the same token in Vercel env vars, then add a Hub workflow
              webhook to the URL on the connection sheet.
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
        {status?.pipelines && status.pipelines.length > 0 ? (
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

        <div className="keep-live">
          <p className="spec-kicker">Stay connected</p>
          <h3>How updates keep moving</h3>
          <ul>
            <li>
              <strong>Drawing → Hub:</strong> drag a card or use Advance. The stage writes back to
              Captivation Hub on that click.
            </li>
            <li>
              <strong>Hub → drawing:</strong> this page re-pulls opportunities every 20 seconds while
              the board is open. Point a Hub workflow at the webhook so Hub changes show up without
              waiting on the poll.
            </li>
            <li>
              <strong>This browser:</strong> the httpOnly session lasts 180 days. Claim this Vercel
              site first — an unclaimed temporary URL expires and the cookie dies with it.
            </li>
            <li>
              <strong>Always on:</strong> after you claim the deploy, add these in Vercel → Project →
              Settings → Environment Variables, then redeploy. That keeps Hub linked for every
              visitor without pasting the token again.
            </li>
          </ul>
          <label className="move-label">
            Hub workflow webhook
            <span className="webhook-row">
              <input readOnly value={webhookUrl} />
              <button
                type="button"
                className="ghost-btn"
                onClick={() => void copy("webhook", webhookUrl)}
                disabled={!webhookUrl}
              >
                {copied === "webhook" ? "Copied" : "Copy"}
              </button>
            </span>
          </label>
          <p className="keep-live-note">
            In Hub: Automation → Workflow → add a Webhook action on Opportunity created / updated /
            stage changed. POST to the URL above. Optional shared secret:{" "}
            <code>?secret=</code> plus <code>GHL_WEBHOOK_SECRET</code>.
          </p>
          <pre className="env-snippet">{envSnippet}</pre>
          <button
            type="button"
            className="ghost-btn"
            onClick={() => void copy("env", envSnippet)}
          >
            {copied === "env" ? "Copied env names" : "Copy env names"}
          </button>
        </div>
      </form>
    </div>
  );
}

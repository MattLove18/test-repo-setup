"use client";

import { formatCurrency, formatDays } from "@/lib/format";
import { STUCK_AFTER_DAYS } from "@/lib/architecture";
import type { OpportunityStatus, PipelineStage, Prospect } from "@/lib/types";

type Props = {
  prospect: Prospect;
  stage: PipelineStage | undefined;
  nextStage: PipelineStage | undefined;
  onClose: () => void;
  onAdvance: () => void;
  onMove: (stageId: string) => void;
  onStatus: (status: OpportunityStatus) => void;
  stages: PipelineStage[];
  saving: boolean;
};

const OWNER_LABEL: Record<string, string> = {
  advisor: "Advisor",
  prospect: "Household",
  carrier: "Carrier",
};

export function SpecSheet({
  prospect,
  stage,
  nextStage,
  onClose,
  onAdvance,
  onMove,
  onStatus,
  stages,
  saving,
}: Props) {
  return (
    <aside className="spec-sheet" aria-label={`${prospect.name} specification`}>
      <header className="spec-head">
        <div>
          <p className="spec-kicker">Sheet · Household</p>
          <h2>{prospect.name}</h2>
          <p className="spec-sub">{prospect.company || "Family / household"}</p>
        </div>
        <button type="button" className="ghost-btn" onClick={onClose}>
          Close
        </button>
      </header>

      <dl className="spec-grid">
        <div>
          <dt>Current bay</dt>
          <dd>
            {stage?.name ?? "Unassigned"}
            <span>{stage?.drawingCode}</span>
          </dd>
        </div>
        <div>
          <dt>Time in bay</dt>
          <dd className={prospect.stuck ? "warn" : undefined}>
            {formatDays(prospect.daysInStage)}
            <span>{prospect.stuck ? `More than ${STUCK_AFTER_DAYS} days in this stage` : "On schedule"}</span>
          </dd>
        </div>
        <div>
          <dt>Premium / value</dt>
          <dd>{formatCurrency(prospect.value)}</dd>
        </div>
        <div>
          <dt>Status</dt>
          <dd className="caps">{prospect.status}</dd>
        </div>
      </dl>

      <section>
        <h3>Next work to move forward</h3>
        <ol className="step-list">
          {prospect.nextSteps.map((step, index) => (
            <li key={step.id}>
              <span className="step-index">{String(index + 1).padStart(2, "0")}</span>
              <div>
                <p className="step-label">{step.label}</p>
                <p className="step-detail">{step.detail}</p>
                <p className="step-owner">{OWNER_LABEL[step.owner] ?? step.owner}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <section className="spec-actions">
        {nextStage ? (
          <button type="button" className="gold-btn" onClick={onAdvance} disabled={saving}>
            Advance to {nextStage.name}
          </button>
        ) : (
          <button type="button" className="gold-btn" onClick={() => onStatus("won")} disabled={saving}>
            Mark as client
          </button>
        )}
        <label className="move-label">
          Move to bay
          <select
            value={prospect.stageId}
            disabled={saving}
            onChange={(event) => onMove(event.target.value)}
          >
            {stages.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </select>
        </label>
      </section>

      <section>
        <h3>Contact</h3>
        <p className="spec-contact">{prospect.email || "No email on file"}</p>
        <p className="spec-contact">{prospect.phone || "No phone on file"}</p>
        {prospect.notes ? <p className="spec-notes">{prospect.notes}</p> : null}
      </section>
    </aside>
  );
}

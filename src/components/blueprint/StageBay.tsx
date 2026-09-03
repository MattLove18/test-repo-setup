"use client";

import { formatDays } from "@/lib/format";
import type { PipelineStage, Prospect } from "@/lib/types";
import { ProspectCard } from "./ProspectCard";

type Props = {
  stage: PipelineStage;
  prospects: Prospect[];
  selectedId: string | null;
  dropTarget: boolean;
  onSelect: (id: string) => void;
  onDragStart: (id: string) => void;
  onDrop: (stageId: string) => void;
  onDragEnter: (stageId: string) => void;
  onDragLeave: (stageId: string) => void;
};

export function StageBay({
  stage,
  prospects,
  selectedId,
  dropTarget,
  onSelect,
  onDragStart,
  onDrop,
  onDragEnter,
  onDragLeave,
}: Props) {
  const openCount = prospects.filter((item) => item.status === "open" || item.status === "won").length;
  return (
    <section
      className={`bay ${dropTarget ? "is-drop" : ""}`}
      onDragOver={(event) => {
        event.preventDefault();
        event.dataTransfer.dropEffect = "move";
      }}
      onDragEnter={(event) => {
        event.preventDefault();
        onDragEnter(stage.id);
      }}
      onDragLeave={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node)) {
          onDragLeave(stage.id);
        }
      }}
      onDrop={(event) => {
        event.preventDefault();
        onDrop(stage.id);
      }}
    >
      <header className="bay-head">
        <p className="bay-code">{stage.drawingCode}</p>
        <h2>{stage.architecturalName}</h2>
        <p className="bay-crm">{stage.name}</p>
        <p className="bay-count">
          {openCount} {openCount === 1 ? "household" : "households"}
        </p>
      </header>
      <p className="bay-next">Next: {stage.nextStepSummary}</p>
      <div className="bay-occupants">
        {prospects.length === 0 ? (
          <p className="bay-empty">Vacant bay — drop a household here to advance the work.</p>
        ) : (
          prospects.map((prospect) => (
            <ProspectCard
              key={prospect.id}
              prospect={prospect}
              selected={selectedId === prospect.id}
              onSelect={onSelect}
              onDragStart={onDragStart}
            />
          ))
        )}
      </div>
      {prospects.some((item) => item.stuck) ? (
        <p className="bay-revision">
          Revision cloud: {prospects.filter((item) => item.stuck).length} sitting beyond{" "}
          {formatDays(Math.max(...prospects.filter((item) => item.stuck).map((item) => item.daysInStage)))}
        </p>
      ) : null}
    </section>
  );
}

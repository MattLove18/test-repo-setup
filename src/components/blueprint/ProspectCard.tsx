"use client";

import { formatDays, initials } from "@/lib/format";
import type { Prospect } from "@/lib/types";

type Props = {
  prospect: Prospect;
  selected: boolean;
  onSelect: (id: string) => void;
  onDragStart: (id: string) => void;
};

export function ProspectCard({ prospect, selected, onSelect, onDragStart }: Props) {
  return (
    <button
      type="button"
      draggable
      onDragStart={(event) => {
        event.dataTransfer.setData("text/plain", prospect.id);
        event.dataTransfer.effectAllowed = "move";
        onDragStart(prospect.id);
      }}
      onClick={() => onSelect(prospect.id)}
      className={`occupant ${selected ? "is-selected" : ""} ${prospect.stuck ? "is-stuck" : ""}`}
      aria-pressed={selected}
    >
      <span className="occupant-mark" aria-hidden>
        {initials(prospect.name)}
      </span>
      <span className="occupant-body">
        <span className="occupant-name">{prospect.name}</span>
        <span className="occupant-meta">{prospect.company || prospect.email || "Household"}</span>
        <span className="occupant-next">{prospect.nextSteps[0]?.label ?? "Review this bay"}</span>
      </span>
      <span className="occupant-age">{formatDays(prospect.daysInStage)}</span>
    </button>
  );
}

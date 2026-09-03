export type ArchitecturalOverlay = {
  architecturalName: string;
  drawingCode: string;
  bayLabel: string;
};

const BAYS: ArchitecturalOverlay[] = [
  { architecturalName: "Site Survey", drawingCode: "A-101", bayLabel: "Inquiry" },
  { architecturalName: "Foundation", drawingCode: "A-102", bayLabel: "Discovery" },
  { architecturalName: "Schematic Design", drawingCode: "A-201", bayLabel: "Design" },
  { architecturalName: "Construction Documents", drawingCode: "A-301", bayLabel: "Application" },
  { architecturalName: "Inspection", drawingCode: "A-401", bayLabel: "Underwriting" },
  { architecturalName: "Certificate of Occupancy", drawingCode: "A-501", bayLabel: "Issued" },
  { architecturalName: "Stewardship", drawingCode: "A-601", bayLabel: "Client" },
];

export function overlayForIndex(index: number, total: number): ArchitecturalOverlay {
  if (total === BAYS.length) {
    return BAYS[index] ?? numberedBay(index);
  }
  if (index < BAYS.length) {
    return BAYS[index];
  }
  return numberedBay(index);
}

function numberedBay(index: number): ArchitecturalOverlay {
  const sheet = String(index + 101).padStart(3, "0");
  return {
    architecturalName: `Bay ${index + 1}`,
    drawingCode: `A-${sheet}`,
    bayLabel: `Stage ${index + 1}`,
  };
}

/** Cards shade yellow after sitting in the same Hub stage longer than this. */
export const STUCK_AFTER_DAYS = 10;

export function stuckThresholdForIndex(_index?: number, _total?: number): number {
  return STUCK_AFTER_DAYS;
}

export function isStuck(input: {
  daysInStage: number;
  stageIndex?: number;
  stageCount?: number;
  status: "open" | "won" | "lost" | "abandoned";
}): boolean {
  if (input.status === "lost" || input.status === "abandoned") return false;
  return input.daysInStage > STUCK_AFTER_DAYS;
}

export function daysBetween(fromIso: string | undefined, now = Date.now()): number {
  if (!fromIso) return 0;
  const then = Date.parse(fromIso);
  if (Number.isNaN(then)) return 0;
  return Math.max(0, Math.floor((now - then) / 86_400_000));
}

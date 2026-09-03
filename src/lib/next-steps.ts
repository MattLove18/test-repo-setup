import type { NextStep, PipelineStage, StepOwner } from "./types";

type Playbook = {
  test: RegExp;
  summary: string;
  steps: Array<{ label: string; owner: StepOwner; detail: string }>;
};

const PLAYBOOKS: Playbook[] = [
  {
    test: /inquir|lead|new|survey|unqualified|incoming|contacted/i,
    summary: "Book the initial cash flow conversation",
    steps: [
      {
        label: "Book the cash flow conversation",
        owner: "advisor",
        detail: "Send the scheduling link and confirm a time with both decision-makers when possible.",
      },
      {
        label: "Capture the calling, not just the numbers",
        owner: "advisor",
        detail: "Note why they reached out: family, business cash flow, tax, or a specific deal.",
      },
      {
        label: "Confirm contact details",
        owner: "prospect",
        detail: "Verify email, mobile, and whether a spouse or partner should be on the first meeting.",
      },
    ],
  },
  {
    test: /discover|foundat|conversation|consult|appoint|booked|qualified|needs/i,
    summary: "Complete discovery and gather financials",
    steps: [
      {
        label: "Run the DEFINE conversation",
        owner: "advisor",
        detail: "Map inflows, outflows, and net cash that can be captured before lifestyle spend.",
      },
      {
        label: "Collect existing coverage and statements",
        owner: "prospect",
        detail: "Request current life insurance, cash reserves, and entity structure (S-corp / LLC).",
      },
      {
        label: "Agree on the problem we are solving",
        owner: "advisor",
        detail: "Write a one-sentence purpose before any illustration is drawn.",
      },
    ],
  },
  {
    test: /design|schematic|illustrat|quote|proposal|present|recommend/i,
    summary: "Present the policy design and get a decision",
    steps: [
      {
        label: "Present the schematic illustration",
        owner: "advisor",
        detail: "Walk premium, guaranteed cash value, death benefit, and how the policy funds their purpose.",
      },
      {
        label: "Choose carrier and structure",
        owner: "prospect",
        detail: "Confirm whole-life design, premium mode, and who owns the policy (personal vs entity).",
      },
      {
        label: "Set the application date",
        owner: "advisor",
        detail: "If they want to build, schedule the application meeting while the design is still warm.",
      },
    ],
  },
  {
    test: /app(lication)?|construct|submit|paperwork|e-app|eapp|docs/i,
    summary: "Submit a clean application package",
    steps: [
      {
        label: "Complete the carrier application",
        owner: "advisor",
        detail: "eApp plus ownership, beneficiary, and billing. Double-check legal names and SSN/EIN.",
      },
      {
        label: "Schedule the paramed exam",
        owner: "prospect",
        detail: "Book labs/exam and share fasting instructions. Missed exams stall underwriting.",
      },
      {
        label: "Send supporting financials",
        owner: "prospect",
        detail: "Income verification, entity docs, and any large-case financial questionnaire.",
      },
    ],
  },
  {
    test: /underwrit|inspec|pending|medical|exam|aps|review/i,
    summary: "Clear underwriting requirements",
    steps: [
      {
        label: "Track outstanding requirements",
        owner: "advisor",
        detail: "APS, labs, financials, or addendum — chase weekly and log every carrier ask.",
      },
      {
        label: "Keep the household informed",
        owner: "advisor",
        detail: "A short weekly status note prevents radio silence from becoming a dropped case.",
      },
      {
        label: "Respond to underwriter questions",
        owner: "prospect",
        detail: "Medical history follow-ups and doctor-record authorizations as they arrive.",
      },
    ],
  },
  {
    test: /issu|deliver|in.?force|occupancy|policy|approved|placement/i,
    summary: "Deliver the policy and place it in force",
    steps: [
      {
        label: "Hold the delivery meeting",
        owner: "advisor",
        detail: "Review the as-issued contract against the design. Confirm ratings, premiums, and options.",
      },
      {
        label: "Sign delivery receipts and set billing",
        owner: "prospect",
        detail: "Execute delivery forms and establish premium from the cash-flow reservoir.",
      },
      {
        label: "Schedule the 90-day stewardship review",
        owner: "advisor",
        detail: "Put the first policy-in-force review on the calendar before they leave the meeting.",
      },
    ],
  },
  {
    test: /client|won|active|steward|nurture|retain|servic/i,
    summary: "Run annual stewardship and keep the design working",
    steps: [
      {
        label: "Annual design review",
        owner: "advisor",
        detail: "Cash value, loans, premium adequacy, and whether the original purpose still holds.",
      },
      {
        label: "Teach policy-as-capital",
        owner: "advisor",
        detail: "When they have a deal, show how to borrow against cash value without dismantling the plan.",
      },
      {
        label: "Update beneficiaries and entity docs",
        owner: "prospect",
        detail: "Life events, new companies, and family-constitution changes belong in the file.",
      },
    ],
  },
];

export function playbookForStageName(name: string): Playbook {
  const found = PLAYBOOKS.find((playbook) => playbook.test.test(name));
  if (found) return found;
  return {
    test: /.*/,
    summary: `Complete ${name} and advance`,
    steps: [
      {
        label: `Finish the ${name} requirements`,
        owner: "advisor",
        detail: "Use the CRM checklist for this stage, then move the opportunity forward.",
      },
      {
        label: "Log the next committed date",
        owner: "advisor",
        detail: "Every household in process should have a next meeting or follow-up on the calendar.",
      },
      {
        label: "Confirm the prospect knows what happens next",
        owner: "prospect",
        detail: "A one-line expectation prevents the case from going quiet.",
      },
    ],
  };
}

export function nextStepsForStage(stage: Pick<PipelineStage, "id" | "name">): NextStep[] {
  return playbookForStageName(stage.name).steps.map((step, index) => ({
    id: `${stage.id}-step-${index + 1}`,
    ...step,
  }));
}

export function summaryForStage(name: string): string {
  return playbookForStageName(name).summary;
}

export function decorateStages(
  stages: Array<{ id: string; name: string; position: number }>,
  overlay: (index: number, total: number) => {
    architecturalName: string;
    drawingCode: string;
    bayLabel: string;
  },
): PipelineStage[] {
  const sorted = [...stages].sort((a, b) => a.position - b.position);
  return sorted.map((stage, index) => {
    const art = overlay(index, sorted.length);
    return {
      ...stage,
      ...art,
      nextStepSummary: summaryForStage(stage.name),
    };
  });
}

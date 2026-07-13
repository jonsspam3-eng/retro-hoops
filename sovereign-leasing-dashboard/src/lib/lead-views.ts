import type { LeadStatus } from "@/lib/types";

export interface LeadView {
  slug: string;
  label: string;
  description: string;
  /** Undefined means every status is included. */
  statuses?: LeadStatus[];
}

export const leadViews: LeadView[] = [
  { slug: "all", label: "All leads", description: "Every inquiry across all stages." },
  {
    slug: "new-leads",
    label: "New",
    description: "Fresh and freshly imported inquiries awaiting triage.",
    statuses: ["NEW", "IMPORTED"],
  },
  {
    slug: "needs-attention",
    label: "Needs attention",
    description: "Inquiries waiting on review, a reply, or more information.",
    statuses: ["NEEDS_REVIEW", "NEEDS_REPLY", "NEEDS_MORE_INFO", "DRAFT_CREATED"],
  },
  {
    slug: "qualified",
    label: "Qualified",
    description: "Leads that passed or are close to passing qualification.",
    statuses: ["QUALIFIED", "POSSIBLY_QUALIFIED"],
  },
  {
    slug: "follow-ups",
    label: "Follow-ups",
    description: "Leads in an active follow-up cadence.",
    statuses: ["FOLLOW_UP", "FOLLOW_UP_NEEDED", "REPLIED"],
  },
  {
    slug: "showings",
    label: "Showings",
    description: "Showing and application activity.",
    statuses: ["SHOWING_REQUESTED", "APPLICATION_REQUESTED"],
  },
  {
    slug: "archived",
    label: "Archived",
    description: "Closed out or disqualified leads.",
    statuses: ["ARCHIVED", "NOT_QUALIFIED"],
  },
];

export function getLeadView(slug?: string): LeadView {
  return leadViews.find((view) => view.slug === slug) ?? leadViews[0];
}

export function countForView(view: LeadView, counts: Record<LeadStatus, number>): number {
  if (!view.statuses) {
    return Object.values(counts).reduce((sum, count) => sum + count, 0);
  }
  return view.statuses.reduce((sum, status) => sum + counts[status], 0);
}

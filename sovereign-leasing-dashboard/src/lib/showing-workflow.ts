import type { ShowingWorkflowStatus } from "@/lib/types";

const transitions: Record<ShowingWorkflowStatus, ShowingWorkflowStatus[]> = {
  NOT_REQUESTED: ["SHOWING_REQUESTED", "ARCHIVED"],
  SHOWING_REQUESTED: ["TIMES_OFFERED", "RESCHEDULE_NEEDED", "ARCHIVED"],
  TIMES_OFFERED: ["SHOWING_CONFIRMED", "RESCHEDULE_NEEDED", "ARCHIVED"],
  SHOWING_CONFIRMED: ["SHOWING_COMPLETED", "NO_SHOW", "RESCHEDULE_NEEDED", "APPLICATION_REQUESTED", "ARCHIVED"],
  SHOWING_COMPLETED: ["APPLICATION_REQUESTED", "ARCHIVED"],
  NO_SHOW: ["RESCHEDULE_NEEDED", "ARCHIVED"],
  RESCHEDULE_NEEDED: ["TIMES_OFFERED", "SHOWING_CONFIRMED", "APPLICATION_REQUESTED", "ARCHIVED"],
  APPLICATION_REQUESTED: ["RESCHEDULE_NEEDED", "ARCHIVED"],
  ARCHIVED: [],
};

export function canTransitionShowingStatus(
  from: ShowingWorkflowStatus,
  to: ShowingWorkflowStatus,
): boolean {
  return transitions[from].includes(to);
}

export function assertShowingTransition(
  from: ShowingWorkflowStatus,
  to: ShowingWorkflowStatus,
): ShowingWorkflowStatus {
  if (!canTransitionShowingStatus(from, to)) {
    throw new Error(`Invalid showing transition from ${from} to ${to}`);
  }
  return to;
}

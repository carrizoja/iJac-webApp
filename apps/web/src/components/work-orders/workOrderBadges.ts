import { WorkOrderPriority, WorkOrderStatus } from '@ijac/shared';

// Class names are spelled out in full so Tailwind's content scan keeps their rules in the build.
const STATUS_BADGE_CLASSES: Record<WorkOrderStatus, string> = {
  [WorkOrderStatus.OPEN]: 'status-open-badge',
  [WorkOrderStatus.IN_PROGRESS]: 'status-in-progress-badge',
  [WorkOrderStatus.COMPLETED]: 'status-completed-badge',
  [WorkOrderStatus.CANCELLED]: 'status-cancelled-badge',
};

const PRIORITY_BADGE_CLASSES: Record<WorkOrderPriority, string> = {
  [WorkOrderPriority.LOW]: 'priority-low-badge',
  [WorkOrderPriority.NORMAL]: 'priority-normal-badge',
  [WorkOrderPriority.HIGH]: 'priority-high-badge',
  [WorkOrderPriority.URGENT]: 'priority-urgent-badge',
};

/** Badge class carrying the status color token (`--color-status-*`). */
export function statusBadgeClass(status: WorkOrderStatus): string {
  return STATUS_BADGE_CLASSES[status];
}

/** Badge class for a priority: plain for low/normal, outlined for high, filled for urgent. */
export function priorityBadgeClass(priority: WorkOrderPriority): string {
  return PRIORITY_BADGE_CLASSES[priority];
}

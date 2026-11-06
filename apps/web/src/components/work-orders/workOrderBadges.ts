import type { WorkOrderPriority, WorkOrderStatus } from '@ijac/shared';

/** Badge class carrying the status color token (`--color-status-*`). */
export function statusBadgeClass(status: WorkOrderStatus): string {
  return `status-${status}-badge`;
}

/** Badge class carrying the priority color token (`--color-priority-*`). */
export function priorityBadgeClass(priority: WorkOrderPriority): string {
  return `priority-${priority}-badge`;
}

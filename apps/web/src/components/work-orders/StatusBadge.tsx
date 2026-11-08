import type { ReactNode } from 'react';
import { WorkOrderStatus } from '@ijac/shared';
import { Circle, CircleCheck, CirclePlay, CircleSlash, type LucideIcon } from 'lucide-react';
import { Badge } from '../ui/States';
import { cn } from '../ui/cn';
import { statusBadgeClass } from './workOrderBadges';

// One circle family: empty when open, playing while in progress, checked when done, slashed when cancelled.
const STATUS_ICONS: Record<WorkOrderStatus, LucideIcon> = {
  [WorkOrderStatus.OPEN]: Circle,
  [WorkOrderStatus.IN_PROGRESS]: CirclePlay,
  [WorkOrderStatus.COMPLETED]: CircleCheck,
  [WorkOrderStatus.CANCELLED]: CircleSlash,
};

interface StatusBadgeProps {
  status: WorkOrderStatus;
  size?: 'xs' | 'sm';
  children: ReactNode;
}

/** Work-order status badge: its color plus a shape, so status never depends on color alone. */
export function StatusBadge({ status, size = 'sm', children }: StatusBadgeProps) {
  const Icon = STATUS_ICONS[status];
  return (
    <Badge variant="tone" size={size} className={statusBadgeClass(status)}>
      <Icon
        aria-hidden="true"
        className={cn('shrink-0', size === 'xs' ? 'h-3 w-3' : 'h-3.5 w-3.5')}
      />
      {children}
    </Badge>
  );
}

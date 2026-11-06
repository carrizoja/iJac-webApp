import type { ReactNode } from 'react';
import { Button } from './Button';
import { Select } from './Form';
import { toTableSort, type TableSort } from '../../lib/tableSort';

export interface SortableHeaderProps<K extends string> {
  sortKey: K;
  sort: TableSort<K>;
  onSort: (key: K) => void;
  children: ReactNode;
}

/** Column header that sorts a table; `aria-sort` tells screen readers the current order. */
export function SortableHeader<K extends string>({
  sortKey,
  sort,
  onSort,
  children,
}: SortableHeaderProps<K>) {
  const active = sort.key === sortKey;
  const ariaSort = active ? (sort.direction === 'asc' ? 'ascending' : 'descending') : 'none';
  return (
    <th scope="col" className="px-4 py-3" aria-sort={ariaSort}>
      <button
        type="button"
        onClick={() => onSort(sortKey)}
        className="inline-flex items-center gap-1 rounded uppercase tracking-wider hover:text-fg-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
      >
        {children}
        <span aria-hidden="true" className={active ? 'text-fg-primary' : 'opacity-30'}>
          {active && sort.direction === 'desc' ? '↓' : '↑'}
        </span>
      </button>
    </th>
  );
}

export interface SortSelectProps<K extends string> {
  id: string;
  label: string;
  keys: readonly K[];
  keyLabel: (key: K) => string;
  sort: TableSort<K>;
  defaultSort: TableSort<K>;
  onChange: (sort: TableSort<K>) => void;
}

/** Sort control for views without column headers, such as cards. */
export function SortSelect<K extends string>({
  id,
  label,
  keys,
  keyLabel,
  sort,
  defaultSort,
  onChange,
}: SortSelectProps<K>) {
  return (
    <>
      <label htmlFor={id} className="sr-only">
        {label}
      </label>
      <Select
        id={id}
        value={`${sort.key}:${sort.direction}`}
        onChange={(e) => {
          const [key, direction] = e.target.value.split(':');
          onChange(toTableSort({ key, direction }, keys, defaultSort));
        }}
        className="w-full rounded-xl sm:w-60"
      >
        {keys.flatMap((key) =>
          (['asc', 'desc'] as const).map((direction) => (
            <option key={`${key}:${direction}`} value={`${key}:${direction}`}>
              {`${keyLabel(key)} ${direction === 'asc' ? '↑' : '↓'}`}
            </option>
          )),
        )}
      </Select>
    </>
  );
}

function PencilIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="h-4 w-4"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="h-4 w-4"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M3 6h18" />
      <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
      <path d="M10 11v6M14 11v6" />
    </svg>
  );
}

export interface RowActionButtonProps {
  action: 'edit' | 'delete';
  /** Accessible name, e.g. "Editar Acme". */
  label: string;
  /** Tooltip, e.g. "Editar". */
  title: string;
  onClick: () => void;
  disabled?: boolean;
}

/** Icon-only edit or delete button for a table row. */
export function RowActionButton({ action, label, title, onClick, disabled }: RowActionButtonProps) {
  return (
    <Button
      variant="ghost"
      size="sm"
      className={`h-9 w-9 rounded-lg border-2 px-0 transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] active:translate-y-0 ${
        action === 'edit' ? 'action-edit' : 'action-delete'
      }`}
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={title}
    >
      {action === 'edit' ? <PencilIcon /> : <TrashIcon />}
    </Button>
  );
}

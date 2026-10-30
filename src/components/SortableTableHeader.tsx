import React from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';

export type SortDirection = 'asc' | 'desc';

interface SortableTableHeaderProps<TField extends string> {
  field: TField;
  label: string;
  activeField: TField;
  direction: SortDirection;
  align?: 'left' | 'right' | 'center';
  defaultDirection?: SortDirection;
  onSort: (field: TField) => void;
  className?: string;
}

export function SortableTableHeader<TField extends string>({
  field,
  label,
  activeField,
  direction,
  align = 'left',
  defaultDirection = 'desc',
  onSort,
  className = '',
}: SortableTableHeaderProps<TField>) {
  const isActive = activeField === field;

  const nextActionText = !isActive
    ? `클릭하여 ${defaultDirection === 'desc' ? '내림차순(▼)' : '오름차순(▲)'} 정렬`
    : direction === defaultDirection
    ? `클릭하여 ${defaultDirection === 'desc' ? '오름차순(▲)' : '내림차순(▼)'} 전환`
    : '클릭하여 기본 정렬 순서로 해제';

  const alignClasses =
    align === 'right'
      ? 'justify-end text-right'
      : align === 'center'
      ? 'justify-center text-center'
      : 'justify-start text-left';

  return (
    <th
      aria-sort={
        !isActive ? 'none' : direction === 'asc' ? 'ascending' : 'descending'
      }
      className={`py-2.5 px-3 transition-colors select-none ${
        isActive
          ? 'bg-[#F0FDF4] dark:bg-emerald-950/35 border-b-2 border-[#2E7D5B]'
          : 'hover:bg-[#F8FAFC] dark:hover:bg-slate-800/50'
      } ${className}`}
    >
      <button
        type="button"
        onClick={() => onSort(field)}
        title={`${label} — ${nextActionText}`}
        className={`w-full inline-flex items-center gap-2 group cursor-pointer focus:outline-none ${alignClasses}`}
      >
        <span
          className={`text-xs transition-colors whitespace-nowrap ${
            isActive
              ? 'font-bold text-[#0F172A] dark:text-white'
              : 'font-medium text-[#64748B] group-hover:text-[#0F172A] dark:group-hover:text-slate-200'
          }`}
        >
          {label}
        </span>

        {/* 직관적인 상/하 듀얼 화살표 정렬 버튼 캡슐 */}
        <span
          className={`inline-flex flex-col items-center justify-center w-5 h-5 rounded-md border transition-all shrink-0 ${
            isActive
              ? 'bg-[#2E7D5B] border-[#2E7D5B] text-white shadow-2xs'
              : 'bg-white dark:bg-slate-800 border-[#CBD5E1] dark:border-slate-700 text-[#94A3B8] group-hover:border-[#2E7D5B] group-hover:text-[#2E7D5B]'
          }`}
        >
          <ChevronUp
            className={`w-3 h-3 -mb-1 transition-opacity ${
              isActive
                ? direction === 'asc'
                  ? 'opacity-100 stroke-[2.6]'
                  : 'opacity-30'
                : 'opacity-70 group-hover:opacity-100'
            }`}
          />
          <ChevronDown
            className={`w-3 h-3 -mt-1 transition-opacity ${
              isActive
                ? direction === 'desc'
                  ? 'opacity-100 stroke-[2.6]'
                  : 'opacity-30'
                : 'opacity-70 group-hover:opacity-100'
            }`}
          />
        </span>
      </button>
    </th>
  );
}

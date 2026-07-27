import React from 'react';
import type { PatientStatus } from '../types';

interface Props {
  status: PatientStatus;
  size?: 'sm' | 'md' | 'lg';
}

export const STATUS_CONFIG: Record<
  PatientStatus,
  { label: string; bg: string; text: string; border: string; dotBg: string }
> = {
  new: {
    label: '新規登録',
    bg: 'bg-blue-50',
    text: 'text-blue-700',
    border: 'border-blue-200',
    dotBg: 'bg-blue-500',
  },
  observing: {
    label: '経過観察中',
    bg: 'bg-indigo-50',
    text: 'text-indigo-700',
    border: 'border-indigo-200',
    dotBg: 'bg-indigo-500',
  },
  waiting_doctor: {
    label: 'ドクター回答待ち',
    bg: 'bg-amber-50',
    text: 'text-amber-800',
    border: 'border-amber-300',
    dotBg: 'bg-amber-500',
  },
  waiting_staff: {
    label: 'スタッフ確認待ち',
    bg: 'bg-purple-50',
    text: 'text-purple-700',
    border: 'border-purple-200',
    dotBg: 'bg-purple-500',
  },
  in_progress: {
    label: '対応中',
    bg: 'bg-sky-50',
    text: 'text-sky-700',
    border: 'border-sky-200',
    dotBg: 'bg-sky-500',
  },
  completed: {
    label: '対応完了',
    bg: 'bg-emerald-50',
    text: 'text-emerald-700',
    border: 'border-emerald-200',
    dotBg: 'bg-emerald-500',
  },
  archived: {
    label: 'アーカイブ',
    bg: 'bg-gray-100',
    text: 'text-gray-600',
    border: 'border-gray-300',
    dotBg: 'bg-gray-400',
  },
};

export const StatusBadge: React.FC<Props> = ({ status, size = 'md' }) => {
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.new;
  const sizeClasses =
    size === 'sm'
      ? 'px-2 py-0.5 text-xs font-medium'
      : size === 'lg'
      ? 'px-3 py-1.5 text-sm font-semibold'
      : 'px-2.5 py-1 text-xs font-semibold';

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border ${config.bg} ${config.text} ${config.border} ${sizeClasses}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${config.dotBg}`} />
      {config.label}
    </span>
  );
};

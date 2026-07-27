import React from 'react';
import type { PriorityLevel } from '../types';

interface Props {
  priority: PriorityLevel;
}

export const PriorityBadge: React.FC<Props> = ({ priority }) => {
  switch (priority) {
    case 'important':
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold bg-red-100 text-red-800 border border-red-200">
          重要
        </span>
      );
    case 'soon':
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-orange-100 text-orange-800 border border-orange-200">
          早めに確認
        </span>
      );
    case 'normal':
    default:
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-normal bg-slate-100 text-slate-600 border border-slate-200">
          通常
        </span>
      );
  }
};

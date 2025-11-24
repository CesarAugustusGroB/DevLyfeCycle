import React from 'react';
import { LifecycleState } from '../types';

const getStateColor = (state: LifecycleState): string => {
  switch (state) {
    case 'CREATING':
      return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
    case 'FIX/POLISH':
      return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
    case 'EXPANDING':
      return 'bg-purple-500/10 text-purple-400 border-purple-500/20';
    case 'STABLE':
      return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
    default:
      return 'bg-gray-500/10 text-gray-400 border-gray-500/20';
  }
};

const getStateLabel = (state: LifecycleState): string => {
  return state;
};

interface StatusBadgeProps {
  state: LifecycleState;
  onClick?: () => void;
  className?: string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ state, onClick, className = '' }) => {
  return (
    <span
      onClick={onClick}
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStateColor(state)} ${className} ${onClick ? 'cursor-pointer hover:opacity-80 transition-opacity' : ''}`}
    >
      {getStateLabel(state)}
    </span>
  );
};
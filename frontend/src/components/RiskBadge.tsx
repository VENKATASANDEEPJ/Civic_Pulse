import React from 'react';

interface RiskBadgeProps {
  level: string;
  score?: number;
  size?: 'sm' | 'md' | 'lg';
}

export const RiskBadge: React.FC<RiskBadgeProps> = ({ level, score, size = 'md' }) => {
  let colorClasses = 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30';
  
  if (level === 'CRITICAL') {
    colorClasses = 'bg-rose-500/20 text-rose-400 border-rose-500/40 animate-pulse';
  } else if (level === 'HIGH') {
    colorClasses = 'bg-amber-500/20 text-amber-400 border-amber-500/40';
  } else if (level === 'WATCH') {
    colorClasses = 'bg-yellow-500/15 text-yellow-300 border-yellow-500/30';
  }

  const sizeClasses = {
    sm: 'px-2 py-0.5 text-xs font-semibold',
    md: 'px-2.5 py-1 text-xs font-bold',
    lg: 'px-3.5 py-1.5 text-sm font-black',
  }[size];

  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border ${colorClasses} ${sizeClasses}`}>
      <span className="h-1.5 w-1.5 rounded-full bg-current"></span>
      {level} {score !== undefined && `(${score.toFixed(0)})`}
    </span>
  );
};

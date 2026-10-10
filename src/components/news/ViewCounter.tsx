import React from 'react';
import { Eye } from 'lucide-react';

interface ViewCounterProps {
  views: number;
  className?: string;
}

export const ViewCounter: React.FC<ViewCounterProps> = ({ views, className = '' }) => {
  return (
    <span
      className={`flex items-center gap-1.5 text-[9px] md:text-[10px] text-gray-400 font-black uppercase tracking-[0.15em] md:tracking-[0.2em] ${className}`}
      title={`${views} visualizações`}
    >
      <Eye className="text-[#0056a4] w-3 h-3" />
      <span>{views}</span>
    </span>
  );
};

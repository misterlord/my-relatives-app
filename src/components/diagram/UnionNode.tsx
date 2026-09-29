'use client';

import React, { memo } from 'react';
import { Handle, Position } from '@xyflow/react';

export interface UnionNodeData extends Record<string, unknown> {
  id: string;
  rawUnionId?: string;
  label?: string;
  childCount?: number;
  isCollapsed?: boolean;
  onToggleCollapse?: (rawUnionId: string) => void;
}

const UnionNodeComponent = ({ data }: { data: UnionNodeData }) => {
  const childCount = data.childCount || 0;
  const isCollapsed = Boolean(data.isCollapsed);

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (childCount > 0 && data.rawUnionId && data.onToggleCollapse) {
      data.onToggleCollapse(data.rawUnionId);
    }
  };

  return (
    <div
      onClick={handleClick}
      className={`group relative flex items-center justify-center rounded-full transition-all duration-200 shadow-md ${
        childCount > 0 ? 'cursor-pointer hover:scale-125' : 'cursor-default'
      } ${
        isCollapsed
          ? 'h-8.5 w-8.5 bg-amber-500/30 border-2 border-amber-400 text-amber-300 ring-4 ring-amber-500/40 animate-pulse'
          : 'h-7 w-7 bg-rose-500/20 border-2 border-rose-500 text-rose-400 hover:border-rose-400'
      }`}
      title={
        childCount > 0
          ? isCollapsed
            ? `คลิกเพื่อแสดงสายบุตรหลาน (${childCount} คน)`
            : `คลิกเพื่อซ่อนสายบุตรหลาน (${childCount} คน)`
          : 'เส้นแต่งงาน / จุดเชื่อมสมรส'
      }
    >
      <Handle
        type="target"
        position={Position.Top}
        className="!h-2 !w-2 !border-0 !bg-rose-500"
      />

      <span className="text-[12px] leading-none select-none">💍</span>

      {/* Collapse/Expand Child Count Badge */}
      {childCount > 0 && (
        <div
          className={`absolute -bottom-2 -right-2 flex h-4.5 min-w-[18px] items-center justify-center rounded-full px-1 text-[9px] font-extrabold shadow-lg border transition-all ${
            isCollapsed
              ? 'bg-amber-400 text-slate-950 border-amber-200 ring-2 ring-amber-500/50'
              : 'bg-indigo-600 text-white border-indigo-400 group-hover:bg-rose-600'
          }`}
        >
          {isCollapsed ? `+${childCount}` : '−'}
        </div>
      )}

      <Handle
        type="source"
        position={Position.Bottom}
        className="!h-2.5 !w-2.5 !border-1 !border-slate-900 !bg-indigo-500"
      />
    </div>
  );
};

export const UnionNode = memo(UnionNodeComponent);

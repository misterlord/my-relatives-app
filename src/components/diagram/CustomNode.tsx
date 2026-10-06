'use client';

import React, { memo } from 'react';
import { Handle, Position } from '@xyflow/react';
import { Image as ImageIcon, FileText, User, Calendar } from 'lucide-react';
import { calculateAge, formatDateBE } from '@/lib/utils';
import { LayoutMode } from './NodeDiagram';

export interface PersonNodeData extends Record<string, unknown> {
  id: string;
  name: string;
  gender: string; // 'MALE' | 'FEMALE' | 'OTHER'
  description?: string | null;
  birthDate?: string | null;
  images?: { id: string; url: string }[];
  isCompact?: boolean;
  layoutMode?: LayoutMode;
  theme?: 'dark' | 'light';
  onNodeClick?: (id: string) => void;
}

const CustomPersonNodeComponent = ({
  data,
  selected,
}: {
  data: PersonNodeData;
  selected?: boolean;
}) => {
  const isLight = data.theme === 'light';
  const imageCount = data.images?.length || 0;
  const isMale = data.gender === 'MALE';
  const isFemale = data.gender === 'FEMALE';

  // Age & Birth Date calculation
  const age = calculateAge(data.birthDate);
  const formattedBirthDate = formatDateBE(data.birthDate);

  // Theme-aware Gender styling (Male: Blue border, Female: Emerald/Green border)
  const genderBg = isMale
    ? isLight
      ? 'border-blue-500 bg-white hover:border-blue-600 text-slate-800 shadow-md'
      : 'border-blue-500 bg-slate-900/90 hover:border-blue-400 text-slate-100'
    : isFemale
    ? isLight
      ? 'border-emerald-500 bg-white hover:border-emerald-600 text-slate-800 shadow-md'
      : 'border-emerald-500 bg-slate-900/90 hover:border-emerald-400 text-slate-100'
    : isLight
    ? 'border-purple-400 bg-white hover:border-purple-500 text-slate-800 shadow-md'
    : 'border-purple-500/80 bg-slate-900/90 hover:border-purple-400 text-slate-100';

  const badgeColor = isMale
    ? isLight
      ? 'bg-blue-50 text-blue-700 border-blue-200'
      : 'bg-blue-500/10 text-blue-400 border-blue-500/30'
    : isFemale
    ? isLight
      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
      : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
    : isLight
    ? 'bg-purple-50 text-purple-700 border-purple-200'
    : 'bg-purple-500/10 text-purple-400 border-purple-500/30';

  const genderText = isMale ? 'ชาย ♂' : isFemale ? 'หญิง ♀' : 'ไม่ระบุ';
  const genderWithAge = age !== null ? `${genderText} (${age} ปี)` : genderText;
  const avatarImage = data.images && data.images.length > 0 ? data.images[0].url : null;

  // COMPACT VIEW RENDER
  if (data.isCompact) {
    return (
      <div
        onClick={() => data.onNodeClick?.(data.id)}
        className={`group relative flex items-center gap-2.5 min-w-[170px] max-w-[210px] cursor-pointer rounded-xl border-2 p-2.5 transition-all duration-200 shadow-lg ${genderBg} ${
          selected ? 'ring-4 ring-indigo-500/50 scale-105 shadow-2xl' : ''
        }`}
      >
        <Handle
          type="target"
          id="top-target"
          position={Position.Top}
          className={`!h-2.5 !w-2.5 !border-2 ${
            isLight ? '!border-white !bg-indigo-600' : '!border-slate-900 !bg-indigo-500'
          }`}
        />
        <Handle
          type="source"
          id="top-source"
          position={Position.Top}
          className="!h-2.5 !w-2.5 !border-2 !border-white !bg-rose-500 !opacity-0 group-hover:!opacity-100"
        />

        <Handle
          type="source"
          id="right-source"
          position={Position.Right}
          className="!h-2.5 !w-2.5 !border-2 !border-slate-900 !bg-rose-500"
        />
        <Handle
          type="target"
          id="right-target"
          position={Position.Right}
          className="!h-2.5 !w-2.5 !border-2 !border-slate-900 !bg-indigo-500 !opacity-0 group-hover:!opacity-100"
        />

        <Handle
          type="source"
          id="left-source"
          position={Position.Left}
          className="!h-2.5 !w-2.5 !border-2 !border-slate-900 !bg-rose-500"
        />
        <Handle
          type="target"
          id="left-target"
          position={Position.Left}
          className="!h-2.5 !w-2.5 !border-2 !border-slate-900 !bg-indigo-500 !opacity-0 group-hover:!opacity-100"
        />

        <Handle
          type="source"
          id="bottom-source"
          position={Position.Bottom}
          className="!h-2.5 !w-2.5 !border-2 !border-slate-900 !bg-indigo-500"
        />
        <Handle
          type="target"
          id="bottom-target"
          position={Position.Bottom}
          className="!h-2.5 !w-2.5 !border-2 !border-slate-900 !bg-rose-500 !opacity-0 group-hover:!opacity-100"
        />

        {/* Avatar */}
        {avatarImage ? (
          <img
            src={avatarImage}
            alt={data.name}
            className={`h-9 w-9 shrink-0 rounded-lg object-cover border ${
              isLight ? 'border-slate-200' : 'border-slate-700'
            }`}
          />
        ) : (
          <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border ${badgeColor}`}>
            <User className="h-5 w-5" />
          </div>
        )}

        <div className="overflow-hidden">
          <h3
            className={`truncate font-bold text-xs ${isLight ? 'text-slate-900' : 'text-slate-100'}`}
            title={data.name}
          >
            {data.name}
          </h3>
          <span className={`inline-block rounded px-1 py-0.2 text-[9px] font-semibold border mt-0.5 ${badgeColor}`}>
            {genderWithAge}
          </span>
        </div>
      </div>
    );
  }

  // FULL VIEW RENDER
  return (
    <div
      onClick={() => data.onNodeClick?.(data.id)}
      className={`group relative min-w-[220px] max-w-[270px] cursor-pointer rounded-2xl border-2 p-4 transition-all duration-200 shadow-xl ${genderBg} ${
        selected ? 'ring-4 ring-indigo-500/50 scale-105 shadow-2xl' : ''
      }`}
    >
      <Handle
        type="target"
        id="top-target"
        position={Position.Top}
        className={`!h-3 !w-3 !border-2 ${
          isLight ? '!border-white !bg-indigo-600' : '!border-slate-900 !bg-indigo-500'
        }`}
      />
      <Handle
        type="source"
        id="top-source"
        position={Position.Top}
        className="!h-3 !w-3 !border-2 !border-slate-900 !bg-rose-500 !opacity-0 group-hover:!opacity-100"
      />

      <Handle
        type="source"
        id="right-source"
        position={Position.Right}
        className="!h-3 !w-3 !border-2 !border-slate-900 !bg-rose-500"
      />
      <Handle
        type="target"
        id="right-target"
        position={Position.Right}
        className="!h-3 !w-3 !border-2 !border-slate-900 !bg-indigo-500 !opacity-0 group-hover:!opacity-100"
      />

      <Handle
        type="source"
        id="left-source"
        position={Position.Left}
        className="!h-3 !w-3 !border-2 !border-slate-900 !bg-rose-500"
      />
      <Handle
        type="target"
        id="left-target"
        position={Position.Left}
        className="!h-3 !w-3 !border-2 !border-slate-900 !bg-indigo-500 !opacity-0 group-hover:!opacity-100"
      />

      {/* Person Header */}
      <div className="flex items-start justify-between gap-2.5 mb-2">
        <div className="flex items-center gap-2.5 overflow-hidden">
          {avatarImage ? (
            <img
              src={avatarImage}
              alt={data.name}
              className={`h-10 w-10 shrink-0 rounded-xl object-cover border shadow ${
                isLight ? 'border-slate-200' : 'border-slate-700'
              }`}
            />
          ) : (
            <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border ${badgeColor}`}>
              <User className="h-5 w-5" />
            </div>
          )}
          <div className="overflow-hidden">
            <h3
              className={`truncate font-bold text-sm ${isLight ? 'text-slate-900' : 'text-slate-100'}`}
              title={data.name}
            >
              {data.name}
            </h3>
            <span className={`inline-block rounded-md px-2 py-0.5 text-[10px] font-semibold border ${badgeColor}`}>
              {genderWithAge}
            </span>
          </div>
        </div>
      </div>

      {/* Birth Date */}
      {formattedBirthDate && (
        <div
          className={`flex items-center gap-1.5 text-xs font-medium mb-2 px-2 py-1 rounded-md border ${
            isLight
              ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
              : 'bg-indigo-950/40 text-indigo-300 border-indigo-900/40'
          }`}
        >
          <Calendar className="h-3.5 w-3.5 text-indigo-500" />
          <span className="text-[11px]">เกิด: {formattedBirthDate}</span>
        </div>
      )}

      {/* Description Snippet */}
      {data.description ? (
        <p
          className={`line-clamp-2 text-xs mb-3 leading-relaxed ${
            isLight ? 'text-slate-600' : 'text-slate-400'
          }`}
        >
          {data.description}
        </p>
      ) : (
        <p className={`text-xs italic mb-3 ${isLight ? 'text-slate-400' : 'text-slate-500'}`}>
          ไม่มีข้อมูลประวัติ
        </p>
      )}

      {/* Footer */}
      <div
        className={`flex items-center justify-between pt-2 border-t text-xs ${
          isLight ? 'border-slate-200 text-slate-500' : 'border-slate-800 text-slate-400'
        }`}
      >
        <div className="flex items-center gap-1">
          <FileText className={`h-3.5 w-3.5 ${isLight ? 'text-slate-400' : 'text-slate-500'}`} />
          <span className="text-[11px]">คลิกดูประวัติ</span>
        </div>

        {imageCount > 0 ? (
          <div
            className={`flex items-center gap-1 rounded-md px-2 py-0.5 font-medium text-[11px] border ${
              isLight
                ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
                : 'bg-indigo-950/80 text-indigo-300 border-indigo-800/40'
            }`}
          >
            <ImageIcon className="h-3 w-3" />
            <span>{imageCount}/3 รูป</span>
          </div>
        ) : (
          <span className="text-[11px] text-slate-400">0/3 รูป</span>
        )}
      </div>

      <Handle
        type="source"
        id="bottom-source"
        position={Position.Bottom}
        className="!h-3 !w-3 !border-2 !border-slate-900 !bg-indigo-500"
      />
      <Handle
        type="target"
        id="bottom-target"
        position={Position.Bottom}
        className="!h-3 !w-3 !border-2 !border-slate-900 !bg-rose-500 !opacity-0 group-hover:!opacity-100"
      />
    </div>
  );
};

export const CustomNode = memo(CustomPersonNodeComponent);

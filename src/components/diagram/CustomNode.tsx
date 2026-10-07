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
  isDeceased?: boolean;
  childrenCount?: number;
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
  const isDeceased = Boolean(data.isDeceased);

  // Age & Birth Date calculation
  const age = calculateAge(data.birthDate);
  const formattedBirthDate = formatDateBE(data.birthDate);

  // Border-only Gender & Status styling (No status background tint):
  // - Neutral Card Background: White in Light mode (bg-white), Dark Slate in Dark mode (bg-slate-900)
  // - Status Border Colors: Blue border for Male, Pink border for Female, Gray/Border for Deceased
  const genderBg = isDeceased
    ? isLight
      ? isMale
        ? 'border-blue-400 bg-white text-slate-800 shadow-sm hover:border-blue-500'
        : isFemale
        ? 'border-pink-400 bg-white text-slate-800 shadow-sm hover:border-pink-500'
        : 'border-slate-400 bg-white text-slate-800 shadow-sm hover:border-slate-500'
      : isMale
      ? 'border-blue-400/80 bg-slate-900 text-slate-200 shadow-md hover:border-blue-300'
      : isFemale
      ? 'border-pink-400/80 bg-slate-900 text-slate-200 shadow-md hover:border-pink-300'
      : 'border-slate-500 bg-slate-900 text-slate-200 shadow-md hover:border-slate-400'
    : isMale
    ? isLight
      ? 'border-blue-500 bg-white text-slate-900 shadow-md hover:border-blue-600'
      : 'border-blue-400 bg-slate-900 text-slate-100 shadow-lg hover:border-blue-300'
    : isFemale
    ? isLight
      ? 'border-pink-500 bg-white text-slate-900 shadow-md hover:border-pink-600'
      : 'border-pink-400 bg-slate-900 text-slate-100 shadow-lg hover:border-pink-300'
    : isLight
    ? 'border-purple-500 bg-white text-slate-900 shadow-md hover:border-purple-600'
    : 'border-purple-400 bg-slate-900 text-slate-100 shadow-lg hover:border-purple-300';

  const badgeColor = isDeceased
    ? isLight
      ? 'bg-slate-100 text-slate-700 border-slate-300'
      : 'bg-slate-800 text-slate-300 border-slate-700'
    : isMale
    ? isLight
      ? 'bg-blue-50 text-blue-800 border-blue-200 font-semibold'
      : 'bg-blue-950/60 text-blue-300 border-blue-800 font-semibold'
    : isFemale
    ? isLight
      ? 'bg-pink-50 text-pink-800 border-pink-200 font-semibold'
      : 'bg-pink-950/60 text-pink-300 border-pink-800 font-semibold'
    : isLight
    ? 'bg-purple-50 text-purple-800 border-purple-200 font-semibold'
    : 'bg-purple-950/60 text-purple-300 border-purple-800 font-semibold';

  const subBadgeColor = isLight
    ? 'bg-slate-50 text-slate-700 border-slate-200'
    : 'bg-slate-800/60 text-slate-300 border-slate-700';

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

        {/* Avatar with Deceased Red Cross Overlay */}
        <div className="relative shrink-0">
          {avatarImage ? (
            <img
              src={avatarImage}
              alt={data.name}
              className={`h-9 w-9 shrink-0 rounded-lg object-cover border ${
                isDeceased ? 'filter grayscale opacity-75' : ''
              } ${isLight ? 'border-slate-200' : 'border-slate-700'}`}
            />
          ) : (
            <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border ${badgeColor}`}>
              <User className="h-5 w-5" />
            </div>
          )}
          {isDeceased && (
            <div className="absolute inset-0 flex items-center justify-center rounded-lg bg-black/40 backdrop-blur-[0.5px]">
              <span className="text-rose-500 font-extrabold text-base leading-none select-none drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
                ❌
              </span>
            </div>
          )}
        </div>

        <div className="overflow-hidden">
          <h3
            className={`truncate font-bold text-xs ${isLight ? 'text-slate-900' : 'text-slate-100'}`}
            title={data.name}
          >
            {data.name}
          </h3>
          <div className="flex items-center gap-1 flex-wrap mt-0.5">
            {age !== null && (
              <span className={`inline-block rounded px-1 py-0.2 text-[9px] font-semibold border ${badgeColor}`}>
                {age} ปี
              </span>
            )}
            {data.childrenCount !== undefined && data.childrenCount > 0 && (
              <span className={`inline-block rounded px-1 py-0.2 text-[9px] font-semibold border ${isLight ? 'bg-amber-50 text-amber-800 border-amber-200' : 'bg-amber-950/60 text-amber-300 border-amber-800'}`}>
                👶 {data.childrenCount}
              </span>
            )}
          </div>
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
          {/* Avatar with Deceased Red Cross Overlay */}
          <div className="relative shrink-0">
            {avatarImage ? (
              <img
                src={avatarImage}
                alt={data.name}
                className={`h-10 w-10 shrink-0 rounded-xl object-cover border shadow ${
                  isDeceased ? 'filter grayscale opacity-75' : ''
                } ${isLight ? 'border-slate-200' : 'border-slate-700'}`}
              />
            ) : (
              <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border ${badgeColor}`}>
                <User className="h-5 w-5" />
              </div>
            )}
            {isDeceased && (
              <div className="absolute inset-0 flex items-center justify-center rounded-xl bg-black/40 backdrop-blur-[0.5px]">
                <span className="text-rose-500 font-extrabold text-xl leading-none select-none drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
                  ❌
                </span>
              </div>
            )}
          </div>
          <div className="overflow-hidden">
            <h3
              className={`truncate font-bold text-sm ${isLight ? 'text-slate-900' : 'text-slate-100'}`}
              title={data.name}
            >
              {data.name}
            </h3>
            <div className="flex items-center gap-1 flex-wrap mt-0.5">
              {age !== null && (
                <span className={`inline-block rounded-md px-2 py-0.5 text-[10px] font-semibold border ${badgeColor}`}>
                  อายุ {age} ปี
                </span>
              )}
              {data.childrenCount !== undefined && data.childrenCount > 0 && (
                <span className={`inline-block rounded-md px-1.5 py-0.5 text-[10px] font-semibold border ${isLight ? 'bg-amber-50 text-amber-800 border-amber-200' : 'bg-amber-950/60 text-amber-300 border-amber-800'}`}>
                  👶 บุตร {data.childrenCount} คน
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Birth Date */}
      {formattedBirthDate && (
        <div className={`flex items-center gap-1.5 text-xs font-medium mb-2 px-2 py-1 rounded-md border ${subBadgeColor}`}>
          <Calendar className="h-3.5 w-3.5 opacity-80" />
          <span className="text-[11px]">เกิด: {formattedBirthDate}</span>
        </div>
      )}

      {/* Description Snippet */}
      {data.description ? (
        <p
          className={`line-clamp-2 text-xs mb-3 leading-relaxed ${
            isLight ? 'text-slate-700' : 'text-slate-300'
          }`}
        >
          {data.description}
        </p>
      ) : (
        <p className={`text-xs italic mb-3 ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
          ไม่มีข้อมูลประวัติ
        </p>
      )}

      {/* Footer */}
      <div
        className={`flex items-center justify-between pt-2 border-t text-xs ${
          isLight ? 'border-slate-300/60 text-slate-600' : 'border-slate-700/60 text-slate-300'
        }`}
      >
        <div className="flex items-center gap-1">
          <FileText className={`h-3.5 w-3.5 ${isLight ? 'text-slate-500' : 'text-slate-400'}`} />
          <span className="text-[11px]">คลิกดูประวัติ</span>
        </div>

        {imageCount > 0 ? (
          <div className={`flex items-center gap-1 rounded-md px-2 py-0.5 font-medium text-[11px] border ${subBadgeColor}`}>
            <ImageIcon className="h-3 w-3 opacity-80" />
            <span>{imageCount}/3 รูป</span>
          </div>
        ) : (
          <span className="text-[11px] opacity-60">0/3 รูป</span>
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

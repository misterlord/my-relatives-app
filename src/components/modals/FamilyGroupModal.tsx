'use client';

import React, { useState } from 'react';
import { X, Users, Plus, Edit2, Trash2, Check, AlertCircle, Sparkles } from 'lucide-react';

export interface FamilyGroup {
  id: string;
  name: string;
  description?: string | null;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
  _count?: {
    persons: number;
  };
}

interface FamilyGroupModalProps {
  isOpen: boolean;
  theme?: 'dark' | 'light';
  groups: FamilyGroup[];
  activeGroupId: string | null;
  onClose: () => void;
  onSelectGroup: (groupId: string) => void;
  onRefreshGroups: () => void;
}

export function FamilyGroupModal({
  isOpen,
  theme = 'dark',
  groups,
  activeGroupId,
  onClose,
  onSelectGroup,
  onRefreshGroups,
}: FamilyGroupModalProps) {
  const isLight = theme === 'light';

  // State for creating new group
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupDesc, setNewGroupDesc] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  // State for editing group
  const [editingGroupId, setEditingGroupId] = useState<string | null>(null);
  const [editGroupName, setEditGroupName] = useState('');
  const [editGroupDesc, setEditGroupDesc] = useState('');

  // General error/loading state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  // Create new group
  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGroupName.trim()) {
      setError('กรุณาระบุชื่อกลุ่มเครือญาติ');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/groups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newGroupName.trim(),
          description: newGroupDesc.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setNewGroupName('');
        setNewGroupDesc('');
        setIsCreating(false);
        onRefreshGroups();
        if (data.group?.id) {
          onSelectGroup(data.group.id);
        }
      } else {
        setError(data.error || 'ไม่สามารถสร้างกลุ่มเครือญาติได้');
      }
    } catch {
      setError('เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์');
    } finally {
      setLoading(false);
    }
  };

  // Start edit group
  const handleStartEdit = (group: FamilyGroup) => {
    setEditingGroupId(group.id);
    setEditGroupName(group.name);
    setEditGroupDesc(group.description || '');
    setError(null);
  };

  // Save edited group
  const handleSaveEdit = async (groupId: string) => {
    if (!editGroupName.trim()) {
      setError('ชื่อกลุ่มเครือญาติห้ามเป็นค่าว่าง');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/groups/${groupId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editGroupName.trim(),
          description: editGroupDesc.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setEditingGroupId(null);
        onRefreshGroups();
      } else {
        setError(data.error || 'ไม่สามารถแก้ไขข้อมูลกลุ่มได้');
      }
    } catch {
      setError('เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์');
    } finally {
      setLoading(false);
    }
  };

  // Delete group
  const handleDeleteGroup = async (group: FamilyGroup) => {
    if (groups.length <= 1) {
      setError('ไม่สามารถลบได้ เนื่องจากต้องมีอย่างน้อย 1 กลุ่มในระบบ');
      return;
    }

    if (
      !confirm(
        `คุณต้องการลบกลุ่มเครือญาติ "${group.name}" ใช่หรือไม่?\n(สมาชิกในกลุ่มนี้จะคงอยู่แต่จะถูกปลดออกจากกลุ่ม)`
      )
    ) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/groups/${group.id}`, {
        method: 'DELETE',
      });

      const data = await res.json();
      if (res.ok) {
        onRefreshGroups();
        // If deleted group was active, select another remaining group
        if (activeGroupId === group.id) {
          const remainingGroup = groups.find((g) => g.id !== group.id);
          if (remainingGroup) {
            onSelectGroup(remainingGroup.id);
          }
        }
      } else {
        setError(data.error || 'ไม่สามารถลบกลุ่มเครือญาติได้');
      }
    } catch {
      setError('เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div
        className={`relative w-full max-w-2xl rounded-2xl border shadow-2xl overflow-hidden flex flex-col max-h-[85vh] ${
          isLight ? 'bg-white border-slate-200 text-slate-800' : 'bg-slate-900 border-slate-800 text-slate-100'
        }`}
      >
        {/* Header */}
        <div
          className={`flex items-center justify-between border-b px-6 py-4 shrink-0 ${
            isLight ? 'border-slate-200 bg-slate-50' : 'border-slate-800 bg-slate-950/60'
          }`}
        >
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600/20 border border-indigo-500/30 text-indigo-500 font-bold">
              <Users className="h-5 w-5" />
            </div>
            <div>
              <h2 className="font-bold text-base leading-tight">จัดการกลุ่มเครือญาติ (Family Groups)</h2>
              <p className={`text-xs ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                สร้าง แก้ไข และสลับกลุ่มเครือญาติเพื่อแยกผังออกจากกันโดยอิสระ
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className={`rounded-lg p-2 transition-colors ${
              isLight
                ? 'text-slate-500 hover:bg-slate-200 hover:text-slate-900'
                : 'text-slate-400 hover:bg-slate-800 hover:text-slate-100'
            }`}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {error && (
            <div className="flex items-center gap-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20 p-4 text-sm text-rose-500">
              <AlertCircle className="h-5 w-5 shrink-0 text-rose-500" />
              <span>{error}</span>
            </div>
          )}

          {/* Group Creation Form / Toggle Button */}
          {!isCreating ? (
            <button
              onClick={() => {
                setIsCreating(true);
                setError(null);
              }}
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-indigo-500/40 p-3.5 text-xs font-semibold text-indigo-500 hover:bg-indigo-500/10 transition-all"
            >
              <Plus className="h-4 w-4" />
              <span>เพิ่มกลุ่มเครือญาติใหม่</span>
            </button>
          ) : (
            <form
              onSubmit={handleCreateGroup}
              className={`rounded-2xl border p-4 space-y-3.5 ${
                isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-950/60 border-slate-800'
              }`}
            >
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-indigo-500 uppercase tracking-wider">
                  สร้างกลุ่มเครือญาติใหม่
                </h3>
                <button
                  type="button"
                  onClick={() => setIsCreating(false)}
                  className="text-slate-400 hover:text-slate-600 text-xs"
                >
                  ยกเลิก
                </button>
              </div>

              <div>
                <label className={`block text-xs font-medium mb-1 ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>
                  ชื่อกลุ่มเครือญาติ <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="ตัวอย่าง: ตระกูลวงศ์สว่าง"
                  value={newGroupName}
                  onChange={(e) => setNewGroupName(e.target.value)}
                  className={`w-full rounded-xl border px-3.5 py-2 text-xs focus:border-indigo-500 focus:outline-none ${
                    isLight
                      ? 'bg-white border-slate-300 text-slate-800 placeholder-slate-400'
                      : 'bg-slate-900 border-slate-700 text-slate-100 placeholder-slate-500'
                  }`}
                />
              </div>

              <div>
                <label className={`block text-xs font-medium mb-1 ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>
                  คำอธิบายเพิ่มเติม
                </label>
                <input
                  type="text"
                  placeholder="ตัวอย่าง: สายสัมพันธ์ฝั่งคุณพ่อ"
                  value={newGroupDesc}
                  onChange={(e) => setNewGroupDesc(e.target.value)}
                  className={`w-full rounded-xl border px-3.5 py-2 text-xs focus:border-indigo-500 focus:outline-none ${
                    isLight
                      ? 'bg-white border-slate-300 text-slate-800 placeholder-slate-400'
                      : 'bg-slate-900 border-slate-700 text-slate-100 placeholder-slate-500'
                  }`}
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setIsCreating(false)}
                  className={`rounded-xl px-3.5 py-1.5 text-xs font-medium border ${
                    isLight ? 'border-slate-300 text-slate-700 hover:bg-slate-200' : 'border-slate-700 text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="rounded-xl bg-indigo-600 px-4 py-1.5 text-xs font-semibold text-white hover:bg-indigo-500 shadow-sm"
                >
                  {loading ? 'กำลังสร้าง...' : 'สร้างกลุ่ม'}
                </button>
              </div>
            </form>
          )}

          {/* List of Family Groups */}
          <div className="space-y-3">
            <h3 className={`text-xs font-bold uppercase tracking-wider ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
              รายชื่อกลุ่มเครือญาติทั้งหมด ({groups.length} กลุ่ม)
            </h3>

            {groups.map((group) => {
              const isActive = activeGroupId === group.id;
              const isEditing = editingGroupId === group.id;

              return (
                <div
                  key={group.id}
                  className={`rounded-xl border p-4 transition-all ${
                    isActive
                      ? isLight
                        ? 'bg-indigo-50/80 border-indigo-300 shadow-sm'
                        : 'bg-indigo-950/40 border-indigo-500/50 shadow-sm'
                      : isLight
                      ? 'bg-white border-slate-200 hover:border-slate-300'
                      : 'bg-slate-950/50 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  {isEditing ? (
                    /* Edit Form Row */
                    <div className="space-y-3">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <input
                          type="text"
                          value={editGroupName}
                          onChange={(e) => setEditGroupName(e.target.value)}
                          placeholder="ชื่อกลุ่ม..."
                          className={`rounded-lg border px-3 py-1.5 text-xs focus:outline-none focus:border-indigo-500 ${
                            isLight ? 'bg-white border-slate-300 text-slate-800' : 'bg-slate-900 border-slate-700 text-slate-100'
                          }`}
                        />
                        <input
                          type="text"
                          value={editGroupDesc}
                          onChange={(e) => setEditGroupDesc(e.target.value)}
                          placeholder="คำอธิบาย..."
                          className={`rounded-lg border px-3 py-1.5 text-xs focus:outline-none focus:border-indigo-500 ${
                            isLight ? 'bg-white border-slate-300 text-slate-800' : 'bg-slate-900 border-slate-700 text-slate-100'
                          }`}
                        />
                      </div>
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => setEditingGroupId(null)}
                          className="px-3 py-1 text-xs rounded-lg border border-slate-600 text-slate-400 hover:text-slate-200"
                        >
                          ยกเลิก
                        </button>
                        <button
                          onClick={() => handleSaveEdit(group.id)}
                          disabled={loading}
                          className="px-3 py-1 text-xs rounded-lg bg-indigo-600 text-white font-semibold hover:bg-indigo-500 flex items-center gap-1"
                        >
                          <Check className="h-3.5 w-3.5" />
                          <span>บันทึก</span>
                        </button>
                      </div>
                    </div>
                  ) : (
                    /* View Row */
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h4 className="font-semibold text-sm truncate">{group.name}</h4>
                          {group.isDefault && (
                            <span className="rounded-md bg-amber-500/10 border border-amber-500/30 px-2 py-0.5 text-[10px] font-semibold text-amber-500 shrink-0">
                              กลุ่มหลัก
                            </span>
                          )}
                          {isActive && (
                            <span className="flex items-center gap-1 rounded-md bg-emerald-500/15 border border-emerald-500/30 px-2 py-0.5 text-[10px] font-semibold text-emerald-500 shrink-0">
                              <Sparkles className="h-3 w-3" />
                              <span>แสดงผลอยู่</span>
                            </span>
                          )}
                        </div>
                        {group.description && (
                          <p className={`text-xs mt-0.5 truncate ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                            {group.description}
                          </p>
                        )}
                        <p className={`text-[10px] mt-1 ${isLight ? 'text-slate-400' : 'text-slate-500'}`}>
                          จำนวนสมาชิก: {group._count?.persons ?? 0} คน
                        </p>
                      </div>

                      {/* Action Buttons */}
                      <div className="flex items-center gap-2 shrink-0">
                        {!isActive && (
                          <button
                            onClick={() => {
                              onSelectGroup(group.id);
                              onClose();
                            }}
                            className="rounded-lg bg-indigo-600/20 border border-indigo-500/30 px-3 py-1.5 text-xs font-semibold text-indigo-400 hover:bg-indigo-600 hover:text-white transition-all"
                          >
                            เลือกกลุ่มนี้
                          </button>
                        )}

                        <button
                          onClick={() => handleStartEdit(group)}
                          className={`p-1.5 rounded-lg border transition-colors ${
                            isLight
                              ? 'border-slate-300 text-slate-600 hover:bg-slate-100'
                              : 'border-slate-700 text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                          }`}
                          title="แก้ไขชื่อกลุ่ม"
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                        </button>

                        <button
                          onClick={() => handleDeleteGroup(group)}
                          disabled={groups.length <= 1}
                          className={`p-1.5 rounded-lg border transition-colors ${
                            groups.length <= 1
                              ? 'opacity-30 cursor-not-allowed border-slate-700 text-slate-500'
                              : isLight
                              ? 'border-slate-300 text-slate-500 hover:bg-rose-100 hover:border-rose-300 hover:text-rose-600'
                              : 'border-slate-800 text-slate-400 hover:bg-rose-500/10 hover:border-rose-500/30 hover:text-rose-400'
                          }`}
                          title={groups.length <= 1 ? 'ต้องมีอย่างน้อย 1 กลุ่ม' : 'ลบกลุ่มนี้'}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div
          className={`flex items-center justify-end border-t px-6 py-3 shrink-0 ${
            isLight ? 'border-slate-200 bg-slate-50' : 'border-slate-800 bg-slate-950/60'
          }`}
        >
          <button
            onClick={onClose}
            className={`rounded-xl px-4 py-2 text-xs font-semibold transition-colors ${
              isLight ? 'bg-slate-200 text-slate-700 hover:bg-slate-300' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            ปิดหน้าต่าง
          </button>
        </div>
      </div>
    </div>
  );
}

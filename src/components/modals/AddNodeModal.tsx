'use client';

import React, { useState, useEffect } from 'react';
import { X, UserPlus, AlertCircle, Heart, Baby, UserCheck } from 'lucide-react';

interface SimplePerson {
  id: string;
  name: string;
  gender: string;
}

interface AddNodeModalProps {
  isOpen: boolean;
  theme?: 'dark' | 'light';
  onClose: () => void;
  onSuccess: () => void;
  allPersons: SimplePerson[];
  initialReferencePersonId?: string | null;
  initialRelationshipType?: 'child' | 'spouse' | 'parent';
}

export function AddNodeModal({
  isOpen,
  theme = 'dark',
  onClose,
  onSuccess,
  allPersons,
  initialReferencePersonId = null,
  initialRelationshipType = 'child',
}: AddNodeModalProps) {
  const isLight = theme === 'light';
  const [name, setName] = useState('');
  const [gender, setGender] = useState<string>('MALE');
  const [birthDate, setBirthDate] = useState<string>('');
  const [description, setDescription] = useState('');
  const [isDeceased, setIsDeceased] = useState(false);
  const [referencePersonId, setReferencePersonId] = useState<string>('');
  const [relationshipType, setRelationshipType] = useState<'child' | 'spouse' | 'parent'>('child');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setName('');
      setGender('MALE');
      setBirthDate('');
      setDescription('');
      setIsDeceased(false);
      setError(null);
      setReferencePersonId(initialReferencePersonId || (allPersons.length > 0 ? allPersons[0].id : ''));
      setRelationshipType(initialRelationshipType || 'child');
    }
  }, [isOpen, initialReferencePersonId, initialRelationshipType, allPersons]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      setError('กรุณาระบุชื่อ-นามสกุล บุคคล');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/nodes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          gender,
          birthDate: birthDate || undefined,
          description: description.trim() || undefined,
          isDeceased,
          relationshipType,
          referencePersonId: referencePersonId || undefined,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        onSuccess();
        onClose();
      } else {
        setError(data.error || 'สร้างสมาชิกไม่สำเร็จ');
      }
    } catch {
      setError('เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div
        className={`relative w-full max-w-lg rounded-2xl border shadow-2xl overflow-hidden ${
          isLight ? 'bg-white border-slate-200 text-slate-800' : 'bg-slate-900 border-slate-800 text-slate-100'
        }`}
      >
        {/* Header */}
        <div
          className={`flex items-center justify-between border-b px-6 py-4 ${
            isLight ? 'border-slate-200 bg-slate-50' : 'border-slate-800 bg-slate-950/50'
          }`}
        >
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-500/10 text-indigo-500 border border-indigo-500/20">
              <UserPlus className="h-5 w-5" />
            </div>
            <h2 className="font-semibold text-lg">เพิ่มสมาชิกใหม่ในผังเครือญาติ</h2>
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

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {error && (
            <div className="flex items-center gap-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20 p-4 text-sm text-rose-500">
              <AlertCircle className="h-5 w-5 shrink-0 text-rose-500" />
              <span>{error}</span>
            </div>
          )}

          {/* Name Input */}
          <div>
            <label className={`block text-xs font-medium mb-1.5 ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>
              ชื่อ-นามสกุล / ชื่อกำกับ <span className="text-rose-400">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="ตัวอย่าง: นายสมศักดิ์ วงศ์ตระกูล"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className={`w-full rounded-xl border px-4 py-2.5 text-sm focus:border-indigo-500 focus:outline-none ${
                isLight
                  ? 'bg-white border-slate-300 text-slate-800 placeholder-slate-400'
                  : 'bg-slate-950 border-slate-700 text-slate-100 placeholder-slate-500'
              }`}
            />
          </div>

          {/* Gender & Birth Date */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={`block text-xs font-medium mb-1.5 ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>
                เพศ <span className="text-rose-400">*</span>
              </label>
              <select
                value={gender}
                onChange={(e) => setGender(e.target.value)}
                className={`w-full rounded-xl border px-3.5 py-2.5 text-sm focus:border-indigo-500 focus:outline-none ${
                  isLight
                    ? 'bg-white border-slate-300 text-slate-800'
                    : 'bg-slate-950 border-slate-700 text-slate-100'
                }`}
              >
                <option value="MALE">ชาย ♂</option>
                <option value="FEMALE">หญิง ♀</option>
                <option value="OTHER">ไม่ระบุ</option>
              </select>
            </div>

            <div>
              <label className={`block text-xs font-medium mb-1.5 ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>
                วัน เดือน ปีเกิด
              </label>
              <div className="relative">
                <input
                  type="date"
                  value={birthDate}
                  onChange={(e) => setBirthDate(e.target.value)}
                  className={`w-full rounded-xl border px-3.5 py-2.5 text-sm focus:border-indigo-500 focus:outline-none ${
                    isLight
                      ? 'bg-white border-slate-300 text-slate-800'
                      : 'bg-slate-950 border-slate-700 text-slate-100'
                  }`}
                />
              </div>
            </div>
          </div>

          {/* Life Status (Alive / Deceased) */}
          <div>
            <label className={`block text-xs font-medium mb-1.5 ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>
              สถานะชีวิต
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setIsDeceased(false)}
                className={`flex items-center justify-center gap-1.5 rounded-xl border py-2 text-xs font-semibold transition-all ${
                  !isDeceased
                    ? 'bg-emerald-500/15 border-emerald-500 text-emerald-500 shadow-sm'
                    : isLight
                    ? 'bg-slate-50 border-slate-300 text-slate-600 hover:bg-slate-100'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:bg-slate-800'
                }`}
              >
                <span>🌱 มีชีวิตอยู่</span>
              </button>

              <button
                type="button"
                onClick={() => setIsDeceased(true)}
                className={`flex items-center justify-center gap-1.5 rounded-xl border py-2 text-xs font-semibold transition-all ${
                  isDeceased
                    ? 'bg-rose-500/15 border-rose-500 text-rose-500 shadow-sm'
                    : isLight
                    ? 'bg-slate-50 border-slate-300 text-slate-600 hover:bg-slate-100'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:bg-slate-800'
                }`}
              >
                <span>❌ เสียชีวิต</span>
              </button>
            </div>
          </div>

          {/* Description */}
          <div>
            <label className={`block text-xs font-medium mb-1.5 ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>
              ประวัติ / รายละเอียดเพิ่มเติม
            </label>
            <textarea
              rows={2}
              placeholder="ข้อมูลอาชีพ หรือหมายเหตุ..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className={`w-full rounded-xl border px-4 py-2.5 text-sm focus:border-indigo-500 focus:outline-none ${
                isLight
                  ? 'bg-white border-slate-300 text-slate-800 placeholder-slate-400'
                  : 'bg-slate-950 border-slate-700 text-slate-100 placeholder-slate-500'
              }`}
            />
          </div>

          {/* Reference Person Dropdown */}
          {allPersons.length > 0 && (
            <div>
              <label className={`block text-xs font-medium mb-1.5 ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>
                เลือกบุคคลอ้างอิงในผังตระกูล
              </label>
              <select
                value={referencePersonId}
                onChange={(e) => setReferencePersonId(e.target.value)}
                className={`w-full rounded-xl border px-4 py-2.5 text-sm focus:border-indigo-500 focus:outline-none ${
                  isLight
                    ? 'bg-white border-slate-300 text-slate-800'
                    : 'bg-slate-950 border-slate-700 text-slate-100'
                }`}
              >
                <option value="">-- ไม่ระบุ (สร้างเป็นต้นตระกูล / Standalone Node) --</option>
                {allPersons.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.gender === 'MALE' ? 'ชาย ♂' : p.gender === 'FEMALE' ? 'หญิง ♀' : 'ไม่ระบุ'})
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Relationship Type Options */}
          {referencePersonId && (
            <div>
              <label className={`block text-xs font-medium mb-2 ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>
                สายสัมพันธ์ (เทียบกับบุคคลอ้างอิง)
              </label>
              <div className="grid grid-cols-3 gap-2.5">
                {/* Child Option */}
                <label
                  className={`flex cursor-pointer flex-col items-center justify-center rounded-xl border p-3 text-center transition-all ${
                    relationshipType === 'child'
                      ? 'border-indigo-500 bg-indigo-500/10 ring-1 ring-indigo-500'
                      : isLight
                      ? 'border-slate-200 bg-slate-50 hover:border-slate-300'
                      : 'border-slate-800 bg-slate-950/40 hover:border-slate-700'
                  }`}
                >
                  <input
                    type="radio"
                    name="relationshipType"
                    value="child"
                    checked={relationshipType === 'child'}
                    onChange={() => setRelationshipType('child')}
                    className="hidden"
                  />
                  <Baby className="h-4 w-4 text-indigo-500 mb-1" />
                  <span className={`font-semibold text-xs ${isLight ? 'text-slate-800' : 'text-slate-100'}`}>Child Node</span>
                  <span className="text-[10px] text-slate-400 mt-0.5">บุตรหลาน (ลูก)</span>
                </label>

                {/* Spouse Option */}
                <label
                  className={`flex cursor-pointer flex-col items-center justify-center rounded-xl border p-3 text-center transition-all ${
                    relationshipType === 'spouse'
                      ? 'border-rose-500 bg-rose-500/10 ring-1 ring-rose-500'
                      : isLight
                      ? 'border-slate-200 bg-slate-50 hover:border-slate-300'
                      : 'border-slate-800 bg-slate-950/40 hover:border-slate-700'
                  }`}
                >
                  <input
                    type="radio"
                    name="relationshipType"
                    value="spouse"
                    checked={relationshipType === 'spouse'}
                    onChange={() => setRelationshipType('spouse')}
                    className="hidden"
                  />
                  <Heart className="h-4 w-4 text-rose-500 mb-1" />
                  <span className={`font-semibold text-xs ${isLight ? 'text-slate-800' : 'text-slate-100'}`}>Spouse</span>
                  <span className="text-[10px] text-slate-400 mt-0.5">แต่งงาน / คู่สมรส</span>
                </label>

                {/* Parent Option */}
                <label
                  className={`flex cursor-pointer flex-col items-center justify-center rounded-xl border p-3 text-center transition-all ${
                    relationshipType === 'parent'
                      ? 'border-indigo-500 bg-indigo-500/10 ring-1 ring-indigo-500'
                      : isLight
                      ? 'border-slate-200 bg-slate-50 hover:border-slate-300'
                      : 'border-slate-800 bg-slate-950/40 hover:border-slate-700'
                  }`}
                >
                  <input
                    type="radio"
                    name="relationshipType"
                    value="parent"
                    checked={relationshipType === 'parent'}
                    onChange={() => setRelationshipType('parent')}
                    className="hidden"
                  />
                  <UserCheck className="h-4 w-4 text-indigo-500 mb-1" />
                  <span className={`font-semibold text-xs ${isLight ? 'text-slate-800' : 'text-slate-100'}`}>Parent Node</span>
                  <span className="text-[10px] text-slate-400 mt-0.5">บิดา / มารดา</span>
                </label>
              </div>
            </div>
          )}

          {/* Footer Actions */}
          <div className={`flex items-center justify-end gap-3 pt-4 border-t ${isLight ? 'border-slate-200' : 'border-slate-800'}`}>
            <button
              type="button"
              onClick={onClose}
              className={`rounded-xl border px-4 py-2.5 text-xs font-medium transition-colors ${
                isLight
                  ? 'border-slate-300 text-slate-700 hover:bg-slate-100'
                  : 'border-slate-700 text-slate-300 hover:bg-slate-800'
              }`}
            >
              ยกเลิก
            </button>
            <button
              type="submit"
              disabled={loading}
              className="rounded-xl bg-indigo-600 px-5 py-2.5 text-xs font-semibold text-white hover:bg-indigo-500 shadow-lg shadow-indigo-600/30 transition-all"
            >
              {loading ? 'กำลังบันทึก...' : 'บันทึกเพิ่มสมาชิก'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

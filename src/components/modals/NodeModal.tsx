'use client';

import React, { useState, useEffect } from 'react';
import {
  X,
  Edit2,
  Trash2,
  Image as ImageIcon,
  User,
  Upload,
  AlertCircle,
  CheckCircle2,
  Heart,
  Baby,
  Calendar,
} from 'lucide-react';
import { calculateAge, formatDateBE } from '@/lib/utils';

interface NodeImage {
  id: string;
  url: string;
}

interface PersonDetail {
  id: string;
  name: string;
  gender: string;
  description?: string | null;
  birthDate?: string | null;
  images: NodeImage[];
  unionsAsPartner1?: any[];
  unionsAsPartner2?: any[];
  parentUnion?: any;
}

interface NodeModalProps {
  nodeId: string | null;
  theme?: 'dark' | 'light';
  onClose: () => void;
  onRefresh: () => void;
  onOpenAddNode: (
    refPersonId: string,
    relationshipType: 'child' | 'spouse' | 'parent',
    existingUnionId?: string
  ) => void;
}

export function NodeModal({
  nodeId,
  theme = 'dark',
  onClose,
  onRefresh,
  onOpenAddNode,
}: NodeModalProps) {
  const isLight = theme === 'light';
  const [person, setPerson] = useState<PersonDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState('');
  const [gender, setGender] = useState('MALE');
  const [birthDate, setBirthDate] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  useEffect(() => {
    if (!nodeId) return;

    const fetchPerson = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/nodes/${nodeId}`);
        const data = await res.json();
        if (res.ok) {
          setPerson(data.person);
          setName(data.person.name);
          setGender(data.person.gender || 'MALE');
          setBirthDate(data.person.birthDate || '');
          setDescription(data.person.description || '');
        } else {
          setError(data.error || 'ไม่สามารถดึงข้อมูลบุคคลได้');
        }
      } catch {
        setError('เกิดข้อผิดพลาดในการเชื่อมต่อ');
      } finally {
        setLoading(false);
      }
    };

    fetchPerson();
  }, [nodeId]);

  if (!nodeId) return null;

  const handleSaveText = async () => {
    if (!name.trim()) {
      setError('ชื่อบุคคลห้ามเป็นค่าว่าง');
      return;
    }

    setError(null);
    setLoading(true);
    try {
      const res = await fetch(`/api/nodes/${nodeId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, gender, birthDate, description }),
      });
      const data = await res.json();
      if (res.ok) {
        setPerson(data.person);
        setIsEditing(false);
        setSuccessMsg('บันทึกข้อมูลเรียบร้อยแล้ว');
        setTimeout(() => setSuccessMsg(null), 3000);
        onRefresh();
      } else {
        setError(data.error || 'ไม่สามารถบันทึกข้อมูลได้');
      }
    } catch {
      setError('เกิดข้อผิดพลาดในการเชื่อมต่อ');
    } finally {
      setLoading(false);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0 || !person) return;

    setError(null);

    const currentCount = person.images.length;
    if (currentCount + files.length > 3) {
      setError(
        `ไม่สามารถอัปโหลดได้! แต่ละบุคคลมีรูปภาพได้สูงสุด 3 รูปเท่านั้น (ปัจจุบันมี ${currentCount} รูป)`
      );
      return;
    }

    const formData = new FormData();
    for (let i = 0; i < files.length; i++) {
      formData.append('images', files[i]);
    }

    setUploading(true);
    try {
      const res = await fetch(`/api/nodes/${nodeId}/images`, {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      if (res.ok) {
        setPerson((prev) => (prev ? { ...prev, images: [...prev.images, ...data.images] } : null));
        setSuccessMsg('อัปโหลดรูปภาพสำเร็จ');
        setTimeout(() => setSuccessMsg(null), 3000);
        onRefresh();
      } else {
        setError(data.error || 'การอัปโหลดรูปภาพล้มเหลว');
      }
    } catch {
      setError('เกิดข้อผิดพลาดในการอัปโหลด');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const handleDeleteImage = async (imageId: string) => {
    if (!confirm('คุณต้องการลบรูปภาพนี้ใช่หรือไม่?')) return;

    setError(null);
    try {
      const res = await fetch(`/api/nodes/${nodeId}/images`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageId }),
      });
      if (res.ok) {
        setPerson((prev) =>
          prev ? { ...prev, images: prev.images.filter((img) => img.id !== imageId) } : null
        );
        if (selectedImage) setSelectedImage(null);
        setSuccessMsg('ลบรูปภาพสำเร็จ');
        setTimeout(() => setSuccessMsg(null), 3000);
        onRefresh();
      } else {
        const data = await res.json();
        setError(data.error || 'ลบรูปภาพไม่สำเร็จ');
      }
    } catch {
      setError('เกิดข้อผิดพลาดในการส่งคำขอ');
    }
  };

  const handleDeletePerson = async () => {
    if (!confirm(`คุณแน่ใจหรือไม่ว่าต้องการลบข้อมูลบุคคล "${person?.name}"?`)) return;

    try {
      const res = await fetch(`/api/nodes/${nodeId}`, { method: 'DELETE' });
      if (res.ok) {
        onRefresh();
        onClose();
      } else {
        const data = await res.json();
        setError(data.error || 'ลบบุคคลไม่สำเร็จ');
      }
    } catch {
      setError('เกิดข้อผิดพลาดในการลบบุคคล');
    }
  };

  const age = calculateAge(person?.birthDate);
  const formattedBirthDate = formatDateBE(person?.birthDate);

  const genderBadge =
    person?.gender === 'MALE'
      ? {
          text: age !== null ? `ชาย ♂ (อายุ ${age} ปี)` : 'ชาย ♂',
          color: isLight
            ? 'bg-blue-50 text-blue-700 border-blue-200'
            : 'bg-blue-500/10 text-blue-400 border-blue-500/30',
        }
      : person?.gender === 'FEMALE'
      ? {
          text: age !== null ? `หญิง ♀ (อายุ ${age} ปี)` : 'หญิง ♀',
          color: isLight
            ? 'bg-pink-50 text-pink-700 border-pink-200'
            : 'bg-pink-500/10 text-pink-400 border-pink-500/30',
        }
      : {
          text: age !== null ? `ไม่ระบุ (อายุ ${age} ปี)` : 'ไม่ระบุ',
          color: isLight
            ? 'bg-purple-50 text-purple-700 border-purple-200'
            : 'bg-purple-500/10 text-purple-400 border-purple-500/30',
        };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-end bg-black/60 backdrop-blur-sm p-4 sm:p-6 transition-all">
      <div
        className={`relative flex h-full w-full max-w-xl flex-col rounded-2xl border shadow-2xl overflow-hidden ${
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
              <User className="h-5 w-5" />
            </div>
            <div>
              <h2 className="font-semibold text-lg leading-tight">ข้อมูลบุคคลในผังตระกูล</h2>
              <p className={`text-xs ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                ID: {nodeId}
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

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {error && (
            <div className="flex items-center gap-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20 p-4 text-sm text-rose-500">
              <AlertCircle className="h-5 w-5 shrink-0 text-rose-500" />
              <span>{error}</span>
            </div>
          )}

          {successMsg && (
            <div className="flex items-center gap-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 p-4 text-sm text-emerald-600">
              <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-500" />
              <span>{successMsg}</span>
            </div>
          )}

          {loading ? (
            <div className="flex h-40 items-center justify-center text-slate-400 text-sm">
              กำลังโหลดข้อมูล...
            </div>
          ) : person ? (
            <>
              {/* Person Info Section */}
              <div
                className={`space-y-4 rounded-xl border p-5 ${
                  isLight ? 'border-slate-200 bg-slate-50/50' : 'border-slate-800 bg-slate-950/40'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-wider text-indigo-500">
                    ประวัติส่วนบุคคล
                  </span>
                  {!isEditing ? (
                    <button
                      onClick={() => setIsEditing(true)}
                      className="flex items-center gap-1.5 text-xs font-medium text-indigo-600 hover:text-indigo-500 transition-colors"
                    >
                      <Edit2 className="h-3.5 w-3.5" /> แก้ไขประวัติ / วันเกิด
                    </button>
                  ) : (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setIsEditing(false)}
                        className={`text-xs ${isLight ? 'text-slate-500 hover:text-slate-800' : 'text-slate-400 hover:text-slate-200'}`}
                      >
                        ยกเลิก
                      </button>
                      <button
                        onClick={handleSaveText}
                        className="rounded-lg bg-indigo-600 px-3 py-1 text-xs font-medium text-white hover:bg-indigo-500"
                      >
                        บันทึก
                      </button>
                    </div>
                  )}
                </div>

                {isEditing ? (
                  <div className="space-y-3 pt-2">
                    <div>
                      <label className={`block text-xs font-medium mb-1 ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>
                        ชื่อ-นามสกุล <span className="text-rose-400">*</span>
                      </label>
                      <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className={`w-full rounded-lg border px-3.5 py-2 text-sm focus:border-indigo-500 focus:outline-none ${
                          isLight
                            ? 'bg-white border-slate-300 text-slate-800'
                            : 'bg-slate-900 border-slate-700 text-slate-100'
                        }`}
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className={`block text-xs font-medium mb-1 ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>เพศ</label>
                        <select
                          value={gender}
                          onChange={(e) => setGender(e.target.value)}
                          className={`w-full rounded-lg border px-3.5 py-2 text-sm focus:border-indigo-500 focus:outline-none ${
                            isLight
                              ? 'bg-white border-slate-300 text-slate-800'
                              : 'bg-slate-900 border-slate-700 text-slate-100'
                          }`}
                        >
                          <option value="MALE">ชาย ♂</option>
                          <option value="FEMALE">หญิง ♀</option>
                          <option value="OTHER">ไม่ระบุ</option>
                        </select>
                      </div>

                      <div>
                        <label className={`block text-xs font-medium mb-1 ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>
                          วัน เดือน ปีเกิด
                        </label>
                        <input
                          type="date"
                          value={birthDate}
                          onChange={(e) => setBirthDate(e.target.value)}
                          className={`w-full rounded-lg border px-3.5 py-2 text-sm focus:border-indigo-500 focus:outline-none ${
                            isLight
                              ? 'bg-white border-slate-300 text-slate-800'
                              : 'bg-slate-900 border-slate-700 text-slate-100'
                          }`}
                        />
                      </div>
                    </div>

                    <div>
                      <label className={`block text-xs font-medium mb-1 ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>
                        ประวัติ / คำอธิบายเพิ่มเติม
                      </label>
                      <textarea
                        rows={3}
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        className={`w-full rounded-lg border px-3.5 py-2 text-sm focus:border-indigo-500 focus:outline-none ${
                          isLight
                            ? 'bg-white border-slate-300 text-slate-800'
                            : 'bg-slate-900 border-slate-700 text-slate-100'
                        }`}
                      />
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className={`text-xl font-bold ${isLight ? 'text-slate-900' : 'text-slate-100'}`}>
                        {person.name}
                      </h3>
                      <span className={`rounded-md px-2 py-0.5 text-xs font-semibold border ${genderBadge.color}`}>
                        {genderBadge.text}
                      </span>
                    </div>

                    {formattedBirthDate && (
                      <div className="flex items-center gap-1.5 text-xs text-indigo-600 font-medium">
                        <Calendar className="h-3.5 w-3.5 text-indigo-500" />
                        <span>วันเกิด: {formattedBirthDate}</span>
                      </div>
                    )}

                    <p className={`text-sm leading-relaxed whitespace-pre-line pt-1 ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>
                      {person.description || 'ไม่มีข้อมูลรายละเอียดเพิ่มเติม'}
                    </p>
                  </div>
                )}
              </div>

              {/* Photos Gallery (Max 3 Images) */}
              <div
                className={`space-y-3 rounded-xl border p-5 ${
                  isLight ? 'border-slate-200 bg-slate-50/50' : 'border-slate-800 bg-slate-950/40'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ImageIcon className="h-4 w-4 text-indigo-500" />
                    <span className={`text-sm font-semibold ${isLight ? 'text-slate-800' : 'text-slate-200'}`}>
                      รูปภาพประกอบ
                    </span>
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium border ${
                      isLight ? 'bg-slate-200 text-slate-700 border-slate-300' : 'bg-slate-800 text-indigo-300 border-slate-700'
                    }`}>
                      {person.images.length} / 3 รูป
                    </span>
                  </div>

                  {person.images.length < 3 && (
                    <label className="flex cursor-pointer items-center gap-1.5 rounded-lg bg-indigo-600/20 border border-indigo-500/30 px-3 py-1.5 text-xs font-medium text-indigo-600 hover:bg-indigo-600/30 transition-all">
                      <Upload className="h-3.5 w-3.5" />
                      <span>{uploading ? 'กำลังอัปโหลด...' : 'อัปโหลดรูป'}</span>
                      <input
                        type="file"
                        accept="image/*"
                        multiple={3 - person.images.length > 1}
                        onChange={handleImageUpload}
                        disabled={uploading}
                        className="hidden"
                      />
                    </label>
                  )}
                </div>

                {person.images.length > 0 ? (
                  <div className="grid grid-cols-3 gap-3 pt-2">
                    {person.images.map((img) => (
                      <div
                        key={img.id}
                        className={`group relative aspect-square overflow-hidden rounded-xl border shadow-inner ${
                          isLight ? 'border-slate-300 bg-slate-100' : 'border-slate-700 bg-slate-900'
                        }`}
                      >
                        <img
                          src={img.url}
                          alt="Person Photo"
                          onClick={() => setSelectedImage(img.url)}
                          className="h-full w-full object-cover cursor-pointer transition-transform group-hover:scale-105"
                        />
                        <button
                          onClick={() => handleDeleteImage(img.id)}
                          className="absolute top-1.5 right-1.5 flex h-7 w-7 items-center justify-center rounded-lg bg-rose-600/90 text-white opacity-0 transition-opacity group-hover:opacity-100 hover:bg-rose-500"
                          title="ลบรูปภาพนี้"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className={`text-xs py-3 text-center italic border border-dashed rounded-lg ${
                    isLight ? 'border-slate-300 text-slate-500' : 'border-slate-800 text-slate-500'
                  }`}>
                    ยังไม่มีรูปภาพประกอบ (สามารถอัปโหลดได้สูงสุด 3 รูป)
                  </p>
                )}
              </div>

              {/* Family Connections / Actions */}
              <div className="space-y-3 pt-2">
                <span className={`block text-xs font-semibold uppercase tracking-wider ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                  การจัดการสายสัมพันธ์ตระกูล
                </span>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => {
                      onOpenAddNode(person.id, 'child');
                      onClose();
                    }}
                    className="flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-xs font-semibold text-white hover:bg-indigo-500 shadow-lg shadow-indigo-600/20 transition-all"
                  >
                    <Baby className="h-4 w-4" /> เพิ่มบุตรหลาน (Child Node)
                  </button>

                  <button
                    onClick={() => {
                      onOpenAddNode(person.id, 'spouse');
                      onClose();
                    }}
                    className={`flex items-center justify-center gap-2 rounded-xl border px-4 py-2.5 text-xs font-semibold transition-all ${
                      isLight
                        ? 'bg-rose-50 border-rose-300 text-rose-700 hover:bg-rose-100'
                        : 'bg-rose-600/20 border-rose-500/40 text-rose-300 hover:bg-rose-600/30'
                    }`}
                  >
                    <Heart className="h-4 w-4 text-rose-500" /> เพิ่มคู่สมรส (Marriage)
                  </button>
                </div>
              </div>
            </>
          ) : null}
        </div>

        {/* Footer */}
        {person && (
          <div
            className={`flex items-center justify-between border-t px-6 py-4 ${
              isLight ? 'border-slate-200 bg-slate-50' : 'border-slate-800 bg-slate-950/50'
            }`}
          >
            <button
              onClick={handleDeletePerson}
              className="flex items-center gap-1.5 text-xs font-medium text-rose-600 hover:text-rose-500 transition-colors"
            >
              <Trash2 className="h-4 w-4" /> ลบบุคคลนี้
            </button>
            <button
              onClick={onClose}
              className={`rounded-xl px-4 py-2 text-xs font-medium transition-colors ${
                isLight ? 'bg-slate-200 text-slate-700 hover:bg-slate-300' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              ปิดหน้าต่าง
            </button>
          </div>
        )}
      </div>

      {/* Lightbox Preview */}
      {selectedImage && (
        <div
          className="fixed inset-0 z-60 flex items-center justify-center bg-black/90 p-4"
          onClick={() => setSelectedImage(null)}
        >
          <div className="relative max-h-[90vh] max-w-[90vw] overflow-hidden rounded-2xl">
            <img src={selectedImage} alt="Expanded Preview" className="max-h-[85vh] object-contain" />
            <button
              onClick={() => setSelectedImage(null)}
              className="absolute top-4 right-4 rounded-full bg-slate-900/80 p-2 text-white hover:bg-slate-800"
            >
              <X className="h-6 w-6" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

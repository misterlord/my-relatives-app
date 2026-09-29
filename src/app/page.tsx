'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { NodeDiagram, LayoutMode } from '@/components/diagram/NodeDiagram';
import { NodeModal } from '@/components/modals/NodeModal';
import { AddNodeModal } from '@/components/modals/AddNodeModal';
import {
  Users,
  Plus,
  LogOut,
  RefreshCw,
  LayoutGrid,
  Eye,
  Sparkles,
  Search,
  X,
} from 'lucide-react';

export default function DashboardPage() {
  const router = useRouter();
  const [persons, setPersons] = useState<any[]>([]);
  const [unions, setUnions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Multi-Layout & Compact View states
  const [layoutMode, setLayoutMode] = useState<LayoutMode>('family_tree');
  const [isCompactView, setIsCompactView] = useState(false);
  const [resetting, setResetting] = useState(false);

  // Branch Focus Lineage & Search states
  const [focusedUnionId, setFocusedUnionId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [focusedPersonId, setFocusedPersonId] = useState<string | null>(null);
  const [isSearchDropdownOpen, setIsSearchDropdownOpen] = useState(false);

  // Modals state
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [addModalRefPersonId, setAddModalRefPersonId] = useState<string | null>(null);
  const [addModalRelationshipType, setAddModalRelationshipType] = useState<
    'child' | 'spouse' | 'parent'
  >('child');
  const [user, setUser] = useState<{ username: string } | null>(null);

  const fetchFamilyTree = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/nodes');
      if (res.status === 401) {
        router.push('/login');
        return;
      }
      const data = await res.json();
      if (res.ok) {
        setPersons(data.persons || []);
        setUnions(data.unions || []);
      } else {
        setError(data.error || 'ดึงข้อมูลไม่สำเร็จ');
      }
    } catch {
      setError('เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์');
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    fetch('/api/auth/me')
      .then((res) => res.json())
      .then((data) => {
        if (data.user) setUser(data.user);
      })
      .catch(() => {});

    fetchFamilyTree();
  }, [fetchFamilyTree]);

  // RESET & AUTO LAYOUT FUNCTION
  const handleResetAutoLayout = async () => {
    if (!confirm('คุณต้องการรีเซ็ตตำแหน่งและจัดผังเครือญาติใหม่อัตโนมัติใช่หรือไม่?')) return;

    setResetting(true);
    try {
      await fetch('/api/nodes/positions', { method: 'DELETE' });
      await fetchFamilyTree();
    } catch {
      setError('ไม่สามารถรีเซ็ตผังอัตโนมัติได้');
    } finally {
      setResetting(false);
    }
  };

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
    router.refresh();
  };

  const handleOpenAddNodeModal = (
    refPersonId: string | null = null,
    relationshipType: 'child' | 'spouse' | 'parent' = 'child'
  ) => {
    setAddModalRefPersonId(refPersonId);
    setAddModalRelationshipType(relationshipType);
    setIsAddModalOpen(true);
  };

  // Live Search Suggestions Filter
  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const q = searchQuery.toLowerCase();
    return persons.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        (p.description && p.description.toLowerCase().includes(q))
    );
  }, [searchQuery, persons]);

  // Branch Lineage Filtering logic
  const { filteredPersons, filteredUnions } = useMemo(() => {
    if (!focusedUnionId) return { filteredPersons: persons, filteredUnions: unions };

    const targetUnion = unions.find((u) => u.id === focusedUnionId);
    if (!targetUnion) return { filteredPersons: persons, filteredUnions: unions };

    const activePersonIds = new Set<string>();
    if (targetUnion.partner1Id) activePersonIds.add(targetUnion.partner1Id);
    if (targetUnion.partner2Id) activePersonIds.add(targetUnion.partner2Id);

    // Queue children & descendants
    const queue: string[] = [];
    if (targetUnion.children) {
      targetUnion.children.forEach((c: any) => {
        activePersonIds.add(c.id);
        queue.push(c.id);
      });
    }

    // Include parents of partner1 & partner2 if present
    [targetUnion.partner1Id, targetUnion.partner2Id].forEach((pId) => {
      if (!pId) return;
      const person = persons.find((p) => p.id === pId);
      if (person && person.parentUnionId) {
        const parentUnion = unions.find((u) => u.id === person.parentUnionId);
        if (parentUnion) {
          if (parentUnion.partner1Id) activePersonIds.add(parentUnion.partner1Id);
          if (parentUnion.partner2Id) activePersonIds.add(parentUnion.partner2Id);
        }
      }
    });

    while (queue.length > 0) {
      const currentId = queue.shift()!;
      const childUnions = unions.filter(
        (u) => u.partner1Id === currentId || u.partner2Id === currentId
      );
      childUnions.forEach((u) => {
        if (u.partner1Id) activePersonIds.add(u.partner1Id);
        if (u.partner2Id) activePersonIds.add(u.partner2Id);
        if (u.children) {
          u.children.forEach((c: any) => {
            if (!activePersonIds.has(c.id)) {
              activePersonIds.add(c.id);
              queue.push(c.id);
            }
          });
        }
      });
    }

    const pResult = persons.filter((p) => activePersonIds.has(p.id));
    const uResult = unions.filter(
      (u) =>
        (u.partner1Id && activePersonIds.has(u.partner1Id)) ||
        (u.partner2Id && activePersonIds.has(u.partner2Id))
    );

    return { filteredPersons: pResult, filteredUnions: uResult };
  }, [focusedUnionId, persons, unions]);

  // Handle Person Selection from Search Dropdown
  const handleSelectSearchedPerson = (personId: string, personName: string) => {
    setFocusedPersonId(personId);
    setSearchQuery(personName);
    setIsSearchDropdownOpen(false);
  };

  // Clear Search
  const handleClearSearch = () => {
    setSearchQuery('');
    setFocusedPersonId(null);
    setIsSearchDropdownOpen(false);
  };

  return (
    <div className="flex h-screen w-screen flex-col bg-slate-950 overflow-hidden font-sans">
      {/* Navbar Header */}
      <header className="flex h-16 shrink-0 items-center justify-between border-b border-slate-800 bg-slate-900/90 px-6 backdrop-blur-md z-20 gap-4">
        {/* Logo & Title */}
        <div className="flex items-center gap-3 shrink-0">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600/20 border border-indigo-500/30 text-indigo-400">
            <Users className="h-5 w-5" />
          </div>
          <div className="hidden lg:block">
            <h1 className="font-bold text-base text-slate-100 leading-tight">
              เครือญาติของฉัน (My Relatives)
            </h1>
            <p className="text-xs text-slate-400">
              ระบบแสดงและจัดการผังความสัมพันธ์หลายรูปแบบ (Multi-Layout Diagram)
            </p>
          </div>
        </div>

        {/* Search Bar with Live Suggestions */}
        <div className="relative flex-1 max-w-md">
          <div className="relative flex items-center">
            <Search className="absolute left-3 h-4 w-4 text-slate-400 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setIsSearchDropdownOpen(true);
                if (!e.target.value) setFocusedPersonId(null);
              }}
              onFocus={() => setIsSearchDropdownOpen(true)}
              placeholder="ค้นหาชื่อสมาชิก..."
              className="w-full rounded-xl border border-slate-700 bg-slate-950/80 py-2 pl-9 pr-8 text-xs text-slate-200 placeholder-slate-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-all"
            />
            {searchQuery && (
              <button
                onClick={handleClearSearch}
                className="absolute right-2.5 text-slate-400 hover:text-slate-200"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {/* Live Search Suggestions Dropdown */}
          {isSearchDropdownOpen && searchResults.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-1 max-h-60 overflow-y-auto rounded-xl border border-slate-800 bg-slate-900 shadow-2xl z-50">
              <div className="p-1">
                {searchResults.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => handleSelectSearchedPerson(p.id, p.name)}
                    className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left hover:bg-slate-800/80 transition-colors"
                  >
                    <div
                      className={`flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-bold ${
                        p.gender === 'FEMALE'
                          ? 'bg-rose-500/20 text-rose-300'
                          : 'bg-indigo-500/20 text-indigo-300'
                      }`}
                    >
                      {p.gender === 'FEMALE' ? 'ญ' : 'ช'}
                    </div>
                    <div className="flex-1 overflow-hidden">
                      <p className="text-xs font-medium text-slate-200 truncate">{p.name}</p>
                      {p.description && (
                        <p className="text-[10px] text-slate-400 truncate">{p.description}</p>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Toolbar Controls */}
        <div className="flex items-center gap-2">
          {/* Compact / Full View Toggle Button */}
          <button
            onClick={() => setIsCompactView(!isCompactView)}
            className={`flex items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-semibold transition-all ${
              isCompactView
                ? 'border-indigo-500 bg-indigo-600/20 text-indigo-300'
                : 'border-slate-700 bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
            title="สลับมุมมองแบบย่อ / แบบเต็ม"
          >
            {isCompactView ? <LayoutGrid className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            <span className="hidden sm:inline">{isCompactView ? 'มุมมองแบบย่อ' : 'มุมมองแบบเต็ม'}</span>
          </button>

          {/* Reset & Auto Layout Button */}
          <button
            onClick={handleResetAutoLayout}
            disabled={resetting}
            className="flex items-center gap-1.5 rounded-xl border border-indigo-500/40 bg-indigo-950/50 px-3 py-2 text-xs font-semibold text-indigo-300 hover:bg-indigo-900/60 transition-all"
            title="จัดตำแหน่งโหนดทั้งหมดใหม่อัตโนมัติ"
          >
            <Sparkles className={`h-4 w-4 text-indigo-400 ${resetting ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">{resetting ? 'กำลังจัดผัง...' : 'Auto Layout'}</span>
          </button>

          <button
            onClick={() => handleOpenAddNodeModal(null, 'child')}
            className="flex items-center gap-1.5 rounded-xl bg-indigo-600 px-3.5 py-2 text-xs font-semibold text-white shadow-lg shadow-indigo-600/20 hover:bg-indigo-500 transition-all active:scale-95"
          >
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">เพิ่มสมาชิก</span>
          </button>

          <button
            onClick={fetchFamilyTree}
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-700 bg-slate-800 text-slate-300 hover:bg-slate-700 transition-all"
            title="รีเฟรชผัง"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </button>

          <div className="h-5 w-px bg-slate-800 hidden sm:block" />

          {/* User profile info */}
          <div className="hidden sm:flex items-center gap-2 rounded-xl bg-slate-800/80 px-3 py-1.5 border border-slate-700/60">
            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-indigo-500/20 text-indigo-400 text-xs font-bold">
              {user?.username?.charAt(0).toUpperCase() || 'A'}
            </div>
            <span className="text-xs font-medium text-slate-200">{user?.username || 'admin'}</span>
          </div>

          <button
            onClick={handleLogout}
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-800 bg-slate-900/60 text-slate-400 hover:bg-rose-500/10 hover:border-rose-500/30 hover:text-rose-400 transition-all"
            title="ออกจากระบบ"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </header>

      {/* Main Diagram Body */}
      <main className="relative flex-1 w-full h-full overflow-hidden">
        {loading && persons.length === 0 ? (
          <div className="flex h-full w-full items-center justify-center text-slate-400 text-sm">
            กำลังโหลดแผนผัง...
          </div>
        ) : error ? (
          <div className="flex h-full w-full items-center justify-center text-rose-400 text-sm">
            {error}
          </div>
        ) : filteredPersons.length === 0 ? (
          <div className="flex h-full w-full flex-col items-center justify-center gap-4 text-center">
            <Users className="h-16 w-16 text-slate-700" />
            <div className="space-y-1">
              <h3 className="font-semibold text-slate-200">ไม่พบสมาชิกในสายตระกูลที่เลือก</h3>
              <p className="text-xs text-slate-400">ลองเลือกล้างตัวกรองสายตระกูลเพื่อแสดงผังทั้งหมด</p>
            </div>
            <button
              onClick={() => setFocusedUnionId(null)}
              className="rounded-xl bg-indigo-600 px-5 py-2.5 text-xs font-semibold text-white shadow-lg shadow-indigo-600/30 hover:bg-indigo-500"
            >
              แสดงผังทั้งหมด
            </button>
          </div>
        ) : (
          <NodeDiagram
            rawPersons={filteredPersons}
            rawUnions={filteredUnions}
            allUnions={unions}
            layoutMode={layoutMode}
            setLayoutMode={setLayoutMode}
            focusedUnionId={focusedUnionId}
            setFocusedUnionId={setFocusedUnionId}
            isCompactView={isCompactView}
            focusedPersonId={focusedPersonId}
            onSelectNode={(id) => setSelectedNodeId(id)}
            onAddNodeClick={() => handleOpenAddNodeModal(null, 'child')}
          />
        )}
      </main>

      {/* View/Edit Person Detail Slide-Over Modal */}
      <NodeModal
        nodeId={selectedNodeId}
        onClose={() => setSelectedNodeId(null)}
        onRefresh={fetchFamilyTree}
        onOpenAddNode={(refId, relType) => handleOpenAddNodeModal(refId, relType)}
      />

      {/* Add Person Modal */}
      <AddNodeModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSuccess={fetchFamilyTree}
        allPersons={persons.map((p) => ({ id: p.id, name: p.name, gender: p.gender }))}
        initialReferencePersonId={addModalRefPersonId}
        initialRelationshipType={addModalRelationshipType}
      />
    </div>
  );
}

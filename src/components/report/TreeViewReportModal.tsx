'use client';

import React, { useState, useMemo } from 'react';
import {
  FileText,
  ChevronRight,
  ChevronDown,
  X,
  Search,
  FolderTree,
  Printer,
  Maximize2,
  Minimize2,
  Users,
  User,
} from 'lucide-react';

interface TreeNode {
  id: string;
  name: string;
  gender: string;
  birthDate?: string | null;
  description?: string | null;
  isDeceased?: boolean;
  spouseName?: string | null;
  directChildrenCount?: number;
  children: TreeNode[];
  isFolder: boolean;
}

interface TreeViewReportModalProps {
  isOpen: boolean;
  theme?: 'dark' | 'light';
  persons: any[];
  unions: any[];
  groups?: any[];
  activeGroupId?: string | null;
  onClose: () => void;
  onSelectPerson: (personId: string) => void;
  onSelectGroup?: (groupId: string) => void;
}

// Build Family Tree Node Hierarchy without duplicates
function buildFamilyTreeNodes(persons: any[], unions: any[]): TreeNode[] {
  const personMap = new Map<string, any>(persons.map((p) => [p.id, p]));
  const unionMap = new Map<string, any>(unions.map((u) => [u.id, u]));

  // Find all children IDs across all unions to identify top-level roots
  const childPersonIds = new Set<string>();
  unions.forEach((u) => {
    if (u.children) {
      u.children.forEach((c: any) => childPersonIds.add(c.id));
    }
  });

  persons.forEach((p) => {
    if (p.parentUnionId) {
      const parentUnion = unionMap.get(p.parentUnionId);
      if (parentUnion) childPersonIds.add(p.id);
    }
  });

  // Top level root persons
  const rootPersons = persons.filter((p) => !childPersonIds.has(p.id));
  const visited = new Set<string>();

  const createNode = (person: any): TreeNode => {
    visited.add(person.id);

    // Find unions where this person is partner1 or partner2
    const personUnions = unions.filter(
      (u) => u.partner1Id === person.id || u.partner2Id === person.id
    );

    const spouseNames: string[] = [];
    const childNodes: TreeNode[] = [];

    personUnions.forEach((u) => {
      const partnerId = u.partner1Id === person.id ? u.partner2Id : u.partner1Id;
      if (partnerId) {
        const partner = personMap.get(partnerId);
        if (partner) {
          if (!spouseNames.includes(partner.name)) {
            spouseNames.push(partner.name);
          }
          // Mark spouse as visited so spouse is not duplicated as a separate root folder
          visited.add(partner.id);
        }
      }

      if (u.children && u.children.length > 0) {
        u.children.forEach((c: any) => {
          const childPerson = personMap.get(c.id);
          if (childPerson && !visited.has(childPerson.id)) {
            const childNode = createNode(childPerson);
            if (childNode) childNodes.push(childNode);
          }
        });
      }
    });

    // Direct children count for this person (immediate children attached to this person's unions)
    let directChildrenCount = 0;
    personUnions.forEach((u) => {
      if (u.children) directChildrenCount += u.children.length;
    });

    const isFolder = childNodes.length > 0 || spouseNames.length > 0;

    return {
      id: person.id,
      name: person.name,
      gender: person.gender || 'MALE',
      birthDate: person.birthDate,
      description: person.description,
      isDeceased: Boolean(person.isDeceased),
      spouseName: spouseNames.length > 0 ? spouseNames.join(', ') : null,
      directChildrenCount,
      children: childNodes,
      isFolder,
    };
  };

  const treeNodes: TreeNode[] = [];

  rootPersons.forEach((rp) => {
    if (!visited.has(rp.id)) {
      const node = createNode(rp);
      if (node) treeNodes.push(node);
    }
  });

  // Add any unvisited standalone persons as root nodes
  persons.forEach((p) => {
    if (!visited.has(p.id)) {
      const node = createNode(p);
      if (node) treeNodes.push(node);
    }
  });

  return treeNodes;
}

// Recursive Tree Row Component matching OS Directory View
const TreeNodeRow = ({
  node,
  depth = 0,
  theme = 'dark',
  searchQuery = '',
  expandedNodeIds,
  toggleExpand,
  onSelectPerson,
}: {
  node: TreeNode;
  depth?: number;
  theme?: 'dark' | 'light';
  searchQuery?: string;
  expandedNodeIds: Set<string>;
  toggleExpand: (id: string) => void;
  onSelectPerson: (id: string) => void;
}) => {
  const isExpanded = expandedNodeIds.has(node.id);
  const isLight = theme === 'light';
  const isMale = node.gender === 'MALE';
  const isFemale = node.gender === 'FEMALE';

  const isMatchSearch =
    searchQuery &&
    (node.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (node.description && node.description.toLowerCase().includes(searchQuery.toLowerCase())));

  return (
    <div className="select-none">
      <div
        className={`flex items-center gap-2 py-1.5 px-2 rounded-lg cursor-pointer transition-colors group ${
          isMatchSearch
            ? 'bg-amber-500/20 border border-amber-500/40 text-amber-300 font-bold'
            : isLight
            ? 'hover:bg-slate-200/70 text-slate-800'
            : 'hover:bg-slate-800/70 text-slate-200'
        }`}
        style={{ paddingLeft: `${depth * 22 + 8}px` }}
        onClick={() => {
          if (node.isFolder) {
            toggleExpand(node.id);
          } else {
            onSelectPerson(node.id);
          }
        }}
      >
        {/* Chevron Expand/Collapse Icon */}
        {node.isFolder ? (
          <button
            onClick={(e) => {
              e.stopPropagation();
              toggleExpand(node.id);
            }}
            className={`flex h-5 w-5 items-center justify-center rounded transition-colors ${
              isLight ? 'hover:bg-slate-300 text-slate-600' : 'hover:bg-slate-700 text-slate-400'
            }`}
          >
            {isExpanded ? (
              <ChevronDown className="h-4 w-4 text-slate-400" />
            ) : (
              <ChevronRight className="h-4 w-4 text-slate-400" />
            )}
          </button>
        ) : (
          <span className="w-5 shrink-0" />
        )}

        {/* Gender Status Icon in Tree View */}
        <div
          className={`relative flex h-6 w-6 items-center justify-center rounded-lg border shrink-0 font-bold ${
            isMale
              ? 'bg-blue-500/15 border-blue-500/30 text-blue-500'
              : isFemale
              ? 'bg-pink-500/15 border-pink-500/30 text-pink-500'
              : 'bg-purple-500/15 border-purple-500/30 text-purple-500'
          }`}
          title={isMale ? 'เพศชาย ♂' : isFemale ? 'เพศหญิง ♀' : 'ไม่ระบุ'}
        >
          <User className="h-3.5 w-3.5" />
          {node.isDeceased && (
            <span className="absolute -top-1 -right-1 text-[9px] leading-none drop-shadow">❌</span>
          )}
        </div>

        {/* Node Text Info */}
        <div className="flex items-center gap-2 overflow-hidden flex-1 min-w-0">
          <span className="font-medium text-xs truncate">{node.name}</span>

          {/* Spouse Tag */}
          {node.spouseName && (
            <span
              className={`hidden md:inline-flex items-center gap-1 text-[10px] px-1.5 py-0.2 rounded border shrink-0 ${
                isLight
                  ? 'bg-rose-50 text-rose-600 border-rose-200'
                  : 'bg-rose-950/40 text-rose-400 border-rose-900/40'
              }`}
            >
              ❤️ {node.spouseName}
            </span>
          )}

          {/* Direct Children Count Tag */}
          {node.directChildrenCount !== undefined && node.directChildrenCount > 0 && (
            <span
              className={`hidden sm:inline-flex items-center gap-1 text-[10px] px-1.5 py-0.2 rounded border shrink-0 ${
                isLight
                  ? 'bg-amber-50 text-amber-800 border-amber-200 font-semibold'
                  : 'bg-amber-950/40 text-amber-300 border-amber-900/40 font-semibold'
              }`}
            >
              👶 บุตร {node.directChildrenCount} คน
            </span>
          )}

          {/* View Details Button on Hover */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onSelectPerson(node.id);
            }}
            className="ml-auto opacity-0 group-hover:opacity-100 px-2 py-0.5 text-[10px] font-semibold rounded bg-indigo-600 text-white hover:bg-indigo-500 transition-opacity shrink-0"
            title="ดูข้อมูลประวัติรายละเอียด"
          >
            ดูรายละเอียด
          </button>
        </div>
      </div>

      {/* Render Nested Children if Folder is Expanded */}
      {node.isFolder && isExpanded && node.children.length > 0 && (
        <div className={`relative border-l ml-5 ${isLight ? 'border-slate-300' : 'border-slate-800'}`}>
          {node.children.map((child) => (
            <TreeNodeRow
              key={child.id}
              node={child}
              depth={depth + 1}
              theme={theme}
              searchQuery={searchQuery}
              expandedNodeIds={expandedNodeIds}
              toggleExpand={toggleExpand}
              onSelectPerson={onSelectPerson}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export function TreeViewReportModal({
  isOpen,
  theme = 'dark',
  persons,
  unions,
  groups = [],
  activeGroupId = null,
  onClose,
  onSelectPerson,
  onSelectGroup,
}: TreeViewReportModalProps) {
  const isLight = theme === 'light';

  // State for group filtering inside report
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(activeGroupId || null);
  const [reportPersons, setReportPersons] = useState<any[]>(persons);
  const [reportUnions, setReportUnions] = useState<any[]>(unions);

  // Synchronize state when props or isOpen change
  React.useEffect(() => {
    if (isOpen) {
      setSelectedGroupId(activeGroupId || null);
      setReportPersons(persons);
      setReportUnions(unions);
    }
  }, [isOpen, activeGroupId, persons, unions]);

  // Group switch handler inside report modal
  const handleReportGroupChange = async (groupId: string) => {
    setSelectedGroupId(groupId);
    if (onSelectGroup) {
      onSelectGroup(groupId);
    }
    try {
      const res = await fetch(`/api/nodes?groupId=${groupId}`);
      const data = await res.json();
      if (res.ok) {
        setReportPersons(data.persons || []);
        setReportUnions(data.unions || []);
      }
    } catch {
      console.error('Failed to fetch group nodes for report');
    }
  };

  // State for expanded folder node IDs
  const [expandedNodeIds, setExpandedNodeIds] = useState<Set<string>>(new Set());
  const [reportSearchQuery, setReportSearchQuery] = useState('');

  // Build tree hierarchy
  const treeNodes = useMemo(() => buildFamilyTreeNodes(reportPersons, reportUnions), [reportPersons, reportUnions]);

  // Collect all folder IDs
  const allFolderIds = useMemo(() => {
    const ids = new Set<string>();
    const collect = (nodes: TreeNode[]) => {
      nodes.forEach((n) => {
        if (n.isFolder) ids.add(n.id);
        if (n.children.length > 0) collect(n.children);
      });
    };
    collect(treeNodes);
    return ids;
  }, [treeNodes]);

  // Expand All / Collapse All handlers
  const handleExpandAll = () => setExpandedNodeIds(allFolderIds);
  const handleCollapseAll = () => setExpandedNodeIds(new Set());

  // Toggle single node expand state
  const toggleExpand = (id: string) => {
    setExpandedNodeIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  // Stats
  const totalPersons = reportPersons.length;
  const maleCount = reportPersons.filter((p) => p.gender === 'MALE').length;
  const femaleCount = reportPersons.filter((p) => p.gender === 'FEMALE').length;

  // Custom Print Handler: Expand all nodes first then trigger window.print()
  const handlePrint = () => {
    setExpandedNodeIds(allFolderIds);
    setTimeout(() => {
      window.print();
    }, 150);
  };

  if (!isOpen) return null;

  const todayStr = new Date().toLocaleDateString('th-TH', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-in fade-in duration-200">
      {/* Print Stylesheet for A4 Printable Report Layout */}
      <style>{`
        @media print {
          /* Hide backdrop overlay & UI elements */
          body {
            background: white !important;
            color: black !important;
          }
          .no-print, header, button, input, select {
            display: none !important;
          }
          .tree-view-modal-container {
            position: absolute !important;
            top: 0 !important;
            left: 0 !important;
            width: 100% !important;
            height: auto !important;
            max-height: none !important;
            border: none !important;
            box-shadow: none !important;
            background: white !important;
            color: black !important;
            overflow: visible !important;
          }
          .tree-view-modal-body {
            overflow: visible !important;
            height: auto !important;
            max-height: none !important;
            padding: 0 !important;
          }
          .print-header {
            display: block !important;
          }
        }
      `}</style>

      <div
        className={`tree-view-modal-container relative flex h-[90vh] w-full max-w-4xl flex-col rounded-2xl border shadow-2xl overflow-hidden ${
          isLight ? 'bg-white border-slate-200 text-slate-800' : 'bg-slate-900 border-slate-800 text-slate-100'
        }`}
      >
        {/* Print Header (Visible only when printed) */}
        <div className="print-header hidden p-4 mb-4 border-b-2 border-slate-900 text-black">
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-bold">รายงานผังลำดับเครือญาติ (My Relatives Family Tree Report)</h1>
            <span className="text-xs font-mono">วันที่พิมพ์: {todayStr}</span>
          </div>
          <p className="text-xs mt-1 text-slate-600">
            จำนวนสมาชิกทั้งหมด: {totalPersons} คน | ชาย: {maleCount} คน | หญิง: {femaleCount} คน
          </p>
        </div>

        {/* Header */}
        <div
          className={`no-print flex items-center justify-between border-b px-6 py-4 ${
            isLight ? 'border-slate-200 bg-slate-50' : 'border-slate-800 bg-slate-950/60'
          }`}
        >
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/20 border border-amber-500/30 text-amber-500">
              <FolderTree className="h-5 w-5" />
            </div>
            <div>
              <h2 className="font-bold text-base leading-tight">
                รายงานผังลำดับเครือญาติ (Directory Tree Report)
              </h2>
              <p className={`text-xs ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                แสดงผังสายสัมพันธ์ตระกูลในรูปแบบแผนผัง Directory View
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className={`flex items-center gap-1.5 rounded-xl border px-3.5 py-2 text-xs font-semibold transition-all shadow-sm ${
                isLight
                  ? 'border-indigo-300 bg-indigo-50 text-indigo-700 hover:bg-indigo-100'
                  : 'border-indigo-500/40 bg-indigo-950/50 text-indigo-300 hover:bg-indigo-900/60'
              }`}
              title="พิมพ์รายงานผังเครือญาติ (พิมพ์ผังทั้งหมดขยายครบทุกชั้น)"
            >
              <Printer className="h-4 w-4 text-indigo-500" />
              <span>พิมพ์รายงาน</span>
            </button>

            <button
              onClick={onClose}
              className={`flex h-9 w-9 items-center justify-center rounded-xl transition-colors ${
                isLight
                  ? 'bg-slate-100 text-slate-500 hover:bg-rose-100 hover:text-rose-600'
                  : 'bg-slate-800 text-slate-400 hover:bg-rose-500/20 hover:text-rose-400'
              }`}
              title="ปิดหน้าต่าง"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Toolbar & Filter Options */}
        <div
          className={`no-print flex flex-wrap items-center justify-between gap-3 border-b px-6 py-3 text-xs ${
            isLight ? 'border-slate-200 bg-slate-100/50' : 'border-slate-800/80 bg-slate-950/40'
          }`}
        >
          {/* Family Group Selector Dropdown */}
          {groups.length > 0 && (
            <div className="flex items-center gap-2">
              <span className={`font-semibold shrink-0 ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
                กลุ่มเครือญาติ:
              </span>
              <select
                value={selectedGroupId || ''}
                onChange={(e) => handleReportGroupChange(e.target.value)}
                className={`rounded-xl border px-3 py-1.5 font-medium focus:outline-none focus:ring-1 focus:ring-amber-500 ${
                  isLight
                    ? 'border-slate-300 bg-white text-slate-800'
                    : 'border-slate-700 bg-slate-900 text-slate-200'
                }`}
              >
                {groups.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.name} ({g._count?.persons ?? 0} คน)
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Search Input inside Report */}
          <div className="relative flex-1 min-w-[180px] max-w-xs">
            <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
            <input
              type="text"
              value={reportSearchQuery}
              onChange={(e) => setReportSearchQuery(e.target.value)}
              placeholder="ค้นหาชื่อในรายงาน..."
              className={`w-full rounded-xl border py-1.5 pl-8 pr-3 text-xs focus:outline-none focus:ring-1 focus:ring-amber-500 ${
                isLight
                  ? 'border-slate-300 bg-white text-slate-800 placeholder-slate-400'
                  : 'border-slate-700 bg-slate-900 text-slate-200 placeholder-slate-500'
              }`}
            />
          </div>

          {/* Expand / Collapse All Controls */}
          <div className="flex items-center gap-2">
            <button
              onClick={handleExpandAll}
              className={`flex items-center gap-1 rounded-lg border px-2.5 py-1.5 font-medium transition-all ${
                isLight
                  ? 'border-slate-300 bg-white text-slate-700 hover:bg-slate-100'
                  : 'border-slate-700 bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
              title="ขยายโฟลเดอร์ทั้งหมด"
            >
              <Maximize2 className="h-3.5 w-3.5 text-amber-500" />
              <span>ขยายทั้งหมด</span>
            </button>

            <button
              onClick={handleCollapseAll}
              className={`flex items-center gap-1 rounded-lg border px-2.5 py-1.5 font-medium transition-all ${
                isLight
                  ? 'border-slate-300 bg-white text-slate-700 hover:bg-slate-100'
                  : 'border-slate-700 bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
              title="ย่อโฟลเดอร์ทั้งหมด"
            >
              <Minimize2 className="h-3.5 w-3.5 text-amber-500" />
              <span>ย่อทั้งหมด</span>
            </button>
          </div>

          {/* Summary Badges */}
          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1 rounded-lg bg-indigo-500/10 border border-indigo-500/30 px-2.5 py-1 font-semibold text-indigo-400">
              <Users className="h-3.5 w-3.5" />
              <span>ทั้งหมด: {totalPersons} คน</span>
            </span>
            <span className="rounded-lg bg-blue-500/10 border border-blue-500/30 px-2 py-1 font-semibold text-blue-400">
              ชาย: {maleCount}
            </span>
            <span className="rounded-lg bg-pink-500/10 border border-pink-500/30 px-2 py-1 font-semibold text-pink-400">
              หญิง: {femaleCount}
            </span>
          </div>
        </div>

        {/* Directory Tree Report Body Container */}
        <div className="tree-view-modal-body flex-1 overflow-y-auto p-6 font-mono">
          {treeNodes.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center gap-2 text-slate-400">
              <FolderTree className="h-12 w-12 text-slate-500" />
              <p className="text-xs">ยังไม่มีข้อมูลสมาชิกในผังเครือญาติ</p>
            </div>
          ) : (
            <div className="space-y-1">
              {treeNodes.map((node) => (
                <TreeNodeRow
                  key={node.id}
                  node={node}
                  depth={0}
                  theme={theme}
                  searchQuery={reportSearchQuery}
                  expandedNodeIds={expandedNodeIds}
                  toggleExpand={toggleExpand}
                  onSelectPerson={(id) => {
                    onSelectPerson(id);
                    onClose();
                  }}
                />
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div
          className={`no-print flex items-center justify-between border-t px-6 py-3 text-xs ${
            isLight ? 'border-slate-200 bg-slate-50 text-slate-500' : 'border-slate-800 bg-slate-950/60 text-slate-400'
          }`}
        >
          <div className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
            <span>คลิกที่ชื่อสมาชิกเพื่อเปิดหน้าต่างดูประวัติรายละเอียด</span>
          </div>

          <button
            onClick={onClose}
            className={`rounded-xl px-4 py-1.5 font-medium transition-colors ${
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

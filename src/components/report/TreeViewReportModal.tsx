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
} from 'lucide-react';

interface TreeNode {
  id: string;
  name: string;
  gender: string;
  birthDate?: string | null;
  description?: string | null;
  isDeceased?: boolean;
  spouseName?: string | null;
  children: TreeNode[];
  isFolder: boolean;
}

interface TreeViewReportModalProps {
  isOpen: boolean;
  theme?: 'dark' | 'light';
  persons: any[];
  unions: any[];
  onClose: () => void;
  onSelectPerson: (personId: string) => void;
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

    const isFolder = childNodes.length > 0 || spouseNames.length > 0;

    return {
      id: person.id,
      name: person.name,
      gender: person.gender || 'MALE',
      birthDate: person.birthDate,
      description: person.description,
      isDeceased: Boolean(person.isDeceased),
      spouseName: spouseNames.length > 0 ? spouseNames.join(', ') : null,
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

        {/* Yellow Folder Icon vs Document File Icon matching user reference image */}
        {node.isFolder ? (
          <div className="relative flex items-center justify-center shrink-0">
            <svg
              className="h-5 w-5 text-amber-400 drop-shadow-sm"
              fill="currentColor"
              viewBox="0 0 24 24"
            >
              <path d="M10 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2h-8l-2-2z" />
            </svg>
          </div>
        ) : (
          <div className="relative flex items-center justify-center shrink-0">
            <FileText className={`h-4.5 w-4.5 ${isLight ? 'text-slate-600' : 'text-slate-400'}`} />
          </div>
        )}

        {/* Node Text Info */}
        <div className="flex items-center gap-2 overflow-hidden flex-1 min-w-0">
          <span className="font-medium text-xs truncate">{node.name}</span>

          {/* Unified Gender & Deceased Status Badge */}
          <span
            className={`inline-flex items-center gap-1 rounded px-1.5 py-0.2 text-[10px] font-semibold border shrink-0 ${
              isMale
                ? 'bg-blue-500/10 text-blue-500 border-blue-500/30'
                : isFemale
                ? 'bg-pink-500/10 text-pink-500 border-pink-500/30'
                : 'bg-purple-500/10 text-purple-500 border-purple-500/30'
            }`}
          >
            {node.isDeceased && <span className="text-rose-500 font-extrabold text-[11px] leading-none">❌</span>}
            <span>{isMale ? 'ชาย ♂' : isFemale ? 'หญิง ♀' : 'ไม่ระบุ'}</span>
          </span>

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
  onClose,
  onSelectPerson,
}: TreeViewReportModalProps) {
  const isLight = theme === 'light';

  // State for expanded folder node IDs
  const [expandedNodeIds, setExpandedNodeIds] = useState<Set<string>>(new Set());
  const [reportSearchQuery, setReportSearchQuery] = useState('');

  // Build tree hierarchy
  const treeNodes = useMemo(() => buildFamilyTreeNodes(persons, unions), [persons, unions]);

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
  const totalPersons = persons.length;
  const maleCount = persons.filter((p) => p.gender === 'MALE').length;
  const femaleCount = persons.filter((p) => p.gender === 'FEMALE').length;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className={`relative flex h-[90vh] w-full max-w-4xl flex-col rounded-2xl border shadow-2xl overflow-hidden ${
          isLight ? 'bg-white border-slate-200 text-slate-800' : 'bg-slate-900 border-slate-800 text-slate-100'
        }`}
      >
        {/* Header */}
        <div
          className={`flex items-center justify-between border-b px-6 py-4 ${
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
              onClick={() => window.print()}
              className={`flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-semibold transition-all ${
                isLight
                  ? 'border-slate-300 bg-white text-slate-700 hover:bg-slate-100'
                  : 'border-slate-700 bg-slate-800 text-slate-200 hover:bg-slate-700'
              }`}
              title="พิมพ์รายงานผังเครือญาติ"
            >
              <Printer className="h-3.5 w-3.5 text-indigo-500" />
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
          className={`flex flex-wrap items-center justify-between gap-3 border-b px-6 py-3 text-xs ${
            isLight ? 'border-slate-200 bg-slate-100/50' : 'border-slate-800/80 bg-slate-950/40'
          }`}
        >
          {/* Search Input inside Report */}
          <div className="relative flex-1 min-w-[200px] max-w-sm">
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
        <div className="flex-1 overflow-y-auto p-6 font-mono">
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
          className={`flex items-center justify-between border-t px-6 py-3 text-xs ${
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

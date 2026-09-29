'use client';

import React, { useMemo, useCallback, useEffect, useState } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  useReactFlow,
  ReactFlowProvider,
  Node,
  Edge,
  BackgroundVariant,
  Connection,
  addEdge,
  reconnectEdge,
  SelectionMode,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import dagre from '@dagrejs/dagre';
import { CustomNode, PersonNodeData } from './CustomNode';
import { UnionNode, UnionNodeData } from './UnionNode';
import {
  TreeDeciduous,
  FolderTree,
  GitBranch,
  Building2,
  BrainCircuit,
  Share2,
  GitFork,
  X,
  SlidersHorizontal,
  ChevronLeft,
} from 'lucide-react';

export type LayoutMode =
  | 'family_tree'
  | 'collapsible_tree'
  | 'dendrogram'
  | 'org_chart'
  | 'mind_map'
  | 'free_graph';

interface NodeDiagramInnerProps {
  rawPersons: any[];
  rawUnions: any[];
  allUnions?: any[];
  layoutMode?: LayoutMode;
  setLayoutMode?: (mode: LayoutMode) => void;
  focusedUnionId?: string | null;
  setFocusedUnionId?: (unionId: string | null) => void;
  isCompactView?: boolean;
  focusedPersonId?: string | null;
  onSelectNode: (id: string) => void;
  onAddNodeClick: () => void;
}

const nodeTypes = {
  customNode: CustomNode,
  unionNode: UnionNode,
};

// Multi-Layout calculation engine
const getLayoutedElements = (
  nodes: Node[],
  edges: Edge[],
  layoutMode: LayoutMode = 'family_tree',
  isCompact = false
) => {
  if (layoutMode === 'free_graph') {
    return { nodes, edges };
  }

  const dagreGraph = new dagre.graphlib.Graph();
  dagreGraph.setDefaultEdgeLabel(() => ({}));

  const isLR = layoutMode === 'mind_map' || layoutMode === 'dendrogram';
  const isDendrogram = layoutMode === 'dendrogram';

  dagreGraph.setGraph({
    rankdir: isLR ? 'LR' : 'TB',
    nodesep: isDendrogram ? 35 : isLR ? 50 : 75,
    ranksep: isDendrogram ? 160 : isLR ? 120 : 95,
  });

  nodes.forEach((node) => {
    const isUnion = node.type === 'unionNode';
    const width = isUnion ? 34 : isDendrogram ? 140 : isCompact ? 180 : 230;
    const height = isUnion ? 34 : isDendrogram ? 30 : isCompact ? 70 : 120;
    dagreGraph.setNode(node.id, { width, height });
  });

  edges.forEach((edge) => {
    dagreGraph.setEdge(edge.source, edge.target);
  });

  dagre.layout(dagreGraph);

  const layoutedNodes = nodes.map((node) => {
    if (node.position && (node.position.x !== 0 || node.position.y !== 0)) {
      return node;
    }

    const nodeWithPosition = dagreGraph.node(node.id);
    const isUnion = node.type === 'unionNode';
    const widthOffset = isUnion ? 17 : isDendrogram ? 70 : isCompact ? 90 : 115;
    const heightOffset = isUnion ? 17 : isDendrogram ? 15 : isCompact ? 35 : 60;

    return {
      ...node,
      position: {
        x: nodeWithPosition.x - widthOffset,
        y: nodeWithPosition.y - heightOffset,
      },
    };
  });

  return { nodes: layoutedNodes, edges };
};

function NodeDiagramInner({
  rawPersons,
  rawUnions,
  allUnions,
  layoutMode = 'family_tree',
  setLayoutMode,
  focusedUnionId,
  setFocusedUnionId,
  isCompactView = false,
  focusedPersonId = null,
  onSelectNode,
  onAddNodeClick,
}: NodeDiagramInnerProps) {
  const { setCenter } = useReactFlow();

  // Collapsible Unions state (Set of collapsed union IDs)
  const [collapsedUnionIds, setCollapsedUnionIds] = useState<Set<string>>(new Set());

  // Toggle state for Top-Left Control Panel (Hidden by default to prioritize canvas area)
  const [isControlPanelOpen, setIsControlPanelOpen] = useState(false);

  const handleToggleCollapseUnion = useCallback((rawUnionId: string) => {
    setCollapsedUnionIds((prev) => {
      const next = new Set(prev);
      if (next.has(rawUnionId)) {
        next.delete(rawUnionId);
      } else {
        next.add(rawUnionId);
      }
      return next;
    });
  }, []);

  // Compute hidden person and union IDs when unions are collapsed
  const { hiddenPersonIds, hiddenUnionIds } = useMemo(() => {
    const hiddenPersons = new Set<string>();
    const hiddenUnions = new Set<string>();

    if (collapsedUnionIds.size === 0) {
      return { hiddenPersonIds: hiddenPersons, hiddenUnionIds: hiddenUnions };
    }

    const queue: string[] = [];

    // Find direct children of collapsed unions
    collapsedUnionIds.forEach((uId) => {
      const union = rawUnions.find((u) => u.id === uId);
      if (union && union.children) {
        union.children.forEach((child: any) => {
          hiddenPersons.add(child.id);
          queue.push(child.id);
        });
      }
    });

    // BFS downstream descendants & descendant unions
    while (queue.length > 0) {
      const currentPersonId = queue.shift()!;
      const childUnions = rawUnions.filter(
        (u) => u.partner1Id === currentPersonId || u.partner2Id === currentPersonId
      );

      childUnions.forEach((u) => {
        hiddenUnions.add(u.id);
        if (u.children) {
          u.children.forEach((c: any) => {
            if (!hiddenPersons.has(c.id)) {
              hiddenPersons.add(c.id);
              queue.push(c.id);
            }
          });
        }
      });
    }

    return { hiddenPersonIds: hiddenPersons, hiddenUnionIds: hiddenUnions };
  }, [collapsedUnionIds, rawUnions]);

  const { nodes: initialNodes, edges: initialEdges } = useMemo(() => {
    const nodes: Node[] = [];
    const edges: Edge[] = [];

    // Filter visible persons
    const visiblePersons = rawPersons.filter((p) => !hiddenPersonIds.has(p.id));
    // Filter visible unions
    const visibleUnions = rawUnions.filter((u) => !hiddenUnionIds.has(u.id));

    // 1. Person Nodes
    visiblePersons.forEach((p) => {
      const hasSavedPosition =
        p.positionX !== null && p.positionY !== null && layoutMode === 'free_graph';
      const isSearchTarget = focusedPersonId === p.id;

      nodes.push({
        id: p.id,
        type: 'customNode',
        data: {
          id: p.id,
          name: p.name,
          gender: p.gender || 'MALE',
          description: p.description,
          birthDate: p.birthDate,
          images: p.images,
          isCompact: isCompactView,
          layoutMode: layoutMode,
          onNodeClick: onSelectNode,
        } as PersonNodeData,
        position: hasSavedPosition
          ? { x: p.positionX, y: p.positionY }
          : { x: 0, y: 0 },
        selected: isSearchTarget,
      });
    });

    const isBezier = layoutMode === 'mind_map' || layoutMode === 'dendrogram';
    const defaultEdgeType = isBezier ? 'bezier' : 'step';
    const childEdgeStroke = layoutMode === 'dendrogram' ? '#94a3b8' : '#2563eb';

    // 2. Marriage Union Junction Nodes & Edges
    visibleUnions.forEach((u) => {
      const unionNodeId = `union-${u.id}`;
      const childCount = u.children ? u.children.length : 0;
      const isCollapsed = collapsedUnionIds.has(u.id);

      nodes.push({
        id: unionNodeId,
        type: 'unionNode',
        data: {
          id: unionNodeId,
          rawUnionId: u.id,
          childCount,
          isCollapsed,
          onToggleCollapse: handleToggleCollapseUnion,
        } as UnionNodeData,
        position: { x: 0, y: 0 },
      });

      // MARRIAGE EDGES (RED `#ef4444`)
      if (u.partner1Id && !hiddenPersonIds.has(u.partner1Id)) {
        edges.push({
          id: `e-${u.partner1Id}-${unionNodeId}`,
          source: u.partner1Id,
          target: unionNodeId,
          type: defaultEdgeType,
          reconnectable: true,
          style: { stroke: '#ef4444', strokeWidth: 2.5 },
        });
      }

      if (u.partner2Id && !hiddenPersonIds.has(u.partner2Id)) {
        edges.push({
          id: `e-${u.partner2Id}-${unionNodeId}`,
          source: u.partner2Id,
          target: unionNodeId,
          type: defaultEdgeType,
          reconnectable: true,
          style: { stroke: '#ef4444', strokeWidth: 2.5 },
        });
      }

      // PARENT-TO-CHILD EDGES (SLATE/BLUE BEZIER) - only if not collapsed
      if (!isCollapsed && u.children && u.children.length > 0) {
        u.children.forEach((child: any) => {
          if (!hiddenPersonIds.has(child.id)) {
            edges.push({
              id: `e-${unionNodeId}-${child.id}`,
              source: unionNodeId,
              target: child.id,
              type: defaultEdgeType,
              reconnectable: true,
              style: { stroke: childEdgeStroke, strokeWidth: isBezier ? 2 : 2.5 },
            });
          }
        });
      }
    });

    // 3. Fallback direct relation
    visiblePersons.forEach((p) => {
      if (p.parentUnionId && !hiddenUnionIds.has(p.parentUnionId)) {
        const isParentUnionCollapsed = collapsedUnionIds.has(p.parentUnionId);
        if (!isParentUnionCollapsed) {
          const unionNodeId = `union-${p.parentUnionId}`;
          const edgeExists = edges.some((e) => e.source === unionNodeId && e.target === p.id);
          if (!edgeExists) {
            edges.push({
              id: `e-${unionNodeId}-${p.id}`,
              source: unionNodeId,
              target: p.id,
              type: defaultEdgeType,
              reconnectable: true,
              style: { stroke: childEdgeStroke, strokeWidth: isBezier ? 2 : 2.5 },
            });
          }
        }
      }
    });

    return getLayoutedElements(nodes, edges, layoutMode, isCompactView);
  }, [
    rawPersons,
    rawUnions,
    layoutMode,
    isCompactView,
    focusedPersonId,
    onSelectNode,
    hiddenPersonIds,
    hiddenUnionIds,
    collapsedUnionIds,
    handleToggleCollapseUnion,
  ]);

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  React.useEffect(() => {
    setNodes(initialNodes);
    setEdges(initialEdges);
  }, [initialNodes, initialEdges, setNodes, setEdges]);

  // AUTO-ZOOM TO SEARCH TARGET NODE
  useEffect(() => {
    if (!focusedPersonId) return;

    const targetNode = nodes.find((n) => n.id === focusedPersonId);
    if (targetNode) {
      const zoomLevel = 1.3;
      setCenter(targetNode.position.x + 75, targetNode.position.y + 75, {
        zoom: zoomLevel,
        duration: 800,
      });
    }
  }, [focusedPersonId, nodes, setCenter]);

  // PREVENT SELF-CONNECTIONS
  const isValidConnection = useCallback((edge: Edge | Connection) => {
    return edge.source !== edge.target;
  }, []);

  const onNodeDragStop = useCallback((_: unknown, node: Node) => {
    if (node.type === 'customNode') {
      fetch('/api/nodes/positions', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          positions: [{ id: node.id, x: node.position.x, y: node.position.y }],
        }),
      }).catch(() => {});
    }
  }, []);

  const onReconnect = useCallback(
    (oldEdge: Edge, newConnection: Connection) => {
      if (newConnection.source === newConnection.target) return;
      setEdges((els) => reconnectEdge(oldEdge, newConnection, els));
    },
    [setEdges]
  );

  const onConnect = useCallback(
    (params: Connection) => {
      if (params.source === params.target) return;
      const isBezier = layoutMode === 'mind_map' || layoutMode === 'dendrogram';
      const newEdge = {
        ...params,
        type: isBezier ? 'bezier' : 'step',
        reconnectable: true,
        style: { stroke: layoutMode === 'dendrogram' ? '#94a3b8' : '#2563eb', strokeWidth: 2 },
      };
      setEdges((els) => addEdge(newEdge, els));
    },
    [setEdges, layoutMode]
  );

  const unionsForDropdown = allUnions || rawUnions;

  return (
    <div className="relative h-full w-full bg-slate-950">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeDragStop={onNodeDragStop}
        onReconnect={onReconnect}
        onConnect={onConnect}
        isValidConnection={isValidConnection}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ padding: 0.3 }}
        minZoom={0.15}
        maxZoom={2.0}
        selectionOnDrag={true}
        panOnDrag={[1, 2]}
        selectionMode={SelectionMode.Partial}
        defaultEdgeOptions={{
          type: layoutMode === 'mind_map' || layoutMode === 'dendrogram' ? 'bezier' : 'step',
        }}
      >
        <Background color="#334155" variant={BackgroundVariant.Dots} gap={20} size={1} />
        <Controls />
        <MiniMap
          nodeColor={(n) => (n.type === 'unionNode' ? '#ef4444' : '#475569')}
          maskColor="rgba(15, 23, 42, 0.7)"
          className="!bg-slate-900 !border-slate-700 !rounded-xl overflow-hidden"
        />
      </ReactFlow>

      {/* Top-Left Canvas Overlay Toggleable Control Box (Hidden by default to maximize canvas space) */}
      {!isControlPanelOpen ? (
        <button
          onClick={() => setIsControlPanelOpen(true)}
          className="absolute top-4 left-4 z-10 flex items-center gap-2 rounded-xl border border-slate-800 bg-slate-900/90 px-3.5 py-2.5 text-xs font-semibold text-slate-200 shadow-2xl backdrop-blur-md hover:bg-slate-800 hover:border-slate-700 transition-all active:scale-95 group"
          title="คลิกเพื่อเปิดเครื่องมือเลือกรูปแบบผังและตัวกรอง"
        >
          <SlidersHorizontal className="h-4 w-4 text-indigo-400 group-hover:rotate-180 transition-transform duration-300" />
          <span>เครื่องมือผัง & ตัวกรอง</span>
          {focusedUnionId && (
            <span className="flex h-2 w-2 rounded-full bg-indigo-500 animate-ping" />
          )}
        </button>
      ) : (
        <div className="absolute top-4 left-4 z-10 flex flex-col gap-2.5 rounded-2xl border border-slate-800 bg-slate-900/95 p-3.5 shadow-2xl backdrop-blur-md text-xs max-w-xs sm:max-w-md animate-in fade-in zoom-in-95 duration-200">
          {/* Control Panel Header */}
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <div className="flex items-center gap-2 text-slate-200 font-bold">
              <SlidersHorizontal className="h-4 w-4 text-indigo-400" />
              <span>เครื่องมือผัง & ตัวกรอง</span>
            </div>
            <button
              onClick={() => setIsControlPanelOpen(false)}
              className="flex h-6 w-6 items-center justify-center rounded-lg bg-slate-800 text-slate-400 hover:bg-rose-500/20 hover:text-rose-400 transition-colors"
              title="ซ่อนกล่องเครื่องมือ"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
          </div>

          {/* Branch Lineage Filter */}
          {setFocusedUnionId && (
            <div className="flex items-center gap-2 rounded-xl border border-slate-800 bg-slate-950/80 px-2.5 py-1.5">
              <GitFork className="h-4 w-4 text-indigo-400 shrink-0" />
              <span className="text-xs font-semibold text-slate-300 shrink-0">สายตระกูล:</span>
              <select
                value={focusedUnionId || ''}
                onChange={(e) => setFocusedUnionId(e.target.value || null)}
                className="w-full bg-transparent text-xs text-slate-200 font-medium focus:outline-none cursor-pointer truncate"
              >
                <option value="" className="bg-slate-900 text-slate-200">
                  -- แสดงผังทั้งหมด --
                </option>
                {unionsForDropdown.map((u) => {
                  const p1 = rawPersons.find((p) => p.id === u.partner1Id)?.name;
                  const p2 = rawPersons.find((p) => p.id === u.partner2Id)?.name;
                  const label = `${p1 || 'ไม่ระบุ'} ❤️ ${p2 || 'ไม่ระบุ'}`;
                  return (
                    <option key={u.id} value={u.id} className="bg-slate-900 text-slate-200">
                      {label}
                    </option>
                  );
                })}
              </select>
              {focusedUnionId && (
                <button
                  onClick={() => setFocusedUnionId(null)}
                  className="rounded p-0.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800 shrink-0"
                  title="ล้างตัวกรองสายตระกูล"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          )}

          {/* Layout Modes List / Selector Buttons */}
          {setLayoutMode && (
            <div className="flex flex-wrap items-center gap-1 rounded-xl border border-slate-800 bg-slate-950/80 p-1">
              <button
                onClick={() => setLayoutMode('family_tree')}
                className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold transition-all ${
                  layoutMode === 'family_tree'
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                }`}
                title="ผังเครือญาติคลาสสิก"
              >
                <TreeDeciduous className="h-3.5 w-3.5" />
                <span>ผังเครือญาติ</span>
              </button>

              <button
                onClick={() => setLayoutMode('collapsible_tree')}
                className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold transition-all ${
                  layoutMode === 'collapsible_tree'
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                }`}
                title="ผังพับเก็บได้"
              >
                <FolderTree className="h-3.5 w-3.5" />
                <span>ผังพับเก็บได้</span>
              </button>

              <button
                onClick={() => setLayoutMode('dendrogram')}
                className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold transition-all ${
                  layoutMode === 'dendrogram'
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                }`}
                title="ผังเดนโดรแกรม"
              >
                <GitBranch className="h-3.5 w-3.5" />
                <span>ผังเดนโดรแกรม</span>
              </button>

              <button
                onClick={() => setLayoutMode('org_chart')}
                className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold transition-all ${
                  layoutMode === 'org_chart'
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                }`}
                title="ผังองค์กร"
              >
                <Building2 className="h-3.5 w-3.5" />
                <span>ผังองค์กร</span>
              </button>

              <button
                onClick={() => setLayoutMode('mind_map')}
                className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold transition-all ${
                  layoutMode === 'mind_map'
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                }`}
                title="ผังมโนทัศน์"
              >
                <BrainCircuit className="h-3.5 w-3.5" />
                <span>ผังมโนทัศน์</span>
              </button>

              <button
                onClick={() => setLayoutMode('free_graph')}
                className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold transition-all ${
                  layoutMode === 'free_graph'
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                }`}
                title="ผังอิสระ"
              >
                <Share2 className="h-3.5 w-3.5" />
                <span>ผังอิสระ</span>
              </button>
            </div>
          )}

          {/* Expand All Collapsed Branches Button */}
          {collapsedUnionIds.size > 0 && (
            <button
              onClick={() => setCollapsedUnionIds(new Set())}
              className="flex items-center justify-center gap-1.5 rounded-xl bg-amber-500/20 px-3 py-1.5 text-xs font-semibold text-amber-300 border border-amber-500/40 hover:bg-amber-500/30 transition-all active:scale-95"
            >
              <span>ขยายผังทั้งหมด ({collapsedUnionIds.size} สายแต่งงานถูกซ่อน)</span>
            </button>
          )}
        </div>
      )}

      <div className="absolute top-4 right-4 z-10 flex gap-2">
        <button
          onClick={onAddNodeClick}
          className="flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white shadow-lg shadow-indigo-600/30 transition-all hover:bg-indigo-500 active:scale-95"
        >
          <span className="text-lg leading-none">+</span> เพิ่มสมาชิกใหม่
        </button>
      </div>
    </div>
  );
}

export function NodeDiagram(props: NodeDiagramInnerProps) {
  return (
    <ReactFlowProvider>
      <NodeDiagramInner {...props} />
    </ReactFlowProvider>
  );
}

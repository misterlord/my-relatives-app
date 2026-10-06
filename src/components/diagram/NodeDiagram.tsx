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
import { CustomNode, PersonNodeData } from './CustomNode';
import { UnionNode, UnionNodeData } from './UnionNode';
import {
  GitFork,
  X,
  SlidersHorizontal,
  ChevronLeft,
  ZoomIn,
  ZoomOut,
  Maximize,
  Move,
  ArrowDown,
  ArrowRight,
  CornerDownRight,
  Minus,
  Network,
} from 'lucide-react';

export type LayoutMode = 'elk_vertical' | 'elk_horizontal' | 'free_graph';
export type EdgeRoutingType = 'step' | 'straight';

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
  theme?: 'dark' | 'light';
  onSelectNode: (id: string) => void;
  onAddNodeClick: () => void;
}

const nodeTypes = {
  customNode: CustomNode,
  unionNode: UnionNode,
};

// Dual-Direction ELKjs Layered Subtree Layout Engine (Vertical & Horizontal)
const getElkTreeLayout = (
  nodes: Node[],
  edges: Edge[],
  direction: 'TB' | 'LR' = 'TB',
  isCompact = false
) => {
  const isLR = direction === 'LR';
  const nodeMap = new Map<string, Node>(nodes.map((n) => [n.id, n]));
  const childrenMap = new Map<string, string[]>();
  const parentMap = new Map<string, string[]>();

  nodes.forEach((n) => {
    childrenMap.set(n.id, []);
    parentMap.set(n.id, []);
  });

  edges.forEach((e) => {
    if (childrenMap.has(e.source)) {
      childrenMap.get(e.source)!.push(e.target);
    }
    if (parentMap.has(e.target)) {
      parentMap.get(e.target)!.push(e.source);
    }
  });

  const getNodeWidth = (id: string) => {
    const node = nodeMap.get(id);
    if (!node) return 200;
    return node.type === 'unionNode' ? 34 : isCompact ? 180 : 230;
  };

  const getNodeHeight = (id: string) => {
    const node = nodeMap.get(id);
    if (!node) return 100;
    return node.type === 'unionNode' ? 34 : isCompact ? 70 : 120;
  };

  const siblingGap = isLR ? 35 : 45;
  const levelGap = isLR ? 160 : 110;

  const rootIds = nodes
    .filter((n) => (parentMap.get(n.id) || []).length === 0)
    .map((n) => n.id);

  const subtreeSizes = new Map<string, number>();

  const computeSubtreeSize = (id: string, visited = new Set<string>()): number => {
    if (visited.has(id)) return isLR ? getNodeHeight(id) : getNodeWidth(id);
    visited.add(id);

    const children = childrenMap.get(id) || [];
    const selfSize = isLR ? getNodeHeight(id) : getNodeWidth(id);

    if (children.length === 0) {
      subtreeSizes.set(id, selfSize);
      return selfSize;
    }

    let totalChildrenSize = 0;
    children.forEach((cId, idx) => {
      const cs = computeSubtreeSize(cId, visited);
      totalChildrenSize += cs;
      if (idx > 0) totalChildrenSize += siblingGap;
    });

    const size = Math.max(selfSize, totalChildrenSize);
    subtreeSizes.set(id, size);
    return size;
  };

  const visitedCompute = new Set<string>();
  rootIds.forEach((rId) => computeSubtreeSize(rId, visitedCompute));

  const nodePositions = new Map<string, { x: number; y: number }>();

  const positionNode = (
    id: string,
    startCrossPos: number,
    currentLevelPos: number,
    visited = new Set<string>()
  ) => {
    if (visited.has(id)) return;
    visited.add(id);

    const nodeW = getNodeWidth(id);
    const nodeH = getNodeHeight(id);
    const children = childrenMap.get(id) || [];
    const selfCrossSize = isLR ? nodeH : nodeW;
    const selfLevelSize = isLR ? nodeW : nodeH;

    if (children.length === 0) {
      const stSize = subtreeSizes.get(id) || selfCrossSize;
      const crossPos = startCrossPos + (stSize - selfCrossSize) / 2;
      nodePositions.set(id, isLR ? { x: currentLevelPos, y: crossPos } : { x: crossPos, y: currentLevelPos });
      return;
    }

    const stSize = subtreeSizes.get(id) || selfCrossSize;
    let childCrossPos = startCrossPos;
    const nextLevelPos = currentLevelPos + selfLevelSize + levelGap;

    children.forEach((cId) => {
      const cs = subtreeSizes.get(cId) || (isLR ? getNodeHeight(cId) : getNodeWidth(cId));
      positionNode(cId, childCrossPos, nextLevelPos, visited);
      childCrossPos += cs + siblingGap;
    });

    const firstChildPos = nodePositions.get(children[0]);
    const lastChildPos = nodePositions.get(children[children.length - 1]);

    if (firstChildPos && lastChildPos) {
      const firstCross = isLR ? firstChildPos.y : firstChildPos.x;
      const lastCross = isLR ? lastChildPos.y : lastChildPos.x;
      const firstCrossSize = isLR ? getNodeHeight(children[0]) : getNodeWidth(children[0]);
      const lastCrossSize = isLR ? getNodeHeight(children[children.length - 1]) : getNodeWidth(children[children.length - 1]);

      const centerFirst = firstCross + firstCrossSize / 2;
      const centerLast = lastCross + lastCrossSize / 2;

      const parentCenterCross = (centerFirst + centerLast) / 2;
      const crossPos = parentCenterCross - selfCrossSize / 2;

      nodePositions.set(id, isLR ? { x: currentLevelPos, y: crossPos } : { x: crossPos, y: currentLevelPos });
    } else {
      const crossPos = startCrossPos + (stSize - selfCrossSize) / 2;
      nodePositions.set(id, isLR ? { x: currentLevelPos, y: crossPos } : { x: crossPos, y: currentLevelPos });
    }
  };

  let rootCrossPos = 0;
  const visitedPos = new Set<string>();

  rootIds.forEach((rId) => {
    const ss = subtreeSizes.get(rId) || (isLR ? getNodeHeight(rId) : getNodeWidth(rId));
    positionNode(rId, rootCrossPos, 0, visitedPos);
    rootCrossPos += ss + 90;
  });

  nodes.forEach((n) => {
    if (!nodePositions.has(n.id)) {
      nodePositions.set(n.id, isLR ? { x: 0, y: rootCrossPos } : { x: rootCrossPos, y: 0 });
      rootCrossPos += (isLR ? getNodeHeight(n.id) : getNodeWidth(n.id)) + 60;
    }
  });

  const layoutedNodes = nodes.map((node) => {
    const pos = nodePositions.get(node.id) || { x: 0, y: 0 };
    return {
      ...node,
      position: pos,
    };
  });

  return { nodes: layoutedNodes, edges };
};

const getLayoutedElements = (
  nodes: Node[],
  edges: Edge[],
  layoutMode: LayoutMode = 'elk_vertical',
  isCompact = false
) => {
  if (layoutMode === 'free_graph') {
    return { nodes, edges };
  }

  const direction = layoutMode === 'elk_horizontal' ? 'LR' : 'TB';
  return getElkTreeLayout(nodes, edges, direction, isCompact);
};

function NodeDiagramInner({
  rawPersons,
  rawUnions,
  allUnions,
  layoutMode = 'elk_vertical',
  setLayoutMode,
  focusedUnionId,
  setFocusedUnionId,
  isCompactView = false,
  focusedPersonId = null,
  theme = 'dark',
  onSelectNode,
  onAddNodeClick,
}: NodeDiagramInnerProps) {
  const isLight = theme === 'light';
  const { setCenter, zoomIn, zoomOut, fitView, getZoom, setViewport } = useReactFlow();

  const [currentZoomLevel, setCurrentZoomLevel] = useState<number>(1);

  // Flexible Edge Routing state: 'step' (Orthogonal 90° lines) or 'straight' (Straight lines)
  const [edgeRouting, setEdgeRouting] = useState<EdgeRoutingType>('step');

  // Toggle state for Top-Left Control Panel
  const [isControlPanelOpen, setIsControlPanelOpen] = useState(false);

  const { nodes: initialNodes, edges: initialEdges } = useMemo(() => {
    const nodes: Node[] = [];
    const edges: Edge[] = [];

    // 1. Person Nodes
    rawPersons.forEach((p) => {
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
          theme: theme,
          onNodeClick: onSelectNode,
        } as PersonNodeData,
        position: hasSavedPosition
          ? { x: p.positionX, y: p.positionY }
          : { x: 0, y: 0 },
        selected: isSearchTarget,
      });
    });

    const defaultEdgeType = edgeRouting; // 'step' for 90° orthogonal, 'straight' for direct lines
    const childEdgeStroke = isLight ? '#10b981' : '#34d399'; // Emerald green stroke for ELK tree connections

    // 2. Marriage Union Junction Nodes & Edges
    rawUnions.forEach((u) => {
      const unionNodeId = `union-${u.id}`;
      const childCount = u.children ? u.children.length : 0;

      nodes.push({
        id: unionNodeId,
        type: 'unionNode',
        data: {
          id: unionNodeId,
          rawUnionId: u.id,
          childCount,
          isCollapsed: false,
          theme: theme,
        } as UnionNodeData,
        position: { x: 0, y: 0 },
      });

      // MARRIAGE EDGES (RED `#ef4444`)
      if (u.partner1Id) {
        edges.push({
          id: `e-${u.partner1Id}-${unionNodeId}`,
          source: u.partner1Id,
          target: unionNodeId,
          type: defaultEdgeType,
          reconnectable: true,
          style: { stroke: '#ef4444', strokeWidth: 2.5 },
        });
      }

      if (u.partner2Id) {
        edges.push({
          id: `e-${u.partner2Id}-${unionNodeId}`,
          source: u.partner2Id,
          target: unionNodeId,
          type: defaultEdgeType,
          reconnectable: true,
          style: { stroke: '#ef4444', strokeWidth: 2.5 },
        });
      }

      // PARENT-TO-CHILD EDGES (GREEN/EMERALD STEP OR STRAIGHT)
      if (u.children && u.children.length > 0) {
        u.children.forEach((child: any) => {
          edges.push({
            id: `e-${unionNodeId}-${child.id}`,
            source: unionNodeId,
            target: child.id,
            type: defaultEdgeType,
            reconnectable: true,
            style: { stroke: childEdgeStroke, strokeWidth: 2.5 },
          });
        });
      }
    });

    // 3. Fallback direct relation
    rawPersons.forEach((p) => {
      if (p.parentUnionId) {
        const unionNodeId = `union-${p.parentUnionId}`;
        const edgeExists = edges.some((e) => e.source === unionNodeId && e.target === p.id);
        if (!edgeExists) {
          edges.push({
            id: `e-${unionNodeId}-${p.id}`,
            source: unionNodeId,
            target: p.id,
            type: defaultEdgeType,
            reconnectable: true,
            style: { stroke: childEdgeStroke, strokeWidth: 2.5 },
          });
        }
      }
    });

    return getLayoutedElements(nodes, edges, layoutMode, isCompactView);
  }, [
    rawPersons,
    rawUnions,
    layoutMode,
    isCompactView,
    edgeRouting,
    theme,
    isLight,
    focusedPersonId,
    onSelectNode,
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
      const newEdge = {
        ...params,
        type: edgeRouting,
        reconnectable: true,
        style: {
          stroke: isLight ? '#10b981' : '#34d399',
          strokeWidth: 2.5,
        },
      };
      setEdges((els) => addEdge(newEdge, els));
    },
    [setEdges, edgeRouting, isLight]
  );

  // Update zoom indicator when viewport changes
  const handleMove = useCallback(() => {
    const z = getZoom();
    if (z) setCurrentZoomLevel(z);
  }, [getZoom]);

  const unionsForDropdown = allUnions || rawUnions;

  return (
    <div className={`relative h-full w-full ${isLight ? 'bg-slate-100' : 'bg-slate-950'}`}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeDragStop={onNodeDragStop}
        onReconnect={onReconnect}
        onConnect={onConnect}
        onMove={handleMove}
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
          type: edgeRouting,
        }}
      >
        <Background
          color={isLight ? '#cbd5e1' : '#334155'}
          variant={BackgroundVariant.Dots}
          gap={20}
          size={1}
        />
        <MiniMap
          nodeColor={(n) => (n.type === 'unionNode' ? '#ef4444' : isLight ? '#94a3b8' : '#475569')}
          maskColor={isLight ? 'rgba(241, 245, 249, 0.7)' : 'rgba(15, 23, 42, 0.7)'}
          className={`!rounded-xl overflow-hidden ${
            isLight ? '!bg-white !border-slate-300' : '!bg-slate-900 !border-slate-700'
          }`}
        />
      </ReactFlow>

      {/* Enhanced Interactive Zoom & Pan Control Bar */}
      <div className="absolute bottom-6 right-6 z-20 flex items-center gap-1.5 rounded-2xl border p-1.5 shadow-2xl backdrop-blur-md">
        <div
          className={`flex items-center gap-1 rounded-xl p-1 ${
            isLight
              ? 'bg-white/95 border border-slate-200 text-slate-800 shadow-lg'
              : 'bg-slate-900/95 border border-slate-800 text-slate-200 shadow-2xl'
          }`}
        >
          {/* Zoom In Button */}
          <button
            onClick={() => zoomIn({ duration: 300 })}
            className={`flex h-9 w-9 items-center justify-center rounded-lg transition-colors ${
              isLight ? 'hover:bg-slate-100 text-slate-700' : 'hover:bg-slate-800 text-slate-200'
            }`}
            title="Zoom In (ขยายภาพ)"
          >
            <ZoomIn className="h-4.5 w-4.5" />
          </button>

          {/* Zoom Out Button */}
          <button
            onClick={() => zoomOut({ duration: 300 })}
            className={`flex h-9 w-9 items-center justify-center rounded-lg transition-colors ${
              isLight ? 'hover:bg-slate-100 text-slate-700' : 'hover:bg-slate-800 text-slate-200'
            }`}
            title="Zoom Out (ย่อภาพ)"
          >
            <ZoomOut className="h-4.5 w-4.5" />
          </button>

          {/* Zoom Percentage Badge & Reset */}
          <button
            onClick={() => setViewport({ x: 0, y: 0, zoom: 1.0 }, { duration: 400 })}
            className={`flex h-9 items-center px-2.5 rounded-lg text-xs font-mono font-bold transition-colors ${
              isLight
                ? 'bg-slate-100 text-indigo-700 hover:bg-slate-200'
                : 'bg-slate-800 text-indigo-300 hover:bg-slate-700'
            }`}
            title="คลิกเพื่อรีเซ็ตขนาดซูม 100%"
          >
            {Math.round(currentZoomLevel * 100)}%
          </button>

          <div className={`h-4 w-px ${isLight ? 'bg-slate-200' : 'bg-slate-800'}`} />

          {/* Fit View Button */}
          <button
            onClick={() => fitView({ duration: 500, padding: 0.25 })}
            className={`flex h-9 w-9 items-center justify-center rounded-lg transition-colors ${
              isLight ? 'hover:bg-slate-100 text-slate-700' : 'hover:bg-slate-800 text-slate-200'
            }`}
            title="Fit View (จัดผังพอดีหน้าจอ)"
          >
            <Maximize className="h-4.5 w-4.5" />
          </button>

          {/* Pan Indicator Hint */}
          <div
            className={`hidden sm:flex items-center gap-1 px-2.5 text-[11px] font-medium border-l ${
              isLight ? 'border-slate-200 text-slate-500' : 'border-slate-800 text-slate-400'
            }`}
            title="คุณสามารถคลิกค้างและลากเพื่อเลื่อนพื้นที่ (Pan) Canvas ได้"
          >
            <Move className="h-3.5 w-3.5 text-indigo-500" />
            <span>Pan Area</span>
          </div>
        </div>
      </div>

      {/* Top-Left Canvas Overlay ELK Tree View & Edge Controls Box */}
      {!isControlPanelOpen ? (
        <button
          onClick={() => setIsControlPanelOpen(true)}
          className={`absolute top-4 left-4 z-10 flex items-center gap-2 rounded-xl border px-3.5 py-2.5 text-xs font-semibold shadow-2xl backdrop-blur-md transition-all active:scale-95 group ${
            isLight
              ? 'bg-white/95 border-slate-300 text-slate-800 hover:bg-slate-100'
              : 'bg-slate-900/90 border-slate-800 text-slate-200 hover:bg-slate-800'
          }`}
          title="คลิกเพื่อเปิดเครื่องมือเลือกมุมมองผัง ELK และเส้นความสัมพันธ์"
        >
          <SlidersHorizontal className="h-4 w-4 text-indigo-500 group-hover:rotate-180 transition-transform duration-300" />
          <span>เครื่องมือผัง ELK Tree</span>
          {focusedUnionId && (
            <span className="flex h-2 w-2 rounded-full bg-indigo-500 animate-ping" />
          )}
        </button>
      ) : (
        <div
          className={`absolute top-4 left-4 z-10 flex flex-col gap-3 rounded-2xl border p-4 shadow-2xl backdrop-blur-md text-xs max-w-xs sm:max-w-md animate-in fade-in zoom-in-95 duration-200 ${
            isLight
              ? 'bg-white/95 border-slate-300 text-slate-800'
              : 'bg-slate-900/95 border-slate-800 text-slate-200'
          }`}
        >
          {/* Control Panel Header */}
          <div
            className={`flex items-center justify-between border-b pb-2 ${
              isLight ? 'border-slate-200' : 'border-slate-800'
            }`}
          >
            <div className="flex items-center gap-2 font-bold text-sm">
              <Network className="h-4 w-4 text-emerald-500" />
              <span>เครื่องมือผัง ELK Tree</span>
            </div>
            <button
              onClick={() => setIsControlPanelOpen(false)}
              className={`flex h-6 w-6 items-center justify-center rounded-lg transition-colors ${
                isLight
                  ? 'bg-slate-100 text-slate-500 hover:bg-rose-100 hover:text-rose-600'
                  : 'bg-slate-800 text-slate-400 hover:bg-rose-500/20 hover:text-rose-400'
              }`}
              title="ซ่อนกล่องเครื่องมือ"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
          </div>

          {/* 1. ELK Tree View Direction Selector (Vertical vs Horizontal) */}
          <div className="space-y-1.5">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              ทิศทางแสดงผล (Layout Direction)
            </span>
            {setLayoutMode && (
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setLayoutMode('elk_vertical')}
                  className={`flex items-center justify-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-bold transition-all ${
                    layoutMode === 'elk_vertical'
                      ? 'bg-indigo-600 text-white border-indigo-500 shadow-md'
                      : isLight
                      ? 'bg-slate-50 border-slate-300 text-slate-700 hover:bg-slate-100'
                      : 'bg-slate-950 border-slate-800 text-slate-300 hover:bg-slate-800'
                  }`}
                  title="แสดงผังแบบแนวตั้ง (จากบนลงล่าง Top-Down)"
                >
                  <ArrowDown className="h-4 w-4 text-indigo-400" />
                  <span>แนวตั้ง (Vertical)</span>
                </button>

                <button
                  onClick={() => setLayoutMode('elk_horizontal')}
                  className={`flex items-center justify-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-bold transition-all ${
                    layoutMode === 'elk_horizontal'
                      ? 'bg-indigo-600 text-white border-indigo-500 shadow-md'
                      : isLight
                      ? 'bg-slate-50 border-slate-300 text-slate-700 hover:bg-slate-100'
                      : 'bg-slate-950 border-slate-800 text-slate-300 hover:bg-slate-800'
                  }`}
                  title="แสดงผังแบบแนวนอน (จากซ้ายไปขวา Left-to-Right)"
                >
                  <ArrowRight className="h-4 w-4 text-indigo-400" />
                  <span>แนวนอน (Horizontal)</span>
                </button>
              </div>
            )}
          </div>

          {/* 2. Flexible Edge Routing Selector (Orthogonal 90° vs Straight Line) */}
          <div className="space-y-1.5">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              รูปแบบเส้นความสัมพันธ์ (Edge Style)
            </span>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setEdgeRouting('step')}
                className={`flex items-center justify-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-bold transition-all ${
                  edgeRouting === 'step'
                    ? 'bg-emerald-600 text-white border-emerald-500 shadow-md'
                    : isLight
                    ? 'bg-slate-50 border-slate-300 text-slate-700 hover:bg-slate-100'
                    : 'bg-slate-950 border-slate-800 text-slate-300 hover:bg-slate-800'
                }`}
                title="เส้นฉากทำมุม 90 องศา (Orthogonal Step Line)"
              >
                <CornerDownRight className="h-4 w-4 text-emerald-300" />
                <span>เส้นหักมุม 90°</span>
              </button>

              <button
                onClick={() => setEdgeRouting('straight')}
                className={`flex items-center justify-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-bold transition-all ${
                  edgeRouting === 'straight'
                    ? 'bg-emerald-600 text-white border-emerald-500 shadow-md'
                    : isLight
                    ? 'bg-slate-50 border-slate-300 text-slate-700 hover:bg-slate-100'
                    : 'bg-slate-950 border-slate-800 text-slate-300 hover:bg-slate-800'
                }`}
                title="เส้นตรงเชื่อมโยงจุดต่อจุด (Straight Line)"
              >
                <Minus className="h-4 w-4 text-emerald-300" />
                <span>เส้นตรง (Straight)</span>
              </button>
            </div>
          </div>

          {/* 3. Branch Lineage Filter */}
          {setFocusedUnionId && (
            <div
              className={`flex items-center gap-2 rounded-xl border px-2.5 py-1.5 ${
                isLight ? 'bg-slate-50 border-slate-300' : 'bg-slate-950/80 border-slate-800'
              }`}
            >
              <GitFork className="h-4 w-4 text-indigo-500 shrink-0" />
              <span className="text-xs font-semibold shrink-0">สายตระกูล:</span>
              <select
                value={focusedUnionId || ''}
                onChange={(e) => setFocusedUnionId(e.target.value || null)}
                className="w-full bg-transparent text-xs font-medium focus:outline-none cursor-pointer truncate"
              >
                <option value="" className={isLight ? 'bg-white text-slate-800' : 'bg-slate-900 text-slate-200'}>
                  -- แสดงผังทั้งหมด --
                </option>
                {unionsForDropdown.map((u) => {
                  const p1 = rawPersons.find((p) => p.id === u.partner1Id)?.name;
                  const p2 = rawPersons.find((p) => p.id === u.partner2Id)?.name;
                  const label = `${p1 || 'ไม่ระบุ'} ❤️ ${p2 || 'ไม่ระบุ'}`;
                  return (
                    <option
                      key={u.id}
                      value={u.id}
                      className={isLight ? 'bg-white text-slate-800' : 'bg-slate-900 text-slate-200'}
                    >
                      {label}
                    </option>
                  );
                })}
              </select>
              {focusedUnionId && (
                <button
                  onClick={() => setFocusedUnionId(null)}
                  className={`rounded p-0.5 shrink-0 ${
                    isLight ? 'hover:bg-slate-200 text-slate-500' : 'hover:bg-slate-800 text-slate-400'
                  }`}
                  title="ล้างตัวกรองสายตระกูล"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
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

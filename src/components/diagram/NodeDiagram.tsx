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
  getNodesBounds,
  getViewportForBounds,
} from '@xyflow/react';
import { toJpeg } from 'html-to-image';
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
  Download,
  Image as ImageIcon,
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
  onRefreshNeeded?: () => void;
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

  // Sort children of each node by order (data.order) to enforce sibling ordering (left = older/พี่, right = younger/น้อง)
  childrenMap.forEach((childrenList) => {
    childrenList.sort((aId, bId) => {
      const nodeA = nodeMap.get(aId);
      const nodeB = nodeMap.get(bId);
      const orderA = (nodeA?.data?.order as number) ?? 0;
      const orderB = (nodeB?.data?.order as number) ?? 0;
      return orderA - orderB;
    });
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

// Calculates relative handle positions (top, bottom, left, right) based on source & target node centers
export function getRelativeHandleIds(
  sourceNode: Node,
  targetNode: Node,
  layoutMode: LayoutMode = 'elk_vertical'
): { sourceHandle: string; targetHandle: string } {
  const isUnionSource = sourceNode.type === 'unionNode';
  const isUnionTarget = targetNode.type === 'unionNode';

  const sourceW = isUnionSource ? 34 : 220;
  const sourceH = isUnionSource ? 34 : 100;
  const targetW = isUnionTarget ? 34 : 220;
  const targetH = isUnionTarget ? 34 : 100;

  const sourceCenterX = (sourceNode.position?.x ?? 0) + sourceW / 2;
  const sourceCenterY = (sourceNode.position?.y ?? 0) + sourceH / 2;
  const targetCenterX = (targetNode.position?.x ?? 0) + targetW / 2;
  const targetCenterY = (targetNode.position?.y ?? 0) + targetH / 2;

  const dx = targetCenterX - sourceCenterX;
  const dy = targetCenterY - sourceCenterY;

  let sourceSide: 'top' | 'bottom' | 'left' | 'right' = 'bottom';
  let targetSide: 'top' | 'bottom' | 'left' | 'right' = 'top';

  if (layoutMode === 'elk_horizontal') {
    if (Math.abs(dx) >= Math.abs(dy) * 0.5) {
      if (dx >= 0) {
        sourceSide = 'right';
        targetSide = 'left';
      } else {
        sourceSide = 'left';
        targetSide = 'right';
      }
    } else {
      if (dy >= 0) {
        sourceSide = 'bottom';
        targetSide = 'top';
      } else {
        sourceSide = 'top';
        targetSide = 'bottom';
      }
    }
  } else {
    if (Math.abs(dy) >= Math.abs(dx) * 0.5) {
      if (dy >= 0) {
        sourceSide = 'bottom';
        targetSide = 'top';
      } else {
        sourceSide = 'top';
        targetSide = 'bottom';
      }
    } else {
      if (dx >= 0) {
        sourceSide = 'right';
        targetSide = 'left';
      } else {
        sourceSide = 'left';
        targetSide = 'right';
      }
    }
  }

  const sourceHandle = isUnionSource ? `union-${sourceSide}-source` : `${sourceSide}-source`;
  const targetHandle = isUnionTarget ? `union-${targetSide}-target` : `${targetSide}-target`;

  return { sourceHandle, targetHandle };
}

const getLayoutedElements = (
  nodes: Node[],
  edges: Edge[],
  layoutMode: LayoutMode = 'elk_vertical',
  isCompact = false
) => {
  let layoutResult = { nodes, edges };
  if (layoutMode !== 'free_graph') {
    const direction = layoutMode === 'elk_horizontal' ? 'LR' : 'TB';
    layoutResult = getElkTreeLayout(nodes, edges, direction, isCompact);
  }

  const nodeMap = new Map<string, Node>(layoutResult.nodes.map((n) => [n.id, n]));
  const updatedEdges = layoutResult.edges.map((edge) => {
    const sourceNode = nodeMap.get(edge.source);
    const targetNode = nodeMap.get(edge.target);

    let defaultSourceHandle = 'bottom-source';
    let defaultTargetHandle = 'top-target';

    if (layoutMode === 'elk_horizontal') {
      defaultSourceHandle = 'right-source';
      defaultTargetHandle = 'left-target';
    } else if (layoutMode === 'free_graph' && sourceNode && targetNode) {
      const rel = getRelativeHandleIds(sourceNode, targetNode, layoutMode);
      defaultSourceHandle = rel.sourceHandle;
      defaultTargetHandle = rel.targetHandle;
    }

    return {
      ...edge,
      sourceHandle: edge.sourceHandle || defaultSourceHandle,
      targetHandle: edge.targetHandle || defaultTargetHandle,
    };
  });

  return { nodes: layoutResult.nodes, edges: updatedEdges };
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
  onRefreshNeeded,
}: NodeDiagramInnerProps) {
  const isLight = theme === 'light';
  const { setCenter, zoomIn, zoomOut, fitView, getZoom, setViewport } = useReactFlow();

  const [currentZoomLevel, setCurrentZoomLevel] = useState<number>(1);
  const [isExportingJpeg, setIsExportingJpeg] = useState(false);
  const { getNodes } = useReactFlow();

  // Export Diagram to JPEG Image Handler
  const handleExportJpeg = useCallback(async () => {
    const currentNodes = getNodes();
    if (!currentNodes || currentNodes.length === 0) return;

    setIsExportingJpeg(true);
    try {
      const viewportElement = document.querySelector('.react-flow__viewport') as HTMLElement;
      if (!viewportElement) throw new Error('Viewport element not found');

      // Calculate bounding box for all diagram nodes
      const nodesBounds = getNodesBounds(currentNodes);
      const minWidth = 1400;
      const minHeight = 900;
      const imageWidth = Math.max(minWidth, Math.round(nodesBounds.width + 240));
      const imageHeight = Math.max(minHeight, Math.round(nodesBounds.height + 240));

      const viewport = getViewportForBounds(
        nodesBounds,
        imageWidth,
        imageHeight,
        0.2,
        2.0,
        0.15
      );

      const dataUrl = await toJpeg(viewportElement, {
        backgroundColor: isLight ? '#f1f5f9' : '#020617',
        width: imageWidth,
        height: imageHeight,
        style: {
          width: `${imageWidth}px`,
          height: `${imageHeight}px`,
          transform: `translate(${viewport.x}px, ${viewport.y}px) scale(${viewport.zoom})`,
        },
        quality: 0.95,
        pixelRatio: 2,
      });

      const dateStr = new Date().toISOString().slice(0, 10);
      const link = document.createElement('a');
      link.download = `my-relatives-family-tree-${dateStr}.jpg`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error('Failed to export JPEG:', err);
      alert('เกิดข้อผิดพลาด ไม่สามารถส่งออกรูปภาพ JPEG ได้ในขณะนี้');
    } finally {
      setIsExportingJpeg(false);
    }
  }, [getNodes, isLight]);

  // Flexible Edge Routing state: 'straight' (Straight lines) or 'step' (Orthogonal 90° lines)
  const [edgeRouting, setEdgeRouting] = useState<EdgeRoutingType>('straight');

  // Toggle state for Top-Left Control Panel
  const [isControlPanelOpen, setIsControlPanelOpen] = useState(false);

  const { nodes: initialNodes, edges: initialEdges } = useMemo(() => {
    const nodes: Node[] = [];
    const edges: Edge[] = [];

    // Build direct children count map (only direct child nodes attached to parent's unions)
    const childrenCountMap = new Map<string, number>();
    const unionMap = new Map<string, any>(rawUnions.map((u) => [u.id, u]));

    rawPersons.forEach((p) => {
      if (p.parentUnionId) {
        const parentUnion = unionMap.get(p.parentUnionId);
        if (parentUnion) {
          if (parentUnion.partner1Id) {
            childrenCountMap.set(
              parentUnion.partner1Id,
              (childrenCountMap.get(parentUnion.partner1Id) || 0) + 1
            );
          }
          if (parentUnion.partner2Id) {
            childrenCountMap.set(
              parentUnion.partner2Id,
              (childrenCountMap.get(parentUnion.partner2Id) || 0) + 1
            );
          }
        }
      }
    });

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
          isDeceased: Boolean(p.isDeceased),
          childrenCount: childrenCountMap.get(p.id) || 0,
          order: p.order || 0,
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

    const defaultEdgeType = edgeRouting; // Default 'straight' for direct parent-child connections
    const directEdgeStroke = isLight ? '#10b981' : '#34d399'; // Emerald green stroke for parent-child connections
    const defaultSourceHandle = layoutMode === 'elk_horizontal' ? 'right-source' : 'bottom-source';
    const defaultTargetHandle = layoutMode === 'elk_horizontal' ? 'left-target' : 'top-target';

    // 2. Direct Parent-to-Child Edges (Straight Lines, Directional Handles)
    rawUnions.forEach((u) => {
      if (u.children && u.children.length > 0) {
        u.children.forEach((child: any) => {
          // Connect Partner 1 (e.g. Father) directly to Child
          if (u.partner1Id) {
            const edgeId = `e-${u.partner1Id}-${child.id}`;
            if (!edges.some((e) => e.id === edgeId)) {
              edges.push({
                id: edgeId,
                source: u.partner1Id,
                target: child.id,
                sourceHandle: defaultSourceHandle,
                targetHandle: defaultTargetHandle,
                type: defaultEdgeType,
                reconnectable: true,
                style: { stroke: directEdgeStroke, strokeWidth: 2.5 },
              });
            }
          }

          // Connect Partner 2 (e.g. Mother) directly to Child
          if (u.partner2Id) {
            const edgeId = `e-${u.partner2Id}-${child.id}`;
            if (!edges.some((e) => e.id === edgeId)) {
              edges.push({
                id: edgeId,
                source: u.partner2Id,
                target: child.id,
                sourceHandle: defaultSourceHandle,
                targetHandle: defaultTargetHandle,
                type: defaultEdgeType,
                reconnectable: true,
                style: { stroke: directEdgeStroke, strokeWidth: 2.5 },
              });
            }
          }
        });
      }
    });

    // 3. Fallback Direct Parent-Child Relation
    rawPersons.forEach((p) => {
      if (p.parentUnionId) {
        const parentUnion = rawUnions.find((u) => u.id === p.parentUnionId);
        if (parentUnion) {
          [parentUnion.partner1Id, parentUnion.partner2Id].forEach((parentPersonId) => {
            if (parentPersonId) {
              const edgeId = `e-${parentPersonId}-${p.id}`;
              if (!edges.some((e) => e.id === edgeId)) {
                edges.push({
                  id: edgeId,
                  source: parentPersonId,
                  target: p.id,
                  sourceHandle: defaultSourceHandle,
                  targetHandle: defaultTargetHandle,
                  type: defaultEdgeType,
                  reconnectable: true,
                  style: { stroke: directEdgeStroke, strokeWidth: 2.5 },
                });
              }
            }
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
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>(initialEdges as Edge[]);

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

  const onNodeDragStop = useCallback(
    async (_: unknown, node: Node) => {
      if (node.type === 'customNode') {
        fetch('/api/nodes/positions', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            positions: [{ id: node.id, x: node.position.x, y: node.position.y }],
          }),
        }).catch(() => {});

        // Reorder siblings based on horizontal X coordinate (left = older/พี่, right = younger/น้อง)
        const currentPerson = rawPersons.find((p) => p.id === node.id);
        if (currentPerson && currentPerson.parentUnionId) {
          const siblings = rawPersons.filter(
            (p) => p.parentUnionId === currentPerson.parentUnionId
          );

          if (siblings.length > 1) {
            const siblingNodesWithX = siblings.map((s) => {
              const liveNode = nodes.find((n) => n.id === s.id);
              const posX = liveNode
                ? liveNode.id === node.id
                  ? node.position.x
                  : liveNode.position.x
                : 0;
              return { id: s.id, x: posX };
            });

            // Sort siblings left-to-right (X ascending)
            siblingNodesWithX.sort((a, b) => a.x - b.x);

            const reorderItems = siblingNodesWithX.map((item, idx) => ({
              id: item.id,
              order: idx,
            }));

            try {
              await fetch('/api/nodes/reorder', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ items: reorderItems }),
              });
              if (onRefreshNeeded) {
                onRefreshNeeded();
              }
            } catch (err) {
              console.error('Failed to reorder siblings:', err);
            }
          }
        }
      }
    },
    [rawPersons, nodes, onRefreshNeeded]
  );

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
        panOnDrag={true}
        panOnScroll={false}
        zoomOnScroll={true}
        zoomOnPinch={true}
        selectionOnDrag={false}
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

          <div className={`h-4 w-px ${isLight ? 'bg-slate-200' : 'bg-slate-800'}`} />

          {/* Export JPEG Image Button */}
          <button
            onClick={handleExportJpeg}
            disabled={isExportingJpeg}
            className={`flex h-9 items-center gap-1.5 px-3 rounded-lg text-xs font-semibold transition-all ${
              isLight
                ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-300'
                : 'bg-emerald-950/80 text-emerald-300 hover:bg-emerald-900 border border-emerald-800'
            }`}
            title="ดาวน์โหลดส่งออกผังเครือญาติเป็นรูปภาพ JPEG"
          >
            <Download className={`h-4 w-4 text-emerald-500 ${isExportingJpeg ? 'animate-bounce' : ''}`} />
            <span>{isExportingJpeg ? 'กำลังส่งออก...' : 'Export JPEG'}</span>
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

          {/* 4. Export JPEG Button */}
          <button
            onClick={handleExportJpeg}
            disabled={isExportingJpeg}
            className={`flex items-center justify-center gap-2 rounded-xl border px-3 py-2 text-xs font-bold transition-all shadow-md ${
              isLight
                ? 'bg-emerald-500 text-white border-emerald-600 hover:bg-emerald-600'
                : 'bg-emerald-600 text-white border-emerald-500 hover:bg-emerald-500'
            }`}
            title="ส่งออกผังแสดงความสัมพันธ์เป็นไฟล์รูปภาพ JPEG"
          >
            <Download className={`h-4 w-4 text-white ${isExportingJpeg ? 'animate-bounce' : ''}`} />
            <span>{isExportingJpeg ? 'กำลังสร้างไฟล์ JPEG...' : 'Export รูปผัง (JPEG)'}</span>
          </button>
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

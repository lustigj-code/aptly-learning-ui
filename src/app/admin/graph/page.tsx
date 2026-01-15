'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useUser } from '@/store/userProfileStore';
import { useRouter } from 'next/navigation';
import { auth } from '@/lib/firebase';
import {
  ReactFlow,
  Node,
  Edge,
  Controls,
  Background,
  MiniMap,
  useNodesState,
  useEdgesState,
  BackgroundVariant,
  MarkerType,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import {
  SOCIAL_MEDIA_MARKETING_GRAPH,
  type Concept,
  type ConceptEdge,
  type ConceptCategory,
} from '@/lib/mastery/knowledgeGraph';
import { Search, User, RefreshCw, Info } from 'lucide-react';

type MasteryStatus = 'high' | 'medium' | 'low' | 'none';

interface MasteryNodeData {
  label: string;
  description: string;
  category: string;
  categoryColor: string;
  difficulty: number;
  masteryLevel: number;
  masteryStatus: MasteryStatus;
  [key: string]: unknown;
}

// Get mastery status based on level
function getMasteryStatus(level: number): MasteryStatus {
  if (level > 80) return 'high';
  if (level > 50) return 'medium';
  if (level > 0) return 'low';
  return 'none';
}

// Get node background color based on mastery status
function getNodeColor(status: MasteryStatus): string {
  switch (status) {
    case 'high':
      return '#22c55e'; // Green
    case 'medium':
      return '#eab308'; // Yellow
    case 'low':
      return '#9ca3af'; // Grey
    case 'none':
      return '#e5e7eb'; // Light grey
  }
}

// Get text color for contrast
function getTextColor(status: MasteryStatus): string {
  switch (status) {
    case 'high':
    case 'medium':
      return '#ffffff';
    case 'low':
    case 'none':
      return '#374151';
  }
}

// Convert knowledge graph to React Flow format
function convertToReactFlowFormat(
  graph: typeof SOCIAL_MEDIA_MARKETING_GRAPH,
  masteryLevels: Record<string, number>
): { nodes: Node<MasteryNodeData>[]; edges: Edge[] } {
  const categoryMap = new Map<string, ConceptCategory>();
  graph.categories.forEach((cat) => categoryMap.set(cat.id, cat));

  // Layout configuration
  const categoryPositions: Record<string, { x: number; y: number }> = {
    fundamentals: { x: 400, y: 0 },
    targeting: { x: 0, y: 200 },
    campaigns: { x: 400, y: 200 },
    budgeting: { x: 400, y: 400 },
    creative: { x: 800, y: 200 },
    measurement: { x: 600, y: 400 },
    optimization: { x: 200, y: 600 },
  };

  const conceptsInCategory: Record<string, string[]> = {};
  Object.values(graph.concepts).forEach((concept) => {
    if (!conceptsInCategory[concept.category]) {
      conceptsInCategory[concept.category] = [];
    }
    conceptsInCategory[concept.category].push(concept.id);
  });

  const nodes: Node<MasteryNodeData>[] = Object.values(graph.concepts).map((concept) => {
    const category = categoryMap.get(concept.category);
    const masteryLevel = masteryLevels[concept.id] ?? 0;
    const masteryStatus = getMasteryStatus(masteryLevel);
    const basePos = categoryPositions[concept.category] || { x: 400, y: 400 };
    const conceptsInCat = conceptsInCategory[concept.category] || [];
    const indexInCategory = conceptsInCat.indexOf(concept.id);

    // Offset within category
    const xOffset = (indexInCategory % 2) * 200;
    const yOffset = Math.floor(indexInCategory / 2) * 100;

    return {
      id: concept.id,
      type: 'default',
      position: {
        x: basePos.x + xOffset,
        y: basePos.y + yOffset,
      },
      data: {
        label: concept.name,
        description: concept.description,
        category: concept.category,
        categoryColor: category?.color || '#666',
        difficulty: concept.difficulty,
        masteryLevel,
        masteryStatus,
      },
      style: {
        background: getNodeColor(masteryStatus),
        color: getTextColor(masteryStatus),
        border: `2px solid ${category?.color || '#666'}`,
        borderRadius: '8px',
        padding: '10px 15px',
        fontSize: '12px',
        fontWeight: 500,
        minWidth: '150px',
        textAlign: 'center' as const,
      },
    };
  });

  const edges: Edge[] = graph.edges
    .filter((edge) => edge.relationship === 'prerequisite')
    .map((edge, index) => ({
      id: `e-${edge.from}-${edge.to}-${index}`,
      source: edge.from,
      target: edge.to,
      type: 'smoothstep',
      animated: edge.strength >= 0.8,
      style: {
        stroke: edge.strength >= 0.8 ? '#6366f1' : '#94a3b8',
        strokeWidth: edge.strength >= 0.8 ? 2 : 1,
      },
      markerEnd: {
        type: MarkerType.ArrowClosed,
        color: edge.strength >= 0.8 ? '#6366f1' : '#94a3b8',
      },
    }));

  return { nodes, edges };
}

export default function AdminGraphPage() {
  const { user, isLoading: userLoading } = useUser();
  const router = useRouter();

  const [searchUserId, setSearchUserId] = useState('');
  const [loadedUserId, setLoadedUserId] = useState<string | null>(null);
  const [userInfo, setUserInfo] = useState<{ email?: string; name?: string } | null>(null);
  const [masteryLevels, setMasteryLevels] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Initialize React Flow
  const initialData = useMemo(
    () => convertToReactFlowFormat(SOCIAL_MEDIA_MARKETING_GRAPH, {}),
    []
  );
  const [nodes, setNodes, onNodesChange] = useNodesState(initialData.nodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialData.edges);

  // Admin check
  useEffect(() => {
    if (!userLoading && (!user || user.role !== 'admin')) {
      router.push('/dashboard');
    }
  }, [user, userLoading, router]);

  // Update nodes when mastery levels change
  useEffect(() => {
    const { nodes: newNodes, edges: newEdges } = convertToReactFlowFormat(
      SOCIAL_MEDIA_MARKETING_GRAPH,
      masteryLevels
    );
    setNodes(newNodes);
    setEdges(newEdges);
  }, [masteryLevels, setNodes, setEdges]);

  // Fetch user mastery data
  const fetchUserMastery = useCallback(async (userId: string) => {
    if (!userId.trim()) {
      setError('Please enter a User ID');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      if (!auth) {
        setError('Firebase not initialized');
        setLoading(false);
        return;
      }
      const token = await auth.currentUser?.getIdToken();
      if (!token) {
        setError('Authentication required');
        setLoading(false);
        return;
      }

      const response = await fetch(
        `/api/admin/user-mastery?userId=${encodeURIComponent(userId.trim())}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to fetch user mastery');
      }

      const data = await response.json();

      if (!data.userExists) {
        setError('User not found');
        setMasteryLevels({});
        setUserInfo(null);
        setLoadedUserId(null);
      } else {
        setMasteryLevels(data.masteryLevels || {});
        setUserInfo({
          email: data.userEmail,
          name: data.userName,
        });
        setLoadedUserId(userId.trim());
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch data');
      setMasteryLevels({});
      setUserInfo(null);
      setLoadedUserId(null);
    } finally {
      setLoading(false);
    }
  }, []);

  // Handle search form submit
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchUserMastery(searchUserId);
  };

  // Clear user data
  const handleClear = () => {
    setSearchUserId('');
    setMasteryLevels({});
    setUserInfo(null);
    setLoadedUserId(null);
    setError(null);
  };

  // Calculate stats
  const stats = useMemo(() => {
    const concepts = Object.values(SOCIAL_MEDIA_MARKETING_GRAPH.concepts);
    const total = concepts.length;
    const withMastery = Object.keys(masteryLevels).length;
    const high = Object.values(masteryLevels).filter((l) => l > 80).length;
    const medium = Object.values(masteryLevels).filter((l) => l > 50 && l <= 80).length;
    const low = Object.values(masteryLevels).filter((l) => l > 0 && l <= 50).length;

    return { total, withMastery, high, medium, low };
  }, [masteryLevels]);

  if (userLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600" />
      </div>
    );
  }

  if (!user || user.role !== 'admin') {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Knowledge Graph Viewer
              </h1>
              <p className="mt-1 text-sm text-gray-500">
                Visualize user mastery across the Social Media Marketing knowledge graph
              </p>
            </div>

            {/* Search Form */}
            <form onSubmit={handleSearch} className="flex items-center gap-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  value={searchUserId}
                  onChange={(e) => setSearchUserId(e.target.value)}
                  placeholder="Enter User ID..."
                  className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent w-64"
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {loading ? (
                  <RefreshCw className="h-4 w-4 animate-spin" />
                ) : (
                  <User className="h-4 w-4" />
                )}
                Load
              </button>
              {loadedUserId && (
                <button
                  type="button"
                  onClick={handleClear}
                  className="px-3 py-2 text-gray-600 text-sm font-medium rounded-lg hover:bg-gray-100"
                >
                  Clear
                </button>
              )}
            </form>
          </div>

          {/* Error / User Info */}
          {error && (
            <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              {error}
            </div>
          )}
          {loadedUserId && userInfo && (
            <div className="mt-4 p-3 bg-indigo-50 border border-indigo-200 rounded-lg text-indigo-700 text-sm flex items-center gap-4">
              <User className="h-5 w-5" />
              <div>
                <span className="font-medium">User:</span> {loadedUserId}
                {userInfo.email && <span className="ml-2 text-indigo-500">({userInfo.email})</span>}
              </div>
            </div>
          )}

          {/* Stats Row */}
          <div className="mt-4 flex items-center gap-6">
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600">Total Concepts:</span>
              <span className="font-semibold text-gray-900">{stats.total}</span>
            </div>
            {loadedUserId && (
              <>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-green-500" />
                  <span className="text-sm text-gray-600">High (&gt;80%):</span>
                  <span className="font-semibold text-green-600">{stats.high}</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-yellow-500" />
                  <span className="text-sm text-gray-600">Medium (&gt;50%):</span>
                  <span className="font-semibold text-yellow-600">{stats.medium}</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-gray-400" />
                  <span className="text-sm text-gray-600">Low (&lt;50%):</span>
                  <span className="font-semibold text-gray-600">{stats.low}</span>
                </div>
              </>
            )}
          </div>

          {/* Legend */}
          <div className="mt-4 flex items-center gap-4 text-xs text-gray-500">
            <Info className="h-4 w-4" />
            <span>Animated edges indicate strong prerequisites (strength &gt;= 0.8)</span>
            <span>|</span>
            <span>Node borders show category colors</span>
          </div>
        </div>
      </header>

      {/* Graph Container */}
      <main className="flex-1">
        <div style={{ width: '100%', height: 'calc(100vh - 280px)' }}>
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            fitView
            fitViewOptions={{ padding: 0.2 }}
            minZoom={0.2}
            maxZoom={2}
          >
            <Controls position="bottom-left" />
            <MiniMap
              position="bottom-right"
              nodeColor={(node) => {
                const data = node.data as MasteryNodeData;
                return getNodeColor(data?.masteryStatus || 'none');
              }}
              maskColor="rgba(0, 0, 0, 0.1)"
            />
            <Background variant={BackgroundVariant.Dots} gap={20} size={1} />
          </ReactFlow>
        </div>
      </main>

      {/* Category Legend */}
      <footer className="bg-white border-t border-gray-200 px-4 py-3">
        <div className="max-w-7xl mx-auto flex items-center gap-6 flex-wrap">
          <span className="text-sm font-medium text-gray-700">Categories:</span>
          {SOCIAL_MEDIA_MARKETING_GRAPH.categories.map((cat) => (
            <div key={cat.id} className="flex items-center gap-2">
              <div
                className="w-4 h-4 rounded border-2"
                style={{ borderColor: cat.color, backgroundColor: `${cat.color}20` }}
              />
              <span className="text-sm text-gray-600">{cat.name}</span>
            </div>
          ))}
        </div>
      </footer>
    </div>
  );
}

'use client';

import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Map, ChevronLeft, ChevronRight, X, Maximize2 } from 'lucide-react';
import Link from 'next/link';
import { MiniMap } from './MiniMap';
import { EnhancedMasteryMap } from './EnhancedMasteryMap';
import type { MasteryMapData, SkillNodeData } from './types';

/**
 * Mastery Map Sidebar
 *
 * Collapsible sidebar showing skill map during learning:
 * - Collapsed: Shows mini progress indicator
 * - Expanded: Shows interactive mini map
 * - Full: Opens modal with full map
 *
 * Part of Phase 14: Mastery Map UX
 */

interface MasteryMapSidebarProps {
  data: MasteryMapData | null;
  isLoading?: boolean;
  onNodeClick?: (node: SkillNodeData) => void;
  onNavigate?: (skillId: string, lessonId: string) => void;
  position?: 'left' | 'right';
  defaultExpanded?: boolean;
  className?: string;
}

export function MasteryMapSidebar({
  data,
  isLoading = false,
  onNodeClick,
  onNavigate,
  position = 'right',
  defaultExpanded = false,
  className = '',
}: MasteryMapSidebarProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const [showFullMap, setShowFullMap] = useState(false);

  const handleToggle = useCallback(() => {
    setIsExpanded((prev) => !prev);
  }, []);

  const handleViewFullMap = useCallback(() => {
    setShowFullMap(true);
  }, []);

  // Position classes
  const positionClasses = position === 'left' ? 'left-0' : 'right-0';
  const toggleIconExpanded = position === 'left' ? ChevronLeft : ChevronRight;
  const toggleIconCollapsed = position === 'left' ? ChevronRight : ChevronLeft;
  const ToggleIcon = isExpanded ? toggleIconExpanded : toggleIconCollapsed;

  return (
    <>
      {/* Sidebar */}
      <motion.div
        className={`fixed top-20 ${positionClasses} z-30 ${className}`}
        initial={false}
        animate={{
          width: isExpanded ? 320 : 48,
        }}
        transition={{ duration: 0.3, ease: 'easeInOut' }}
      >
        {/* Toggle Button */}
        <button
          onClick={handleToggle}
          className={`absolute top-4 ${
            position === 'left' ? '-right-4' : '-left-4'
          } z-10 w-8 h-8 bg-white border border-grey/30 rounded-full shadow-md flex items-center justify-center hover:bg-light-grey transition-colors`}
          aria-label={isExpanded ? 'Collapse map' : 'Expand map'}
        >
          <ToggleIcon className="w-4 h-4 text-grey" />
        </button>

        {/* Sidebar Content */}
        <AnimatePresence mode="wait">
          {isExpanded ? (
            <ExpandedSidebar
              key="expanded"
              data={data}
              isLoading={isLoading}
              onViewFullMap={handleViewFullMap}
              position={position}
            />
          ) : (
            <CollapsedSidebar
              key="collapsed"
              data={data}
              onClick={handleToggle}
              position={position}
            />
          )}
        </AnimatePresence>
      </motion.div>

      {/* Full Map Modal */}
      <AnimatePresence>
        {showFullMap && (
          <FullMapModal
            data={data}
            isLoading={isLoading}
            onClose={() => setShowFullMap(false)}
            onNodeClick={onNodeClick}
            onNavigate={onNavigate}
          />
        )}
      </AnimatePresence>
    </>
  );
}

/**
 * Collapsed Sidebar View
 */
function CollapsedSidebar({
  data,
  onClick,
  position,
}: {
  data: MasteryMapData | null;
  onClick: () => void;
  position: 'left' | 'right';
}) {
  const progress = data
    ? Math.round(
        (data.nodes.filter((n) => n.status === 'mastered').length /
          data.nodes.length) *
          100
      )
    : 0;

  const currentNode = data?.nodes.find((n) => n.id === data.currentSkillId);
  const hasDecaying = data?.nodes.some((n) => n.status === 'decaying') || false;

  return (
    <motion.div
      initial={{ opacity: 0, x: position === 'left' ? -20 : 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: position === 'left' ? -20 : 20 }}
      className={`bg-white border border-grey/20 shadow-lg py-4 px-2 flex flex-col items-center gap-4 ${
        position === 'left' ? 'rounded-r-xl' : 'rounded-l-xl'
      }`}
    >
      {/* Map Icon */}
      <button
        onClick={onClick}
        className="relative p-2 hover:bg-light-grey rounded-lg transition-colors"
        title="View Skill Map"
      >
        <Map className="w-5 h-5 text-teal" />
        {hasDecaying && (
          <span className="absolute top-1 right-1 w-2 h-2 bg-orange-500 rounded-full" />
        )}
      </button>

      {/* Progress Ring */}
      <div className="relative w-8 h-8">
        <svg className="w-8 h-8 transform -rotate-90">
          <circle
            cx="16"
            cy="16"
            r="14"
            fill="none"
            stroke="#e5e7eb"
            strokeWidth="3"
          />
          <circle
            cx="16"
            cy="16"
            r="14"
            fill="none"
            stroke="#14b8a6"
            strokeWidth="3"
            strokeDasharray={`${progress * 0.88} 88`}
            strokeLinecap="round"
          />
        </svg>
        <span className="absolute inset-0 flex items-center justify-center text-xs font-semibold text-navy">
          {progress}
        </span>
      </div>

      {/* Current Skill Indicator */}
      {currentNode && (
        <div className="w-6 h-6 bg-amber-100 rounded-full flex items-center justify-center border-2 border-amber-400">
          <span className="text-xs font-bold text-amber-700">
            {currentNode.name.charAt(0)}
          </span>
        </div>
      )}
    </motion.div>
  );
}

/**
 * Expanded Sidebar View
 */
function ExpandedSidebar({
  data,
  isLoading,
  onViewFullMap,
  position,
}: {
  data: MasteryMapData | null;
  isLoading?: boolean;
  onViewFullMap: () => void;
  position: 'left' | 'right';
}) {
  return (
    <motion.div
      initial={{ opacity: 0, x: position === 'left' ? -20 : 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: position === 'left' ? -20 : 20 }}
      className={`bg-white border border-grey/20 shadow-lg overflow-hidden h-[calc(100vh-120px)] flex flex-col ${
        position === 'left' ? 'rounded-r-xl' : 'rounded-l-xl'
      }`}
    >
      {/* Header */}
      <div className="px-4 py-3 border-b border-grey/10 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-2">
          <Map className="w-5 h-5 text-teal" />
          <h3 className="font-semibold text-navy">Skill Map</h3>
        </div>
        <button
          onClick={onViewFullMap}
          className="p-1.5 hover:bg-light-grey rounded-lg transition-colors"
          title="View full map"
        >
          <Maximize2 className="w-4 h-4 text-grey" />
        </button>
      </div>

      {/* Mini Map */}
      <div className="flex-1 overflow-hidden">
        <MiniMap
          data={data}
          isLoading={isLoading}
          onViewFullMap={onViewFullMap}
        />
      </div>

      {/* Footer */}
      <div className="px-4 py-2 border-t border-grey/10 flex-shrink-0">
        <Link
          href="/mastery"
          className="text-xs text-teal hover:text-teal-dark transition-colors"
        >
          Open Full Map View
        </Link>
      </div>
    </motion.div>
  );
}

/**
 * Full Map Modal
 */
function FullMapModal({
  data,
  isLoading,
  onClose,
  onNodeClick,
  onNavigate,
}: {
  data: MasteryMapData | null;
  isLoading?: boolean;
  onClose: () => void;
  onNodeClick?: (node: SkillNodeData) => void;
  onNavigate?: (skillId: string, lessonId: string) => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl h-[80vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-grey/10 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            <Map className="w-6 h-6 text-teal" />
            <div>
              <h2 className="text-xl font-bold text-navy">Mastery Map</h2>
              <p className="text-sm text-grey">Track your learning journey</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/mastery"
              className="px-4 py-2 text-sm text-teal hover:bg-teal/10 rounded-lg transition-colors"
            >
              Open Page
            </Link>
            <button
              onClick={onClose}
              className="p-2 hover:bg-light-grey rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-grey" />
            </button>
          </div>
        </div>

        {/* Map */}
        <div className="flex-1 overflow-hidden">
          {isLoading ? (
            <div className="h-full flex items-center justify-center">
              <div className="w-8 h-8 border-2 border-teal border-t-transparent rounded-full animate-spin" />
            </div>
          ) : data ? (
            <EnhancedMasteryMap
              data={data}
              onNodeClick={onNodeClick}
              onNavigate={onNavigate}
              showLegend
              showControls
              variant="full"
              className="h-full"
            />
          ) : (
            <div className="h-full flex items-center justify-center text-grey">
              No data available
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}

export default MasteryMapSidebar;

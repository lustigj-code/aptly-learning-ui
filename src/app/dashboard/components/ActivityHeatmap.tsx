/**
 * Activity Heatmap
 *
 * GitHub-style 12-week activity calendar showing
 * learning activity intensity by day.
 */

'use client';

import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Activity } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { COLORS_RAW } from '@/lib/design-tokens';
import { BentoCard } from './DashboardGrid';
import type { ActivityDay } from '../types';

interface ActivityHeatmapProps {
  data: ActivityDay[];
  weeks?: number;
  className?: string;
}

export function ActivityHeatmap({
  data,
  weeks = 12,
  className,
}: ActivityHeatmapProps) {
  const prefersReducedMotion = useReducedMotion();
  const [hoveredDay, setHoveredDay] = useState<ActivityDay | null>(null);
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });

  // Organize data into weeks (columns) and days (rows)
  const grid = useMemo(() => {
    // Fill grid with 7 rows (Sun-Sat) x N weeks
    const totalDays = weeks * 7;
    const gridData: (ActivityDay | null)[][] = [];

    // Create empty grid
    for (let week = 0; week < weeks; week++) {
      gridData.push(new Array(7).fill(null));
    }

    // Get the end date (today) and calculate start date
    const endDate = new Date();
    const startDate = new Date(endDate);
    startDate.setDate(startDate.getDate() - totalDays + 1);

    // Adjust to start on Sunday
    const startDayOfWeek = startDate.getDay();
    startDate.setDate(startDate.getDate() - startDayOfWeek);

    // Create a map of date strings to activity data
    const dataMap = new Map(data.map((d) => [d.date, d]));

    // Fill the grid
    const currentDate = new Date(startDate);
    for (let week = 0; week < weeks; week++) {
      for (let day = 0; day < 7; day++) {
        const dateStr = currentDate.toISOString().split('T')[0];
        const activityData = dataMap.get(dateStr);

        if (currentDate <= endDate) {
          gridData[week][day] = activityData || {
            date: dateStr,
            count: 0,
            level: 0,
          };
        }

        currentDate.setDate(currentDate.getDate() + 1);
      }
    }

    return gridData;
  }, [data, weeks]);

  // Get color for activity level
  const getLevelColor = (level: number): string => {
    switch (level) {
      case 0:
        return COLORS_RAW.lightGrey;
      case 1:
        return '#a7f3d0'; // light teal/green
      case 2:
        return '#6ee7b7'; // medium
      case 3:
        return COLORS_RAW.teal;
      case 4:
        return COLORS_RAW.tealDark;
      default:
        return COLORS_RAW.lightGrey;
    }
  };

  // Format date for tooltip
  const formatDate = (dateStr: string): string => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });
  };

  // Calculate total activity
  const totalActivity = data.reduce((sum, d) => sum + d.count, 0);
  const activeDays = data.filter((d) => d.count > 0).length;

  // Weekday labels
  const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  return (
    <BentoCard span="3x1" delay={0.2} className={className}>
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Activity size={18} className="text-teal" />
            <p className="text-sm font-medium text-rich-black/60">Activity</p>
          </div>
          <div className="flex items-center gap-4 text-xs text-rich-black/50">
            <span>{activeDays} active days</span>
            <span>{totalActivity} total activities</span>
          </div>
        </div>

        {/* Heatmap */}
        <div className="flex-1 flex gap-2 overflow-x-auto pb-2">
          {/* Weekday labels - only show Mon, Wed, Fri for compactness */}
          <div className="flex flex-col justify-between py-1 pr-2 text-xs text-rich-black/40">
            {weekdays.map((day, i) => (
              <span key={day} className={i % 2 === 1 ? 'opacity-100' : 'opacity-0'}>
                {day.charAt(0)}
              </span>
            ))}
          </div>

          {/* Grid */}
          <div className="flex gap-[3px]">
            {grid.map((week, weekIndex) => (
              <div key={weekIndex} className="flex flex-col gap-[3px]">
                {week.map((day, dayIndex) => (
                  <motion.div
                    key={`${weekIndex}-${dayIndex}`}
                    initial={prefersReducedMotion ? false : { scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{
                      delay: prefersReducedMotion ? 0 : 0.25 + (weekIndex * 7 + dayIndex) * 0.002,
                      duration: 0.15,
                    }}
                    className={cn(
                      'w-3 h-3 rounded-sm cursor-pointer',
                      'transition-transform hover:scale-125'
                    )}
                    style={{
                      backgroundColor: day ? getLevelColor(day.level) : 'transparent',
                    }}
                    onMouseEnter={(e) => {
                      if (day) {
                        setHoveredDay(day);
                        const rect = e.currentTarget.getBoundingClientRect();
                        setTooltipPosition({
                          x: rect.left + rect.width / 2,
                          y: rect.top - 8,
                        });
                      }
                    }}
                    onMouseLeave={() => setHoveredDay(null)}
                  />
                ))}
              </div>
            ))}
          </div>
        </div>

        {/* Legend */}
        <div className="flex items-center justify-end gap-2 mt-2">
          <span className="text-xs text-rich-black/40">Less</span>
          {[0, 1, 2, 3, 4].map((level) => (
            <div
              key={level}
              className="w-3 h-3 rounded-sm"
              style={{ backgroundColor: getLevelColor(level) }}
            />
          ))}
          <span className="text-xs text-rich-black/40">More</span>
        </div>
      </div>

      {/* Tooltip */}
      {hoveredDay && (
        <motion.div
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          className="fixed z-50 px-3 py-2 bg-navy text-white text-xs rounded-lg shadow-lg pointer-events-none"
          style={{
            left: tooltipPosition.x,
            top: tooltipPosition.y,
            transform: 'translate(-50%, -100%)',
          }}
        >
          <p className="font-medium">{formatDate(hoveredDay.date)}</p>
          <p className="text-white/70">
            {hoveredDay.count} {hoveredDay.count === 1 ? 'activity' : 'activities'}
          </p>
        </motion.div>
      )}
    </BentoCard>
  );
}

export default ActivityHeatmap;

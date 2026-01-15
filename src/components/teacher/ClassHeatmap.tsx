'use client';

import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { COLORS_RAW, SPRING } from '@/lib/design-tokens';
import { type StudentMasteryData, type ConceptInfo } from '@/lib/teacher/types';

interface ClassHeatmapProps {
  students: StudentMasteryData[];
  concepts: readonly ConceptInfo[];
  sortBy: 'name' | 'struggling';
}

/**
 * Get color for mastery level (0-100)
 * Red (0) -> Yellow (50) -> Green (100)
 */
function getMasteryColor(level: number): string {
  if (level === 0) {
    return '#f3f4f6'; // Gray for no data
  }

  if (level < 30) {
    return '#ef4444'; // Red - struggling
  } else if (level < 50) {
    return '#f97316'; // Orange - needs work
  } else if (level < 70) {
    return '#eab308'; // Yellow - progressing
  } else if (level < 85) {
    return '#84cc16'; // Light green - proficient
  } else {
    return '#22c55e'; // Green - mastered
  }
}

/**
 * Get text color based on background brightness
 */
function getTextColor(bgColor: string): string {
  // Light backgrounds need dark text
  if (bgColor === '#f3f4f6' || bgColor === '#eab308' || bgColor === '#84cc16') {
    return '#1f2937';
  }
  return '#ffffff';
}

export function ClassHeatmap({ students, concepts, sortBy }: ClassHeatmapProps) {
  const [hoveredCell, setHoveredCell] = useState<{ student: string; concept: string } | null>(null);
  const [selectedStudent, setSelectedStudent] = useState<string | null>(null);

  // Sort students based on sortBy prop
  const sortedStudents = useMemo(() => {
    const studentsCopy = [...students];

    if (sortBy === 'struggling') {
      // Sort by lowest average mastery first
      return studentsCopy.sort((a, b) => a.averageMastery - b.averageMastery);
    }

    // Default: sort by name
    return studentsCopy.sort((a, b) => a.name.localeCompare(b.name));
  }, [students, sortBy]);

  // Group concepts by lesson for better visualization
  const groupedConcepts = useMemo(() => {
    const groups: Record<number, ConceptInfo[]> = {};
    concepts.forEach((concept) => {
      if (!groups[concept.lesson]) {
        groups[concept.lesson] = [];
      }
      groups[concept.lesson].push(concept);
    });
    return groups;
  }, [concepts]);

  const lessonNames = [
    'Facebook',
    'Instagram',
    'Snapchat',
    'Policy',
    'Channels',
    'Objectives',
    'Budgeting',
  ];

  if (students.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center">
        <p className="text-gray-500">No student data available yet.</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
      {/* Legend */}
      <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium text-gray-700">Mastery Levels</h3>
          <div className="flex items-center gap-4 text-xs">
            <div className="flex items-center gap-1">
              <div className="w-4 h-4 rounded" style={{ backgroundColor: '#f3f4f6' }} />
              <span className="text-gray-600">No data</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-4 h-4 rounded" style={{ backgroundColor: '#ef4444' }} />
              <span className="text-gray-600">&lt;30%</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-4 h-4 rounded" style={{ backgroundColor: '#f97316' }} />
              <span className="text-gray-600">30-50%</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-4 h-4 rounded" style={{ backgroundColor: '#eab308' }} />
              <span className="text-gray-600">50-70%</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-4 h-4 rounded" style={{ backgroundColor: '#84cc16' }} />
              <span className="text-gray-600">70-85%</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-4 h-4 rounded" style={{ backgroundColor: '#22c55e' }} />
              <span className="text-gray-600">&gt;85%</span>
            </div>
          </div>
        </div>
      </div>

      {/* Heatmap Container */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            {/* Lesson Headers */}
            <tr className="bg-gray-50">
              <th className="sticky left-0 z-10 bg-gray-50 px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b border-r border-gray-200">
                Student
              </th>
              {Object.entries(groupedConcepts).map(([lesson, lessonConcepts]) => (
                <th
                  key={lesson}
                  colSpan={lessonConcepts.length}
                  className="px-2 py-2 text-center text-xs font-medium text-gray-700 uppercase tracking-wider border-b border-gray-200"
                  style={{ backgroundColor: `${COLORS_RAW.teal}15` }}
                >
                  L{lesson}: {lessonNames[parseInt(lesson) - 1]}
                </th>
              ))}
              <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider border-b border-l border-gray-200 bg-gray-50">
                Avg
              </th>
            </tr>
            {/* Concept Headers */}
            <tr className="bg-gray-50">
              <th className="sticky left-0 z-10 bg-gray-50 px-4 py-2 border-b border-r border-gray-200" />
              {concepts.map((concept) => (
                <th
                  key={concept.id}
                  className="px-1 py-2 text-center border-b border-gray-200"
                  style={{ minWidth: '40px', maxWidth: '60px' }}
                >
                  <div
                    className="text-xs text-gray-600 truncate transform -rotate-45 origin-center whitespace-nowrap"
                    title={concept.name}
                    style={{ fontSize: '10px', width: '80px', marginLeft: '-20px' }}
                  >
                    {concept.name.split(' ').slice(0, 2).join(' ')}
                  </div>
                </th>
              ))}
              <th className="px-4 py-2 border-b border-l border-gray-200 bg-gray-50" />
            </tr>
          </thead>
          <tbody>
            {sortedStudents.map((student, studentIndex) => (
              <motion.tr
                key={student.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: studentIndex * 0.02 }}
                className={`
                  ${selectedStudent === student.id ? 'bg-blue-50' : studentIndex % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}
                  hover:bg-blue-50/50 transition-colors cursor-pointer
                `}
                onClick={() => setSelectedStudent(selectedStudent === student.id ? null : student.id)}
              >
                {/* Student Name */}
                <td className="sticky left-0 z-10 px-4 py-2 border-r border-gray-200 bg-inherit">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-medium"
                      style={{ backgroundColor: COLORS_RAW.navy }}
                    >
                      {student.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div className="text-sm font-medium text-gray-900 truncate max-w-[120px]">
                        {student.name}
                      </div>
                      {sortBy === 'struggling' && student.averageMastery < 50 && (
                        <div className="text-xs text-red-500 font-medium">
                          Needs attention
                        </div>
                      )}
                    </div>
                  </div>
                </td>

                {/* Mastery Cells */}
                {concepts.map((concept) => {
                  const mastery = student.masteryLevels.find((m) => m.skillId === concept.id);
                  const level = mastery?.level || 0;
                  const bgColor = getMasteryColor(level);
                  const textColor = getTextColor(bgColor);
                  const isHovered = hoveredCell?.student === student.id && hoveredCell?.concept === concept.id;

                  return (
                    <td
                      key={`${student.id}-${concept.id}`}
                      className="px-0 py-0 relative"
                      onMouseEnter={() => setHoveredCell({ student: student.id, concept: concept.id })}
                      onMouseLeave={() => setHoveredCell(null)}
                    >
                      <motion.div
                        className="w-full h-10 flex items-center justify-center text-xs font-medium relative"
                        style={{ backgroundColor: bgColor, color: textColor }}
                        initial={false}
                        animate={{
                          scale: isHovered ? 1.1 : 1,
                          zIndex: isHovered ? 20 : 1,
                        }}
                        transition={SPRING.snappy}
                      >
                        {level > 0 ? `${Math.round(level)}` : '-'}

                        {/* Tooltip */}
                        {isHovered && (
                          <motion.div
                            initial={{ opacity: 0, y: 5 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-gray-900 text-white text-xs rounded shadow-lg whitespace-nowrap z-50"
                          >
                            <div className="font-medium">{student.name}</div>
                            <div>{concept.name}</div>
                            <div className="text-gray-300">
                              {level > 0 ? `${Math.round(level)}% mastery` : 'No data yet'}
                            </div>
                          </motion.div>
                        )}
                      </motion.div>
                    </td>
                  );
                })}

                {/* Average Mastery */}
                <td className="px-2 py-2 border-l border-gray-200">
                  <div
                    className="w-12 h-8 rounded flex items-center justify-center text-xs font-bold mx-auto"
                    style={{
                      backgroundColor: getMasteryColor(student.averageMastery),
                      color: getTextColor(getMasteryColor(student.averageMastery)),
                    }}
                  >
                    {Math.round(student.averageMastery)}%
                  </div>
                </td>
              </motion.tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Selected Student Detail Panel */}
      {selectedStudent && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          className="border-t border-gray-200 bg-blue-50 p-4"
        >
          {(() => {
            const student = sortedStudents.find((s) => s.id === selectedStudent);
            if (!student) return null;

            const strongConcepts = concepts
              .filter((c) => {
                const m = student.masteryLevels.find((ml) => ml.skillId === c.id);
                return m && m.level >= 70;
              })
              .slice(0, 3);

            const weakConcepts = concepts
              .filter((c) => {
                const m = student.masteryLevels.find((ml) => ml.skillId === c.id);
                return !m || m.level < 50;
              })
              .slice(0, 3);

            return (
              <div className="flex items-start justify-between">
                <div>
                  <h4 className="font-medium text-gray-900">{student.name}</h4>
                  <p className="text-sm text-gray-600">{student.email}</p>
                  <p className="text-xs text-gray-500 mt-1">
                    Last active: {student.lastActiveAt
                      ? new Date(student.lastActiveAt).toLocaleDateString()
                      : 'Never'}
                  </p>
                </div>
                <div className="flex gap-8">
                  <div>
                    <h5 className="text-xs font-medium text-green-700 uppercase">Strengths</h5>
                    <ul className="mt-1 text-sm text-gray-700">
                      {strongConcepts.length > 0 ? (
                        strongConcepts.map((c) => <li key={c.id}>- {c.name}</li>)
                      ) : (
                        <li className="text-gray-500 italic">Building foundations</li>
                      )}
                    </ul>
                  </div>
                  <div>
                    <h5 className="text-xs font-medium text-red-700 uppercase">Needs Work</h5>
                    <ul className="mt-1 text-sm text-gray-700">
                      {weakConcepts.length > 0 ? (
                        weakConcepts.map((c) => <li key={c.id}>- {c.name}</li>)
                      ) : (
                        <li className="text-gray-500 italic">Great progress!</li>
                      )}
                    </ul>
                  </div>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedStudent(null);
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            );
          })()}
        </motion.div>
      )}
    </div>
  );
}

'use client';

import { useMemo } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  ResponsiveContainer,
} from 'recharts';
import { motion } from 'framer-motion';
import { TrendingUp } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card';

export type MasteryDataPoint = {
  date: string;
  pMastery: number;
  skillId?: string;
  skillName?: string;
};

type MasteryTrajectoryChartProps = {
  data: MasteryDataPoint[];
  targetMastery?: number;
  title?: string;
  description?: string;
  className?: string;
};

const MASTERY_TARGET = 0.95; // 95% mastery threshold

// Custom tooltip component - defined outside to avoid recreation during render
type TooltipPayload = {
  value: number;
  payload: { fullDate: string };
};

function CustomTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: TooltipPayload[];
}) {
  if (active && payload && payload.length > 0) {
    const value = payload[0].value;
    const fullDate = payload[0].payload.fullDate;
    return (
      <div className="bg-white border border-grey/20 rounded-lg shadow-lg p-3">
        <p className="text-sm text-grey">{fullDate}</p>
        <p className="text-lg font-bold text-navy">{value}%</p>
      </div>
    );
  }
  return null;
}

export function MasteryTrajectoryChart({
  data,
  targetMastery = MASTERY_TARGET,
  title = 'Learning Progress',
  description = 'Track your learning progress',
  className,
}: MasteryTrajectoryChartProps) {
  // Format data for recharts
  const chartData = useMemo(() => {
    return data.map((point) => ({
      ...point,
      date: new Date(point.date).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
      }),
      fullDate: point.date,
      mastery: Math.round(point.pMastery * 100),
    }));
  }, [data]);

  // Calculate trend
  const trend = useMemo(() => {
    if (chartData.length < 2) return 0;
    const first = chartData[0].mastery;
    const last = chartData[chartData.length - 1].mastery;
    return last - first;
  }, [chartData]);

  if (data.length === 0) {
    return (
      <Card variant="elevated" padding="lg" className={className}>
        <CardHeader className="flex flex-row items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-purple/20 flex items-center justify-center">
            <TrendingUp size={20} className="text-purple" />
          </div>
          <div>
            <CardTitle>{title}</CardTitle>
            <CardDescription>{description}</CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center h-48 text-grey">
            <TrendingUp size={32} className="mb-2 opacity-50" />
            <p>No progress data yet</p>
            <p className="text-sm">Complete lessons to see your progress</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card variant="elevated" padding="lg" className={className}>
      <CardHeader className="flex flex-row items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-purple/20 flex items-center justify-center">
            <TrendingUp size={20} className="text-purple" />
          </div>
          <div>
            <CardTitle>{title}</CardTitle>
            <CardDescription>{description}</CardDescription>
          </div>
        </div>
        {trend !== 0 && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            className={`px-3 py-1 rounded-full text-sm font-medium ${
              trend > 0
                ? 'bg-success/20 text-success'
                : 'bg-error/20 text-error'
            }`}
          >
            {trend > 0 ? '+' : ''}{trend}%
          </motion.div>
        )}
      </CardHeader>
      <CardContent>
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={chartData}
              margin={{ top: 10, right: 10, left: -10, bottom: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#E6E6E6" />
              <XAxis
                dataKey="date"
                stroke="#666"
                fontSize={12}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                domain={[0, 100]}
                stroke="#666"
                fontSize={12}
                tickLine={false}
                axisLine={false}
                tickFormatter={(value) => `${value}%`}
              />
              <Tooltip content={<CustomTooltip />} />
              <ReferenceLine
                y={targetMastery * 100}
                stroke="#22c55e"
                strokeDasharray="5 5"
                strokeWidth={2}
                label={{
                  value: `Goal ${targetMastery * 100}%`,
                  position: 'right',
                  fill: '#22c55e',
                  fontSize: 12,
                }}
              />
              <Line
                type="monotone"
                dataKey="mastery"
                stroke="#21A8B0"
                strokeWidth={3}
                dot={{
                  fill: '#21A8B0',
                  strokeWidth: 2,
                  r: 4,
                }}
                activeDot={{
                  fill: '#21A8B0',
                  strokeWidth: 2,
                  r: 6,
                }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Legend */}
        <div className="flex items-center justify-center gap-6 mt-4 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-teal" />
            <span className="text-grey">Your Progress</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-6 h-0.5 bg-success border-dashed border-t-2 border-success" />
            <span className="text-grey">Goal</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default MasteryTrajectoryChart;

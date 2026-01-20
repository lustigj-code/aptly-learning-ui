'use client';

import { useMemo } from 'react';

interface DataPoint {
  date: string;
  value: number;
}

interface MetricsChartProps {
  data: DataPoint[];
  color: string;
  label: string;
  height?: number;
}

export function MetricsChart({
  data,
  color,
  label,
  height = 200,
}: MetricsChartProps) {
  const { pathD, points, xLabels, yLabels } = useMemo(() => {
    if (data.length === 0) {
      return { pathD: '', points: [], xLabels: [], yLabels: [] };
    }

    const values = data.map((d) => d.value);
    const min = Math.min(...values);
    const max = Math.max(...values);
    const padding = (max - min) * 0.1 || 10;
    const yMin = Math.max(0, min - padding);
    const yMax = max + padding;

    const width = 100;
    const chartHeight = height - 40; // Leave room for labels

    const xStep = width / (data.length - 1 || 1);

    const pointCoords = data.map((d, i) => ({
      x: i * xStep,
      y: chartHeight - ((d.value - yMin) / (yMax - yMin)) * chartHeight,
      value: d.value,
      date: d.date,
    }));

    // Create smooth path
    let path = `M ${pointCoords[0].x} ${pointCoords[0].y}`;
    for (let i = 1; i < pointCoords.length; i++) {
      const prev = pointCoords[i - 1];
      const curr = pointCoords[i];
      const cpx = (prev.x + curr.x) / 2;
      path += ` C ${cpx} ${prev.y}, ${cpx} ${curr.y}, ${curr.x} ${curr.y}`;
    }

    // X-axis labels (show every 5th date)
    const xLabelData = data.filter((_, i) => i % Math.ceil(data.length / 6) === 0);

    // Y-axis labels
    const yLabelData = [yMax, (yMax + yMin) / 2, yMin].map((v) => ({
      value: Math.round(v),
      y: chartHeight - ((v - yMin) / (yMax - yMin)) * chartHeight,
    }));

    return {
      pathD: path,
      points: pointCoords,
      xLabels: xLabelData.map((d) => ({
        label: formatDate(d.date),
        x: (data.indexOf(d) / (data.length - 1)) * width,
      })),
      yLabels: yLabelData,
    };
  }, [data, height]);

  if (data.length === 0) {
    return (
      <div
        className="flex items-center justify-center text-gray-400"
        style={{ height }}
      >
        No data available
      </div>
    );
  }

  return (
    <div style={{ height }}>
      <svg
        viewBox={`-40 -10 150 ${height}`}
        className="w-full h-full"
        preserveAspectRatio="none"
      >
        {/* Y-axis labels */}
        {yLabels.map((yl, i) => (
          <text
            key={i}
            x="-5"
            y={yl.y}
            textAnchor="end"
            className="text-[3px] fill-gray-400"
            dominantBaseline="middle"
          >
            {yl.value}
          </text>
        ))}

        {/* Grid lines */}
        {yLabels.map((yl, i) => (
          <line
            key={i}
            x1="0"
            y1={yl.y}
            x2="100"
            y2={yl.y}
            stroke="#E5E7EB"
            strokeWidth="0.2"
            strokeDasharray="2,2"
          />
        ))}

        {/* Area fill */}
        <path
          d={`${pathD} L ${points[points.length - 1]?.x || 0} ${height - 40} L 0 ${height - 40} Z`}
          fill={color}
          fillOpacity="0.1"
        />

        {/* Line */}
        <path
          d={pathD}
          fill="none"
          stroke={color}
          strokeWidth="0.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Data points */}
        {points.map((p, i) => (
          <g key={i}>
            <circle
              cx={p.x}
              cy={p.y}
              r="1"
              fill={color}
              className="opacity-0 hover:opacity-100 transition-opacity"
            />
            <title>
              {formatDate(p.date)}: {p.value}
            </title>
          </g>
        ))}

        {/* X-axis labels */}
        {xLabels.map((xl, i) => (
          <text
            key={i}
            x={xl.x}
            y={height - 30}
            textAnchor="middle"
            className="text-[3px] fill-gray-400"
          >
            {xl.label}
          </text>
        ))}
      </svg>

      <div className="text-center text-xs text-gray-500 -mt-2">{label}</div>
    </div>
  );
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

// Bar chart variant for categorical data
interface BarChartProps {
  data: { label: string; value: number; color?: string }[];
  height?: number;
}

export function BarChart({ data, height = 200 }: BarChartProps) {
  if (data.length === 0) {
    return (
      <div
        className="flex items-center justify-center text-gray-400"
        style={{ height }}
      >
        No data available
      </div>
    );
  }

  const maxValue = Math.max(...data.map((d) => d.value));
  const barWidth = 100 / data.length;

  return (
    <div style={{ height }}>
      <svg viewBox={`0 0 100 ${height}`} className="w-full h-full">
        {data.map((d, i) => {
          const barHeight = (d.value / maxValue) * (height - 40);
          const x = i * barWidth + barWidth * 0.1;
          const width = barWidth * 0.8;
          const y = height - 40 - barHeight;

          return (
            <g key={i}>
              <rect
                x={x}
                y={y}
                width={width}
                height={barHeight}
                fill={d.color || '#21A8B0'}
                rx="1"
              />
              <text
                x={x + width / 2}
                y={height - 30}
                textAnchor="middle"
                className="text-[3px] fill-gray-500"
              >
                {d.label}
              </text>
              <text
                x={x + width / 2}
                y={y - 3}
                textAnchor="middle"
                className="text-[3px] fill-gray-600 font-medium"
              >
                {d.value}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

// Comparison chart for A/B test results
interface ComparisonChartProps {
  data: {
    metric: string;
    control: number;
    treatment: number;
    isSignificant: boolean;
  }[];
  height?: number;
}

export function ComparisonChart({ data, height = 300 }: ComparisonChartProps) {
  if (data.length === 0) {
    return (
      <div
        className="flex items-center justify-center text-gray-400"
        style={{ height }}
      >
        No data available
      </div>
    );
  }

  const maxValue = Math.max(...data.flatMap((d) => [d.control, d.treatment]));

  return (
    <div style={{ height }} className="overflow-y-auto">
      {data.map((d, i) => {
        const controlWidth = (d.control / maxValue) * 100;
        const treatmentWidth = (d.treatment / maxValue) * 100;
        const improvement = d.treatment > d.control;

        return (
          <div
            key={i}
            className={`py-3 px-4 ${
              d.isSignificant ? 'bg-green-50' : ''
            } border-b border-gray-100`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700">
                {formatMetricName(d.metric)}
              </span>
              {d.isSignificant && (
                <span className="text-xs px-2 py-0.5 bg-green-100 text-green-700 rounded-full">
                  Significant
                </span>
              )}
            </div>

            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-500 w-16">Control</span>
                <div className="flex-1 h-4 bg-gray-100 rounded overflow-hidden">
                  <div
                    className="h-full bg-gray-400 rounded"
                    style={{ width: `${controlWidth}%` }}
                  />
                </div>
                <span className="text-xs text-gray-600 w-12 text-right">
                  {d.control.toFixed(1)}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-500 w-16">Treatment</span>
                <div className="flex-1 h-4 bg-gray-100 rounded overflow-hidden">
                  <div
                    className={`h-full rounded ${
                      improvement ? 'bg-green-500' : 'bg-red-500'
                    }`}
                    style={{ width: `${treatmentWidth}%` }}
                  />
                </div>
                <span
                  className={`text-xs w-12 text-right font-medium ${
                    improvement ? 'text-green-600' : 'text-red-600'
                  }`}
                >
                  {d.treatment.toFixed(1)}
                </span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function formatMetricName(metric: string): string {
  return metric
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, (str) => str.toUpperCase())
    .replace(/\./g, ' - ');
}

'use client';

/**
 * Statistical Significance Component
 * Displays statistical significance metrics for A/B experiments
 *
 * Shows p-value and sample sizes for experiment metrics
 */

type StatisticalSignificanceProps = {
  pValue: number;
  controlN: number;
  treatmentN: number;
};

export function StatisticalSignificance({
  pValue,
  controlN,
  treatmentN,
}: StatisticalSignificanceProps) {
  // Determine significance level
  const isSignificant = pValue < 0.05;
  const isHighlySignificant = pValue < 0.01;

  // Format p-value for display
  const formatPValue = (p: number) => {
    if (p < 0.001) return '< 0.001';
    if (p < 0.01) return p.toFixed(3);
    return p.toFixed(2);
  };

  return (
    <div className="flex items-center gap-3 text-xs">
      <span className="text-rich-black/50">
        p = {formatPValue(pValue)}
      </span>
      <span className="text-rich-black/50">
        n = {controlN + treatmentN}
      </span>
      {isHighlySignificant && (
        <span className="px-1.5 py-0.5 bg-success-light text-success rounded text-[10px] font-medium">
          p &lt; 0.01
        </span>
      )}
      {isSignificant && !isHighlySignificant && (
        <span className="px-1.5 py-0.5 bg-yellow-light text-yellow-dark rounded text-[10px] font-medium">
          p &lt; 0.05
        </span>
      )}
    </div>
  );
}

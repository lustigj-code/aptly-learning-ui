'use client';

import { motion } from 'framer-motion';
import { Lightbulb, Info, HelpCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

type WhyExplanationProps = {
  /** The explanation text */
  reason: string;
  /** Confidence level 0-100 */
  confidence?: number;
  /** Optional model info */
  modelInfo?: string;
  /** Visual variant */
  variant?: 'default' | 'compact' | 'inline';
  /** Optional className for customization */
  className?: string;
};

/**
 * WhyExplanation Component
 *
 * Displays ML model reasoning with a lightbulb icon, confidence indicator,
 * and model information. Used to explain "why" the AI made certain recommendations.
 */
export function WhyExplanation({
  reason,
  confidence,
  modelInfo,
  variant = 'default',
  className,
}: WhyExplanationProps) {
  // Get confidence color and label
  const getConfidenceConfig = (conf: number) => {
    if (conf >= 80) {
      return { color: 'text-success', bgColor: 'bg-success', label: 'High confidence' };
    }
    if (conf >= 60) {
      return { color: 'text-teal', bgColor: 'bg-teal', label: 'Good confidence' };
    }
    if (conf >= 40) {
      return { color: 'text-yellow-dark', bgColor: 'bg-yellow', label: 'Moderate confidence' };
    }
    return { color: 'text-rich-black/50', bgColor: 'bg-grey', label: 'Low confidence' };
  };

  const confidenceConfig = confidence !== undefined ? getConfidenceConfig(confidence) : null;

  if (variant === 'inline') {
    return (
      <span className={cn('inline-flex items-center gap-1 text-xs text-rich-black/60', className)}>
        <Lightbulb size={12} className="text-teal" />
        <span>{reason}</span>
        {confidence !== undefined && (
          <span className={cn('font-medium', confidenceConfig?.color)}>
            ({Math.round(confidence)}%)
          </span>
        )}
      </span>
    );
  }

  if (variant === 'compact') {
    return (
      <div
        className={cn(
          'flex items-start gap-2 p-2 rounded-lg bg-teal/5 border border-teal/10',
          className
        )}
      >
        <div className="w-5 h-5 rounded-md bg-teal/20 flex items-center justify-center flex-shrink-0 mt-0.5">
          <Lightbulb size={12} className="text-teal" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs text-rich-black/70 leading-relaxed">{reason}</p>
          {(confidence !== undefined || modelInfo) && (
            <div className="flex items-center gap-2 mt-1">
              {confidence !== undefined && (
                <span className={cn('text-xs font-medium', confidenceConfig?.color)}>
                  {Math.round(confidence)}% confident
                </span>
              )}
              {modelInfo && (
                <span className="text-xs text-rich-black/40">{modelInfo}</span>
              )}
            </div>
          )}
        </div>
      </div>
    );
  }

  // Default variant
  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className={cn(
        'p-3 rounded-lg bg-gradient-to-r from-teal/5 to-purple/5 border border-teal/15',
        className
      )}
    >
      <div className="flex items-start gap-3">
        {/* Icon */}
        <div className="w-8 h-8 rounded-lg bg-teal/20 flex items-center justify-center flex-shrink-0">
          <Lightbulb size={16} className="text-teal" />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-semibold text-navy uppercase tracking-wide">
              Why this recommendation
            </span>
            <div className="group relative">
              <HelpCircle size={12} className="text-rich-black/40 cursor-help" />
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-navy text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10">
                Based on your learning patterns
              </div>
            </div>
          </div>

          <p className="text-sm text-rich-black/70 leading-relaxed">{reason}</p>

          {/* Confidence & Model Info */}
          {(confidence !== undefined || modelInfo) && (
            <div className="flex items-center gap-3 mt-2 pt-2 border-t border-teal/10">
              {confidence !== undefined && (
                <div className="flex items-center gap-2">
                  {/* Confidence bar */}
                  <div className="w-16 h-1.5 bg-grey/20 rounded-full overflow-hidden">
                    <div
                      className={cn('h-full rounded-full transition-all', confidenceConfig?.bgColor)}
                      style={{ width: `${Math.min(100, Math.max(0, confidence))}%` }}
                    />
                  </div>
                  <span className={cn('text-xs font-medium', confidenceConfig?.color)}>
                    {Math.round(confidence)}%
                  </span>
                  <div className="group relative">
                    <Info size={12} className="text-rich-black/40 cursor-help" />
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-navy text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10">
                      {confidenceConfig?.label}
                    </div>
                  </div>
                </div>
              )}

              {modelInfo && (
                <span className="text-xs text-rich-black/40 flex items-center gap-1">
                  <span className="w-1 h-1 bg-rich-black/30 rounded-full" />
                  {modelInfo}
                </span>
              )}
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}

export default WhyExplanation;

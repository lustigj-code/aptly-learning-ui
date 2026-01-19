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
      <motion.div
        initial={{ opacity: 0, y: 4 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
        className={cn(
          'group flex items-start gap-2 p-2.5 rounded-lg bg-teal/5 border border-teal/10 hover:bg-teal/8 hover:border-teal/20 transition-all',
          className
        )}
      >
        <div className="w-5 h-5 rounded-md bg-teal/20 flex items-center justify-center flex-shrink-0 mt-0.5 group-hover:scale-110 transition-transform">
          <Lightbulb size={12} className="text-teal" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs text-rich-black/70 leading-relaxed">{reason}</p>
          {(confidence !== undefined || modelInfo) && (
            <div className="flex items-center gap-2 mt-1.5 flex-wrap">
              {confidence !== undefined && (
                <div className="flex items-center gap-1.5">
                  <div className="w-16 h-1 bg-grey/20 rounded-full overflow-hidden">
                    <motion.div
                      className={cn('h-full rounded-full', confidenceConfig?.bgColor)}
                      initial={{ width: 0 }}
                      animate={{ width: `${Math.min(100, Math.max(0, confidence))}%` }}
                      transition={{ duration: 0.5, delay: 0.2 }}
                    />
                  </div>
                  <span className={cn('text-xs font-semibold tabular-nums', confidenceConfig?.color)}>
                    {Math.round(confidence)}%
                  </span>
                </div>
              )}
              {modelInfo && (
                <>
                  <span className="text-xs text-rich-black/30">•</span>
                  <span className="text-xs text-rich-black/50 font-medium">{modelInfo}</span>
                </>
              )}
            </div>
          )}
        </div>
      </motion.div>
    );
  }

  // Default variant - Enhanced with better tooltips and animations
  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={cn(
        'group p-4 rounded-xl bg-gradient-to-r from-teal/5 to-purple/5 border border-teal/15 hover:border-teal/25 hover:shadow-sm transition-all',
        className
      )}
    >
      <div className="flex items-start gap-3">
        {/* Icon */}
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-teal/20 to-purple/10 flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform shadow-sm">
          <Lightbulb size={16} className="text-teal" />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xs font-bold text-navy uppercase tracking-wider">
              Why this recommendation
            </span>
            <div className="group/tooltip relative">
              <HelpCircle size={12} className="text-rich-black/40 hover:text-teal cursor-help transition-colors" />
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-1.5 bg-navy text-white text-xs rounded-lg opacity-0 group-hover/tooltip:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10 shadow-lg">
                Based on your learning patterns
                <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 border-4 border-transparent border-t-navy" />
              </div>
            </div>
          </div>

          <p className="text-sm text-rich-black/80 leading-relaxed">{reason}</p>

          {/* Confidence & Model Info - Enhanced */}
          {(confidence !== undefined || modelInfo) && (
            <div className="flex items-center gap-3 mt-3 pt-3 border-t border-teal/10">
              {confidence !== undefined && (
                <div className="flex items-center gap-2">
                  {/* Confidence bar with animation */}
                  <div className="w-20 h-2 bg-grey/15 rounded-full overflow-hidden shadow-inner">
                    <motion.div
                      className={cn('h-full rounded-full', confidenceConfig?.bgColor)}
                      initial={{ width: 0 }}
                      animate={{ width: `${Math.min(100, Math.max(0, confidence))}%` }}
                      transition={{ duration: 0.6, delay: 0.3, ease: 'easeOut' }}
                    />
                  </div>
                  <span className={cn('text-xs font-bold tabular-nums', confidenceConfig?.color)}>
                    {Math.round(confidence)}%
                  </span>
                  <div className="group/info relative">
                    <Info size={12} className="text-rich-black/40 hover:text-teal cursor-help transition-colors" />
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-1.5 bg-navy text-white text-xs rounded-lg opacity-0 group-hover/info:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10 shadow-lg">
                      {confidenceConfig?.label}
                      <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 border-4 border-transparent border-t-navy" />
                    </div>
                  </div>
                </div>
              )}

              {modelInfo && (
                <span className="text-xs text-rich-black/50 flex items-center gap-1.5 font-medium">
                  <span className="w-1 h-1 bg-rich-black/40 rounded-full" />
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

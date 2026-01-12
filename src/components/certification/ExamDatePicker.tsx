'use client';

import { useState, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Calendar,
  AlertCircle,
  Clock,
  X,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils';
import { formatDaysUntilExam, getDaysUntilExam } from '@/lib/certification/examScheduler';

// ============================================
// TYPES
// ============================================

export interface ExamDatePickerProps {
  value: Date | null;
  onChange: (date: Date | null) => void;
  onClear?: () => void;
  minDate?: Date;
  maxDate?: Date;
  disabled?: boolean;
  showDaysRemaining?: boolean;
  className?: string;
}

interface CalendarDay {
  date: Date;
  isCurrentMonth: boolean;
  isToday: boolean;
  isSelected: boolean;
  isPast: boolean;
  isBeyondMax: boolean;
}

// ============================================
// HELPERS
// ============================================

function getMonthDays(year: number, month: number): CalendarDay[] {
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const daysInMonth = lastDay.getDate();
  const startingDayOfWeek = firstDay.getDay();

  const days: CalendarDay[] = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Add days from previous month
  const prevMonth = new Date(year, month, 0);
  const prevMonthDays = prevMonth.getDate();
  for (let i = startingDayOfWeek - 1; i >= 0; i--) {
    const date = new Date(year, month - 1, prevMonthDays - i);
    days.push({
      date,
      isCurrentMonth: false,
      isToday: false,
      isSelected: false,
      isPast: date < today,
      isBeyondMax: false,
    });
  }

  // Add days of current month
  for (let day = 1; day <= daysInMonth; day++) {
    const date = new Date(year, month, day);
    date.setHours(0, 0, 0, 0);
    days.push({
      date,
      isCurrentMonth: true,
      isToday: date.getTime() === today.getTime(),
      isSelected: false,
      isPast: date < today,
      isBeyondMax: false,
    });
  }

  // Add days from next month to fill the grid
  const remainingDays = 42 - days.length; // 6 weeks * 7 days
  for (let i = 1; i <= remainingDays; i++) {
    const date = new Date(year, month + 1, i);
    days.push({
      date,
      isCurrentMonth: false,
      isToday: false,
      isSelected: false,
      isPast: false,
      isBeyondMax: false,
    });
  }

  return days;
}

function formatMonthYear(date: Date): string {
  return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}

function formatDate(date: Date): string {
  return date.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

// ============================================
// COMPONENT
// ============================================

export function ExamDatePicker({
  value,
  onChange,
  onClear,
  minDate,
  maxDate,
  disabled = false,
  showDaysRemaining = true,
  className,
}: ExamDatePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [viewDate, setViewDate] = useState(() => {
    if (value) return new Date(value.getFullYear(), value.getMonth(), 1);
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });

  const today = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  const effectiveMinDate = useMemo(() => minDate || today, [minDate, today]);
  const effectiveMaxDate = useMemo(() =>
    maxDate || new Date(today.getFullYear() + 2, today.getMonth(), today.getDate()),
    [maxDate, today]
  );

  const daysUntilExam = value ? getDaysUntilExam(value) : null;

  const handleDateSelect = useCallback((date: Date) => {
    if (date < effectiveMinDate || date > effectiveMaxDate) return;
    onChange(date);
    setIsOpen(false);
  }, [onChange, effectiveMinDate, effectiveMaxDate]);

  const handleClear = useCallback(() => {
    onChange(null);
    onClear?.();
  }, [onChange, onClear]);

  const goToPreviousMonth = useCallback(() => {
    setViewDate(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  }, []);

  const goToNextMonth = useCallback(() => {
    setViewDate(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  }, []);

  // Generate calendar days
  const calendarDays = getMonthDays(viewDate.getFullYear(), viewDate.getMonth()).map(day => ({
    ...day,
    isSelected: value ? day.date.getTime() === new Date(value.setHours(0, 0, 0, 0)).getTime() : false,
    isPast: day.date < effectiveMinDate,
    isBeyondMax: day.date > effectiveMaxDate,
  }));

  // Get status color based on days remaining
  const getStatusColor = () => {
    if (!daysUntilExam) return 'text-rich-black/60';
    if (daysUntilExam < 0) return 'text-error';
    if (daysUntilExam <= 7) return 'text-yellow-600';
    if (daysUntilExam <= 30) return 'text-teal';
    return 'text-navy';
  };

  const getStatusBgColor = () => {
    if (!daysUntilExam) return 'bg-grey/10';
    if (daysUntilExam < 0) return 'bg-error/10';
    if (daysUntilExam <= 7) return 'bg-yellow/10';
    if (daysUntilExam <= 30) return 'bg-teal/10';
    return 'bg-navy/5';
  };

  return (
    <div className={cn('relative', className)}>
      {/* Date Input Display */}
      <button
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className={cn(
          'w-full flex items-center justify-between gap-3 px-4 py-3',
          'border-2 rounded-xl transition-all duration-200',
          'focus:outline-none focus:ring-2 focus:ring-teal/50',
          isOpen ? 'border-teal bg-teal/5' : 'border-grey/30 hover:border-grey/50',
          disabled && 'opacity-50 cursor-not-allowed',
          !disabled && 'cursor-pointer'
        )}
      >
        <div className="flex items-center gap-3">
          <Calendar size={20} className={value ? 'text-teal' : 'text-rich-black/40'} />
          <span className={cn(
            'text-left',
            value ? 'text-navy font-medium' : 'text-rich-black/50'
          )}>
            {value ? formatDate(value) : 'Select your exam date'}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {value && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleClear();
              }}
              className="p-1 rounded-full hover:bg-grey/20 text-rich-black/40 hover:text-error transition-colors"
            >
              <X size={16} />
            </button>
          )}
          <ChevronRight
            size={18}
            className={cn(
              'text-rich-black/40 transition-transform duration-200',
              isOpen && 'rotate-90'
            )}
          />
        </div>
      </button>

      {/* Days Remaining Badge */}
      {showDaysRemaining && value && daysUntilExam !== null && (
        <motion.div
          initial={{ opacity: 0, y: -5 }}
          animate={{ opacity: 1, y: 0 }}
          className={cn(
            'mt-2 px-3 py-2 rounded-lg flex items-center gap-2',
            getStatusBgColor()
          )}
        >
          {daysUntilExam <= 7 && daysUntilExam >= 0 ? (
            <AlertCircle size={16} className={getStatusColor()} />
          ) : (
            <Clock size={16} className={getStatusColor()} />
          )}
          <span className={cn('font-medium text-sm', getStatusColor())}>
            {formatDaysUntilExam(daysUntilExam)}
          </span>
        </motion.div>
      )}

      {/* Calendar Dropdown */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="absolute z-50 mt-2 w-full bg-white rounded-xl shadow-xl border border-grey/20 overflow-hidden"
          >
            {/* Calendar Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-grey/10 bg-light-grey/30">
              <button
                type="button"
                onClick={goToPreviousMonth}
                className="p-2 rounded-lg hover:bg-grey/20 text-rich-black/60 hover:text-navy transition-colors"
              >
                <ChevronLeft size={18} />
              </button>
              <span className="font-semibold text-navy">
                {formatMonthYear(viewDate)}
              </span>
              <button
                type="button"
                onClick={goToNextMonth}
                className="p-2 rounded-lg hover:bg-grey/20 text-rich-black/60 hover:text-navy transition-colors"
              >
                <ChevronRight size={18} />
              </button>
            </div>

            {/* Day Names */}
            <div className="grid grid-cols-7 gap-0 px-2 py-2 border-b border-grey/10">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                <div
                  key={day}
                  className="text-center text-xs font-medium text-rich-black/50 py-1"
                >
                  {day}
                </div>
              ))}
            </div>

            {/* Calendar Grid */}
            <div className="grid grid-cols-7 gap-0 p-2">
              {calendarDays.map((day, index) => {
                const isDisabled = day.isPast || day.isBeyondMax;
                return (
                  <button
                    key={index}
                    type="button"
                    onClick={() => !isDisabled && handleDateSelect(day.date)}
                    disabled={isDisabled}
                    className={cn(
                      'relative p-2 text-sm rounded-lg transition-all duration-150',
                      'focus:outline-none focus:ring-2 focus:ring-teal/50',
                      // Base styles
                      !day.isCurrentMonth && 'text-rich-black/30',
                      day.isCurrentMonth && !isDisabled && 'text-navy hover:bg-teal/10',
                      // Selected
                      day.isSelected && 'bg-teal text-white hover:bg-teal-dark',
                      // Today
                      day.isToday && !day.isSelected && 'ring-2 ring-teal/30',
                      // Disabled
                      isDisabled && 'text-rich-black/20 cursor-not-allowed'
                    )}
                  >
                    {day.date.getDate()}
                    {day.isSelected && (
                      <motion.div
                        layoutId="selected-date"
                        className="absolute inset-0 bg-teal rounded-lg -z-10"
                        initial={false}
                        transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                      />
                    )}
                  </button>
                );
              })}
            </div>

            {/* Quick Actions */}
            <div className="flex gap-2 p-3 border-t border-grey/10 bg-light-grey/20">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  const date = new Date();
                  date.setMonth(date.getMonth() + 1);
                  handleDateSelect(date);
                }}
                className="flex-1 text-xs"
              >
                In 1 month
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  const date = new Date();
                  date.setMonth(date.getMonth() + 2);
                  handleDateSelect(date);
                }}
                className="flex-1 text-xs"
              >
                In 2 months
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  const date = new Date();
                  date.setMonth(date.getMonth() + 3);
                  handleDateSelect(date);
                }}
                className="flex-1 text-xs"
              >
                In 3 months
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setIsOpen(false)}
        />
      )}
    </div>
  );
}

export default ExamDatePicker;

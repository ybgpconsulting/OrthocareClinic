import React from 'react';
import { ClinicSettings } from '../types';
import { formatDayHours, getWeeklyHours, WEEKDAYS } from '../utils/openingHours';

interface WeeklyHoursProps {
  settings: ClinicSettings | null;
  variant?: 'light' | 'dark';
  compact?: boolean;
}

export function WeeklyHours({ settings, variant = 'light', compact = false }: WeeklyHoursProps) {
  const today = new Intl.DateTimeFormat('en-US', {
    weekday: 'long',
    timeZone: 'Asia/Kolkata',
  }).format(new Date()).toLowerCase();
  const isDark = variant === 'dark';

  return (
    <ul
      aria-label="Clinic consultation hours, Monday through Sunday"
      className={`divide-y ${isDark ? 'divide-slate-800' : 'divide-slate-100'}`}
    >
      {getWeeklyHours(settings).map((day) => {
        const label = WEEKDAYS.find(({ id }) => id === day.day)?.label || day.day;
        const isToday = day.day === today;

        return (
          <li
            key={day.day}
            aria-current={isToday ? 'date' : undefined}
            className={`flex min-h-9 items-center justify-between gap-2 rounded-lg px-2 ${
              isToday
                ? isDark
                  ? 'bg-emerald-950/60'
                  : 'bg-emerald-50'
                : ''
            } ${compact ? 'py-1' : 'py-1.5'}`}
          >
            <span className="flex min-w-0 items-center gap-2">
              <span
                className={`text-sm font-semibold ${
                  isDark
                    ? isToday ? 'text-emerald-300' : 'text-slate-200'
                    : isToday ? 'text-emerald-900' : 'text-slate-800'
                }`}
              >
                {label}
              </span>
              {isToday && (
                <span
                  className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide ${
                    isDark
                      ? 'bg-emerald-900 text-emerald-200'
                      : 'bg-emerald-100 text-emerald-800'
                  }`}
                >
                  Today
                </span>
              )}
            </span>
            <span
              className={`shrink-0 text-right text-sm ${
                day.isClosed
                  ? isDark ? 'font-medium text-slate-400' : 'font-medium text-slate-500'
                  : isDark
                    ? 'font-medium text-slate-300'
                    : 'font-medium text-slate-700'
              }`}
            >
              {formatDayHours(day)}
            </span>
          </li>
        );
      })}
    </ul>
  );
}

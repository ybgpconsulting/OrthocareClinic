import { ClinicSettings, DayOpeningHours, OpeningTimeRange, Weekday } from '../types';

export const WEEKDAYS: { id: Weekday; label: string }[] = [
  { id: 'monday', label: 'Monday' },
  { id: 'tuesday', label: 'Tuesday' },
  { id: 'wednesday', label: 'Wednesday' },
  { id: 'thursday', label: 'Thursday' },
  { id: 'friday', label: 'Friday' },
  { id: 'saturday', label: 'Saturday' },
  { id: 'sunday', label: 'Sunday' },
];

function parseTime(value: string): string | null {
  const match = value.trim().match(/^(\d{1,2})(?::(\d{2}))?\s*(AM|PM)?$/i);
  if (!match) return null;

  let hours = Number(match[1]);
  const minutes = Number(match[2] || 0);
  const meridiem = match[3]?.toUpperCase();

  if (minutes > 59 || hours > (meridiem ? 12 : 23) || hours < (meridiem ? 1 : 0)) return null;
  if (meridiem) {
    hours = (hours % 12) + (meridiem === 'PM' ? 12 : 0);
  }

  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}

function parseTimeRanges(value: string | undefined): OpeningTimeRange[] {
  if (!value) return [];

  const time = String.raw`(\d{1,2}(?::\d{2})?\s*(?:AM|PM)?)`;
  const rangePattern = new RegExp(`${time}\\s*(?:-|–|—|to)\\s*${time}`, 'gi');
  const ranges: OpeningTimeRange[] = [];

  for (const match of value.matchAll(rangePattern)) {
    const open = parseTime(match[1]);
    const close = parseTime(match[2]);
    if (open && close) ranges.push({ open, close });
  }

  return ranges;
}

function parseNote(value: string | undefined): string | undefined {
  const parentheticalNote = value?.match(/\(([^)]+)\)/)?.[1]?.trim();
  if (parentheticalNote) return parentheticalNote;
  return value?.match(/\bby\s+(?:prior\s+)?appointment\b/i)?.[0];
}

function createLegacyDay(day: Weekday, value: string | undefined): DayOpeningHours {
  const intervals = parseTimeRanges(value);
  return {
    day,
    isClosed: intervals.length === 0 && Boolean(value?.match(/\b(off|closed)\b/i)),
    intervals,
    note: parseNote(value),
  };
}

export function getWeeklyHours(settings?: Partial<ClinicSettings> | null): DayOpeningHours[] {
  const savedHours = settings?.weeklyHours;
  if (Array.isArray(savedHours)) {
    return WEEKDAYS.map(({ id }) => {
      const savedDay = savedHours.find((entry) => entry.day === id);
      return savedDay
        ? {
            day: id,
            isClosed: Boolean(savedDay.isClosed),
            intervals: Array.isArray(savedDay.intervals)
              ? savedDay.intervals.map(({ open, close }) => ({ open, close }))
              : [],
            note: savedDay.note,
          }
        : { day: id, isClosed: true, intervals: [] };
    });
  }

  const weekdayIntervals = parseTimeRanges(settings?.openingHoursWeekday);
  const weekdayClosed =
    weekdayIntervals.length === 0 && Boolean(settings?.openingHoursWeekday?.match(/\b(off|closed)\b/i));

  return WEEKDAYS.map(({ id }) => {
    if (id === 'sunday') return createLegacyDay(id, settings?.openingHoursSunday);
    return {
      day: id,
      isClosed: weekdayClosed,
      intervals: weekdayIntervals.map(({ open, close }) => ({ open, close })),
      note: parseNote(settings?.openingHoursWeekday),
    };
  });
}

export function formatTime(value: string): string {
  const [hours, minutes] = value.split(':').map(Number);
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return value;
  const meridiem = hours >= 12 ? 'PM' : 'AM';
  const displayHour = hours % 12 || 12;
  return `${displayHour}:${String(minutes).padStart(2, '0')} ${meridiem}`;
}

export function formatDayHours(day: DayOpeningHours): string {
  if (day.isClosed) return 'Closed';
  const hours = day.intervals.length === 0
    ? 'Hours not set'
    : day.intervals
    .map(({ open, close }) => `${formatTime(open)} – ${formatTime(close)}`)
    .join(' · ');
  if (hours === 'Hours not set') return day.note || hours;
  return day.note ? `${hours} (${day.note})` : hours;
}

export function formatLegacyWeekdayHours(schedule: DayOpeningHours[]): string {
  const weekdaySchedule = schedule.slice(0, 6);
  const firstHours = formatDayHours(weekdaySchedule[0]);
  if (weekdaySchedule.every((day) => formatDayHours(day) === firstHours)) {
    return `Monday – Saturday: ${firstHours}`;
  }
  return weekdaySchedule
    .map((day, index) => `${WEEKDAYS[index].label}: ${formatDayHours(day)}`)
    .join('; ');
}

export function formatLegacySundayHours(schedule: DayOpeningHours[]): string {
  const sunday = schedule.find((day) => day.day === 'sunday');
  return sunday ? `Sunday: ${formatDayHours(sunday)}` : 'Sunday: Closed';
}

export function validateWeeklyHours(schedule: DayOpeningHours[]): string | null {
  for (const day of schedule) {
    if (day.isClosed) continue;
    if (day.intervals.length === 0) {
      return `Add at least one time period for ${WEEKDAYS.find(({ id }) => id === day.day)?.label}.`;
    }

    const intervals = day.intervals
      .map(({ open, close }) => ({
        start: open ? Number(open.replace(':', '')) : Number.NaN,
        end: close ? Number(close.replace(':', '')) : Number.NaN,
      }))
      .sort((a, b) => a.start - b.start);

    if (intervals.some(({ start, end }) => !Number.isFinite(start) || !Number.isFinite(end) || end <= start)) {
      return `Check the start and end times for ${WEEKDAYS.find(({ id }) => id === day.day)?.label}.`;
    }
    if (intervals.some((interval, index) => index > 0 && interval.start < intervals[index - 1].end)) {
      return `Time periods for ${WEEKDAYS.find(({ id }) => id === day.day)?.label} cannot overlap.`;
    }
  }
  return null;
}

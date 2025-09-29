// models/timetable.model.ts
import { User } from "./user.model";
import { Class } from "./class.model";
import { Subject } from "./subject.model";
import { Schedule } from "./schedule.model";

// Timetable session interface (simplified version of Session for display)
export interface TimetableSession {
  _id: string;
  sessionDate: Date; // Specific date for this session
  dayOfWeek: 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday';
  startTime: string;
  endTime: string;
  duration: string; // Formatted duration like "2h", "1h 30min"
  teacher?: User;
  class?: Class;
  className?: string; // For flexible class handling
  classGrade?: string;
  subject: Subject;
  sessionType: 'lecture' | 'practical' | 'exam' | 'revision' | 'tutorial' | 'lab' | 'fieldwork' | 'other';
  room?: string;
  notes?: string;
  weekType: 'A' | 'B' | 'both';
  status: 'scheduled' | 'ongoing' | 'completed' | 'cancelled' | 'rescheduled';
  schedule: Schedule;
}

// Grouped timetable structure (still useful for week view)
export interface WeeklyTimetable {
  monday: TimetableSession[];
  tuesday: TimetableSession[];
  wednesday: TimetableSession[];
  thursday: TimetableSession[];
  friday: TimetableSession[];
  saturday: TimetableSession[];
  sunday: TimetableSession[];
}

// NEW: Date-based timetable structure
export interface DateBasedTimetable {
  [date: string]: {
    date: string;
    dayOfWeek: string;
    sessions: TimetableSession[];
  };
}

// Enhanced timetable statistics
export interface TimetableStatistics {
  totalSessions: number;
  totalHours: number;
  classesCount?: number; // For teachers
  teachersCount?: number; // For students
  subjectsCount: number;
  weekTypeDistribution: {
    A: number;
    B: number;
    both: number;
  };
  upcomingSessions?: number; // NEW
  ongoingSessions?: number; // NEW
}

// Teacher timetable response (updated)
export interface TeacherTimetableResponse {
  teacher: {
    _id: string;
    name: string;
    email: string;
  };
  timetable: WeeklyTimetable;
  statistics: TimetableStatistics;
  weekType: string;
  academicYear?: string;
  dateRange: {
    startDate: string;
    endDate: string;
  };
}

// Student timetable response (updated)
export interface StudentTimetableResponse {
  student: {
    _id: string;
    name: string;
    email: string;
  };
  class: {
    name: string;
    grade: string;
  };
  timetable: WeeklyTimetable;
  statistics: TimetableStatistics;
  weekType: string;
  academicYear?: string;
  dateRange: {
    startDate: string;
    endDate: string;
  };
}

// Class timetable response (updated to support both ObjectId and className)
export interface ClassTimetableResponse {
  class: {
    _id?: string; // May be null if using className directly
    name: string;
    grade: string;
  };
  timetable: WeeklyTimetable;
  statistics: TimetableStatistics;
  weekType: string;
  academicYear?: string;
  dateRange: {
    startDate: string;
    endDate: string;
  };
}

// Weekly schedule response for dashboard (updated)
export interface WeeklyScheduleResponse {
  weeklySchedule: WeeklyTimetable;
  totalSessions: number;
  weekType?: string;
  academicYear?: string;
  weekRange: {
    startDate: string;
    endDate: string;
  };
}

// Current week info
export interface CurrentWeekResponse {
  currentWeekType: 'A' | 'B';
  weekNumber: number;
  academicYear: string;
  currentDate: string;
}

// Timetable query filters (updated)
export interface TimetableFilters {
  weekType?: 'A' | 'B' | 'both';
  academicYear?: string;
  startDate?: string; // NEW
  endDate?: string; // NEW
}

// Time slot for timetable display
export interface TimeSlot {
  start: string;
  end: string;
  display: string; // e.g., "08:00 - 10:00"
}

// Day configuration for timetable
export interface DayConfig {
  key: keyof WeeklyTimetable;
  label: string;
  fullLabel: string;
  sessions: TimetableSession[];
}

// Timetable view configuration
export interface TimetableViewConfig {
  showWeekends: boolean;
  timeSlotHeight: number;
  startHour: number; // 8 for 08:00
  endHour: number; // 18 for 18:00
  timeInterval: number; // 60 for 1-hour intervals
  showRoomNumbers: boolean;
  showSessionNotes: boolean;
  compactView: boolean;
  viewType: 'week' | 'day' | 'month'; // NEW
}

// Session status for real-time display
export interface SessionStatus {
  status: 'upcoming' | 'ongoing' | 'completed' | 'scheduled';
  minutesUntilStart?: number;
  minutesUntilEnd?: number;
}

// Session with status (for real-time timetables)
export interface TimetableSessionWithStatus extends TimetableSession {
  statusInfo: SessionStatus;
  isToday: boolean;
  isThisWeek: boolean; // NEW
}

// Week navigation (updated)
export interface WeekNavigation {
  currentWeek: 'A' | 'B';
  canSwitchWeek: boolean;
  nextWeekType: 'A' | 'B';
  weekStartDate: Date;
  weekEndDate: Date;
  weekNumber: number; // NEW
}

// Date navigation (NEW)
export interface DateNavigation {
  currentDate: Date;
  currentWeek: Date[];
  currentMonth: Date[];
  canNavigate: {
    previousWeek: boolean;
    nextWeek: boolean;
    previousMonth: boolean;
    nextMonth: boolean;
  };
}

// Timetable export options
export interface TimetableExportOptions {
  format: 'pdf' | 'excel' | 'csv';
  includeWeekends: boolean;
  weekType: 'A' | 'B' | 'both' | 'current';
  dateRange?: {
    start: Date;
    end: Date;
  };
  includeDetails: boolean; // NEW
}

// Print/export configuration
export interface TimetablePrintConfig {
  title: string;
  subtitle?: string;
  showLogo: boolean;
  showStatistics: boolean;
  orientation: 'portrait' | 'landscape';
  paperSize: 'A4' | 'A3' | 'letter';
  includeEmptySlots: boolean; // NEW
}

// Time conflict information for display
export interface TimetableConflict {
  session: TimetableSession;
  conflictType: 'teacher' | 'class' | 'room';
  conflictWith: TimetableSession[];
  severity: 'warning' | 'error';
  date: string; // NEW - specific date of conflict
}

// Timetable validation result
export interface TimetableValidation {
  isValid: boolean;
  conflicts: TimetableConflict[];
  warnings: string[];
  suggestions: string[];
}

// Mobile timetable view (updated)
export interface MobileTimetableDay {
  date: Date;
  dateString: string; // YYYY-MM-DD format
  dayName: string;
  sessions: TimetableSession[];
  hasConflicts: boolean;
  isToday: boolean;
  sessionCount: number; // NEW
}

// NEW: Calendar view for monthly timetable
export interface TimetableCalendarDay {
  date: Date;
  dateString: string;
  dayOfMonth: number;
  isCurrentMonth: boolean;
  isToday: boolean;
  sessions: TimetableSession[];
  sessionCount: number;
  hasConflicts: boolean;
}

export interface TimetableCalendarWeek {
  weekNumber: number;
  weekType: 'A' | 'B';
  days: TimetableCalendarDay[];
}

export interface TimetableCalendar {
  month: number;
  year: number;
  monthName: string;
  weeks: TimetableCalendarWeek[];
}

// NEW: Search and filter options
export interface TimetableSearchOptions {
  query?: string;
  teacherName?: string;
  subjectName?: string;
  className?: string;
  room?: string;
  sessionType?: string;
  dateFrom?: Date;
  dateTo?: Date;
}

// NEW: Session grouping options
export interface TimetableGroupingOptions {
  groupBy: 'date' | 'teacher' | 'subject' | 'class' | 'room';
  sortBy: 'time' | 'date' | 'duration' | 'alphabetical';
  sortOrder: 'asc' | 'desc';
}

// Utility types for timetable
export type TimetableViewType = 'week' | 'day' | 'list' | 'calendar'; // Updated
export type TimetableUserType = 'teacher' | 'student' | 'class';
export type SessionColorScheme = 'subject' | 'teacher' | 'type' | 'weekType' | 'status'; // Updated

// NEW: Timetable preferences (for user settings)
export interface TimetablePreferences {
  defaultView: TimetableViewType;
  colorScheme: SessionColorScheme;
  showWeekends: boolean;
  timeFormat: '12h' | '24h';
  startHour: number;
  endHour: number;
  autoRefresh: boolean;
  refreshInterval: number; // seconds
  showNotifications: boolean;
  notifyBefore: number; // minutes
}

// NEW: Quick access session info
export interface QuickSessionInfo {
  upcomingToday: TimetableSession[];
  currentSession?: TimetableSession;
  nextSession?: TimetableSession;
  totalToday: number;
  completedToday: number;
}
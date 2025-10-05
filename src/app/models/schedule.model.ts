  // models/schedule.model.ts
  import { User } from "./user.model";
  import { School } from "./school.model";
  import { Class } from "./class.model";
  import { Subject } from "./subject.model";

  export interface Schedule {
    _id?: string;
    name: string;
    teacher: User | string; // Each schedule belongs to a specific teacher
    weekType: 'A' | 'B' | 'both';
    description?: string;
    status: 'draft' | 'active' | 'completed' | 'suspended';
    school: School | string;
    isActive: boolean;
    createdBy: User | string;
    createdAt?: Date;
    updatedAt?: Date;
    sessionCount?: number; // Added by backend for list view
    statistics?: ScheduleStatistics; // Added for detailed view
  }

  export interface Session {
    _id?: string;
    schedule: Schedule | string;
    sessionDate: Date; // Specific date for this session
    dayOfWeek: 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday';
    startTime: string; // Format: "HH:MM"
    endTime: string; // Format: "HH:MM"
    duration: number; // Duration in minutes
    teacher: User | string;
    class?: Class | string; // Optional - for backward compatibility
    className: string; // Required - flexible class identifier
    classGrade: string; // Required - class grade/level
    subject: Subject | string;
    sessionType: 'lecture' | 'practical' | 'exam' | 'revision' | 'tutorial' | 'lab' | 'fieldwork' | 'other';
    room?: string;
    notes?: string;
    weekType: 'A' | 'B' | 'both';
    status: 'scheduled' | 'ongoing' | 'completed' | 'cancelled' | 'rescheduled';
    expectedStudents?: number;
    actualAttendance?: number;
    isActive: boolean;
    school: School | string;
    createdBy: User | string;
    createdAt?: Date;
    updatedAt?: Date;
  }

  // Request interfaces
  export interface CreateScheduleRequest {
    name: string;
    teacherId: string; // Required - teacher ID
    weekType: 'A' | 'B' | 'both';
    description?: string;
  }

  export interface UpdateScheduleRequest {
    name?: string;
    weekType?: 'A' | 'B' | 'both';
    description?: string;
    status?: 'draft' | 'active' | 'completed' | 'suspended';
    isActive?: boolean;
  }
// In schedule.model.ts
export interface CreateSessionRequest {
  sessionDate: string;
  startTime: string;
  endTime: string;
  // Remove duration and dayOfWeek - they're calculated by the backend
  className: string;
  classGrade: string;
  subjectId: string;
  sessionType?: string;
  room?: string;
  notes?: string;
  weekType?: string;
}
  export interface UpdateSessionRequest {
    sessionDate?: string;
    startTime?: string;
    endTime?: string;
    className?: string;
    classGrade?: string;
    subjectId?: string;
    sessionType?: 'lecture' | 'practical' | 'exam' | 'revision' | 'tutorial' | 'lab' | 'fieldwork' | 'other';
    room?: string;
    notes?: string;
    weekType?: 'A' | 'B' | 'both';
    status?: 'scheduled' | 'ongoing' | 'completed' | 'cancelled' | 'rescheduled';
  }


  // Response interfaces
  export interface ScheduleResponse {
    message: string;
    schedule: Schedule;
  }

  export interface SchedulesResponse {
    schedules: Schedule[];
    pagination: {
      currentPage: number;
      totalPages: number;
      totalSchedules: number;
    };
  }

  export interface SessionResponse {
    message: string;
    session: Session;
  }

  export interface SessionsResponse {
    sessions: Session[];
  }

  export interface ScheduleWithSessionsResponse {
    schedule: Schedule;
    sessions: GroupedSessions | ClassGroupedSessions | SubjectGroupedSessions;
    statistics: ScheduleStatistics;
  }


  // NEW: Class schedule response for students
  export interface ClassScheduleResponse {
    className: string;
    classGrade: string;
    schedule: GroupedSessionsByDate;
    statistics: ClassScheduleStatistics;
    dateRange: {
      startDate: string;
      endDate: string;
    };
  }

  // NEW: All classes overview response
  export interface AllClassesScheduleResponse {
    classes: {
      [className: string]: {
        className: string;
        classGrade: string;
        sessions: Session[];
      };
    };
    statistics: {
      totalClasses: number;
      totalSessions: number;
      totalHours: number;
      uniqueTeachers: number;
      uniqueSubjects: number;
    };
    filters: {
      weekType?: string;
      date?: string;
    };
  }

  // NEW: Teacher schedule response
  export interface TeacherScheduleResponse {
    teacher: {
      _id: string;
      name: string;
      email: string;
    };
    schedule: {
      _id: string;
      name: string;
      weekType: string;
    };
    sessions: GroupedSessionsByDate;
    statistics: ScheduleStatistics;
  }

  // Grouped sessions interfaces
  export interface GroupedSessions {
    monday?: Session[];
    tuesday?: Session[];
    wednesday?: Session[];
    thursday?: Session[];
    friday?: Session[];
    saturday?: Session[];
    sunday?: Session[];
  }

  // NEW: Grouped by date
  export interface GroupedSessionsByDate {
    [date: string]: {
      date: string;
      dayOfWeek: string;
      sessions: Session[];
    };
  }

  export interface ClassGroupedSessions {
    [className: string]: {
      className: string;
      classGrade: string;
      sessions: Session[];
    };
  }

  export interface SubjectGroupedSessions {
    [subjectId: string]: {
      subject: Subject;
      sessions: Session[];
    };
  }

  // Statistics interfaces
  export interface ScheduleStatistics {
    totalSessions: number;
    totalHours: number;
    uniqueClasses: number;
    uniqueSubjects: number;
    weekTypeDistribution: {
      A: number;
      B: number;
      both: number;
    };
  }

  export interface ClassScheduleStatistics {
    totalSessions: number;
    totalHours: number;
    uniqueTeachers: number;
    uniqueSubjects: number;
    sessionTypes: {
      [type: string]: number;
    };
  }

  export interface DetailedScheduleStatistics {
    basic: {
      totalSessions: number;
      totalHours: number;
      uniqueTeachers: number;
      uniqueClasses: number;
      uniqueSubjects: number;
    };
    weekTypeDistribution: {
      A: number;
      B: number;
      both: number;
    };
    sessionsByDay: {
      [day: string]: number;
    };
    sessionsByType: {
      [type: string]: number;
    };
    classesList: string[];
    subjectsList: Subject[];
  }

  export interface ScheduleStatisticsResponse {
    schedule: {
      _id: string;
      name: string;
      teacher: User;
      weekType: string;
    };
    statistics: DetailedScheduleStatistics;
  }

  // Conflict detection
  export interface TimeConflict {
    teacher?: string;
    className?: string;
    subject?: string;
    time: string;
    date: string;
    weekType: string;
  }

  export interface ConflictError {
    message: string;
    conflicts: TimeConflict[];
  }

  // Query filters
  export interface ScheduleFilters {
    page?: number;
    limit?: number;
    weekType?: 'A' | 'B' | 'both';
    teacherId?: string;
    status?: 'draft' | 'active' | 'completed' | 'suspended';
    isActive?: boolean; // Added missing property
  }

  export interface SessionFilters {
    startDate?: string;
    endDate?: string;
    className?: string;
    subjectId?: string;
    status?: 'scheduled' | 'ongoing' | 'completed' | 'cancelled' | 'rescheduled';
    weekType?: 'A' | 'B' | 'both'; // Added missing property
  }

  // NEW: Class schedule filters
  export interface ClassScheduleFilters {
    startDate?: string;
    endDate?: string;
    weekType?: 'A' | 'B' | 'both';
  }

  // Utility types
  export type WeekType = 'A' | 'B' | 'both';
  export type DayOfWeek = 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday';
  export type SessionType = 'lecture' | 'practical' | 'exam' | 'revision' | 'tutorial' | 'lab' | 'fieldwork' | 'other';
  export type SessionStatus = 'scheduled' | 'ongoing' | 'completed' | 'cancelled' | 'rescheduled';
  export type ScheduleStatus = 'draft' | 'active' | 'completed' | 'suspended';
  export type GroupByType = 'date' | 'class' | 'subject';

  // NEW: Date-based session utilities
  export interface SessionDate {
    date: Date;
    dateString: string; // YYYY-MM-DD format
    dayOfWeek: DayOfWeek;
    isToday: boolean;
    isWeekend: boolean;
  }

  // NEW: Session with computed properties
  export interface SessionWithMeta extends Omit<Session, 'sessionDate'> {
    formattedDuration: string; // e.g., "2h", "1h 30min"
    formattedTime: string; // e.g., "08:00 - 10:00"
    isToday: boolean;
    currentStatus: 'upcoming' | 'ongoing' | 'completed' | 'scheduled';
    sessionDate: SessionDate; // Override with SessionDate type
  }
// services/schedule.service.ts
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { BaseService } from './base.service';
import {
  Schedule,
  Session,
  CreateScheduleRequest,
  UpdateScheduleRequest,
  CreateSessionRequest,
  UpdateSessionRequest,
  ScheduleResponse,
  SchedulesResponse,
  SessionResponse,
  SessionsResponse,
  ScheduleWithSessionsResponse,
  ScheduleStatisticsResponse,
  ScheduleFilters,
  SessionFilters,
  GroupByType,
  ClassScheduleResponse,
  ClassScheduleFilters,
  AllClassesScheduleResponse,
  TeacherScheduleResponse,
  TimeConflict,
  SessionWithMeta
} from '../models/schedule.model';
import { map } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class ScheduleService extends BaseService {
  private endpoint = '/schedules';

  constructor(http: HttpClient) {
    super(http);
  }

  // Schedule CRUD operations
  createSchedule(schedule: CreateScheduleRequest): Observable<ScheduleResponse> {
    return this.http.post<ScheduleResponse>(
      `${this.apiUrl}${this.endpoint}`,
      schedule
    );
  }

  getAllSchedules(filters?: ScheduleFilters): Observable<SchedulesResponse> {
    const params = this.buildParams(filters || {});
    return this.http.get<SchedulesResponse>(
      `${this.apiUrl}${this.endpoint}`,
      { params }
    );
  }

  getScheduleById(
    scheduleId: string, 
    groupBy: GroupByType = 'date',
    startDate?: string,
    endDate?: string
  ): Observable<ScheduleWithSessionsResponse> {
    const params = this.buildParams({ 
      groupBy,
      ...(startDate && { startDate }),
      ...(endDate && { endDate })
    });
    return this.http.get<ScheduleWithSessionsResponse>(
      `${this.apiUrl}${this.endpoint}/${scheduleId}`,
      { params }
    );
  }

  updateSchedule(
    scheduleId: string, 
    updates: UpdateScheduleRequest
  ): Observable<ScheduleResponse> {
    return this.http.put<ScheduleResponse>(
      `${this.apiUrl}${this.endpoint}/${scheduleId}`,
      updates
    );
  }

  deleteSchedule(scheduleId: string): Observable<{ message: string; deletedSessionsCount: number }> {
    return this.http.delete<{ message: string; deletedSessionsCount: number }>(
      `${this.apiUrl}${this.endpoint}/${scheduleId}`
    );
  }

  // Session CRUD operations
  createSession(
    scheduleId: string, 
    session: CreateSessionRequest
  ): Observable<SessionResponse> {
    return this.http.post<SessionResponse>(
      `${this.apiUrl}${this.endpoint}/${scheduleId}/sessions`,
      session
    );
  }

  getScheduleSessions(
    scheduleId: string, 
    filters?: SessionFilters
  ): Observable<SessionsResponse> {
    const params = this.buildParams(filters || {});
    return this.http.get<SessionsResponse>(
      `${this.apiUrl}${this.endpoint}/${scheduleId}/sessions`,
      { params }
    );
  }

  updateSession(
    sessionId: string, 
    updates: UpdateSessionRequest
  ): Observable<SessionResponse> {
    return this.http.put<SessionResponse>(
      `${this.apiUrl}${this.endpoint}/sessions/${sessionId}`,
      updates
    );
  }

  deleteSession(sessionId: string): Observable<{ message: string; session: Session }> {
    return this.http.delete<{ message: string; session: Session }>(
      `${this.apiUrl}${this.endpoint}/sessions/${sessionId}`
    );
  }

  // NEW: Teacher schedule operations
  getTeacherSchedule(
    teacherId: string,
    startDate?: string,
    endDate?: string
  ): Observable<TeacherScheduleResponse> {
    const params = this.buildParams({
      ...(startDate && { startDate }),
      ...(endDate && { endDate })
    });
    return this.http.get<TeacherScheduleResponse>(
      `${this.apiUrl}${this.endpoint}/teacher/${teacherId}`,
      { params }
    );
  }

  // NEW: Class schedule operations
  getClassSchedule(
    className: string,
    filters?: ClassScheduleFilters
  ): Observable<ClassScheduleResponse> {
    const params = this.buildParams(filters || {});
    return this.http.get<ClassScheduleResponse>(
      `${this.apiUrl}${this.endpoint}/class/${encodeURIComponent(className)}/schedule`,
      { params }
    );
  }

  getAllClassesSchedules(filters?: {
    weekType?: string;
    date?: string;
  }): Observable<AllClassesScheduleResponse> {
    const params = this.buildParams(filters || {});
    return this.http.get<AllClassesScheduleResponse>(
      `${this.apiUrl}${this.endpoint}/classes/overview`,
      { params }
    );
  }

  // Advanced schedule operations
  // Clone method removed - each teacher can only have one schedule now

  getScheduleStatistics(scheduleId: string): Observable<ScheduleStatisticsResponse> {
    return this.http.get<ScheduleStatisticsResponse>(
      `${this.apiUrl}${this.endpoint}/${scheduleId}/statistics`
    );
  }

  // NEW: Bulk operations
  bulkUpdateSessions(
    sessions: { sessionId: string; updates: UpdateSessionRequest }[]
  ): Observable<{
    message: string;
    results: Array<{
      sessionId: string;
      success: boolean;
      session?: Session;
      error?: string;
    }>;
    summary: {
      total: number;
      successful: number;
      failed: number;
    };
  }> {
    return this.http.put<any>(
      `${this.apiUrl}${this.endpoint}/sessions/bulk-update`,
      { sessions }
    );
  }

  // Utility methods for easier data access
  getScheduleList(filters?: ScheduleFilters): Observable<Schedule[]> {
    return this.getAllSchedules(filters).pipe(
      map(response => response.schedules)
    );
  }

  getSessionList(scheduleId: string, filters?: SessionFilters): Observable<Session[]> {
    return this.getScheduleSessions(scheduleId, filters).pipe(
      map(response => response.sessions)
    );
  }

  // Helper methods for common operations
  activateSchedule(scheduleId: string): Observable<ScheduleResponse> {
    return this.updateSchedule(scheduleId, { isActive: true, status: 'active' });
  }

  deactivateSchedule(scheduleId: string): Observable<ScheduleResponse> {
    return this.updateSchedule(scheduleId, { isActive: false, status: 'suspended' });
  }

  getActiveSchedules(): Observable<Schedule[]> {
    const filters: ScheduleFilters = { status: 'active' };
    return this.getScheduleList(filters);
  }

  getSchedulesByTeacher(teacherId: string): Observable<Schedule[]> {
    const filters: ScheduleFilters = { teacherId };
    return this.getScheduleList(filters);
  }

  // NEW: Date-based session methods
  getSessionsByDate(
    scheduleId: string, 
    date: string
  ): Observable<Session[]> {
    return this.getSessionList(scheduleId, { 
      startDate: date, 
      endDate: date 
    });
  }

  getSessionsByDateRange(
    scheduleId: string,
    startDate: string,
    endDate: string
  ): Observable<Session[]> {
    return this.getSessionList(scheduleId, { startDate, endDate });
  }

  getSessionsByWeekType(
    scheduleId: string, 
    weekType: 'A' | 'B' | 'both'
  ): Observable<Session[]> {
    return this.getSessionList(scheduleId, { weekType });
  }

  getSessionsByClass(
    scheduleId: string, 
    className: string
  ): Observable<Session[]> {
    return this.getSessionList(scheduleId, { className });
  }

  getSessionsBySubject(
    scheduleId: string, 
    subjectId: string
  ): Observable<Session[]> {
    return this.getSessionList(scheduleId, { subjectId });
  }

  // NEW: Today's sessions
  getTodaysSessions(scheduleId: string): Observable<Session[]> {
    const today = new Date().toISOString().split('T')[0];
    return this.getSessionsByDate(scheduleId, today);
  }

  // NEW: This week's sessions
  getThisWeeksSessions(scheduleId: string): Observable<Session[]> {
    const today = new Date();
    const startOfWeek = new Date(today.setDate(today.getDate() - today.getDay()));
    const endOfWeek = new Date(today.setDate(today.getDate() - today.getDay() + 6));
    
    return this.getSessionsByDateRange(
      scheduleId,
      startOfWeek.toISOString().split('T')[0],
      endOfWeek.toISOString().split('T')[0]
    );
  }

  // Session validation helpers
  validateSessionTime(startTime: string, endTime: string): { valid: boolean; error?: string } {
    const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
    
    if (!timeRegex.test(startTime) || !timeRegex.test(endTime)) {
      return { valid: false, error: 'Invalid time format. Use HH:MM format.' };
    }

    const start = startTime.split(':').map(Number);
    const end = endTime.split(':').map(Number);
    const startMinutes = start[0] * 60 + start[1];
    const endMinutes = end[0] * 60 + end[1];

    if (endMinutes <= startMinutes) {
      return { valid: false, error: 'End time must be after start time.' };
    }

    const duration = endMinutes - startMinutes;
    if (duration < 15) {
      return { valid: false, error: 'Session must be at least 15 minutes long.' };
    }

    if (duration > 480) { // 8 hours
      return { valid: false, error: 'Session cannot exceed 8 hours.' };
    }

    return { valid: true };
  }

  validateSessionDate(date: string): { valid: boolean; error?: string } {
    const sessionDate = new Date(date);
    if (isNaN(sessionDate.getTime())) {
      return { valid: false, error: 'Invalid date format.' };
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    if (sessionDate < today) {
      return { valid: false, error: 'Session date cannot be in the past.' };
    }

    return { valid: true };
  }

  // Utility calculation methods
  calculateDuration(startTime: string, endTime: string): number {
    const start = startTime.split(':').map(Number);
    const end = endTime.split(':').map(Number);
    const startMinutes = start[0] * 60 + start[1];
    const endMinutes = end[0] * 60 + end[1];
    return endMinutes - startMinutes;
  }

  formatDuration(minutes: number): string {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    
    if (hours === 0) {
      return `${mins}min`;
    } else if (mins === 0) {
      return `${hours}h`;
    } else {
      return `${hours}h ${mins}min`;
    }
  }

  formatTimeRange(startTime: string, endTime: string): string {
    return `${startTime} - ${endTime}`;
  }

  // Session status helpers
  getSessionStatus(session: Session): 'upcoming' | 'ongoing' | 'completed' | 'scheduled' {
    const now = new Date();
    const sessionDate = new Date(session.sessionDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Check if session is today
    if (sessionDate.toDateString() !== today.toDateString()) {
      return sessionDate < today ? 'completed' : 'scheduled';
    }

    // Session is today, check time
    const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
    
    if (currentTime < session.startTime) {
      return 'upcoming';
    } else if (currentTime >= session.startTime && currentTime <= session.endTime) {
      return 'ongoing';
    } else {
      return 'completed';
    }
  }

  isSessionToday(session: Session): boolean {
    const today = new Date();
    const sessionDate = new Date(session.sessionDate);
    return sessionDate.toDateString() === today.toDateString();
  }

  // Enhanced session object with computed properties
  enhanceSession(session: Session): SessionWithMeta {
    return {
      ...session,
      formattedDuration: this.formatDuration(session.duration),
      formattedTime: this.formatTimeRange(session.startTime, session.endTime),
      isToday: this.isSessionToday(session),
      currentStatus: this.getSessionStatus(session),
      sessionDate: {
        date: new Date(session.sessionDate),
        dateString: new Date(session.sessionDate).toISOString().split('T')[0],
        dayOfWeek: session.dayOfWeek,
        isToday: this.isSessionToday(session),
        isWeekend: ['saturday', 'sunday'].includes(session.dayOfWeek)
      }
    };
  }

  enhanceSessions(sessions: Session[]): SessionWithMeta[] {
    return sessions.map(session => this.enhanceSession(session));
  }

  // Conflict detection helpers
  detectPotentialConflicts(
    newSession: CreateSessionRequest,
    existingSessions: Session[]
  ): TimeConflict[] {
    const conflicts: TimeConflict[] = [];
    const newStart = this.timeToMinutes(newSession.startTime);
    const newEnd = this.timeToMinutes(newSession.endTime);

    existingSessions.forEach(existing => {
      // Check if sessions are on the same date
      if (new Date(existing.sessionDate).toDateString() !== new Date(newSession.sessionDate).toDateString()) {
        return;
      }

      // Check week type conflicts
// Dans votre schedule.service.ts, ligne 452, modifiez cette ligne :
      if (!this.weekTypesConflict(newSession.weekType as 'A' | 'B' | 'both' || 'both', existing.weekType)) {
        return;
      }

      const existingStart = this.timeToMinutes(existing.startTime);
      const existingEnd = this.timeToMinutes(existing.endTime);

      // Check time overlap
      if (newStart < existingEnd && newEnd > existingStart) {
        conflicts.push({
          teacher: typeof existing.teacher === 'string' ? existing.teacher : existing.teacher.name,
          className: existing.className,
          subject: typeof existing.subject === 'string' ? existing.subject : existing.subject.name,
          time: `${existing.startTime} - ${existing.endTime}`,
          date: new Date(existing.sessionDate).toISOString().split('T')[0],
          weekType: existing.weekType
        });
      }
    });

    return conflicts;
  }

  private timeToMinutes(time: string): number {
    const [hours, minutes] = time.split(':').map(Number);
    return hours * 60 + minutes;
  }

  private weekTypesConflict(type1: 'A' | 'B' | 'both', type2: 'A' | 'B' | 'both'): boolean {
    if (type1 === 'both' || type2 === 'both') return true;
    return type1 === type2;
  }

  // Date utility methods
  getCurrentAcademicYear(): string {
    const now = new Date();
    const currentYear = now.getFullYear();
    const academicYearStart = new Date(currentYear, 8, 1); // September 1st
    
    if (now < academicYearStart) {
      return (currentYear - 1).toString();
    } else {
      return currentYear.toString();
    }
  }

  getNextAcademicYear(): string {
    const current = parseInt(this.getCurrentAcademicYear());
    return (current + 1).toString();
  }

  getWeekDates(date: Date = new Date()): { start: Date; end: Date; dates: Date[] } {
    const start = new Date(date);
    start.setDate(date.getDate() - date.getDay()); // Start of week (Sunday)
    start.setHours(0, 0, 0, 0);

    const end = new Date(start);
    end.setDate(start.getDate() + 6); // End of week (Saturday)
    end.setHours(23, 59, 59, 999);

    const dates: Date[] = [];
    for (let i = 0; i < 7; i++) {
      const day = new Date(start);
      day.setDate(start.getDate() + i);
      dates.push(day);
    }

    return { start, end, dates };
  }

  getMonthDates(date: Date = new Date()): Date[] {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    
    const dates: Date[] = [];
    for (let day = 1; day <= lastDay.getDate(); day++) {
      dates.push(new Date(year, month, day));
    }
    
    return dates;
  }

  // Session filtering and sorting
  filterSessionsByStatus(sessions: Session[], status: string[]): Session[] {
    return sessions.filter(session => status.includes(this.getSessionStatus(session)));
  }

  sortSessionsByTime(sessions: Session[]): Session[] {
    return sessions.sort((a, b) => {
      // First sort by date
      const dateA = new Date(a.sessionDate);
      const dateB = new Date(b.sessionDate);
      if (dateA.getTime() !== dateB.getTime()) {
        return dateA.getTime() - dateB.getTime();
      }
      
      // Then sort by start time
      const timeA = this.timeToMinutes(a.startTime);
      const timeB = this.timeToMinutes(b.startTime);
      return timeA - timeB;
    });
  }

  groupSessionsByDate(sessions: Session[]): { [date: string]: Session[] } {
    return sessions.reduce((groups, session) => {
      const date = new Date(session.sessionDate).toISOString().split('T')[0];
      if (!groups[date]) {
        groups[date] = [];
      }
      groups[date].push(session);
      return groups;
    }, {} as { [date: string]: Session[] });
  }

  groupSessionsByClass(sessions: Session[]): { [className: string]: Session[] } {
    return sessions.reduce((groups, session) => {
      const className = session.className;
      if (!groups[className]) {
        groups[className] = [];
      }
      groups[className].push(session);
      return groups;
    }, {} as { [className: string]: Session[] });
  }

  // Search functionality
  searchSessions(sessions: Session[], query: string): Session[] {
    if (!query.trim()) return sessions;

    const searchTerm = query.toLowerCase();
    return sessions.filter(session => {
      const teacherName = typeof session.teacher === 'string' ? '' : session.teacher.name.toLowerCase();
      const subjectName = typeof session.subject === 'string' ? '' : session.subject.name.toLowerCase();
      const className = session.className.toLowerCase();
      const room = (session.room || '').toLowerCase();
      const notes = (session.notes || '').toLowerCase();

      return teacherName.includes(searchTerm) ||
             subjectName.includes(searchTerm) ||
             className.includes(searchTerm) ||
             room.includes(searchTerm) ||
             notes.includes(searchTerm);
    });
  }

  // PDF Generation
  generateSchedulePDF(scheduleData: any): Observable<Blob> {
    return this.http.post(
      `${this.apiUrl}${this.endpoint}/generate-pdf`,
      scheduleData,
      {
        responseType: 'blob',
        headers: {
          'Accept': 'application/pdf'
        }
      }
    );
  }

}
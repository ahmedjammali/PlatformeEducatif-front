// services/timetable.service.ts
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { BaseService } from './base.service';
import {
  TeacherTimetableResponse,
  StudentTimetableResponse,
  ClassTimetableResponse,
  WeeklyScheduleResponse,
  CurrentWeekResponse,
  TimetableFilters,
  WeeklyTimetable,
  TimetableSession,
  TimetableSessionWithStatus,
  SessionStatus,
  DateBasedTimetable,
  TimetableStatistics,
  TimetableCalendar,
  TimetableCalendarDay,
  TimetableCalendarWeek,
  QuickSessionInfo,
  MobileTimetableDay
} from '../models/timetable.model';
import { map } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class TimetableService extends BaseService {
  private endpoint = '/schedules';

  constructor(http: HttpClient) {
    super(http);
  }

  // Teacher timetable (updated for new session structure)
  getTeacherTimetable(
    teacherId?: string, 
    filters?: TimetableFilters
  ): Observable<TeacherTimetableResponse> {
    const params = this.buildParams(filters || {});
    const url = teacherId 
      ? `${this.apiUrl}${this.endpoint}/timetable/teacher/${teacherId}`
      : `${this.apiUrl}${this.endpoint}/timetable/teacher`;
    
    return this.http.get<TeacherTimetableResponse>(url, { params });
  }

  // Student timetable (updated for new session structure)
  getStudentTimetable(
    studentId?: string, 
    filters?: TimetableFilters
  ): Observable<StudentTimetableResponse> {
    const params = this.buildParams(filters || {});
    const url = studentId 
      ? `${this.apiUrl}${this.endpoint}/timetable/student/${studentId}`
      : `${this.apiUrl}${this.endpoint}/timetable/student`;
    
    return this.http.get<StudentTimetableResponse>(url, { params });
  }

  // Class timetable (updated to support both ObjectId and className)
  getClassTimetable(
    classId: string, 
    filters?: TimetableFilters
  ): Observable<ClassTimetableResponse> {
    const params = this.buildParams(filters || {});
    return this.http.get<ClassTimetableResponse>(
      `${this.apiUrl}${this.endpoint}/timetable/class/${encodeURIComponent(classId)}`,
      { params }
    );
  }

  // Weekly schedule for dashboard (updated for new session structure)
  getWeeklySchedule(filters?: TimetableFilters): Observable<WeeklyScheduleResponse> {
    const params = this.buildParams(filters || {});
    return this.http.get<WeeklyScheduleResponse>(
      `${this.apiUrl}${this.endpoint}/weekly`,
      { params }
    );
  }

  // Current week information
  getCurrentWeek(): Observable<CurrentWeekResponse> {
    return this.http.get<CurrentWeekResponse>(
      `${this.apiUrl}${this.endpoint}/current-week`
    );
  }

  // Utility methods for easier data access
  getMyTimetable(
    role: 'teacher' | 'student', 
    filters?: TimetableFilters
  ): Observable<TeacherTimetableResponse | StudentTimetableResponse> {
    if (role === 'teacher') {
      return this.getTeacherTimetable(undefined, filters);
    } else {
      return this.getStudentTimetable(undefined, filters);
    }
  }

  getTimetableForWeek(
    userType: 'teacher' | 'student' | 'class',
    id?: string,
    weekType?: 'A' | 'B' | 'both'
  ): Observable<WeeklyTimetable> {
    const filters: TimetableFilters = weekType ? { weekType } : {};
    
    switch (userType) {
      case 'teacher':
        return this.getTeacherTimetable(id, filters).pipe(
          map(response => response.timetable)
        );
      case 'student':
        return this.getStudentTimetable(id, filters).pipe(
          map(response => response.timetable)
        );
      case 'class':
        if (!id) throw new Error('Class ID is required for class timetable');
        return this.getClassTimetable(id, filters).pipe(
          map(response => response.timetable)
        );
      default:
        throw new Error('Invalid user type');
    }
  }

  // NEW: Date-based timetable methods
  getTimetableForDate(
    userType: 'teacher' | 'student' | 'class',
    date: string,
    id?: string
  ): Observable<TimetableSession[]> {
    const filters: TimetableFilters = { 
      startDate: date, 
      endDate: date 
    };
    
    return this.getTimetableForWeek(userType, id).pipe(
      map(timetable => {
        const dayOfWeek = this.getDayOfWeekFromDate(date) as keyof WeeklyTimetable;
        return timetable[dayOfWeek] || [];
      })
    );
  }

  getTimetableForDateRange(
    userType: 'teacher' | 'student' | 'class',
    startDate: string,
    endDate: string,
    id?: string
  ): Observable<DateBasedTimetable> {
    const filters: TimetableFilters = { startDate, endDate };
    
    switch (userType) {
      case 'teacher':
        return this.getTeacherTimetable(id, filters).pipe(
          map(response => this.convertWeeklyToDateBased(response.timetable, startDate, endDate))
        );
      case 'student':
        return this.getStudentTimetable(id, filters).pipe(
          map(response => this.convertWeeklyToDateBased(response.timetable, startDate, endDate))
        );
      case 'class':
        if (!id) throw new Error('Class ID is required for class timetable');
        return this.getClassTimetable(id, filters).pipe(
          map(response => this.convertWeeklyToDateBased(response.timetable, startDate, endDate))
        );
      default:
        throw new Error('Invalid user type');
    }
  }

  // Helper methods for timetable manipulation
  getDayNames(): string[] {
    return ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
  }

  getDayDisplayNames(): { [key: string]: string } {
    return {
      monday: 'Monday',
      tuesday: 'Tuesday',
      wednesday: 'Wednesday',
      thursday: 'Thursday',
      friday: 'Friday',
      saturday: 'Saturday',
      sunday: 'Sunday'
    };
  }

  getWorkDays(): string[] {
    return ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'];
  }

  // Session status calculation (updated for date-based sessions)
  getSessionStatus(session: TimetableSession): SessionStatus {
    const now = new Date();
    const sessionDate = new Date(session.sessionDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Check if session is today
    if (sessionDate.toDateString() !== today.toDateString()) {
      return { status: sessionDate < today ? 'completed' : 'scheduled' };
    }

    // Session is today, check time
    const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
    
    if (currentTime < session.startTime) {
      const startMinutes = this.timeToMinutes(session.startTime);
      const currentMinutes = this.timeToMinutes(currentTime);
      return { 
        status: 'upcoming',
        minutesUntilStart: startMinutes - currentMinutes
      };
    } else if (currentTime >= session.startTime && currentTime <= session.endTime) {
      const endMinutes = this.timeToMinutes(session.endTime);
      const currentMinutes = this.timeToMinutes(currentTime);
      return { 
        status: 'ongoing',
        minutesUntilEnd: endMinutes - currentMinutes
      };
    } else {
      return { status: 'completed' };
    }
  }

  addStatusToSessions(sessions: TimetableSession[]): TimetableSessionWithStatus[] {
    return sessions.map((session: TimetableSession) => ({
      ...session,
      statusInfo: this.getSessionStatus(session),
      isToday: this.isSessionToday(session),
      isThisWeek: this.isSessionThisWeek(session)
    }));
  }

  isSessionToday(session: TimetableSession): boolean {
    const today = new Date();
    const sessionDate = new Date(session.sessionDate);
    return sessionDate.toDateString() === today.toDateString();
  }

  isSessionThisWeek(session: TimetableSession): boolean {
    const today = new Date();
    const sessionDate = new Date(session.sessionDate);
    const startOfWeek = new Date(today.setDate(today.getDate() - today.getDay()));
    const endOfWeek = new Date(today.setDate(today.getDate() - today.getDay() + 6));
    
    return sessionDate >= startOfWeek && sessionDate <= endOfWeek;
  }

  // Time utility methods
  private timeToMinutes(time: string): number {
    const [hours, minutes] = time.split(':').map(Number);
    return hours * 60 + minutes;
  }

  formatTime(time: string, format: '12h' | '24h' = '12h'): string {
    if (format === '24h') {
      return time;
    }

    const [hours, minutes] = time.split(':');
    const hour24 = parseInt(hours);
    const hour12 = hour24 === 0 ? 12 : hour24 > 12 ? hour24 - 12 : hour24;
    const ampm = hour24 >= 12 ? 'PM' : 'AM';
    return `${hour12}:${minutes} ${ampm}`;
  }

  formatTimeRange(startTime: string, endTime: string, format: '12h' | '24h' = '12h'): string {
    return `${this.formatTime(startTime, format)} - ${this.formatTime(endTime, format)}`;
  }

  formatDate(date: Date | string, format: 'short' | 'long' | 'iso' = 'short'): string {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    
    switch (format) {
      case 'short':
        return dateObj.toLocaleDateString();
      case 'long':
        return dateObj.toLocaleDateString('en-US', { 
          weekday: 'long', 
          year: 'numeric', 
          month: 'long', 
          day: 'numeric' 
        });
      case 'iso':
        return dateObj.toISOString().split('T')[0];
      default:
        return dateObj.toLocaleDateString();
    }
  }

  // Timetable filtering and sorting
  filterSessionsByWeekType(
    timetable: WeeklyTimetable, 
    weekType: 'A' | 'B' | 'both'
  ): WeeklyTimetable {
    const filtered: WeeklyTimetable = {
      monday: [],
      tuesday: [],
      wednesday: [],
      thursday: [],
      friday: [],
      saturday: [],
      sunday: []
    };

    Object.keys(timetable).forEach((day: string) => {
      const dayKey = day as keyof WeeklyTimetable;
      filtered[dayKey] = timetable[dayKey].filter((session: TimetableSession) => 
        session.weekType === weekType || session.weekType === 'both'
      );
    });

    return filtered;
  }

  filterSessionsByDate(sessions: TimetableSession[], date: string): TimetableSession[] {
    const targetDate = new Date(date);
    return sessions.filter(session => {
      const sessionDate = new Date(session.sessionDate);
      return sessionDate.toDateString() === targetDate.toDateString();
    });
  }

  sortSessionsByTime(sessions: TimetableSession[]): TimetableSession[] {
    return sessions.sort((a: TimetableSession, b: TimetableSession) => {
      // First sort by date
      const dateA = new Date(a.sessionDate);
      const dateB = new Date(b.sessionDate);
      if (dateA.getTime() !== dateB.getTime()) {
        return dateA.getTime() - dateB.getTime();
      }
      
      // Then sort by start time
      const aMinutes = this.timeToMinutes(a.startTime);
      const bMinutes = this.timeToMinutes(b.startTime);
      return aMinutes - bMinutes;
    });
  }

  // Timetable analysis
  getTotalSessionsCount(timetable: WeeklyTimetable): number {
    return Object.values(timetable).reduce((total: number, sessions: TimetableSession[]) => total + sessions.length, 0);
  }

  getTotalHours(timetable: WeeklyTimetable): number {
    let totalMinutes = 0;
    Object.values(timetable).forEach((sessions: TimetableSession[]) => {
      sessions.forEach((session: TimetableSession) => {
        const start = this.timeToMinutes(session.startTime);
        const end = this.timeToMinutes(session.endTime);
        totalMinutes += (end - start);
      });
    });
    return totalMinutes / 60;
  }

  getBusiestDay(timetable: WeeklyTimetable): string {
    let maxSessions = 0;
    let busiestDay = 'monday';
    
    Object.entries(timetable).forEach(([day, sessions]: [string, TimetableSession[]]) => {
      if (sessions.length > maxSessions) {
        maxSessions = sessions.length;
        busiestDay = day;
      }
    });

    return busiestDay;
  }

  getEarliestSession(timetable: WeeklyTimetable): TimetableSession | null {
    let earliest: TimetableSession | null = null;
    let earliestMinutes = Infinity;

    Object.values(timetable).forEach((sessions: TimetableSession[]) => {
      sessions.forEach((session: TimetableSession) => {
        const minutes = this.timeToMinutes(session.startTime);
        if (minutes < earliestMinutes) {
          earliestMinutes = minutes;
          earliest = session;
        }
      });
    });

    return earliest;
  }

  getLatestSession(timetable: WeeklyTimetable): TimetableSession | null {
    let latest: TimetableSession | null = null;
    let latestMinutes = -1;

    Object.values(timetable).forEach((sessions: TimetableSession[]) => {
      sessions.forEach((session: TimetableSession) => {
        const minutes = this.timeToMinutes(session.endTime);
        if (minutes > latestMinutes) {
          latestMinutes = minutes;
          latest = session;
        }
      });
    });

    return latest;
  }

  // NEW: Quick session info for dashboard
  getQuickSessionInfo(timetable: WeeklyTimetable): QuickSessionInfo {
    const now = new Date();
    const today = now.toISOString().split('T')[0];
    
    // Get all sessions and filter for today
    const allSessions: TimetableSession[] = [];
    Object.values(timetable).forEach(sessions => {
      allSessions.push(...sessions);
    });
    
    const todaysSessions = allSessions.filter(session => 
      this.formatDate(session.sessionDate, 'iso') === today
    );

    // Sort by time
    const sortedTodaysSessions = this.sortSessionsByTime(todaysSessions);
    
    // Find current and next sessions
    const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
    
    let currentSession: TimetableSession | undefined;
    let nextSession: TimetableSession | undefined;
    
    for (const session of sortedTodaysSessions) {
      if (currentTime >= session.startTime && currentTime <= session.endTime) {
        currentSession = session;
      } else if (currentTime < session.startTime && !nextSession) {
        nextSession = session;
      }
    }

    // Get upcoming sessions (next 3)
    const upcoming = sortedTodaysSessions.filter(session => 
      currentTime < session.startTime
    ).slice(0, 3);

    // Count completed sessions
    const completedToday = todaysSessions.filter(session => 
      currentTime > session.endTime
    ).length;

    return {
      upcomingToday: upcoming,
      currentSession,
      nextSession,
      totalToday: todaysSessions.length,
      completedToday
    };
  }

  // Conflict detection
  detectTimeConflicts(timetable: WeeklyTimetable): TimetableSession[][] {
    const conflicts: TimetableSession[][] = [];
    const allSessions: TimetableSession[] = [];

    // Collect all sessions
    Object.values(timetable).forEach(sessions => {
      allSessions.push(...sessions);
    });

    // Group by date for conflict detection
    const sessionsByDate = this.groupSessionsByDate(allSessions);

    Object.values(sessionsByDate).forEach(sessions => {
      for (let i = 0; i < sessions.length; i++) {
        for (let j = i + 1; j < sessions.length; j++) {
          const session1 = sessions[i];
          const session2 = sessions[j];

          if (this.sessionsOverlap(session1, session2) && 
              this.weekTypesConflict(session1.weekType, session2.weekType)) {
            conflicts.push([session1, session2]);
          }
        }
      }
    });

    return conflicts;
  }

  private sessionsOverlap(session1: TimetableSession, session2: TimetableSession): boolean {
    const start1 = this.timeToMinutes(session1.startTime);
    const end1 = this.timeToMinutes(session1.endTime);
    const start2 = this.timeToMinutes(session2.startTime);
    const end2 = this.timeToMinutes(session2.endTime);

    return start1 < end2 && start2 < end1;
  }

  private weekTypesConflict(type1: 'A' | 'B' | 'both', type2: 'A' | 'B' | 'both'): boolean {
    if (type1 === 'both' || type2 === 'both') return true;
    return type1 === type2;
  }

  // NEW: Calendar view methods
  generateTimetableCalendar(
    sessions: TimetableSession[],
    month: number,
    year: number
  ): TimetableCalendar {
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const monthName = firstDay.toLocaleDateString('en-US', { month: 'long' });

    // Group sessions by date
    const sessionsByDate = this.groupSessionsByDate(sessions);

    const weeks: TimetableCalendarWeek[] = [];
    let currentWeek: TimetableCalendarDay[] = [];
    let weekNumber = 1;

    // Start from the first day of the month
    for (let day = 1; day <= lastDay.getDate(); day++) {
      const date = new Date(year, month, day);
      const dateString = date.toISOString().split('T')[0];
      const daySessions = sessionsByDate[dateString] || [];

      const calendarDay: TimetableCalendarDay = {
        date,
        dateString,
        dayOfMonth: day,
        isCurrentMonth: true,
        isToday: this.isToday(date),
        sessions: daySessions,
        sessionCount: daySessions.length,
        hasConflicts: this.detectDayConflicts(daySessions).length > 0
      };

      currentWeek.push(calendarDay);

      // If Sunday or last day of month, complete the week
      if (date.getDay() === 0 || day === lastDay.getDate()) {
        // Fill the rest of the week if needed
        while (currentWeek.length < 7) {
          const fillDate = new Date(date);
          fillDate.setDate(date.getDate() + (7 - currentWeek.length));
          currentWeek.push({
            date: fillDate,
            dateString: fillDate.toISOString().split('T')[0],
            dayOfMonth: fillDate.getDate(),
            isCurrentMonth: false,
            isToday: false,
            sessions: [],
            sessionCount: 0,
            hasConflicts: false
          });
        }

        weeks.push({
          weekNumber: weekNumber++,
          weekType: this.getWeekType(currentWeek[0].date),
          days: currentWeek
        });

        currentWeek = [];
      }
    }

    return {
      month,
      year,
      monthName,
      weeks
    };
  }

  private isToday(date: Date): boolean {
    const today = new Date();
    return date.toDateString() === today.toDateString();
  }

  private detectDayConflicts(sessions: TimetableSession[]): TimetableSession[][] {
    const conflicts: TimetableSession[][] = [];
    
    for (let i = 0; i < sessions.length; i++) {
      for (let j = i + 1; j < sessions.length; j++) {
        if (this.sessionsOverlap(sessions[i], sessions[j])) {
          conflicts.push([sessions[i], sessions[j]]);
        }
      }
    }
    
    return conflicts;
  }

  private getWeekType(date: Date): 'A' | 'B' {
    // Calculate week type based on academic year start
    const year = date.getFullYear();
    const academicYearStart = new Date(year, 8, 1); // September 1st
    
    if (date < academicYearStart) {
      academicYearStart.setFullYear(year - 1);
    }
    
    const weeksSinceStart = Math.floor((date.getTime() - academicYearStart.getTime()) / (7 * 24 * 60 * 60 * 1000));
    return weeksSinceStart % 2 === 0 ? 'A' : 'B';
  }

  // Mobile-specific helpers
  getTodaysSessions(timetable: WeeklyTimetable): TimetableSession[] {
    const now = new Date();
    const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const todayName = dayNames[now.getDay()] as keyof WeeklyTimetable;
    
    const todaySessions = timetable[todayName] || [];
    return todaySessions.filter(session => this.isSessionToday(session));
  }

  getUpcomingSessions(timetable: WeeklyTimetable, limit: number = 5): TimetableSession[] {
    const allSessions: TimetableSession[] = [];
    
    Object.values(timetable).forEach(sessions => {
      allSessions.push(...sessions);
    });

    // Filter future sessions and sort by date/time
    const now = new Date();
    const futureSessions = allSessions.filter(session => {
      const sessionDate = new Date(session.sessionDate);
      return sessionDate >= now;
    });

    return this.sortSessionsByTime(futureSessions).slice(0, limit);
  }

  getMobileTimetableDays(
    timetable: WeeklyTimetable,
    startDate: Date,
    numberOfDays: number = 7
  ): MobileTimetableDay[] {
    const days: MobileTimetableDay[] = [];
    const allSessions: TimetableSession[] = [];
    
    Object.values(timetable).forEach(sessions => {
      allSessions.push(...sessions);
    });

    for (let i = 0; i < numberOfDays; i++) {
      const date = new Date(startDate);
      date.setDate(startDate.getDate() + i);
      const dateString = date.toISOString().split('T')[0];
      
      const daySessions = allSessions.filter(session => 
        this.formatDate(session.sessionDate, 'iso') === dateString
      );

      days.push({
        date,
        dateString,
        dayName: this.getDayDisplayNames()[this.getDayOfWeekFromDate(dateString)],
        sessions: this.sortSessionsByTime(daySessions),
        hasConflicts: this.detectDayConflicts(daySessions).length > 0,
        isToday: this.isToday(date),
        sessionCount: daySessions.length
      });
    }

    return days;
  }

  // Utility conversion methods
  private convertWeeklyToDateBased(
    weekly: WeeklyTimetable,
    startDate: string,
    endDate: string
  ): DateBasedTimetable {
    const dateBased: DateBasedTimetable = {};
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    // Iterate through all days in the range
    for (let date = new Date(start); date <= end; date.setDate(date.getDate() + 1)) {
      const dateString = date.toISOString().split('T')[0];
      const dayOfWeek = this.getDayOfWeekFromDate(dateString);
      const sessions = weekly[dayOfWeek as keyof WeeklyTimetable] || [];
      
      // Filter sessions for this specific date
      const dateSessions = sessions.filter(session =>
        this.formatDate(session.sessionDate, 'iso') === dateString
      );

      if (dateSessions.length > 0) {
        dateBased[dateString] = {
          date: dateString,
          dayOfWeek,
          sessions: this.sortSessionsByTime(dateSessions)
        };
      }
    }
    
    return dateBased;
  }

  private getDayOfWeekFromDate(dateString: string): string {
    const date = new Date(dateString);
    const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    return dayNames[date.getDay()];
  }

  private groupSessionsByDate(sessions: TimetableSession[]): { [date: string]: TimetableSession[] } {
    return sessions.reduce((groups, session) => {
      const date = this.formatDate(session.sessionDate, 'iso');
      if (!groups[date]) {
        groups[date] = [];
      }
      groups[date].push(session);
      return groups;
    }, {} as { [date: string]: TimetableSession[] });
  }

  // Timetable generation helpers
  generateTimeSlots(startHour: number = 8, endHour: number = 18, interval: number = 60): string[] {
    const slots: string[] = [];
    for (let hour = startHour; hour < endHour; hour += interval / 60) {
      const wholeHour = Math.floor(hour);
      const minutes = Math.round((hour - wholeHour) * 60);
      const timeString = `${wholeHour.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
      slots.push(timeString);
    }
    return slots;
  }

  // Export/Print helpers
  getTimetableForExport(
    timetable: WeeklyTimetable, 
    includeWeekends: boolean = false
  ): any[][] {
    const days = includeWeekends 
      ? ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']
      : ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'];

    const allTimes = new Set<string>();
    days.forEach((day: string) => {
      const dayKey = day as keyof WeeklyTimetable;
      timetable[dayKey].forEach((session: TimetableSession) => {
        allTimes.add(session.startTime);
        allTimes.add(session.endTime);
      });
    });

    const timeSlots = this.generateTimeSlots();
    
    // Generate grid data for export
    const exportData: any[][] = [];
    
    // Header row
    const header = ['Time', ...days.map((day: string) => this.getDayDisplayNames()[day])];
    exportData.push(header);

    // Data rows
    timeSlots.forEach((time: string) => {
      const row = [time];
      days.forEach((day: string) => {
        const dayKey = day as keyof WeeklyTimetable;
        const sessionsAtTime = timetable[dayKey].filter((session: TimetableSession) => 
          this.timeToMinutes(session.startTime) <= this.timeToMinutes(time) &&
          this.timeToMinutes(session.endTime) > this.timeToMinutes(time)
        );
        
        if (sessionsAtTime.length > 0) {
          const session = sessionsAtTime[0];
          row.push(`${session.subject.name} - ${session.room || 'No Room'}`);
        } else {
          row.push('');
        }
      });
      exportData.push(row);
    });

    return exportData;
  }

  // Search and filter methods
  searchTimetable(
    timetable: WeeklyTimetable,
    query: string
  ): WeeklyTimetable {
    if (!query.trim()) return timetable;
    
    const filtered: WeeklyTimetable = {
      monday: [],
      tuesday: [],
      wednesday: [],
      thursday: [],
      friday: [],
      saturday: [],
      sunday: []
    };

    const searchTerm = query.toLowerCase();

    Object.entries(timetable).forEach(([day, sessions]) => {
      const dayKey = day as keyof WeeklyTimetable;
      filtered[dayKey] = sessions.filter((session: TimetableSession) => {
        const teacherName = session.teacher?.name?.toLowerCase() || '';
        const subjectName = session.subject.name.toLowerCase();
        const className = session.className?.toLowerCase() || '';
        const room = (session.room || '').toLowerCase();
        const notes = (session.notes || '').toLowerCase();
        
        return teacherName.includes(searchTerm) ||
               subjectName.includes(searchTerm) ||
               className.includes(searchTerm) ||
               room.includes(searchTerm) ||
               notes.includes(searchTerm);
      });
    });

    return filtered;
  }

  // Statistics calculation
  calculateTimetableStatistics(timetable: WeeklyTimetable): TimetableStatistics {
    const allSessions: TimetableSession[] = [];
    Object.values(timetable).forEach(sessions => {
      allSessions.push(...sessions);
    });

    const uniqueTeachers = new Set(
      allSessions
        .map(s => s.teacher?._id)
        .filter(id => id)
    ).size;

    const uniqueSubjects = new Set(
      allSessions.map(s => s.subject._id)
    ).size;

    const uniqueClasses = new Set(
      allSessions.map(s => s.className).filter(name => name)
    ).size;

    const weekTypeDistribution = {
      A: allSessions.filter(s => s.weekType === 'A').length,
      B: allSessions.filter(s => s.weekType === 'B').length,
      both: allSessions.filter(s => s.weekType === 'both').length
    };

    const totalHours = allSessions.reduce((total, session) => {
      const start = this.timeToMinutes(session.startTime);
      const end = this.timeToMinutes(session.endTime);
      return total + (end - start);
    }, 0) / 60;

    const upcomingSessions = allSessions.filter(session => 
      this.getSessionStatus(session).status === 'upcoming'
    ).length;

    const ongoingSessions = allSessions.filter(session => 
      this.getSessionStatus(session).status === 'ongoing'
    ).length;

    return {
      totalSessions: allSessions.length,
      totalHours,
      teachersCount: uniqueTeachers,
      classesCount: uniqueClasses,
      subjectsCount: uniqueSubjects,
      weekTypeDistribution,
      upcomingSessions,
      ongoingSessions
    };
  }
}
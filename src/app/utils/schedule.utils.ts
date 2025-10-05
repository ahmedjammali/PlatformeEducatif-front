// utils/schedule.utils.ts
import { Session, SessionWithMeta, SessionDate, DayOfWeek } from '../models/schedule.model';

export class ScheduleUtils {
  
  // Time conversion utilities
  static timeToMinutes(time: string): number {
    const [hours, minutes] = time.split(':').map(Number);
    return hours * 60 + minutes;
  }

  static minutesToTime(minutes: number): string {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
  }

  static formatDuration(minutes: number): string {
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

  static calculateDuration(startTime: string, endTime: string): number {
    const start = startTime.split(':').map(Number);
    const end = endTime.split(':').map(Number);
    const startMinutes = start[0] * 60 + start[1];
    const endMinutes = end[0] * 60 + end[1];
    return endMinutes - startMinutes;
  }

  static formatTime(time: string, format: '12h' | '24h' = '12h'): string {
    if (format === '24h') {
      return time;
    }

    const [hours, minutes] = time.split(':');
    const hour24 = parseInt(hours);
    const hour12 = hour24 === 0 ? 12 : hour24 > 12 ? hour24 - 12 : hour24;
    const ampm = hour24 >= 12 ? 'PM' : 'AM';
    return `${hour12}:${minutes} ${ampm}`;
  }

  // Date utilities
  static getDayOfWeekFromDate(date: Date | string): DayOfWeek {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    const dayNames: DayOfWeek[] = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    return dayNames[dateObj.getDay()];
  }

  static isToday(date: Date | string): boolean {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    const today = new Date();
    return dateObj.toDateString() === today.toDateString();
  }

  static formatDate(date: Date | string, format: 'short' | 'long' | 'iso' = 'short'): string {
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

  // Session status calculation
  static getSessionStatus(session: Session): 'upcoming' | 'ongoing' | 'completed' | 'scheduled' {
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

  // Session enhancement
  static enhanceSession(session: Session): SessionWithMeta {
    const sessionDate: SessionDate = {
      date: new Date(session.sessionDate),
      dateString: this.formatDate(session.sessionDate, 'iso'),
      dayOfWeek: this.getDayOfWeekFromDate(session.sessionDate),
      isToday: this.isToday(session.sessionDate),
      isWeekend: ['saturday', 'sunday'].includes(this.getDayOfWeekFromDate(session.sessionDate))
    };

    return {
      ...session,
      sessionDate, // Override with SessionDate type
      formattedDuration: this.formatDuration(session.duration),
      formattedTime: `${session.startTime} - ${session.endTime}`,
      isToday: this.isToday(session.sessionDate),
      currentStatus: this.getSessionStatus(session)
    };
  }

  // Validation utilities
  static validateTimeFormat(time: string): boolean {
    const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
    return timeRegex.test(time);
  }

  static validateDateFormat(date: string): boolean {
    const dateObj = new Date(date);
    return !isNaN(dateObj.getTime());
  }

  static validateSessionTime(startTime: string, endTime: string): { valid: boolean; error?: string } {
    if (!this.validateTimeFormat(startTime) || !this.validateTimeFormat(endTime)) {
      return { valid: false, error: 'Invalid time format. Use HH:MM format.' };
    }

    const startMinutes = this.timeToMinutes(startTime);
    const endMinutes = this.timeToMinutes(endTime);

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


  // Week utilities
  static getWeekDates(date: Date = new Date()): { start: Date; end: Date; dates: Date[] } {
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

  static getCurrentWeekType(): 'A' | 'B' {
    const now = new Date();
    const currentYear = now.getFullYear();
    const academicYearStart = new Date(currentYear, 8, 1); // September 1st
    
    if (now < academicYearStart) {
      academicYearStart.setFullYear(currentYear - 1);
    }
    
    const weeksSinceStart = Math.floor((now.getTime() - academicYearStart.getTime()) / (7 * 24 * 60 * 60 * 1000));
    return weeksSinceStart % 2 === 0 ? 'A' : 'B';
  }

  // Sorting and filtering
  static sortSessionsByTime(sessions: Session[]): Session[] {
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

  static groupSessionsByDate(sessions: Session[]): { [date: string]: Session[] } {
    return sessions.reduce((groups, session) => {
      const date = this.formatDate(session.sessionDate, 'iso');
      if (!groups[date]) {
        groups[date] = [];
      }
      groups[date].push(session);
      return groups;
    }, {} as { [date: string]: Session[] });
  }

  static filterSessionsByStatus(sessions: Session[], statuses: string[]): Session[] {
    return sessions.filter(session => statuses.includes(this.getSessionStatus(session)));
  }

  // Conflict detection
  static detectTimeConflicts(sessions: Session[]): Session[][] {
    const conflicts: Session[][] = [];
    const sessionsByDate = this.groupSessionsByDate(sessions);

    Object.values(sessionsByDate).forEach(dateSessions => {
      for (let i = 0; i < dateSessions.length; i++) {
        for (let j = i + 1; j < dateSessions.length; j++) {
          const session1 = dateSessions[i];
          const session2 = dateSessions[j];

          if (this.sessionsOverlap(session1, session2) && 
              this.weekTypesConflict(session1.weekType, session2.weekType)) {
            conflicts.push([session1, session2]);
          }
        }
      }
    });

    return conflicts;
  }
private timeToMinutes(time: string): number {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
}
  private static sessionsOverlap(session1: Session, session2: Session): boolean {
    const start1 = this.timeToMinutes(session1.startTime);
    const end1 = this.timeToMinutes(session1.endTime);
    const start2 = this.timeToMinutes(session2.startTime);
    const end2 = this.timeToMinutes(session2.endTime);

    return start1 < end2 && start2 < end1;
  }

  private static weekTypesConflict(type1: 'A' | 'B' | 'both', type2: 'A' | 'B' | 'both'): boolean {
    if (type1 === 'both' || type2 === 'both') return true;
    return type1 === type2;
  }

  // Search utilities
  static searchSessions(sessions: Session[], query: string): Session[] {
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

  // Export utilities
  static generateTimeSlots(startHour: number = 8, endHour: number = 18, interval: number = 60): string[] {
    const slots: string[] = [];
    for (let hour = startHour; hour < endHour; hour += interval / 60) {
      const wholeHour = Math.floor(hour);
      const minutes = Math.round((hour - wholeHour) * 60);
      const timeString = `${wholeHour.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
      slots.push(timeString);
    }
    return slots;
  }

  // Calendar utilities
  static getMonthDates(date: Date = new Date()): Date[] {
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

  static getDayDisplayNames(): { [key: string]: string } {
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

  static getSessionTypeDisplayNames(): { [key: string]: string } {
    return {
      lecture: 'Lecture',
      practical: 'Practical',
      exam: 'Exam',
      revision: 'Revision',
      tutorial: 'Tutorial',
      lab: 'Laboratory',
      fieldwork: 'Field Work',
      other: 'Other'
    };
  }

  static getWeekTypeDisplayNames(): { [key: string]: string } {
    return {
      A: 'Week A',
      B: 'Week B',
      both: 'Both Weeks'
    };
  }
}
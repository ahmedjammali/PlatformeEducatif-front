import { Component, OnInit, OnDestroy, Input } from '@angular/core';
import { Subject, takeUntil } from 'rxjs';
import { ToasterService } from '../../../services/toaster.service';
import { ScheduleService } from '../../../services/schedule.service';
import { AuthService } from '../../../services/auth.service';
import { SessionWithMeta, TeacherScheduleResponse, Session, DayOfWeek } from '../../../models/schedule.model';
import { ScheduleUtils } from '../../../utils/schedule.utils';

@Component({
  selector: 'app-teacher-schedule',
  templateUrl: './teacher-schedule.component.html',
  styleUrls: ['./teacher-schedule.component.css']
})
export class TeacherScheduleComponent implements OnInit, OnDestroy {
  @Input() teacherId?: string;
  @Input() currentUser?: any;

  private destroy$ = new Subject<void>();

  // État de chargement
  loading = false;
  loadingMessage = '';

  // Données de l'enseignant
  selectedAcademicYear: string;
  academicYears: string[] = [];

  // Emploi du temps
  workDays = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  timeSlots = [
    '08:00', '09:00', '10:00', '11:00', '12:00',
    '13:00', '14:00', '15:00', '16:00', '17:00', '18:00'
  ];
  sessions: SessionWithMeta[] = [];

  constructor(
    private scheduleService: ScheduleService,
    private authService: AuthService,
    private toasterService: ToasterService
  ) {
    this.selectedAcademicYear = ScheduleUtils.getCurrentAcademicYear();
    this.academicYears = ScheduleUtils.getAcademicYearsList();
  }

  ngOnInit(): void {
    console.log('TeacherScheduleComponent initialized with currentUser:', this.currentUser);
    if (this.currentUser) {
      this.loadTeacherSchedule();
    } else {
      this.getCurrentUser();
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  getCurrentUser(): void {
    // Try multiple ways to get the current user
    this.currentUser = this.authService.getCurrentUser();
    console.log('Current user from auth service:', this.currentUser); // Debug log

    // If no user from auth service, try getting from localStorage directly
    if (!this.currentUser || !this.currentUser._id) {
      try {
        const userFromStorage = localStorage.getItem('currentUser');
        if (userFromStorage) {
          this.currentUser = JSON.parse(userFromStorage);
          console.log('Current user from localStorage:', this.currentUser); // Debug log
        }
      } catch (error) {
        console.error('Error parsing user from localStorage:', error);
      }
    }

    // If we have a user now, load the schedule
    if (this.currentUser && this.currentUser._id) {
      this.loadTeacherSchedule();
    } else {
      // Wait a bit more and try again
      setTimeout(() => {
        this.currentUser = this.authService.getCurrentUser();
        if (this.currentUser && this.currentUser._id) {
          this.loadTeacherSchedule();
        } else {
          console.error('Still no user available after timeout');
          this.toasterService.error('Impossible de récupérer les informations utilisateur. Veuillez vous reconnecter.');
          this.loading = false;
        }
      }, 2000);
    }
  }

  loadTeacherSchedule(): void {
    const teacherId = this.teacherId || this.currentUser?.id || this.currentUser?._id;
    console.log('Teacher ID for schedule loading:', teacherId); // Debug log
    console.log('Current user object:', this.currentUser); // Debug log
    if (!teacherId) {
      this.toasterService.error('Identifiant enseignant manquant');
      return;
    }

    this.loading = true;
    this.loadingMessage = 'Chargement de votre emploi du temps...';

    this.scheduleService.getTeacherSchedule(teacherId, undefined, undefined, this.selectedAcademicYear)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          // Flatten the grouped sessions by date into a simple array
          this.sessions = [];
          if (response.sessions) {
            Object.values(response.sessions).forEach(dayData => {
              if (dayData && dayData.sessions) {
                const sessionsWithMeta = dayData.sessions.map(session => this.addMetaToSession(session));
                this.sessions.push(...sessionsWithMeta);
              }
            });
          }
          this.loading = false;
        },
        error: (error) => {
          console.error('Erreur lors du chargement de l\'emploi du temps:', error);
          this.toasterService.error('Impossible de charger votre emploi du temps');
          this.loading = false;
        }
      });
  }

  onAcademicYearChange(): void {
    this.loadTeacherSchedule();
  }

  downloadPDF(): void {
    if (!this.currentUser || this.sessions.length === 0) {
      this.toasterService.warning('Aucun emploi du temps à exporter');
      return;
    }

    this.loading = true;
    this.loadingMessage = 'Génération du PDF en cours...';

    const scheduleData = {
      teacher: {
        name: this.currentUser.name,
        email: this.currentUser.email,
        id: this.currentUser.id || this.currentUser._id
      },
      academicYear: this.selectedAcademicYear,
      sessions: this.sessions.map(session => ({
        date: ScheduleUtils.formatDate(session.sessionDate.date, 'iso'),
        dayOfWeek: this.getDayDisplayName(session.dayOfWeek),
        startTime: session.startTime,
        endTime: session.endTime,
        duration: session.formattedDuration,
        subject: this.getCleanSubjectName(session),
        className: session.className,
        classGrade: session.classGrade,
        room: session.room || '',
        sessionType: this.getSessionTypeDisplay(session.sessionType),
        weekType: this.getWeekTypeDisplay(session.weekType),
        notes: session.notes || ''
      })),
      generatedAt: new Date().toISOString(),
      totalSessions: this.sessions.length
    };

    this.scheduleService.generateSchedulePDF(scheduleData)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response: Blob) => {
          const url = window.URL.createObjectURL(response);
          const link = document.createElement('a');
          link.href = url;
          link.download = `mon_emploi_du_temps_${this.selectedAcademicYear}.pdf`;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          window.URL.revokeObjectURL(url);

          this.loading = false;
          this.toasterService.success('PDF téléchargé avec succès !');
        },
        error: (error) => {
          console.error('Erreur lors de la génération du PDF:', error);
          this.loading = false;
          this.toasterService.error('Échec de la génération du PDF');
        }
      });
  }

  // Méthodes utilitaires
  getDayDisplayName(day: string): string {
    const dayNames: { [key: string]: string } = {
      'monday': 'Lundi',
      'tuesday': 'Mardi',
      'wednesday': 'Mercredi',
      'thursday': 'Jeudi',
      'friday': 'Vendredi',
      'saturday': 'Samedi',
      'sunday': 'Dimanche'
    };
    return dayNames[day] || day;
  }

  getSessionTypeDisplay(type: string): string {
    const types: { [key: string]: string } = {
      'lecture': 'Cours Magistral',
      'tutorial': 'Travaux Dirigés',
      'practical': 'Travaux Pratiques',
      'exam': 'Examen',
      'other': 'Autre'
    };
    return types[type] || type;
  }

  getWeekTypeDisplay(weekType: string): string {
    const types: { [key: string]: string } = {
      'A': 'Semaine A',
      'B': 'Semaine B',
      'both': 'Deux Semaines'
    };
    return types[weekType] || weekType;
  }

  getCleanSubjectName(session: any): string {
    try {
      if (session.subject && typeof session.subject === 'object' && session.subject.name) {
        const subjectName = session.subject.name.toString().replace(/[^\x20-\x7E\u00C0-\u017F]/g, '');
        return subjectName || 'Matière Inconnue';
      }

      if (session.subjectName) {
        const subjectName = session.subjectName.toString().replace(/[^\x20-\x7E\u00C0-\u017F]/g, '');
        return subjectName || 'Matière Inconnue';
      }

      return 'Matière Inconnue';
    } catch (error) {
      console.error('Error getting clean subject name:', error);
      return 'Matière Inconnue';
    }
  }

  getSessionsForTimeSlot(day: string, time: string): SessionWithMeta[] {
    return this.sessions.filter(session =>
      session.dayOfWeek === day &&
      session.startTime === time
    );
  }

  hasSessionAtTime(day: string, time: string): boolean {
    return this.getSessionsForTimeSlot(day, time).length > 0;
  }

  private addMetaToSession(session: Session): SessionWithMeta {
    // Calculate duration
    const startTime = session.startTime.split(':').map(Number);
    const endTime = session.endTime.split(':').map(Number);
    const startMinutes = startTime[0] * 60 + startTime[1];
    const endMinutes = endTime[0] * 60 + endTime[1];
    const durationMinutes = endMinutes - startMinutes;

    const hours = Math.floor(durationMinutes / 60);
    const minutes = durationMinutes % 60;
    const formattedDuration = hours > 0 ? `${hours}h${minutes > 0 ? ` ${minutes}min` : ''}` : `${minutes}min`;

    // Create proper SessionDate object
    const sessionDate = new Date(session.sessionDate);
    const today = new Date();
    const isToday = sessionDate.toDateString() === today.toDateString();

    // Get day of week
    const dayNames: DayOfWeek[] = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const dayOfWeek: DayOfWeek = dayNames[sessionDate.getDay()];
    const isWeekend = sessionDate.getDay() === 0 || sessionDate.getDay() === 6;

    const sessionDateMeta = {
      date: sessionDate,
      dateString: sessionDate.toISOString().split('T')[0],
      dayOfWeek,
      isToday,
      isWeekend
    };

    // Determine current status
    let currentStatus: 'upcoming' | 'ongoing' | 'completed' | 'scheduled' = 'scheduled';
    if (isToday) {
      const now = new Date();
      const currentMinutes = now.getHours() * 60 + now.getMinutes();

      if (currentMinutes >= startMinutes && currentMinutes <= endMinutes) {
        currentStatus = 'ongoing';
      } else if (currentMinutes > endMinutes) {
        currentStatus = 'completed';
      } else {
        currentStatus = 'upcoming';
      }
    } else if (sessionDate < today) {
      currentStatus = 'completed';
    } else {
      currentStatus = 'scheduled';
    }

    return {
      ...session,
      sessionDate: sessionDateMeta,
      formattedDuration,
      formattedTime: `${session.startTime} - ${session.endTime}`,
      isToday,
      currentStatus
    };
  }
}

import { Component, OnInit, OnDestroy, HostListener } from '@angular/core';
import { Subject, takeUntil, forkJoin } from 'rxjs';
import { ToasterService } from '../../../services/toaster.service';

// Services
import { UserService } from '../../../services/user.service';
import { ClassService } from '../../../services/class.service';
import { ScheduleService } from '../../../services/schedule.service';
import { SubjectService } from '../../../services/subject.service';

// Models
import { User, TeachingClass } from '../../../models/user.model';
import { Class } from '../../../models/class.model';
import { Subject as SubjectModel } from '../../../models/subject.model';
import { 
  CreateScheduleRequest, 
  CreateSessionRequest, 
  Session,
  SessionWithMeta 
} from '../../../models/schedule.model';

// Utils
import { ScheduleUtils } from '../../../utils/schedule.utils';

interface SessionForm {
  sessionDate: string;
  startTime: string;
  endTime: string;
  scheduleType: 'every_week' | 'alternating';

  // For "every_week" schedule type
  subjectId: string;
  classId: string;
  className: string;
  classGrade: string;

  // For "alternating" schedule type
  weekA: {
    enabled: boolean;
    subjectId: string;
    classId: string;
    className: string;
    classGrade: string;
  };
  weekB: {
    enabled: boolean;
    subjectId: string;
    classId: string;
    className: string;
    classGrade: string;
  };

  sessionType: string;
  room: string;
  notes: string;
  weekType: string; // Keep for compatibility
}

@Component({
  selector: 'app-schedule-management',
  templateUrl: './schedule-management.component.html',
  styleUrls: ['./schedule-management.component.css']
})
export class ScheduleManagementComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  // États de chargement
  loading = false;
  loadingMessage = '';

  // Sélection d'enseignant
  teachers: User[] = [];
  filteredTeachers: User[] = [];
  selectedTeacher: User | null = null;
  teacherSearchQuery = '';
  selectedSubjectFilter = '';
  allSubjects: SubjectModel[] = [];

  // Création d'emploi du temps
  selectedAcademicYear: string;
  selectedWeekType: string = 'both';
  academicYears: string[] = [];
  
  // Emploi du temps
  workDays = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  timeSlots = [
    '08:00-09:00', '09:00-10:00', '10:00-11:00', '11:00-12:00', '12:00-13:00',
    '14:00-15:00', '15:00-16:00', '16:00-17:00', '17:00-18:00'
  ];
  sessions: SessionWithMeta[] = [];
  selectedTimeSlot: { day: string; time: string } | null = null;

  // Modal de session
  showSessionModal = false;
  editingSession: SessionWithMeta | null = null;
  sessionForm: SessionForm = {
    sessionDate: '',
    startTime: '',
    endTime: '',
    scheduleType: 'every_week',
    subjectId: '',
    classId: '',
    className: '',
    classGrade: '',
    weekA: {
      enabled: false,
      subjectId: '',
      classId: '',
      className: '',
      classGrade: ''
    },
    weekB: {
      enabled: false,
      subjectId: '',
      classId: '',
      className: '',
      classGrade: ''
    },
    sessionType: 'lecture',
    room: '',
    notes: '',
    weekType: 'both'
  };
  validationErrors: string[] = [];

  // Modaux de confirmation
  showDeleteSessionModal = false;
  showClearAllModal = false;
  sessionToDelete: SessionWithMeta | null = null;

  // Classes disponibles pour l'enseignant et la matière sélectionnés
  availableClasses: Class[] = [];
  availableClassesWeekA: Class[] = [];
  availableClassesWeekB: Class[] = [];

  constructor(
    private userService: UserService,
    private classService: ClassService,
    private scheduleService: ScheduleService,
    private subjectService: SubjectService,
    private toasterService: ToasterService
  ) {
    this.selectedAcademicYear = ScheduleUtils.getCurrentAcademicYear();
    this.academicYears = ScheduleUtils.getAcademicYearsList();
  }

  ngOnInit(): void {

    this.selectedWeekType = 'both'; // Always use 'both' as default
    // Charger d'abord les matières, puis les enseignants
    this.loadAllSubjects();
    this.loadTeachers();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  @HostListener('document:keydown', ['$event'])
  onKeyDown(event: KeyboardEvent): void {
    if (event.key === 'Escape') {
      if (this.showSessionModal) {
        this.closeSessionModal();
      } else if (this.showDeleteSessionModal) {
        this.closeDeleteSessionModal();
      } else if (this.showClearAllModal) {
        this.closeClearAllModal();
      } else if (this.selectedTeacher) {
        this.resetSelection();
      }
    }

    if (event.ctrlKey || event.metaKey) {
      switch (event.key) {
        case 's':
          event.preventDefault();
          if (this.selectedTeacher && this.sessions.length > 0) {
            this.saveSchedule();
          }
          break;
        case 'n':
          event.preventDefault();
          if (this.selectedTeacher && !this.showSessionModal) {
            this.openSessionModal();
          }
          break;
      }
    }
  }

  // ===============================
  // CHARGEMENT DES MATIÈRES
  // ===============================

  private loadAllSubjects(): void {
    this.subjectService.getSubjects()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (subjects) => {
          this.allSubjects = subjects;
        },
        error: (error) => {
          console.error('Erreur lors du chargement des matières:', error);
          this.showError('Échec du chargement des matières');
        }
      });
  }

  // ===============================
  // CHARGEMENT ET SÉLECTION D'ENSEIGNANTS
  // ===============================

  loadTeachers(): void {
    this.loading = true;
    this.loadingMessage = 'Chargement des enseignants...';

    this.userService.getAllUsers({ role: 'teacher', limit: 1000 })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.teachers = response.users.filter(user => 
            user.teachingClasses && user.teachingClasses.length > 0
          );
          this.filteredTeachers = [...this.teachers];
          this.extractAllSubjects();
          this.loading = false;
        },
        error: (error) => {
          console.error('Erreur lors du chargement des enseignants:', error);
          this.showError('Échec du chargement des enseignants');
          this.loading = false;
        }
      });
  }

  extractAllSubjects(): void {
    const subjectsSet = new Set<string>();
    const subjectsMap = new Map<string, SubjectModel>();

    this.teachers.forEach(teacher => {
      if (teacher.teachingClasses && Array.isArray(teacher.teachingClasses)) {
        teacher.teachingClasses.forEach(tc => {
          if (tc.subjects && Array.isArray(tc.subjects)) {
            tc.subjects.forEach(subject => {
              if (typeof subject === 'object' && subject !== null && subject._id) {
                subjectsSet.add(subject._id);
                subjectsMap.set(subject._id, subject);
              } else if (typeof subject === 'string') {
                const foundSubject = this.allSubjects.find(s => s._id === subject);
                if (foundSubject) {
                  subjectsSet.add(foundSubject._id!);
                  subjectsMap.set(foundSubject._id!, foundSubject);
                }
              }
            });
          }
        });
      }
    });

    // Fusionner avec les matières déjà chargées
    this.allSubjects.forEach(subject => {
      if (subject._id && !subjectsMap.has(subject._id)) {
        subjectsMap.set(subject._id, subject);
      }
    });

    this.allSubjects = Array.from(subjectsMap.values());
  }

  filterTeachers(): void {
    this.filteredTeachers = this.teachers.filter(teacher => {
      const matchesSearch = !this.teacherSearchQuery || 
        teacher.name.toLowerCase().includes(this.teacherSearchQuery.toLowerCase()) ||
        teacher.email.toLowerCase().includes(this.teacherSearchQuery.toLowerCase());

      const matchesSubject = !this.selectedSubjectFilter ||
        this.getTeacherSubjects(teacher).some(subject => subject._id === this.selectedSubjectFilter);

      return matchesSearch && matchesSubject;
    });
  }

  selectTeacher(teacher: User): void {
    this.selectedTeacher = teacher;
    this.sessions = [];
    this.loadExistingSchedule();
  }

  resetSelection(): void {
    this.selectedTeacher = null;
    this.sessions = [];
    this.closeSessionModal();
    this.closeDeleteSessionModal();
    this.closeClearAllModal();
  }

  onAcademicYearChange(): void {
    if (this.selectedTeacher) {
      this.sessions = [];
      this.loadExistingSchedule();
    }
  }

  // ===============================
  // MÉTHODES D'AIDE POUR LES ENSEIGNANTS
  // ===============================

  getInitials(name: string): string {
    return name.split(' ')
      .map(part => part.charAt(0).toUpperCase())
      .join('')
      .substring(0, 2);
  }

  getTeacherSubjects(teacher: User): SubjectModel[] {
    if (!teacher.teachingClasses || !Array.isArray(teacher.teachingClasses)) {
      return [];
    }
    
    const subjects: SubjectModel[] = [];
    const subjectIds = new Set<string>();
    
    teacher.teachingClasses.forEach(tc => {
      if (tc.subjects && Array.isArray(tc.subjects)) {
        tc.subjects.forEach(subject => {
          if (typeof subject === 'object' && subject !== null && subject._id) {
            if (!subjectIds.has(subject._id)) {
              subjects.push(subject);
              subjectIds.add(subject._id);
            }
          } else if (typeof subject === 'string') {
            const foundSubject = this.allSubjects.find(s => s._id === subject);
            if (foundSubject && foundSubject._id && !subjectIds.has(foundSubject._id)) {
              subjects.push(foundSubject);
              subjectIds.add(foundSubject._id);
            }
          }
        });
      }
    });
    
    return subjects;
  }

  getTeacherSubjectCount(teacher: User): number {
    return this.getTeacherSubjects(teacher).length;
  }

  getTeacherClassCount(teacher: User): number {
    return teacher.teachingClasses?.length || 0;
  }

  getSessionSubjectName(session: SessionWithMeta): string {
    if (typeof session.subject === 'object' && session.subject.name) {
      return session.subject.name;
    }
    return 'Matière Inconnue';
  }

  isTeacherSelected(teacher: User): boolean {
    return this.selectedTeacher !== null && this.selectedTeacher._id === teacher._id;
  }

  // ===============================
  // GESTION DES EMPLOIS DU TEMPS
  // ===============================

  loadExistingSchedule(): void {
    if (!this.selectedTeacher) return;

    this.loading = true;
    this.loadingMessage = 'Chargement de l\'emploi du temps existant...';

    this.scheduleService.getSchedulesByTeacher(this.selectedTeacher._id, this.selectedAcademicYear)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (schedules) => {
          if (schedules.length > 0) {
            this.loadScheduleSessions(schedules[0]._id!);
          } else {
            this.loading = false;
          }
        },
        error: (error) => {
          console.error('Erreur lors du chargement de l\'emploi du temps:', error);
          this.loading = false;
        }
      });
  }

  loadScheduleSessions(scheduleId: string): void {
    this.scheduleService.getSessionList(scheduleId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (sessions) => {
          this.sessions = sessions.map(session => 
            ScheduleUtils.enhanceSession(session)
          );
          this.loading = false;
        },
        error: (error) => {
          console.error('Erreur lors du chargement des sessions:', error);
          this.loading = false;
        }
      });
  }

  saveSchedule(): void {
    if (!this.selectedTeacher || this.sessions.length === 0) return;

    this.loading = true;
    this.loadingMessage = 'Sauvegarde de l\'emploi du temps...';

    // D'abord, vérifier s'il existe déjà un emploi du temps
    this.scheduleService.getSchedulesByTeacher(this.selectedTeacher._id, this.selectedAcademicYear)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (schedules) => {
          if (schedules.length > 0) {
            // Utiliser l'emploi du temps existant
            this.saveSessions(schedules[0]._id!);
          } else {
            // Créer un nouvel emploi du temps
            this.createNewSchedule();
          }
        },
        error: (error) => {
          console.error('Erreur lors de la vérification de l\'emploi du temps existant:', error);
          this.showError('Échec de la vérification de l\'emploi du temps');
          this.loading = false;
        }
      });
  }

  private createNewSchedule(): void {
    const scheduleRequest: CreateScheduleRequest = {
      name: `${this.selectedTeacher!.name} - ${this.selectedAcademicYear}`,
      teacherId: this.selectedTeacher!._id,
      weekType: this.selectedWeekType as any,
      academicYear: this.selectedAcademicYear
    };

    this.scheduleService.createSchedule(scheduleRequest)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.saveSessions(response.schedule._id!);
        },
        error: (error) => {
          console.error('Erreur lors de la création de l\'emploi du temps:', error);
          this.showError('Échec de la création de l\'emploi du temps');
          this.loading = false;
        }
      });
  }

  saveSessions(scheduleId: string): void {
    // D'abord, supprimer toutes les sessions existantes pour cet emploi du temps
    this.scheduleService.getSessionList(scheduleId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (existingSessions) => {
          // Supprimer les sessions existantes si il y en a
          if (existingSessions.length > 0) {
            const deleteRequests = existingSessions.map(session => 
              this.scheduleService.deleteSession(session._id!)
            );
            
            forkJoin(deleteRequests)
              .pipe(takeUntil(this.destroy$))
              .subscribe({
                next: () => {
                  this.createNewSessions(scheduleId);
                },
                error: (error) => {
                  console.warn('Erreur lors de la suppression de certaines sessions existantes:', error);
                  // Continuer quand même avec la création des nouvelles sessions
                  this.createNewSessions(scheduleId);
                }
              });
          } else {
            this.createNewSessions(scheduleId);
          }
        },
        error: (error) => {
          console.warn('Erreur lors de la récupération des sessions existantes:', error);
          // Continuer quand même avec la création des nouvelles sessions
          this.createNewSessions(scheduleId);
        }
      });
  }

  private createNewSessions(scheduleId: string): void {
    const sessionRequests = this.sessions.map(session => {
    const sessionRequest: CreateSessionRequest = {
      sessionDate: ScheduleUtils.formatDate(session.sessionDate.date, 'iso'),
      startTime: session.startTime,
      endTime: session.endTime,
      className: session.className,
      classGrade: session.classGrade,
      subjectId: typeof session.subject === 'string' ? session.subject : session.subject._id!,
      sessionType: session.sessionType,
      room: session.room || undefined,
      notes: session.notes || undefined,
      weekType: session.weekType
    };
    
    // Clean up undefined values
    Object.keys(sessionRequest).forEach(key => {
      if (sessionRequest[key as keyof typeof sessionRequest] === undefined) {
        delete sessionRequest[key as keyof typeof sessionRequest];
      }
    });
      
      return this.scheduleService.createSession(scheduleId, sessionRequest);
    });

    if (sessionRequests.length === 0) {
      this.loading = false;
      this.showSuccess('Emploi du temps sauvegardé avec succès !');
      return;
    }

    forkJoin(sessionRequests)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (responses) => {
          this.loading = false;
          this.showSuccess(`${responses.length} session(s) sauvegardée(s) avec succès !`);
          this.loadExistingSchedule();
        },
        error: (error) => {
          console.error('Erreur lors de la sauvegarde des sessions:', error);
          this.showError('Échec de la sauvegarde de certaines sessions: ' + (error.error?.message || error.message));
          this.loading = false;
        }
      });
  }

  // ===============================
  // MÉTHODES D'EMPLOI DU TEMPS
  // ===============================

  getDayDisplayName(day: string): string {
    const displayNames: { [key: string]: string } = {
      'monday': 'Lundi',
      'tuesday': 'Mardi', 
      'wednesday': 'Mercredi',
      'thursday': 'Jeudi',
      'friday': 'Vendredi',
      'saturday': 'Samedi',
      'sunday': 'Dimanche'
    };
    return displayNames[day] || day;
  }

  formatTimeDisplay(time: string): string {
    return ScheduleUtils.formatTime(time, '24h');
  }

  getCurrentWeekType(): string {
    const weekType = ScheduleUtils.getCurrentWeekType();
    return weekType === 'A' ? 'Semaine A' : 'Semaine B';
  }

  getDaySessions(day: string): SessionWithMeta[] {
    return this.sessions.filter(session => session.dayOfWeek === day);
  }

getSessionsAtTime(day: string, timeInterval: string): SessionWithMeta[] {
  // Extract start time from interval (e.g., "08:00-09:00" -> "08:00")
  const startTime = timeInterval.split('-')[0];
  const timeMinutes = ScheduleUtils.timeToMinutes(startTime);

  return this.sessions.filter(session => {
    if (session.dayOfWeek !== day) return false;

    const sessionStart = ScheduleUtils.timeToMinutes(session.startTime);
    const sessionEnd = ScheduleUtils.timeToMinutes(session.endTime);

    return timeMinutes >= sessionStart && timeMinutes < sessionEnd;
  });
}

hasSessionAtTime(day: string, time: string): boolean {
  return this.getSessionsAtTime(day, time).length > 0;
}

hasMultipleSessionsAtTime(day: string, time: string): boolean {
  return this.getSessionsAtTime(day, time).length > 1;
}

getSessionAtTime(day: string, time: string): SessionWithMeta | null {
  const sessions = this.getSessionsAtTime(day, time);
  return sessions.length > 0 ? sessions[0] : null;
}

getSessionsByWeekType(sessions: SessionWithMeta[]): {
  weekA: SessionWithMeta[];
  weekB: SessionWithMeta[];
  both: SessionWithMeta[];
} {
  return {
    weekA: sessions.filter(s => s.weekType === 'A'),
    weekB: sessions.filter(s => s.weekType === 'B'),
    both: sessions.filter(s => s.weekType === 'both')
  };
}


  isSelectedCell(day: string, time: string): boolean {
    return this.selectedTimeSlot?.day === day && this.selectedTimeSlot?.time === time;
  }

  selectTimeSlot(day: string, time: string): void {
    if (this.hasSessionAtTime(day, time)) return;
    
    this.selectedTimeSlot = { day, time };
    this.openSessionModal(day, time);
  }

  // ===============================
  // MODAUX DE CONFIRMATION
  // ===============================

  openClearAllModal(): void {
    this.showClearAllModal = true;
  }

  closeClearAllModal(): void {
    this.showClearAllModal = false;
  }

  confirmClearAll(): void {
    this.sessions = [];
    this.closeClearAllModal();
    this.showSuccess('Toutes les sessions ont été effacées');
  }

  openDeleteSessionModal(session: SessionWithMeta, event: Event): void {
    event.stopPropagation();
    this.sessionToDelete = session;
    this.showDeleteSessionModal = true;
  }

  closeDeleteSessionModal(): void {
    this.showDeleteSessionModal = false;
    this.sessionToDelete = null;
  }

  confirmDeleteSession(): void {
    if (this.sessionToDelete) {
      this.sessions = this.sessions.filter(s => s._id !== this.sessionToDelete!._id);
      this.showSuccess('Session supprimée avec succès');
      this.closeDeleteSessionModal();
    }
  }

  // ===============================
  // MÉTHODES DE MODAL DE SESSION
  // ===============================

  openSessionModal(day?: string, timeInterval?: string): void {
    this.editingSession = null;
    this.resetSessionForm();

    if (day && timeInterval) {
      const today = new Date();
      const currentDay = today.getDay();
      const targetDay = this.workDays.indexOf(day) + 1;

      let daysToAdd = targetDay - currentDay;
      if (daysToAdd <= 0) daysToAdd += 7;

      const sessionDate = new Date(today);
      sessionDate.setDate(today.getDate() + daysToAdd);

      // Extract start and end times from interval (e.g., "08:00-09:00")
      const [startTime, endTime] = timeInterval.split('-');

      this.sessionForm.sessionDate = ScheduleUtils.formatDate(sessionDate, 'iso');
      this.sessionForm.startTime = startTime;
      this.sessionForm.endTime = endTime;
      this.sessionForm.weekType = this.selectedWeekType;
    }

    this.showSessionModal = true;
  }

  editSession(session: SessionWithMeta, event: Event): void {
    event.stopPropagation();

    this.editingSession = session;

    // For now, treat all existing sessions as "every_week" type for editing
    // TODO: In the future, we could store the schedule type in the session metadata
    this.sessionForm = {
      sessionDate: ScheduleUtils.formatDate(session.sessionDate.date, 'iso'),
      startTime: session.startTime,
      endTime: session.endTime,
      scheduleType: 'every_week',
      subjectId: typeof session.subject === 'string' ? session.subject : session.subject._id!,
      classId: typeof session.class === 'string' ? session.class : session.class?._id || '',
      className: session.className,
      classGrade: session.classGrade,
      weekA: {
        enabled: false,
        subjectId: '',
        classId: '',
        className: '',
        classGrade: ''
      },
      weekB: {
        enabled: false,
        subjectId: '',
        classId: '',
        className: '',
        classGrade: ''
      },
      sessionType: session.sessionType,
      room: session.room || '',
      notes: session.notes || '',
      weekType: session.weekType
    };

    this.onSubjectChange();
    this.showSessionModal = true;
  }

  closeSessionModal(): void {
    this.showSessionModal = false;
    this.editingSession = null;
    this.selectedTimeSlot = null;
    this.resetSessionForm();
  }

  resetSessionForm(): void {
    this.sessionForm = {
      sessionDate: '',
      startTime: '',
      endTime: '',
      scheduleType: 'every_week',
      subjectId: '',
      classId: '',
      className: '',
      classGrade: '',
      weekA: {
        enabled: false,
        subjectId: '',
        classId: '',
        className: '',
        classGrade: ''
      },
      weekB: {
        enabled: false,
        subjectId: '',
        classId: '',
        className: '',
        classGrade: ''
      },
      sessionType: 'lecture',
      room: '',
      notes: '',
      weekType: 'both'
    };
    this.validationErrors = [];
    this.availableClasses = [];
    this.availableClassesWeekA = [];
    this.availableClassesWeekB = [];
  }

  // ===============================
  // MÉTHODES DE FORMULAIRE
  // ===============================

onSubjectChange(): void {
  if (!this.selectedTeacher || !this.sessionForm.subjectId) {
    this.availableClasses = [];
    return;
  }

  // Find ALL teaching classes where the teacher teaches this subject
  const teachingClassesWithSubject = this.selectedTeacher.teachingClasses?.filter(tc => {
    if (Array.isArray(tc.subjects)) {
      return tc.subjects.some(subject => {
        return typeof subject === 'object' 
          ? subject._id === this.sessionForm.subjectId 
          : subject === this.sessionForm.subjectId;
      });
    }
    return false;
  }) || [];

  // Load all the classes
  if (teachingClassesWithSubject.length > 0) {
    const classPromises = teachingClassesWithSubject.map(tc => {
      if (typeof tc.class === 'string') {
        return this.classService.getClassById(tc.class)
          .pipe(takeUntil(this.destroy$))
          .toPromise()
          .then(response => response?.class)
          .catch(error => {
            console.error('Error loading class:', error);
            return null;
          });
      } else {
        return Promise.resolve(tc.class as Class);
      }
    });

    Promise.all(classPromises).then(classes => {
      // Filter out any null values from failed loads
      this.availableClasses = classes.filter(cls => cls !== null) as Class[];
      
      // If only one class is available, auto-select it
      if (this.availableClasses.length === 1) {
        this.sessionForm.classId = this.availableClasses[0]._id!;
        this.onClassChange();
      }
    });
  } else {
    this.availableClasses = [];
  }
}
getClassDisplayName(cls: Class): string {
  return `${cls.name} - ${cls.grade}`;
}

getAvailableClassesInfo(): string {
  if (!this.sessionForm.subjectId) {
    return 'Sélectionnez d\'abord une matière';
  }
  if (this.availableClasses.length === 0) {
    return 'Aucune classe disponible pour cette matière';
  }
  return `${this.availableClasses.length} classe(s) disponible(s)`;
}
  onClassChange(): void {
    if (this.sessionForm.classId) {
      const selectedClass = this.availableClasses.find(cls => cls._id === this.sessionForm.classId);
      if (selectedClass) {
        this.sessionForm.className = selectedClass.name;
        this.sessionForm.classGrade = selectedClass.grade;
      }
    }
  }

  getAvailableClasses(): Class[] {
    return this.availableClasses;
  }

  isSessionFormValid(): boolean {
    if (this.sessionForm.scheduleType === 'every_week') {
      return !!(
        this.sessionForm.sessionDate &&
        this.sessionForm.startTime &&
        this.sessionForm.endTime &&
        this.sessionForm.subjectId &&
        (this.sessionForm.classId || this.sessionForm.className) &&
        this.sessionForm.classGrade
      );
    } else {
      // For alternating schedule, at least one week must be enabled and configured
      const weekAValid = !this.sessionForm.weekA.enabled || (
        this.sessionForm.weekA.subjectId &&
        (this.sessionForm.weekA.classId || this.sessionForm.weekA.className) &&
        this.sessionForm.weekA.classGrade
      );

      const weekBValid = !this.sessionForm.weekB.enabled || (
        this.sessionForm.weekB.subjectId &&
        (this.sessionForm.weekB.classId || this.sessionForm.weekB.className) &&
        this.sessionForm.weekB.classGrade
      );

      const atLeastOneWeekEnabled = this.sessionForm.weekA.enabled || this.sessionForm.weekB.enabled;

      const basicFieldsValid = !!(
        this.sessionForm.sessionDate &&
        this.sessionForm.startTime &&
        this.sessionForm.endTime
      );

      // Debug logging
      if (this.sessionForm.scheduleType === 'alternating') {
        console.log('Form validation debug:', {
          basicFieldsValid,
          atLeastOneWeekEnabled,
          weekAValid,
          weekBValid,
          weekA: this.sessionForm.weekA,
          weekB: this.sessionForm.weekB
        });
      }

      return !!(
        basicFieldsValid &&
        atLeastOneWeekEnabled &&
        weekAValid &&
        weekBValid
      );
    }
  }

  // Methods for alternating schedule functionality
  onScheduleTypeChange(): void {
    // Reset form when schedule type changes
    if (this.sessionForm.scheduleType === 'alternating') {
      // Clear regular fields
      this.sessionForm.subjectId = '';
      this.sessionForm.classId = '';
      this.sessionForm.className = '';
      this.sessionForm.classGrade = '';

      // Enable Week A by default for alternating
      this.sessionForm.weekA.enabled = true;
      this.sessionForm.weekB.enabled = false;
    } else {
      // Clear alternating fields
      this.sessionForm.weekA = {
        enabled: false,
        subjectId: '',
        classId: '',
        className: '',
        classGrade: ''
      };
      this.sessionForm.weekB = {
        enabled: false,
        subjectId: '',
        classId: '',
        className: '',
        classGrade: ''
      };
    }

    // Reset available classes
    this.availableClasses = [];
    this.availableClassesWeekA = [];
    this.availableClassesWeekB = [];
  }

  onWeekConfigChange(): void {
    // Update available classes when week configuration changes
    this.onWeekASubjectChange();
    this.onWeekBSubjectChange();
  }

  onWeekASubjectChange(): void {
    if (!this.selectedTeacher || !this.sessionForm.weekA.subjectId) {
      this.availableClassesWeekA = [];
      return;
    }

    this.loadClassesForSubject(this.sessionForm.weekA.subjectId, 'weekA');
  }

  onWeekBSubjectChange(): void {
    if (!this.selectedTeacher || !this.sessionForm.weekB.subjectId) {
      this.availableClassesWeekB = [];
      return;
    }

    this.loadClassesForSubject(this.sessionForm.weekB.subjectId, 'weekB');
  }

  onWeekAClassChange(): void {
    if (this.sessionForm.weekA.classId) {
      const selectedClass = this.availableClassesWeekA.find(cls => cls._id === this.sessionForm.weekA.classId);
      if (selectedClass) {
        this.sessionForm.weekA.className = selectedClass.name;
        this.sessionForm.weekA.classGrade = selectedClass.grade;
      }
    }
  }

  onWeekBClassChange(): void {
    if (this.sessionForm.weekB.classId) {
      const selectedClass = this.availableClassesWeekB.find(cls => cls._id === this.sessionForm.weekB.classId);
      if (selectedClass) {
        this.sessionForm.weekB.className = selectedClass.name;
        this.sessionForm.weekB.classGrade = selectedClass.grade;
      }
    }
  }

  private loadClassesForSubject(subjectId: string, week: 'weekA' | 'weekB'): void {
    const teachingClassesWithSubject = this.selectedTeacher?.teachingClasses?.filter(tc => {
      if (Array.isArray(tc.subjects)) {
        return tc.subjects.some(subject => {
          return typeof subject === 'object'
            ? subject._id === subjectId
            : subject === subjectId;
        });
      }
      return false;
    }) || [];

    if (teachingClassesWithSubject.length > 0) {
      const classPromises = teachingClassesWithSubject.map(tc => {
        if (typeof tc.class === 'string') {
          return this.classService.getClassById(tc.class)
            .pipe(takeUntil(this.destroy$))
            .toPromise()
            .then(response => response?.class)
            .catch(error => {
              console.error('Error loading class:', error);
              return null;
            });
        } else {
          return Promise.resolve(tc.class as Class);
        }
      });

      Promise.all(classPromises).then(classes => {
        const validClasses = classes.filter(cls => cls !== null) as Class[];

        if (week === 'weekA') {
          this.availableClassesWeekA = validClasses;

          // Auto-select if only one class available
          if (this.availableClassesWeekA.length === 1) {
            this.sessionForm.weekA.classId = this.availableClassesWeekA[0]._id!;
            this.sessionForm.weekA.className = this.availableClassesWeekA[0].name;
            this.sessionForm.weekA.classGrade = this.availableClassesWeekA[0].grade;
          }
        } else {
          this.availableClassesWeekB = validClasses;

          // Auto-select if only one class available
          if (this.availableClassesWeekB.length === 1) {
            this.sessionForm.weekB.classId = this.availableClassesWeekB[0]._id!;
            this.sessionForm.weekB.className = this.availableClassesWeekB[0].name;
            this.sessionForm.weekB.classGrade = this.availableClassesWeekB[0].grade;
          }
        }
      });
    } else {
      if (week === 'weekA') {
        this.availableClassesWeekA = [];
      } else {
        this.availableClassesWeekB = [];
      }
    }
  }

  validateSessionForm(): boolean {
    this.validationErrors = [];

    if (!this.sessionForm.sessionDate) {
      this.validationErrors.push('La date de session est requise');
    } else {
      const dateValidation = ScheduleUtils.validateDateFormat(this.sessionForm.sessionDate);
      if (!dateValidation) {
        this.validationErrors.push('Format de date invalide');
      }
    }

    if (!this.sessionForm.startTime || !this.sessionForm.endTime) {
      this.validationErrors.push('Les heures de début et de fin sont requises');
    } else {
      const timeValidation = ScheduleUtils.validateSessionTime(
        this.sessionForm.startTime,
        this.sessionForm.endTime
      );
      if (!timeValidation.valid) {
        this.validationErrors.push(timeValidation.error!);
      }
    }

    // Validate based on schedule type
    if (this.sessionForm.scheduleType === 'every_week') {
      if (!this.sessionForm.subjectId) {
        this.validationErrors.push('La matière est requise');
      }

      if (!this.sessionForm.classId && !this.sessionForm.className) {
        this.validationErrors.push('La classe est requise');
      }

      if (!this.sessionForm.classGrade) {
        this.validationErrors.push('Le niveau de classe est requis');
      }
    } else if (this.sessionForm.scheduleType === 'alternating') {
      // Check if at least one week is enabled
      if (!this.sessionForm.weekA.enabled && !this.sessionForm.weekB.enabled) {
        this.validationErrors.push('Au moins une semaine (A ou B) doit être activée');
      }

      // Validate Week A if enabled
      if (this.sessionForm.weekA.enabled) {
        if (!this.sessionForm.weekA.subjectId) {
          this.validationErrors.push('La matière de la Semaine A est requise');
        }
        if (!this.sessionForm.weekA.classId && !this.sessionForm.weekA.className) {
          this.validationErrors.push('La classe de la Semaine A est requise');
        }
        if (!this.sessionForm.weekA.classGrade) {
          this.validationErrors.push('Le niveau de classe de la Semaine A est requis');
        }
      }

      // Validate Week B if enabled
      if (this.sessionForm.weekB.enabled) {
        if (!this.sessionForm.weekB.subjectId) {
          this.validationErrors.push('La matière de la Semaine B est requise');
        }
        if (!this.sessionForm.weekB.classId && !this.sessionForm.weekB.className) {
          this.validationErrors.push('La classe de la Semaine B est requise');
        }
        if (!this.sessionForm.weekB.classGrade) {
          this.validationErrors.push('Le niveau de classe de la Semaine B est requis');
        }
      }
    }

    if (this.validationErrors.length === 0) {
      this.checkSessionConflicts();
    }

    return this.validationErrors.length === 0;
  }

  checkSessionConflicts(): void {
    const existingSessions = this.editingSession 
      ? this.sessions.filter(s => s._id !== this.editingSession!._id)
      : this.sessions;

    const sessionData = existingSessions.map(session => ({
      ...session,
      sessionDate: session.sessionDate.date
    }));

    const tempSession: any = {
      sessionDate: new Date(this.sessionForm.sessionDate),
      startTime: this.sessionForm.startTime,
      endTime: this.sessionForm.endTime,
      weekType: this.sessionForm.weekType,
      className: this.sessionForm.className
    };

    const conflicts = ScheduleUtils.detectTimeConflicts([...sessionData, tempSession]);
    
    if (conflicts.length > 0) {
      this.validationErrors.push('Conflit d\'horaire détecté avec des sessions existantes');
    }
  }

  saveSession(): void {
    if (!this.validateSessionForm()) {
      return;
    }

    // Calculer la durée et le jour de la semaine
    const duration = ScheduleUtils.calculateDuration(this.sessionForm.startTime, this.sessionForm.endTime);
    const dayOfWeek = ScheduleUtils.getDayOfWeekFromDate(this.sessionForm.sessionDate);

    if (this.sessionForm.scheduleType === 'every_week') {
      // Handle regular "every week" session
      const sessionData: Partial<SessionWithMeta> = {
        sessionDate: {
          date: new Date(this.sessionForm.sessionDate),
          dateString: this.sessionForm.sessionDate,
          dayOfWeek: dayOfWeek,
          isToday: ScheduleUtils.isToday(this.sessionForm.sessionDate),
          isWeekend: ['saturday', 'sunday'].includes(dayOfWeek)
        },
        dayOfWeek: dayOfWeek,
        startTime: this.sessionForm.startTime,
        endTime: this.sessionForm.endTime,
        duration: duration,
        teacher: this.selectedTeacher!,
        className: this.sessionForm.className,
        classGrade: this.sessionForm.classGrade,
        subject: this.getTeacherSubjects(this.selectedTeacher!).find(s => s._id === this.sessionForm.subjectId)!,
        sessionType: this.sessionForm.sessionType as any,
        room: this.sessionForm.room,
        notes: this.sessionForm.notes,
        weekType: this.sessionForm.weekType as any,
        status: 'scheduled' as any,
        isActive: true,
        formattedDuration: ScheduleUtils.formatDuration(duration),
        formattedTime: `${this.sessionForm.startTime} - ${this.sessionForm.endTime}`,
        isToday: ScheduleUtils.isToday(this.sessionForm.sessionDate),
        currentStatus: 'scheduled' as any
      };

      if (this.editingSession) {
        const index = this.sessions.findIndex(s => s._id === this.editingSession!._id);
        if (index !== -1) {
          this.sessions[index] = { ...this.editingSession, ...sessionData };
        }
      } else {
        const newSession: SessionWithMeta = {
          _id: this.generateTempId(),
          ...sessionData as SessionWithMeta,
          schedule: ''
        };
        this.sessions.push(newSession);
      }
    } else {
      // Handle alternating schedule - create separate sessions for Week A and B
      const sessionsToCreate: Partial<SessionWithMeta>[] = [];

      // Create Week A session if enabled
      if (this.sessionForm.weekA.enabled) {
        const weekASession: Partial<SessionWithMeta> = {
          sessionDate: {
            date: new Date(this.sessionForm.sessionDate),
            dateString: this.sessionForm.sessionDate,
            dayOfWeek: dayOfWeek,
            isToday: ScheduleUtils.isToday(this.sessionForm.sessionDate),
            isWeekend: ['saturday', 'sunday'].includes(dayOfWeek)
          },
          dayOfWeek: dayOfWeek,
          startTime: this.sessionForm.startTime,
          endTime: this.sessionForm.endTime,
          duration: duration,
          teacher: this.selectedTeacher!,
          className: this.sessionForm.weekA.className,
          classGrade: this.sessionForm.weekA.classGrade,
          subject: this.getTeacherSubjects(this.selectedTeacher!).find(s => s._id === this.sessionForm.weekA.subjectId)!,
          sessionType: this.sessionForm.sessionType as any,
          room: this.sessionForm.room,
          notes: this.sessionForm.notes,
          weekType: 'A' as any,
          status: 'scheduled' as any,
          isActive: true,
          formattedDuration: ScheduleUtils.formatDuration(duration),
          formattedTime: `${this.sessionForm.startTime} - ${this.sessionForm.endTime}`,
          isToday: ScheduleUtils.isToday(this.sessionForm.sessionDate),
          currentStatus: 'scheduled' as any
        };
        sessionsToCreate.push(weekASession);
      }

      // Create Week B session if enabled
      if (this.sessionForm.weekB.enabled) {
        const weekBSession: Partial<SessionWithMeta> = {
          sessionDate: {
            date: new Date(this.sessionForm.sessionDate),
            dateString: this.sessionForm.sessionDate,
            dayOfWeek: dayOfWeek,
            isToday: ScheduleUtils.isToday(this.sessionForm.sessionDate),
            isWeekend: ['saturday', 'sunday'].includes(dayOfWeek)
          },
          dayOfWeek: dayOfWeek,
          startTime: this.sessionForm.startTime,
          endTime: this.sessionForm.endTime,
          duration: duration,
          teacher: this.selectedTeacher!,
          className: this.sessionForm.weekB.className,
          classGrade: this.sessionForm.weekB.classGrade,
          subject: this.getTeacherSubjects(this.selectedTeacher!).find(s => s._id === this.sessionForm.weekB.subjectId)!,
          sessionType: this.sessionForm.sessionType as any,
          room: this.sessionForm.room,
          notes: this.sessionForm.notes,
          weekType: 'B' as any,
          status: 'scheduled' as any,
          isActive: true,
          formattedDuration: ScheduleUtils.formatDuration(duration),
          formattedTime: `${this.sessionForm.startTime} - ${this.sessionForm.endTime}`,
          isToday: ScheduleUtils.isToday(this.sessionForm.sessionDate),
          currentStatus: 'scheduled' as any
        };
        sessionsToCreate.push(weekBSession);
      }

      // Add the sessions to the schedule
      if (this.editingSession) {
        // For editing, remove the old session first
        this.sessions = this.sessions.filter(s => s._id !== this.editingSession!._id);
      }

      // Add new sessions
      sessionsToCreate.forEach(sessionData => {
        const newSession: SessionWithMeta = {
          _id: this.generateTempId(),
          ...sessionData as SessionWithMeta,
          schedule: ''
        };
        this.sessions.push(newSession);
      });
    }

    this.closeSessionModal();
    this.showSuccess(this.editingSession ? 'Session mise à jour !' : 'Session(s) créée(s) !');
  }

  generateTempId(): string {
    return 'temp_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }

  // ===============================
  // MÉTHODES UTILITAIRES
  // ===============================

  showSuccess(message: string): void {
    this.toasterService.success(message);
  }

  showError(message: string): void {
    this.toasterService.error(message);
  }

  showWarning(message: string): void {
    this.toasterService.warning(message);
  }

  // ===============================
  // MÉTHODES D'EXPORTATION
  // ===============================

  private getCleanSubjectName(session: any): string {
    try {
      // First check if subject is populated and has a name
      if (session.subject && typeof session.subject === 'object' && session.subject.name) {
        // Clean the subject name of any non-printable characters
        const subjectName = session.subject.name.toString().replace(/[^\x20-\x7E\u00C0-\u017F]/g, '');
        return subjectName || 'Matière Inconnue';
      }

      // If subject is a string ID, try to find it in the subjects list
      if (typeof session.subject === 'string' && this.allSubjects && this.allSubjects.length > 0) {
        const foundSubject = this.allSubjects.find(s => s._id === session.subject);
        if (foundSubject && foundSubject.name) {
          const subjectName = foundSubject.name.toString().replace(/[^\x20-\x7E\u00C0-\u017F]/g, '');
          return subjectName || 'Matière Inconnue';
        }
      }

      // Fallback to session.subjectName if available
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

  createScheduleTableData(): any {
    // Create the table structure with time slots as rows and days as columns
    const table = {
      timeSlots: this.timeSlots,
      workDays: this.workDays.map(day => ({
        key: day,
        name: this.getDayDisplayName(day)
      })),
      grid: {} as { [timeSlot: string]: { [day: string]: any[] } }
    };

    // Initialize grid with empty cells
    this.timeSlots.forEach(timeSlot => {
      table.grid[timeSlot] = {};
      this.workDays.forEach(day => {
        table.grid[timeSlot][day] = [];
      });
    });

    // Fill grid with sessions
    this.sessions.forEach(session => {
      const timeSlot = session.startTime;
      const day = session.dayOfWeek;

      if (table.grid[timeSlot] && table.grid[timeSlot][day]) {
        table.grid[timeSlot][day].push({
          subject: this.getCleanSubjectName(session),
          className: session.className,
          room: session.room || '',
          weekType: session.weekType,
          sessionType: this.getSessionTypeDisplay(session.sessionType),
          duration: session.formattedDuration
        });
      }
    });

    return table;
  }

  downloadSchedulePDF(): void {
    if (!this.selectedTeacher || this.sessions.length === 0) {
      this.showWarning('Aucun emploi du temps à exporter');
      return;
    }

    this.loading = true;
    this.loadingMessage = 'Génération du PDF en cours...';

    // Create schedule table data structure
    const scheduleTable = this.createScheduleTableData();

    // Prepare schedule data for PDF generation
    const scheduleData = {
      teacher: {
        name: this.selectedTeacher.name,
        email: this.selectedTeacher.email,
        id: this.selectedTeacher._id
      },
      academicYear: this.selectedAcademicYear,
      format: 'table', // Specify table format
      table: scheduleTable,
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

    // Call backend API to generate PDF
    this.scheduleService.generateSchedulePDF(scheduleData)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response: Blob) => {
          // Create download link
          const url = window.URL.createObjectURL(response);
          const link = document.createElement('a');
          link.href = url;
          link.download = `emploi_du_temps_${this.selectedTeacher!.name.replace(/\s+/g, '_')}_${this.selectedAcademicYear}.pdf`;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          window.URL.revokeObjectURL(url);

          this.loading = false;
          this.showSuccess('PDF téléchargé avec succès !');
        },
        error: (error) => {
          console.error('Erreur lors de la génération du PDF:', error);
          this.loading = false;
          this.showError('Échec de la génération du PDF');
        }
      });
  }

  exportSchedule(format: 'csv' | 'json' = 'csv'): void {
    if (!this.selectedTeacher || this.sessions.length === 0) {
      this.showWarning('Aucune donnée d\'emploi du temps à exporter');
      return;
    }

    const sessionData = this.sessions.map(session => ({
      ...session,
      sessionDate: session.sessionDate.date
    }));

    const sortedSessions = ScheduleUtils.sortSessionsByTime(sessionData);
    
    if (format === 'csv') {
      this.exportToCSV(this.sessions);
    } else {
      this.exportToJSON(this.sessions);
    }
  }

  private exportToCSV(sessions: SessionWithMeta[]): void {
    const headers = [
      'Date', 'Jour', 'Heure Début', 'Heure Fin', 'Durée',
      'Matière', 'Classe', 'Niveau', 'Salle', 'Type', 'Type Semaine', 'Notes'
    ];

    const csvData = sessions.map(session => [
      ScheduleUtils.formatDate(session.sessionDate.date, 'iso'),
      this.getDayDisplayName(session.dayOfWeek),
      session.startTime,
      session.endTime,
      session.formattedDuration,
      typeof session.subject === 'object' ? session.subject.name : '',
      session.className,
      session.classGrade,
      session.room || '',
      this.getSessionTypeDisplay(session.sessionType),
      this.getWeekTypeDisplay(session.weekType),
      session.notes || ''
    ]);

    const csvContent = [headers, ...csvData]
      .map(row => row.map(cell => `"${cell}"`).join(','))
      .join('\n');

    this.downloadFile(
      csvContent,
      `emploi_du_temps_${this.selectedTeacher!.name}_${this.selectedAcademicYear}.csv`,
      'text/csv'
    );
  }

  private exportToJSON(sessions: SessionWithMeta[]): void {
    const exportData = {
      enseignant: {
        nom: this.selectedTeacher!.name,
        email: this.selectedTeacher!.email
      },
      anneeAcademique: this.selectedAcademicYear,
      typeSemaine: this.selectedWeekType,
      dateExportation: new Date().toISOString(),
      sessions: sessions.map(session => ({
        date: ScheduleUtils.formatDate(session.sessionDate.date, 'iso'),
        jourSemaine: this.getDayDisplayName(session.dayOfWeek),
        heureDebut: session.startTime,
        heureFin: session.endTime,
        matiere: typeof session.subject === 'object' ? session.subject.name : '',
        nomClasse: session.className,
        niveauClasse: session.classGrade,
        salle: session.room,
        typeSession: this.getSessionTypeDisplay(session.sessionType),
        typeSemaine: this.getWeekTypeDisplay(session.weekType),
        notes: session.notes
      }))
    };

    const jsonContent = JSON.stringify(exportData, null, 2);
    this.downloadFile(
      jsonContent,
      `emploi_du_temps_${this.selectedTeacher!.name}_${this.selectedAcademicYear}.json`,
      'application/json'
    );
  }

  private downloadFile(content: string, filename: string, type: string): void {
    const blob = new Blob([content], { type });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  }

  // ===============================
  // MÉTHODES D'AFFICHAGE
  // ===============================

  getSessionTypeDisplay(sessionType: string): string {
    const types: { [key: string]: string } = {
      'lecture': 'Cours Magistral',
      'practical': 'Travaux Pratiques',
      'lab': 'Laboratoire',
      'tutorial': 'Tutorat',
      'exam': 'Examen',
      'revision': 'Révision',
      'other': 'Autre'
    };
    return types[sessionType] || sessionType;
  }

  getWeekTypeDisplay(weekType: string): string {
    const types: { [key: string]: string } = {
      'both': 'Deux Semaines',
      'A': 'Semaine A',
      'B': 'Semaine B'
    };
    return types[weekType] || weekType;
  }

  // ===============================
  // MÉTHODES DE CYCLE DE VIE
  // ===============================

  onWindowResize(): void {
    // Gérer les ajustements réactifs d'emploi du temps si nécessaire
  }

  trackBySessionId(index: number, session: SessionWithMeta): string {
    return session._id || index.toString();
  }

  trackByTeacherId(index: number, teacher: User): string {
    return teacher._id;
  }
}
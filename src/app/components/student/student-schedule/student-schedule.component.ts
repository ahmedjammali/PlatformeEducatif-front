import { Component, OnInit, OnDestroy } from '@angular/core';
import { Subject, takeUntil } from 'rxjs';
import { ScheduleService } from '../../../services/schedule.service';
import { AuthService } from '../../../services/auth.service';
import { ToasterService } from '../../../services/toaster.service';
import { ClassService } from '../../../services/class.service';
import { SessionWithMeta, ClassScheduleResponse, ClassScheduleFilters, GroupedSessionsByDate, Session, DayOfWeek } from '../../../models/schedule.model';
import { ScheduleUtils } from '../../../utils/schedule.utils';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

@Component({
  selector: 'app-student-schedule',
  templateUrl: './student-schedule.component.html',
  styleUrls: ['./student-schedule.component.css']
})
export class StudentScheduleComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  // Loading state
  loading = false;
  loadingMessage = '';

  // User data
  currentUser: any;
  className: string = '';

  // Schedule data
  sessions: SessionWithMeta[] = [];

  // Schedule grid configuration
  workDays = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  timeSlots = [
    '08:00-09:00', '09:00-10:00', '10:00-11:00', '11:00-12:00', '12:00-13:00',
    '14:00-15:00', '15:00-16:00', '16:00-17:00', '17:00-18:00', '18:00-19:00'
  ];

  // Week type for filtering (removed - using 'both' as default)
  selectedWeekType: 'A' | 'B' | 'both' = 'both';

  // Mobile view
  selectedMobileDay: string = 'monday';

  constructor(
    private scheduleService: ScheduleService,
    private authService: AuthService,
    private toasterService: ToasterService,
    private classService: ClassService
  ) {
  }

  ngOnInit(): void {
    this.getCurrentUser();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  getCurrentUser(): void {
    this.currentUser = this.authService.getCurrentUser();

    if (this.currentUser) {
      this.loadClassInfo();
    } else {
      this.toasterService.error('Impossible de récupérer les informations utilisateur. Veuillez vous reconnecter.');
    }
  }

  private loadClassInfo(): void {
    this.classService.getStudentClass()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          if (response && response.class && response.class.name) {
            this.className = response.class.name;
            this.loadClassSchedule();
          } else {
            this.toasterService.error('Aucune classe trouvée pour cet étudiant.');
          }
        },
        error: (error) => {
          console.error('Error loading class info:', error);
          this.toasterService.error('Erreur lors du chargement des informations de classe.');
        }
      });
  }

  loadClassSchedule(): void {
    if (!this.className) {
      this.toasterService.error('Nom de classe manquant');
      return;
    }

    this.loading = true;
    this.loadingMessage = 'Chargement de votre emploi du temps...';

    this.scheduleService.getClassSchedule(this.className)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response: ClassScheduleResponse) => {
          // Process the schedule data and extract all sessions
          if (response && response.schedule) {
            this.sessions = this.extractSessionsFromSchedule(response.schedule);
          } else {
            this.sessions = [];
          }

          this.loading = false;
        },
        error: (error) => {
          console.error('Error loading schedule:', error);
          this.toasterService.error('Impossible de charger votre emploi du temps');
          this.loading = false;
        }
      });
  }

  // Utility methods
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

  getCleanSubjectName(session: any): string {
    try {
      // Check for subject object with name
      if (session.subject && typeof session.subject === 'object' && session.subject.name) {
        return session.subject.name || 'Matière Inconnue';
      }

      // Check for direct subjectName property
      if (session.subjectName) {
        return session.subjectName || 'Matière Inconnue';
      }

      // Check for subject as string
      if (session.subject && typeof session.subject === 'string') {
        return session.subject || 'Matière Inconnue';
      }

      return 'Matière Inconnue';
    } catch (error) {
      console.error('Error getting clean subject name:', error);
      return 'Matière Inconnue';
    }
  }

  getTeacherName(session: any): string {
    try {
      if (session.teacher && typeof session.teacher === 'object' && session.teacher.name) {
        return session.teacher.name;
      }
      if (session.teacherName) {
        return session.teacherName;
      }
      if (session.teacher && typeof session.teacher === 'string') {
        return session.teacher;
      }
      return 'Enseignant Non Assigné';
    } catch (error) {
      console.error('Error getting teacher name:', error);
      return 'Enseignant Non Assigné';
    }
  }

  getSessionsAtTime(day: string, timeInterval: string): SessionWithMeta[] {
    // Extract start time from interval (e.g., "08:00-09:00" -> "08:00")
    const startTime = timeInterval.split('-')[0];
    const timeMinutes = this.timeToMinutes(startTime);

    return this.sessions.filter(session => {
      if (session.dayOfWeek !== day) return false;

      const sessionStart = this.timeToMinutes(session.startTime);
      const sessionEnd = this.timeToMinutes(session.endTime);

      // Check if the time slot falls within the session duration
      return timeMinutes >= sessionStart && timeMinutes < sessionEnd;
    });
  }

  hasSessionAtTime(day: string, time: string): boolean {
    return this.getSessionsAtTime(day, time).length > 0;
  }

  private timeToMinutes(time: string): number {
    const [hours, minutes] = time.split(':').map(Number);
    return hours * 60 + minutes;
  }

  selectMobileDay(day: string): void {
    this.selectedMobileDay = day;
  }

  private extractSessionsFromSchedule(schedule: GroupedSessionsByDate): SessionWithMeta[] {
    const allSessions: SessionWithMeta[] = [];

    // Extract sessions from grouped schedule data
    Object.entries(schedule).forEach(([dateKey, dayData]) => {
      if (dayData && dayData.sessions && Array.isArray(dayData.sessions)) {
        dayData.sessions.forEach((session) => {
          const sessionWithMeta = this.addMetaToSession(session, dateKey);
          allSessions.push(sessionWithMeta);
        });
      }
    });

    return allSessions;
  }

  private addMetaToSession(session: Session, dateKey?: string): SessionWithMeta {
    // Calculate duration
    const startTime = session.startTime.split(':').map(Number);
    const endTime = session.endTime.split(':').map(Number);
    const startMinutes = startTime[0] * 60 + startTime[1];
    const endMinutes = endTime[0] * 60 + endTime[1];
    const durationMinutes = endMinutes - startMinutes;

    const hours = Math.floor(durationMinutes / 60);
    const minutes = durationMinutes % 60;
    const formattedDuration = hours > 0 ? `${hours}h${minutes > 0 ? ` ${minutes}min` : ''}` : `${minutes}min`;

    // Use dateKey from schedule structure or session.sessionDate
    let sessionDateString = dateKey || session.sessionDate;
    const sessionDate = new Date(sessionDateString);
    const today = new Date();
    const isToday = sessionDate.toDateString() === today.toDateString();

    // Get day of week
    const dayNames: DayOfWeek[] = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const dayOfWeek = dayNames[sessionDate.getDay()];
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
      dayOfWeek, // Add dayOfWeek directly to session for filtering
      sessionDate: sessionDateMeta,
      formattedDuration,
      formattedTime: `${session.startTime} - ${session.endTime}`,
      isToday,
      currentStatus
    };
  }

  // Translate Arabic text to French for PDF (simple mapping)
  private translateToFrench(text: string): string {
    if (!text) return '';

    // Common Arabic to French translations
    const translations: { [key: string]: string } = {
      'التاريخ والجغرافيا': 'Histoire et Géographie',
      'التاريخ': 'Histoire',
      'الجغرافيا': 'Géographie',
      'التربية السلمية': 'Éducation Civique',
      'التربية الإسلامية': 'Éducation Islamique',
      'اللغة العربية': 'Langue Arabe',
      'اللغة الفرنسية': 'Langue Française',
      'الرياضيات': 'Mathématiques',
      'الفيزياء': 'Physique',
      'الكيمياء': 'Chimie',
      'علوم الحياة والأرض': 'Sciences de la Vie et de la Terre',
      'SVT': 'SVT',
      'الفلسفة': 'Philosophie',
      'الرياضة': 'Éducation Physique',
      'التربية البدنية': 'Éducation Physique',
      'الموسيقى': 'Musique',
      'الفنون': 'Arts Plastiques',
      'الإعلاميات': 'Informatique',
      'الاقتصاد': 'Économie',
      'الإنجليزية': 'Anglais',
      'الإسبانية': 'Espagnol',
      'الألمانية': 'Allemand',
      'الإيطالية': 'Italien'
    };

    // Check if there's an exact match
    if (translations[text]) {
      return translations[text];
    }

    // Check if text contains Arabic characters
    const hasArabic = /[\u0600-\u06FF]/.test(text);

    if (hasArabic) {
      // Try partial matches
      for (const [arabic, french] of Object.entries(translations)) {
        if (text.includes(arabic)) {
          return french;
        }
      }
      // If no translation found, return a generic label
      return '[Matière en Arabe]';
    }

    // No Arabic, return as-is
    return text;
  }

  downloadSchedulePDF(): void {
    try {
      // Create PDF in landscape orientation
      const doc = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a4',
        putOnlyUsedFonts: true,
        compress: true
      });

      // Add title
      doc.setFontSize(18);
      doc.setTextColor(40, 40, 40);
      doc.text('Emploi du Temps', 148, 15, { align: 'center' });

      // Add class name
      doc.setFontSize(12);
      doc.text(`Classe: ${this.className}`, 148, 23, { align: 'center' });

      // Add generated date
      doc.setFontSize(10);
      doc.setTextColor(100, 100, 100);
      doc.text(`Généré le: ${new Date().toLocaleDateString('fr-FR')}`, 148, 29, { align: 'center' });

      // Prepare table data
      const tableData: any[] = [];

      // Create header row with time slots (excluding 18:00-19:00)
      const filteredTimeSlots = this.timeSlots.filter(slot => slot !== '18:00-19:00');
      const headerRow = ['Jour', ...filteredTimeSlots];

      // Create rows for each day
      this.workDays.forEach(day => {
        const row: any[] = [this.getDayDisplayName(day)];

        filteredTimeSlots.forEach(timeSlot => {
          const sessionsAtTime = this.getSessionsAtTime(day, timeSlot);

          if (sessionsAtTime.length > 0) {
            // Format session info with French translation and line separator
            const sessionInfo = sessionsAtTime.map(session => {
              const subjectName = this.translateToFrench(this.getCleanSubjectName(session));
              const teacherName = this.getTeacherName(session);
              const room = session.room ? `Salle: ${session.room}` : '';
              const weekBadge = session.weekType !== 'both' ? ` ${session.weekType}` : '';

              // Build session text
              let text = `${subjectName}${weekBadge}\n${teacherName}`;
              if (room) {
                text += `\n${room}`;
              }
              return text;
            }).join('\n──────\n');

            row.push(sessionInfo);
          } else {
            row.push('');
          }
        });

        tableData.push(row);
      });

      // Generate table with improved design
      autoTable(doc, {
        head: [headerRow],
        body: tableData,
        startY: 35,
        styles: {
          fontSize: 8,
          cellPadding: 2.5,
          lineColor: [164, 180, 101],
          lineWidth: 0.3,
          halign: 'center',
          valign: 'middle',
          font: 'helvetica',
          fontStyle: 'normal'
        },
        headStyles: {
          fillColor: [102, 126, 234],
          textColor: [255, 255, 255],
          fontStyle: 'bold',
          halign: 'center',
          fontSize: 8,
          cellPadding: 2,
          minCellHeight: 10
        },
        columnStyles: {
          0: {
            fillColor: [164, 180, 101],
            textColor: [255, 255, 255],
            fontStyle: 'bold',
            halign: 'center',
            cellWidth: 20
          }
        },
        bodyStyles: {
          minCellHeight: 18,
          fontSize: 7.5
        },
        alternateRowStyles: {
          fillColor: [245, 247, 250]
        },
        didParseCell: (data: any) => {
          // Color cells with sessions
          if (data.section === 'body' && data.column.index > 0 && data.cell.text.length > 0 && data.cell.text[0] !== '') {
            data.cell.styles.fillColor = [240, 249, 232];
            data.cell.styles.textColor = [40, 40, 40];
            data.cell.styles.fontStyle = 'normal';
          }
        }
      });

      // Add footer with Edusphere branding
      const pageCount = doc.getNumberOfPages();
      doc.setFontSize(8);
      doc.setTextColor(102, 126, 234);
      doc.text(
        `Généré par Edusphere - Page 1/${pageCount}`,
        148,
        doc.internal.pageSize.height - 10,
        { align: 'center' }
      );

      // Save PDF
      const fileName = `Emploi_du_Temps_${this.className}_${new Date().toISOString().split('T')[0]}.pdf`;
      doc.save(fileName);

      this.toasterService.success('PDF téléchargé avec succès');
    } catch (error) {
      console.error('Error generating PDF:', error);
      this.toasterService.error('Erreur lors de la génération du PDF');
    }
  }
}

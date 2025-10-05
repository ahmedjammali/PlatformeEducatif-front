import { Component, OnInit, OnDestroy, Input } from '@angular/core';
import { Subject, takeUntil } from 'rxjs';
import { ToasterService } from '../../../services/toaster.service';
import { ScheduleService } from '../../../services/schedule.service';
import { AuthService } from '../../../services/auth.service';
import { SessionWithMeta, TeacherScheduleResponse, Session, DayOfWeek } from '../../../models/schedule.model';
import { ScheduleUtils } from '../../../utils/schedule.utils';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

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

  // Emploi du temps
  workDays = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  timeSlots = [
    '08:00', '09:00', '10:00', '11:00', '12:00',
    '14:00', '15:00', '16:00', '17:00', '18:00'
  ];
  sessions: SessionWithMeta[] = [];

  // Mobile view
  selectedMobileDay: string = 'monday';

  constructor(
    private scheduleService: ScheduleService,
    private authService: AuthService,
    private toasterService: ToasterService
  ) {
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
    if (!teacherId) {
      this.toasterService.error('Identifiant enseignant manquant');
      return;
    }

    this.loading = true;
    this.loadingMessage = 'Chargement de votre emploi du temps...';

    this.scheduleService.getTeacherSchedule(teacherId, undefined, undefined)
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

  downloadPDF(): void {
    if (!this.currentUser || this.sessions.length === 0) {
      this.toasterService.warning('Aucun emploi du temps à exporter');
      return;
    }

    this.loading = true;
    this.loadingMessage = 'Génération du PDF en cours...';

    try {
      this.generateClientSidePDF();
      this.loading = false;
      this.toasterService.success('PDF téléchargé avec succès !');
    } catch (error) {
      console.error('Erreur lors de la génération du PDF:', error);
      this.loading = false;
      this.toasterService.error('Échec de la génération du PDF');
    }
  }

  private generateClientSidePDF(): void {
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

      // Add teacher name
      doc.setFontSize(12);
      doc.text(`Enseignant: ${this.currentUser?.name || 'Enseignant'}`, 148, 23, { align: 'center' });

      // Add generated date
      doc.setFontSize(10);
      doc.setTextColor(100, 100, 100);
      doc.text(`Généré le: ${new Date().toLocaleDateString('fr-FR')}`, 148, 29, { align: 'center' });

      // Prepare table data
      const tableData: any[] = [];

      // Create header row with time slots (excluding 18:00-19:00)
      const timeSlotRanges = [
        '08:00-09:00', '09:00-10:00', '10:00-11:00', '11:00-12:00', '12:00-13:00',
        '14:00-15:00', '15:00-16:00', '16:00-17:00', '17:00-18:00'
      ];
      const headerRow = ['Jour', ...timeSlotRanges];

      // Create rows for each day
      this.workDays.forEach(day => {
        const row: any[] = [this.getDayDisplayName(day)];

        timeSlotRanges.forEach(timeSlot => {
          const sessionsAtTime = this.getSessionsAtTime(day, timeSlot);

          if (sessionsAtTime.length > 0) {
            // Format session info with French translation
            const sessionInfo = sessionsAtTime.map(session => {
              const subjectName = this.translateToFrench(this.getCleanSubjectName(session));
              const className = session.className || '';
              const room = session.room ? `Salle: ${session.room}` : '';
              const weekBadge = session.weekType !== 'both' ? ` (Semaine ${session.weekType})` : '';

              // Build session text
              let text = `${subjectName}${weekBadge}\n${className}`;
              if (room) {
                text += `\n${room}`;
              }
              return text;
            }).join('\n\n-----------------\n\n');

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
      const fileName = `Emploi_du_Temps_${this.currentUser?.name?.replace(/\s+/g, '_') || 'Enseignant'}_${new Date().toISOString().split('T')[0]}.pdf`;
      doc.save(fileName);

      this.toasterService.success('PDF téléchargé avec succès');
    } catch (error) {
      console.error('Error generating PDF:', error);
      this.toasterService.error('Erreur lors de la génération du PDF');
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

  private createPDFTableData(): any[][] {
    // Sort sessions by day and time
    const sortedSessions = this.sessions.sort((a, b) => {
      const dayOrder = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
      const dayA = dayOrder.indexOf(a.dayOfWeek);
      const dayB = dayOrder.indexOf(b.dayOfWeek);

      if (dayA !== dayB) {
        return dayA - dayB;
      }

      // Sort by time if same day
      const timeA = this.timeToMinutes(a.startTime);
      const timeB = this.timeToMinutes(b.startTime);
      return timeA - timeB;
    });

    return sortedSessions.map(session => {
      let subjectName = this.getCleanSubjectName(session);

      // Handle Arabic text for PDF compatibility
      if (subjectName && subjectName !== 'Matière Inconnue') {
        // Ensure the text is properly formatted for PDF
        subjectName = this.formatTextForPDF(subjectName);
      }

      return [
        this.getDayDisplayName(session.dayOfWeek),
        `${session.startTime} - ${session.endTime}`,
        subjectName || 'Matière Inconnue',
        session.className || '',
        session.room || '-',
        this.getSessionTypeDisplay(session.sessionType),
        this.getWeekTypeDisplay(session.weekType)
      ];
    });
  }

  private timeToMinutes(time: string): number {
    const [hours, minutes] = time.split(':').map(Number);
    return hours * 60 + minutes;
  }

  private formatTextForPDF(text: string): string {
    if (!text) return '';

    let cleanText = text.toString().trim();

    // Check if text contains Arabic characters
    const hasArabic = /[\u0600-\u06FF]/.test(cleanText);

    if (hasArabic) {
      // For Arabic text, use transliteration or provide a readable alternative
      const transliterated = this.transliterateArabicForPDF(cleanText);
      return transliterated;
    }

    // For non-Arabic text, clean and return
    try {
      cleanText = cleanText.replace(/[\u200E\u200F]/g, ''); // Remove invisible direction marks
      cleanText = cleanText.replace(/\s+/g, ' '); // Normalize spaces
      return cleanText;
    } catch (error) {
      console.error('Error formatting text for PDF:', error);
      return text.toString();
    }
  }

  private transliterateArabicForPDF(arabicText: string): string {
    // Log the exact Arabic text being processed for debugging
    console.log('Processing Arabic text for PDF:', `"${arabicText}"`, 'Length:', arabicText.length);

    // Common Arabic subject name mappings for Lebanese/Moroccan curriculum
    const arabicToLatin: { [key: string]: string } = {
      'التربية الإسلامية': 'Tarbiya Islamiya (Education Islamique)',
      'التاريخ و الجغرافيا': 'Tarikh wa Jughrafiya (Histoire et Geographie)',
      'التاريخ والجغرافيا': 'Tarikh wa Jughrafiya (Histoire et Geographie)',
      'التاريخ و لجغرافيا': 'Tarikh wa Jughrafiya (Histoire et Geographie)', // Alternative spelling
      'التاريخ ولجغرافيا': 'Tarikh wa Jughrafiya (Histoire et Geographie)', // Another variant
      'اللغة العربية': 'Lugha Arabiya (Langue Arabe)',
      'الرياضيات': 'Riyadiyat (Mathematiques)',
      'العلوم': 'Ulum (Sciences)',
      'الفيزياء': 'Fiziya (Physique)',
      'الكيمياء': 'Kimiya (Chimie)',
      'الأحياء': 'Ahya (Biologie)',
      'التربية البدنية': 'Tarbiya Badaniya (Education Physique)',
      'التربية الفنية': 'Tarbiya Faniya (Education Artistique)',
      'التربية المدنية': 'Tarbiya Madaniya (Education Civique)',
      'الحاسوب': 'Hasub (Informatique)',
      'الموسيقى': 'Musiqa (Musique)',
      'الفلسفة': 'Falsafa (Philosophie)',
      'الأدب العربي': 'Adab Arabi (Litterature Arabe)',
      'القرآن الكريم': 'Quran Karim (Coran)',
      'الحديث الشريف': 'Hadith Sharif (Hadith)',
      'الفقه': 'Fiqh (Jurisprudence)',
      'التوحيد': 'Tawhid (Monotheisme)',
      // Additional common variants
      'علوم الحياة والأرض': 'Ulum al-Hayat wa al-Ard (Sciences de la Vie et de la Terre)',
      'التربية الوطنية': 'Tarbiya Wataniya (Education Civique)',
      'التكنولوجيا': 'Teknologia (Technologie)',
      'الجغرافيا': 'Jughrafiya (Geographie)',
      'التاريخ': 'Tarikh (Histoire)'
    };

    // Clean the text first
    const cleanText = arabicText.trim();

    // Try exact match first
    if (arabicToLatin[cleanText]) {
      console.log('Exact match found:', arabicToLatin[cleanText]);
      return arabicToLatin[cleanText];
    }

    // Try partial matches for similar texts
    for (const [arabic, latin] of Object.entries(arabicToLatin)) {
      if (cleanText.includes(arabic) || arabic.includes(cleanText)) {
        console.log('Partial match found:', arabic, '->', latin);
        return latin;
      }
    }

    // Log when no match is found
    console.log('No match found for Arabic text:', `"${cleanText}"`);

    // If no match found, create a basic transliteration with original text
    // Remove Arabic characters and provide a readable fallback
    const basicTransliteration = cleanText
      .replace(/[\u0600-\u06FF]/g, '') // Remove Arabic characters
      .trim();

    if (basicTransliteration) {
      return `${basicTransliteration} (Matiere en Arabe)`;
    }

    return 'Matiere en Arabe';
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

      // Check for subject ID and try to get from loaded data
      if (session.subjectId && session.subjectDetails) {
        return session.subjectDetails.name || 'Matière Inconnue';
      }

      // Check for teacherSubject structure
      if (session.teacherSubject && session.teacherSubject.subject) {
        if (typeof session.teacherSubject.subject === 'object' && session.teacherSubject.subject.name) {
          return session.teacherSubject.subject.name || 'Matière Inconnue';
        }
        if (typeof session.teacherSubject.subject === 'string') {
          return session.teacherSubject.subject || 'Matière Inconnue';
        }
      }

      // Check if there's a populated subject reference
      if (session.subjectId && typeof session.subjectId === 'object' && session.subjectId.name) {
        return session.subjectId.name || 'Matière Inconnue';
      }

      return 'Matière Inconnue';
    } catch (error) {
      console.error('Error getting clean subject name:', error, session);
      return 'Matière Inconnue';
    }
  }

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

  getSessionsForTimeSlot(day: string, time: string): SessionWithMeta[] {
    return this.sessions.filter(session =>
      session.dayOfWeek === day &&
      session.startTime === time
    );
  }

  hasSessionAtTime(day: string, time: string): boolean {
    return this.getSessionsForTimeSlot(day, time).length > 0;
  }

  getDaySessions(day: string): SessionWithMeta[] {
    return this.sessions.filter(session => session.dayOfWeek === day);
  }

  selectMobileDay(day: string): void {
    this.selectedMobileDay = day;
  }

  // Time slots as intervals for mobile view
  get timeSlotIntervals(): string[] {
    return [
      '08:00-09:00', '09:00-10:00', '10:00-11:00', '11:00-12:00', '12:00-13:00',
      '14:00-15:00', '15:00-16:00', '16:00-17:00', '17:00-18:00', '18:00-19:00'
    ];
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

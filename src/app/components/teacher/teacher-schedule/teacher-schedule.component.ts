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
  selectedAcademicYear: string;
  academicYears: string[] = [];

  // Emploi du temps
  workDays = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  timeSlots = [
    '08:00', '09:00', '10:00', '11:00', '12:00',
    '14:00', '15:00', '16:00', '17:00', '18:00'
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
    // Create PDF with UTF-8 support
    const doc = new jsPDF('p', 'mm', 'a4');

    // Try to set font that supports Unicode better
    try {
      doc.setFont('helvetica');
    } catch (error) {
      console.warn('Could not set font, using default');
    }

    // Header
    doc.setFontSize(20);
    doc.text('Emploi du Temps', 105, 20, { align: 'center' });

    // Teacher info
    doc.setFontSize(12);
    doc.text(`Enseignant: ${this.currentUser.name}`, 20, 35);
    doc.text(`Année Académique: ${this.selectedAcademicYear}`, 20, 45);
    doc.text(`Total des séances: ${this.sessions.length}`, 20, 55);
    doc.text(`Généré le: ${new Date().toLocaleDateString('fr-FR')}`, 20, 65);

    // Create table data
    const tableData = this.createPDFTableData();

    // Generate table with enhanced configuration for multilingual support
    autoTable(doc, {
      head: [['Jour', 'Heure', 'Matière', 'Classe', 'Salle', 'Type', 'Semaine']],
      body: tableData,
      startY: 75,
      styles: {
        fontSize: 9,
        cellPadding: 3,
        halign: 'center',
        valign: 'middle',
        font: 'helvetica',
        lineColor: [200, 200, 200],
        lineWidth: 0.1,
        overflow: 'linebreak',
        cellWidth: 'wrap'
      },
      headStyles: {
        fillColor: [41, 128, 185],
        textColor: 255,
        fontStyle: 'bold',
        fontSize: 10,
        halign: 'center'
      },
      alternateRowStyles: {
        fillColor: [248, 249, 250]
      },
      columnStyles: {
        0: { cellWidth: 20, halign: 'center' },  // Jour
        1: { cellWidth: 25, halign: 'center' },  // Heure
        2: { cellWidth: 60, halign: 'left', fontSize: 8, overflow: 'linebreak' }, // Matière - wider for transliterated text
        3: { cellWidth: 20, halign: 'center' },  // Classe
        4: { cellWidth: 15, halign: 'center' },  // Salle
        5: { cellWidth: 20, halign: 'center' },  // Type
        6: { cellWidth: 20, halign: 'center' }   // Semaine
      },
      // Enhanced cell parsing for multilingual text
      didParseCell: function(data) {
        if (data.column.index === 2 && data.cell.text) { // Subject column
          // Ensure proper text handling for Arabic
          if (Array.isArray(data.cell.text)) {
            data.cell.text = data.cell.text.map(text => {
              return String(text || '').trim();
            });
          }
        }
      }
    });

    // Save PDF
    const fileName = `emploi_du_temps_${this.currentUser.name.replace(/\s+/g, '_')}_${this.selectedAcademicYear}.pdf`;
    doc.save(fileName);
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
        // Return the subject name as-is to support Arabic and other languages
        return session.subject.name.toString() || 'Matière Inconnue';
      }

      // Check for direct subjectName property
      if (session.subjectName) {
        return session.subjectName.toString() || 'Matière Inconnue';
      }

      // Check for subject as string
      if (session.subject && typeof session.subject === 'string') {
        return session.subject.toString() || 'Matière Inconnue';
      }

      // Check for subject ID and try to get from loaded data
      if (session.subjectId && session.subjectDetails) {
        return session.subjectDetails.name || 'Matière Inconnue';
      }

      // Check for teacherSubject structure
      if (session.teacherSubject && session.teacherSubject.subject) {
        if (typeof session.teacherSubject.subject === 'object' && session.teacherSubject.subject.name) {
          return session.teacherSubject.subject.name.toString() || 'Matière Inconnue';
        }
        if (typeof session.teacherSubject.subject === 'string') {
          return session.teacherSubject.subject.toString() || 'Matière Inconnue';
        }
      }

      // Check if there's a populated subject reference
      if (session.subjectId && typeof session.subjectId === 'object' && session.subjectId.name) {
        return session.subjectId.name.toString() || 'Matière Inconnue';
      }

      return 'Matière Inconnue';
    } catch (error) {
      console.error('Error getting clean subject name:', error, session);
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

  getDaySessions(day: string): SessionWithMeta[] {
    return this.sessions.filter(session => session.dayOfWeek === day);
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

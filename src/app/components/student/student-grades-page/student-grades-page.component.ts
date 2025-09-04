// student-grades-page.component.ts
import { Component, OnInit, OnDestroy } from '@angular/core';
import { Subject, takeUntil } from 'rxjs';
import { ClassService } from '../../../services/class.service';
import { GradeService } from '../../../services/grade.service';
import { AuthService } from '../../../services/auth.service';
import { Grade } from '../../../models/grader.model';
import { User } from 'src/app/models/user.model';

interface ExtendedUser extends User {
  id?: string;
}

@Component({
  selector: 'app-student-grades-page',
  templateUrl: './student-grades-page.component.html',
  styleUrls: ['./student-grades-page.component.css']
})
export class StudentGradesPageComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  
  // Data properties
  studentId: string = '';
  currentClassId: string = '';
  grades: Grade[] = [];
  filteredGrades: Grade[] = [];
  subjects: any[] = [];
  allStudentClasses: any[] = []; // All classes the student has been in
  statistics: any = null;
  currentUser: ExtendedUser | null = null;
  currentAcademicYear: string = new Date().getFullYear().toString();
  
  // Filter properties
  selectedTrimester: string = '';
  selectedSubjectFilter: string = '';
  selectedExamType: string = '';
  selectedClassFilter: string = ''; // New class filter
  
  // UI state
  loading: boolean = false;
  error: string = '';
  
  constructor(
    private classService: ClassService,
    private gradeService: GradeService,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    this.initializeStudent();
    this.loadData();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private initializeStudent(): void {
    this.currentUser = this.authService.getCurrentUser();

    if (this.currentUser) {
      this.studentId = this.currentUser.id || '';
      // Get current class ID from user's studentClass property
      if (this.currentUser.studentClass) {
        this.currentClassId = typeof this.currentUser.studentClass === 'object' 
          ? this.currentUser.studentClass._id || ''
          : this.currentUser.studentClass;
      }
    }
  }

  loadData(): void {
    this.loading = true;
    this.error = '';
    
    // Load student's current class and subjects first
    this.loadStudentCurrentClass();
  }

  private loadStudentCurrentClass(): void {
    this.classService.getStudentClass()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.subjects = response.subjects || [];
          // Update current class ID from the response
          if (response.class) {
            this.currentClassId = typeof response.class === 'object' 
              ? response.class._id || ''
              : response.class;
          }
          
          // Set current class as default filter
          this.selectedClassFilter = this.currentClassId;
          
          // Load grades after we have current class information
          this.loadGrades();
        },
        error: (error) => {
          console.error('Error loading current class:', error);
          this.loading = false;
          this.error = 'Erreur lors du chargement de la classe actuelle';
        }
      });
  }

  private extractClassesFromGrades(): void {
    // Extract unique classes from grades
    const classMap = new Map();
    
    this.grades.forEach(grade => {
      if (grade.class) {
        const classObj = typeof grade.class === 'object' ? grade.class : null;
        const classId = typeof grade.class === 'object' ? grade.class._id : grade.class;
        
        if (classId && !classMap.has(classId)) {
          classMap.set(classId, {
            _id: classId,
            name: classObj?.name || `Classe ${classId.substring(0, 8)}`,
            academicYear: grade.academicYear || 'N/A',
            grade: classObj?.grade || 'N/A'
          });
        }
      }
    });
    
    this.allStudentClasses = Array.from(classMap.values());

  }

  private loadSubjects(): void {
    // This method is now handled in loadStudentCurrentClass()
    // Keeping it for backward compatibility if needed elsewhere
  }

  private loadGrades(): void {
    if (!this.studentId) {
      this.loading = false;
      this.error = 'Informations étudiant manquantes';
      return;
    }
    
    // Load grades for all classes the student has been in
    // Backend will filter by student ID, and we'll filter by class on frontend
    const filters = {
      // Remove classId filter to get grades from all classes
      // We'll filter by selected class in filterGrades()
    };
    

    
    this.gradeService.getGradesByStudent(this.studentId, filters)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          // Store all grades from all classes
          this.grades = response.grades || [];
          
          // Extract classes from grades
          this.extractClassesFromGrades();
          
          // Recalculate statistics based on current filter
          this.calculateStatisticsForSelectedClass();
          this.filterGrades();
          this.loading = false;

        },
        error: (error) => {
          this.error = 'Erreur lors du chargement des notes';
          this.loading = false;
          console.error('Error loading grades:', error);
        }
      });
  }

  filterGrades(): void {
    // Start with all grades
    let gradesForSelectedClass = this.grades;
    
    // Filter by selected class (default is current class)
    if (this.selectedClassFilter) {
      gradesForSelectedClass = this.grades.filter(grade => {
        const gradeClassId = typeof grade.class === 'object' ? grade.class._id : grade.class;
        return gradeClassId === this.selectedClassFilter;
      });
    }
    
    // Apply other filters
    this.filteredGrades = gradesForSelectedClass.filter(grade => {
      let matches = true;
      
      if (this.selectedTrimester && grade.trimester !== this.selectedTrimester) {
        matches = false;
      }
      
      if (this.selectedSubjectFilter) {
        const subjectId = typeof grade.subject === 'object' ? grade.subject._id : grade.subject;
        if (subjectId !== this.selectedSubjectFilter) {
          matches = false;
        }
      }
      
      if (this.selectedExamType && grade.examType !== this.selectedExamType) {
        matches = false;
      }
      
      return matches;
    });
    
    // Recalculate statistics for the selected class
    this.calculateStatisticsForSelectedClass();
  }

  onClassFilterChange(): void {
    // When class filter changes, update subjects for that class
    this.updateSubjectsForSelectedClass();
    // Reset subject filter since subjects might be different
    this.selectedSubjectFilter = '';
    // Filter grades
    this.filterGrades();
  }

  private updateSubjectsForSelectedClass(): void {
    if (this.selectedClassFilter === this.currentClassId) {
      // Current class - subjects are already loaded
      return;
    }
    
    // For previous classes, we might need to load subjects
    // For now, we'll extract subjects from grades of that class
    const classGrades = this.grades.filter(grade => {
      const gradeClassId = typeof grade.class === 'object' ? grade.class._id : grade.class;
      return gradeClassId === this.selectedClassFilter;
    });
    
    // Extract unique subjects from grades
    const subjectMap = new Map();
    classGrades.forEach(grade => {
      if (grade.subject) {
        const subject = typeof grade.subject === 'object' ? grade.subject : null;
        if (subject && subject._id) {
          subjectMap.set(subject._id, subject);
        }
      }
    });
    
    // If we're not in current class, update subjects list
    if (this.selectedClassFilter !== this.currentClassId) {
      this.subjects = Array.from(subjectMap.values());
    }
  }

  resetFilters(): void {
    this.selectedTrimester = '';
    this.selectedSubjectFilter = '';
    this.selectedExamType = '';
    this.selectedClassFilter = this.currentClassId; // Reset to current class
    this.updateSubjectsForSelectedClass();
    this.filterGrades();
  }

  hasActiveFilters(): boolean {
    return !!(this.selectedTrimester || 
              this.selectedSubjectFilter || 
              this.selectedExamType || 
              (this.selectedClassFilter && this.selectedClassFilter !== this.currentClassId));
  }

  private calculateStatisticsForSelectedClass(): void {
    // Get grades for currently selected class
    const selectedClassGrades = this.grades.filter(grade => {
      const gradeClassId = typeof grade.class === 'object' ? grade.class._id : grade.class;
      return gradeClassId === this.selectedClassFilter;
    });
    
    if (!this.statistics) {
      this.statistics = {};
    }
    
    if (selectedClassGrades.length > 0) {
      // Calculate overall average from selected class grades
      this.statistics.moyenneGenerale = this.calculateWeightedAverage(selectedClassGrades);
      
      // Calculate best grade from selected class grades
      const grades = selectedClassGrades.map(g => g.grade);
      this.statistics.meilleureNote = Math.max(...grades);
      
      // Calculate progression (compare current trimester with previous) - selected class only
      const currentTrimesterGrades = selectedClassGrades.filter(g => g.trimester === '3ème Trimestre');
      if (currentTrimesterGrades.length > 0) {
        const currentAverage = this.calculateWeightedAverage(currentTrimesterGrades);
        const previousTrimesterGrades = selectedClassGrades.filter(g => g.trimester === '2ème Trimestre');
        
        if (previousTrimesterGrades.length > 0) {
          const previousAverage = this.calculateWeightedAverage(previousTrimesterGrades);
          this.statistics.progression = ((currentAverage - previousAverage) / previousAverage) * 100;
        } else {
          // Compare with first trimester if second doesn't exist
          const firstTrimesterGrades = selectedClassGrades.filter(g => g.trimester === '1er Trimestre');
          if (firstTrimesterGrades.length > 0) {
            const firstAverage = this.calculateWeightedAverage(firstTrimesterGrades);
            this.statistics.progression = ((currentAverage - firstAverage) / firstAverage) * 100;
          }
        }
      } else {
        // Compare second trimester with first
        const secondTrimesterGrades = selectedClassGrades.filter(g => g.trimester === '2ème Trimestre');
        const firstTrimesterGrades = selectedClassGrades.filter(g => g.trimester === '1er Trimestre');
        
        if (secondTrimesterGrades.length > 0 && firstTrimesterGrades.length > 0) {
          const secondAverage = this.calculateWeightedAverage(secondTrimesterGrades);
          const firstAverage = this.calculateWeightedAverage(firstTrimesterGrades);
          this.statistics.progression = ((secondAverage - firstAverage) / firstAverage) * 100;
        }
      }
      
      // Calculate average by subject for selected class only
      this.calculateSubjectAveragesForSelectedClass(selectedClassGrades);
    } else {
      // No grades in selected class
      this.statistics.moyenneGenerale = 0;
      this.statistics.meilleureNote = 0;
      this.statistics.progression = 0;
      this.statistics.subjectAverages = {};
    }
  }

  private calculateWeightedAverage(grades: Grade[]): number {
    let totalWeightedGrades = 0;
    let totalCoefficients = 0;
    
    grades.forEach(grade => {
      const coefficient = grade.coefficient || 1;
      totalWeightedGrades += grade.grade * coefficient;
      totalCoefficients += coefficient;
    });
    
    return totalCoefficients > 0 ? totalWeightedGrades / totalCoefficients : 0;
  }

  private calculateSubjectAveragesForSelectedClass(selectedClassGrades: Grade[]): void {
    const subjectAverages: { [key: string]: number } = {};
    
    // Get unique subjects from selected class grades
    const subjectsInClass = new Set();
    selectedClassGrades.forEach(grade => {
      const subjectId = typeof grade.subject === 'object' ? grade.subject._id : grade.subject;
      if (subjectId) {
        subjectsInClass.add(subjectId);
      }
    });
    
    // Calculate average for each subject
    subjectsInClass.forEach(subjectId => {
      const subjectGrades = selectedClassGrades.filter(grade => {
        const gradeSubjectId = typeof grade.subject === 'object' ? grade.subject._id : grade.subject;
        return gradeSubjectId === subjectId;
      });
      
      if (subjectGrades.length > 0) {
        subjectAverages[subjectId as string] = this.calculateWeightedAverage(subjectGrades);
      }
    });
    
    this.statistics.subjectAverages = subjectAverages;
  }

  private calculateSubjectAverages(): void {
    // Legacy method - now handled by calculateSubjectAveragesForSelectedClass
    const subjectAverages: { [key: string]: number } = {};
    
    this.subjects.forEach(subject => {
      const subjectGrades = this.grades.filter(grade => {
        const gradeSubjectId = typeof grade.subject === 'object' ? grade.subject._id : grade.subject;
        const gradeClassId = typeof grade.class === 'object' ? grade.class._id : grade.class;
        return gradeSubjectId === subject._id && gradeClassId === this.currentClassId;
      });
      
      if (subjectGrades.length > 0) {
        subjectAverages[subject._id] = this.calculateWeightedAverage(subjectGrades);
      }
    });
    
    this.statistics.subjectAverages = subjectAverages;
  }

  getClassName(classId: string): string {
    if (!classId) return 'N/A';
    
    // Check if it's the current class
    if (classId === this.currentClassId) {
      return 'Classe Actuelle';
    }
    
    // Find class in extracted classes from grades
    const foundClass = this.allStudentClasses.find(c => c._id === classId);
    if (foundClass) {
      return `${foundClass.name} (${foundClass.academicYear})`;
    }
    
    // Fallback: try to find class info in grades
    const gradeWithClass = this.grades.find(grade => {
      const gradeClassId = typeof grade.class === 'object' ? grade.class._id : grade.class;
      return gradeClassId === classId;
    });
    
    if (gradeWithClass) {
      const classObj = typeof gradeWithClass.class === 'object' ? gradeWithClass.class : null;
      const className = classObj?.name || `Classe ${classId.substring(0, 8)}`;
      const academicYear = gradeWithClass.academicYear || 'N/A';
      return `${className} (${academicYear})`;
    }
    
    return 'Classe Inconnue';
  }

  getSubjectName(subject: any): string {
    if (typeof subject === 'object' && subject.name) {
      return subject.name;
    }
    if (this.subjects) {
      const foundSubject = this.subjects.find(s => s._id === subject);
      return foundSubject ? foundSubject.name : 'N/A';
    }
    return 'N/A';
  }

  formatDate(date: Date | string): string {
    if (!date) return 'N/A';
    const dateObj = new Date(date);
    return dateObj.toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  }

  // Method to refresh data when class changes (can be called from parent component)
  refreshDataForNewClass(): void {
    this.initializeStudent();
    this.loadData();
  }
}
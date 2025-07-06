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
  grades: Grade[] = [];
  filteredGrades: Grade[] = [];
  subjects: any[] = [];
  statistics: any = null;
  currentUser: ExtendedUser | null = null;
  currentAcademicYear: string = new Date().getFullYear().toString();
  
  // Filter properties
  selectedTrimester: string = '';
  selectedSubjectFilter: string = '';
  selectedExamType: string = '';
  
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
    console.log('Current user:', this.currentUser);
    if (this.currentUser) {
      this.studentId = this.currentUser.id || '';
    }
  }

  loadData(): void {
    this.loading = true;
    this.error = '';
    
    // Load subjects
    this.loadSubjects();
    
    // Load grades
    this.loadGrades();
  }

  private loadSubjects(): void {
    this.classService.getStudentClass()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.subjects = response.subjects || [];
        },
        error: (error) => {
          console.error('Error loading subjects:', error);
        }
      });
  }

  private loadGrades(): void {
    if (!this.studentId) {
      this.loading = false;
      return;
    }
    
    const filters = {
      academicYear: this.currentAcademicYear
    };
    console.log('Loading grades for student:', this.studentId, 'with filters:', filters);
    
    this.gradeService.getGradesByStudent(this.studentId, filters)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.grades = response.grades || [];
          this.statistics = response.statistics || {};
          this.calculateAdditionalStatistics();
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
    this.filteredGrades = this.grades.filter(grade => {
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
  }

  resetFilters(): void {
    this.selectedTrimester = '';
    this.selectedSubjectFilter = '';
    this.selectedExamType = '';
    this.filterGrades();
  }

  hasActiveFilters(): boolean {
    return !!(this.selectedTrimester || this.selectedSubjectFilter || this.selectedExamType);
  }

  private calculateAdditionalStatistics(): void {
    if (!this.statistics) {
      this.statistics = {};
    }
    
    if (this.grades.length > 0) {
      // Calculate best grade if not already present
      if (!this.statistics.meilleureNote) {
        const grades = this.grades.map(g => g.grade);
        this.statistics.meilleureNote = Math.max(...grades);
      }
      
      // Calculate progression (compare current trimester with previous)
      const currentTrimesterGrades = this.grades.filter(g => g.trimester === '3ème Trimestre');
      if (currentTrimesterGrades.length > 0) {
        const currentAverage = this.calculateWeightedAverage(currentTrimesterGrades);
        const previousTrimesterGrades = this.grades.filter(g => g.trimester === '2ème Trimestre');
        
        if (previousTrimesterGrades.length > 0) {
          const previousAverage = this.calculateWeightedAverage(previousTrimesterGrades);
          this.statistics.progression = ((currentAverage - previousAverage) / previousAverage) * 100;
        } else {
          // Compare with first trimester if second doesn't exist
          const firstTrimesterGrades = this.grades.filter(g => g.trimester === '1er Trimestre');
          if (firstTrimesterGrades.length > 0) {
            const firstAverage = this.calculateWeightedAverage(firstTrimesterGrades);
            this.statistics.progression = ((currentAverage - firstAverage) / firstAverage) * 100;
          }
        }
      } else {
        // Compare second trimester with first
        const secondTrimesterGrades = this.grades.filter(g => g.trimester === '2ème Trimestre');
        const firstTrimesterGrades = this.grades.filter(g => g.trimester === '1er Trimestre');
        
        if (secondTrimesterGrades.length > 0 && firstTrimesterGrades.length > 0) {
          const secondAverage = this.calculateWeightedAverage(secondTrimesterGrades);
          const firstAverage = this.calculateWeightedAverage(firstTrimesterGrades);
          this.statistics.progression = ((secondAverage - firstAverage) / firstAverage) * 100;
        }
      }
      
      // Calculate average by subject
      this.calculateSubjectAverages();
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

  private calculateSubjectAverages(): void {
    const subjectAverages: { [key: string]: number } = {};
    
    this.subjects.forEach(subject => {
      const subjectGrades = this.grades.filter(grade => {
        const gradeSubjectId = typeof grade.subject === 'object' ? grade.subject._id : grade.subject;
        return gradeSubjectId === subject._id;
      });
      
      if (subjectGrades.length > 0) {
        subjectAverages[subject._id] = this.calculateWeightedAverage(subjectGrades);
      }
    });
    
    this.statistics.subjectAverages = subjectAverages;
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
}
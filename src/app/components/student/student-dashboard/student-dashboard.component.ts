// student-dashboard.component.ts
import { Component, OnInit, OnDestroy } from '@angular/core';
import { Subject, takeUntil } from 'rxjs';
import { ClassService } from '../../../services/class.service';
import { GradeService } from '../../../services/grade.service';
import { AuthService } from '../../../services/auth.service';
import { Grade } from '../../../models/grader.model';
import { User } from 'src/app/models/user.model';
import { Router } from '@angular/router';

interface ExtendedUser extends User {
  id?: string;
}

@Component({
  selector: 'app-student-dashboard',
  templateUrl: './student-dashboard.component.html',
  styleUrls: ['./student-dashboard.component.css']
})
export class StudentDashboardComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  
  // Data properties
  studentName: string = '';
  studentId: string = '';
  classInfo: { class: any; subjects: any[] } | null = null;
  grades: Grade[] = [];
  statistics: any = null;
  currentUser: ExtendedUser | null = null;
  currentAcademicYear: string = new Date().getFullYear().toString();
  
  // UI state
  loading: boolean = false;
  error: string = '';
  
  constructor(
    private classService: ClassService,
    private gradeService: GradeService,
    private authService: AuthService,
    private router: Router
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
      this.studentName = this.currentUser.name;
      this.studentId = this.currentUser.id || '';
    }
  }

  loadData(): void {
    this.loading = true;
    this.error = '';
    
    // Load class and subjects
    this.loadClassInfo();
    
    // Load grades for statistics only
    this.loadGradesForStats();
  }

  private loadClassInfo(): void {
    this.classService.getStudentClass()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.classInfo = response;
          this.loading = false;
        },
        error: (error) => {
          this.error = 'Erreur lors du chargement des informations de classe';
          this.loading = false;
          console.error('Error loading class info:', error);
        }
      });
  }

  private loadGradesForStats(): void {
    if (!this.studentId) return;
    
    const filters = {
      academicYear: this.currentAcademicYear
    };

    
    this.gradeService.getGradesByStudent(this.studentId, filters)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.grades = response.grades || [];
          this.statistics = response.statistics || {};
          this.calculateAdditionalStatistics();
        },
        error: (error) => {
          console.error('Error loading grades for statistics:', error);
          // Don't show error for stats, just log it
        }
      });
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

  selectSubject(subject: any): void {
    // Navigate to subject exercises
    this.router.navigate(['/student/exercises', subject._id, { subjectName: subject.name }]);
  }

  navigateToExercises(): void {
    // Navigate to general exercises page or first available subject
    if (this.classInfo && this.classInfo.subjects && this.classInfo.subjects.length > 0) {
      this.selectSubject(this.classInfo.subjects[0]);
    } else {
      // Navigate to a general exercises page
      this.router.navigate(['/student/exercises']);
    }
  }

  getSubjectInitials(name: string): string {
    return name
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  }

  getTeacherName(teacher: any): string {
    if (typeof teacher === 'object' && teacher.name) {
      return teacher.name;
    }
    if (typeof teacher === 'string') {
      return teacher;
    }
    return 'Non assigné';
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
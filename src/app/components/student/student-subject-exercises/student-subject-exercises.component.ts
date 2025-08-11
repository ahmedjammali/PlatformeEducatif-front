// student-subject-exercises.component.ts
import { Component, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Subject, takeUntil, forkJoin } from 'rxjs';
import { ExerciseService } from '../../../services/exercise.service';
import { ProgressService } from '../../../services/progress.service';
import { Exercise } from '../../../models/exrecice.model';
import { StudentProgress } from '../../../models/progress.model';
import { AuthService } from '../../../services/auth.service';
import { User } from 'src/app/models/user.model';

interface ExerciseWithStatus extends Exercise {
  status?: 'not_started' | 'in_progress' | 'completed';
  remainingAttempts?: number;
  studentProgress?: {
    attemptNumber: number;
    score: number;
    accuracy: number;
    completedAt?: Date;
    status: 'passed' | 'failed';
  };
  allAttempts?: StudentProgress[];
}

interface ExtendedUser extends User {
  id?: string;
}


@Component({
  selector: 'app-student-subject-exercises',
  templateUrl: './student-subject-exercises.component.html',
  styleUrls: ['./student-subject-exercises.component.css']
})
export class StudentSubjectExercisesComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  
  // Data properties
  subjectId: string = '';
  subjectName: string = '';
  exercises: ExerciseWithStatus[] = [];
  filteredExercises: ExerciseWithStatus[] = [];
  studentId: string = '';
  
  // Filter properties
  selectedDifficulty: string = '';
  selectedStatus: string = '';
  
  // Pagination
  currentPage: number = 1;
  pageSize: number = 20;
  totalPages: number = 1;
  totalExercises: number = 0;
  
  // UI state
  loading: boolean = false;
  error: string = '';

    currentUser: ExtendedUser | null = null;
  
  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private exerciseService: ExerciseService,
    private progressService: ProgressService,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    // Get current student ID
    this.currentUser = this.authService.getCurrentUser();
    this.studentId = this.currentUser?.id || '';
    
    this.route.params.pipe(takeUntil(this.destroy$)).subscribe(params => {
      this.subjectId = params['subjectId'];
      this.subjectName = params['subjectName'] || 'Matière';
      this.loadExercises();
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadExercises(): void {
    this.loading = true;
    this.error = '';
    
    const filters = {
      page: this.currentPage,
      limit: this.pageSize,
      difficulty: this.selectedDifficulty || undefined
    };
    
    this.exerciseService.getExercisesBySubject(this.subjectId, filters)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.exercises = this.processExercises(response.exercises);
          this.totalPages = response.pagination?.totalPages || 1;
          this.totalExercises = response.pagination?.totalExercises || response.exercises.length;
          
          // Load all attempts for each exercise
          this.loadAllAttemptsForExercises();
        },
        error: (error) => {
          this.error = 'Erreur lors du chargement des exercices';
          this.loading = false;
          console.error('Error loading exercises:', error);
        }
      });
  }

  private loadAllAttemptsForExercises(): void {
    if (this.exercises.length === 0 || !this.studentId) {
      this.filterExercises();
      this.loading = false;
      return;
    }

    // Load progress for each exercise
    const progressRequests = this.exercises.map(exercise => 
      this.exerciseService.getExerciseProgress(exercise._id!, this.studentId)
    );

    forkJoin(progressRequests)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (responses) => {
          responses.forEach((response, index) => {
            if (response.progress && response.progress.length > 0) {
              this.exercises[index].allAttempts = response.progress;
              // Set the latest attempt as the current progress
              const latestAttempt = response.progress.reduce((latest, current) => 
                new Date(current.completedAt) > new Date(latest.completedAt) ? current : latest
              );
              this.exercises[index].studentProgress = {
                attemptNumber: latestAttempt.attemptNumber,
                score: latestAttempt.totalPointsEarned,
                accuracy: latestAttempt.accuracyPercentage,
                completedAt: latestAttempt.completedAt,
                status: latestAttempt.accuracyPercentage >= 50 ? 'passed' : 'failed'
              };
            }
          });
          
          this.exercises = this.processExercisesWithAttempts(this.exercises);
          this.filterExercises();
          this.loading = false;
        },
        error: (error) => {
          console.error('Error loading attempts:', error);
          this.filterExercises();
          this.loading = false;
        }
      });
  }

  private processExercises(exercises: any[]): ExerciseWithStatus[] {
    return exercises.map(exercise => ({
      ...exercise,
      status: 'not_started',
      remainingAttempts: exercise.metadata?.maxAttempts || 1
    }));
  }

  private processExercisesWithAttempts(exercises: ExerciseWithStatus[]): ExerciseWithStatus[] {
    return exercises.map(exercise => {
      let status: 'not_started' | 'in_progress' | 'completed' = 'not_started';
      let remainingAttempts = exercise.metadata?.maxAttempts || 1;
      
      if (exercise.allAttempts && exercise.allAttempts.length > 0) {
        const hasCompleted = exercise.allAttempts.some(attempt => attempt.completedAt);
        if (hasCompleted) {
          status = 'completed';
        } else {
          status = 'in_progress';
        }
        remainingAttempts = (exercise.metadata?.maxAttempts || 1) - exercise.allAttempts.length;
      }
      
      return {
        ...exercise,
        status,
        remainingAttempts
      };
    });
  }

  filterExercises(): void {
    this.filteredExercises = this.exercises.filter(exercise => {
      if (this.selectedStatus && exercise.status !== this.selectedStatus) {
        return false;
      }
      return true;
    });
  }

  startExercise(exercise: ExerciseWithStatus): void {
    // Navigate to the exercise page
    this.router.navigate(['/student/exercise', exercise._id]);
  }

  viewAttemptDetails(exercise: ExerciseWithStatus, attempt: StudentProgress): void {
    // Navigate to specific attempt results
    this.router.navigate(['/student/exercise', exercise._id ,'attempt', attempt._id]);
  }

  viewAllAttempts(exercise: ExerciseWithStatus): void {
    // Navigate to all attempts view
    this.router.navigate(['/student/exercise', exercise._id, 'attempts']);
  }

  canStartExercise(exercise: ExerciseWithStatus): boolean {
    // Check if exercise can be started or retried
    if (!exercise.allAttempts || exercise.allAttempts.length === 0) {
      return true; // Not started yet
    }
    
    if (exercise.metadata?.maxAttempts) {
      return exercise.allAttempts.length < exercise.metadata.maxAttempts;
    }
    
    return false;
  }

  getStartButtonText(exercise: ExerciseWithStatus): string {
    if (!exercise.allAttempts || exercise.allAttempts.length === 0) {
      return 'Commencer';
    }
    
    if (exercise.status === 'in_progress') {
      return 'Continuer';
    }
    
    if (exercise.remainingAttempts && exercise.remainingAttempts > 0) {
      return 'Réessayer';
    }
    
    return 'Voir les résultats';
  }

  isBestAttempt(exercise: ExerciseWithStatus, attempt: StudentProgress): boolean {
    if (!exercise.allAttempts || exercise.allAttempts.length <= 1) {
      return false;
    }
    
    const bestAttempt = exercise.allAttempts.reduce((best, current) => 
      current.accuracyPercentage > best.accuracyPercentage ? current : best
    );
    
    return attempt._id === bestAttempt._id;
  }

  
shouldShowAttemptDetails(exercise: ExerciseWithStatus, attempt: StudentProgress): boolean {
  // Si l'étudiant a obtenu 100%, toujours afficher le bouton
  if (attempt.accuracyPercentage === 100) {
    return true;
  }
  
  // Si l'étudiant n'a plus de tentatives restantes, afficher le bouton
  if (!exercise.remainingAttempts || exercise.remainingAttempts <= 0) {
    return true;
  }
  
  // Si l'étudiant a encore des tentatives restantes et n'a pas eu 100%, 
  // ne pas afficher le bouton
  return false;
}

  formatDateTime(date: Date | string): string {
    if (!date) return 'N/A';
    const dateObj = new Date(date);
    return dateObj.toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  formatDuration(seconds: number): string {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    
    if (minutes > 0) {
      return `${minutes}m ${secs}s`;
    }
    return `${secs}s`;
  }

  getAttemptsText(exercise: ExerciseWithStatus): string {
    const maxAttempts = exercise.metadata?.maxAttempts || 1;
    const currentAttempt = exercise.allAttempts?.length || 0;
    const remaining = maxAttempts - currentAttempt;
    
    if (currentAttempt === 0) {
      return `${maxAttempts} tentative${maxAttempts > 1 ? 's' : ''} disponible${maxAttempts > 1 ? 's' : ''}`;
    }
    
    return `${remaining} tentative${remaining > 1 ? 's' : ''} restante${remaining > 1 ? 's' : ''}`;
  }

  getDifficultyLabel(difficulty: string): string {
    const labels: { [key: string]: string } = {
      'easy': 'Facile',
      'medium': 'Moyen',
      'hard': 'Difficile'
    };
    return labels[difficulty] || difficulty;
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

  goBack(): void {
    this.router.navigate(['/student/dashboard']);
  }
}
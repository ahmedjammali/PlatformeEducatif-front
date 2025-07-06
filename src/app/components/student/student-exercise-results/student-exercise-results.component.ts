// student-exercise-results.component.ts
import { Component, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { ExerciseService } from '../../../services/exercise.service';
import { ProgressService } from '../../../services/progress.service';
import { Exercise } from '../../../models/exrecice.model';
import { StudentProgress } from '../../../models/progress.model';
import { AuthService } from 'src/app/services/auth.service';
import { User } from 'src/app/models/user.model';

interface ReviewSentencePart {
  text: string;
  isBlank: boolean;
  studentAnswer?: string;
  correctAnswer?: string;
  isCorrect?: boolean;
}

interface ExtendedUser extends User {
  id?: string;
}

@Component({
  selector: 'app-student-exercise-results',
  templateUrl: './student-exercise-results.component.html',
  styleUrls: ['./student-exercise-results.component.css']
})
export class StudentExerciseResultsComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  
  // Data
  exerciseId: string = '';
  attemptId: string | null = null;
  exercise: Exercise | null = null;
  progress: StudentProgress | null = null;
  allAttempts: StudentProgress[] = [];
    currentUser: ExtendedUser | null = null;
  
  // UI State
  loading: boolean = false;
  error: string = '';
  
  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private exerciseService: ExerciseService,
    private progressService: ProgressService , 
    private authService: AuthService // Assuming you have AuthService to get current user
  ) {}

  ngOnInit(): void {
    this.route.params.pipe(takeUntil(this.destroy$)).subscribe(params => {
      this.exerciseId = params['id'];
      this.attemptId = params['attemptId'] || null;
      this.loadResults();
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadResults(): void {
    this.loading = true;
    this.error = '';
    
    // First load exercise details
    this.exerciseService.getExerciseById(this.exerciseId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.exercise = response.exercise;
          
          // If attemptId is specified, load that specific attempt
          if (this.attemptId) {
            this.loadSpecificAttempt();
          } else {
            // Otherwise, load the latest attempt
            this.progress = response.studentProgress || null;
            if (!this.progress) {
              this.error = 'Aucun résultat trouvé pour cet exercice';
            }
            this.loading = false;
          }
        },
        error: (error) => {
          this.error = 'Erreur lors du chargement des résultats';
          this.loading = false;
          console.error('Error loading results:', error);
        }
      });
  }

  private loadSpecificAttempt(): void {
    // Get the current user to get student ID
    this.currentUser = this.authService.getCurrentUser(); ;
    const studentId = this.currentUser?.id ;
    
    if (!studentId) {
      this.error = 'Impossible de charger les résultats: ID étudiant manquant';
      this.loading = false;
      return;
    }
    
    // Load all attempts for this exercise
    this.exerciseService.getExerciseProgress(this.exerciseId, studentId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.allAttempts = response.progress || [];
          
          // Find the specific attempt
          if (this.attemptId) {
            this.progress = this.allAttempts.find(attempt => attempt._id === this.attemptId) || null;
            if (!this.progress) {
              this.error = 'Tentative non trouvée';
            }
          } else if (this.allAttempts.length > 0) {
            // Get the latest attempt
            this.progress = this.allAttempts.reduce((latest, current) => 
              new Date(current.completedAt) > new Date(latest.completedAt) ? current : latest
            );
          }
          
          this.loading = false;
        },
        error: (error) => {
          this.error = 'Erreur lors du chargement de la tentative';
          this.loading = false;
          console.error('Error loading attempt:', error);
        }
      });
  }

  // Performance Calculation
  getPerformanceLevel(): string {
    if (!this.progress) return 'poor';
    
    const percentage = this.progress.accuracyPercentage;
    if (percentage >= 90) return 'excellent';
    if (percentage >= 70) return 'good';
    if (percentage >= 50) return 'average';
    return 'poor';
  }

  getCircleProgress(): string {
    const circumference = 2 * Math.PI * 45;
    return `${circumference} ${circumference}`;
  }

  getCircleOffset(): string {
    if (!this.progress) return '100%';
    const circumference = 2 * Math.PI * 45;
    const offset = circumference - (this.progress.accuracyPercentage / 100) * circumference;
    return `${offset}`;
  }

  // Statistics
  getCorrectAnswersCount(): number {
    if (!this.progress) return 0;
    
    if (this.exercise?.type === 'qcm' && this.progress.qcmAnswers) {
      return this.progress.qcmAnswers.filter(a => a.isCorrect).length;
    } else if (this.exercise?.type === 'fill_blanks' && this.progress.fillBlankAnswers) {
      return this.progress.fillBlankAnswers.filter(a => 
        a.blankAnswers.every(ba => ba.isCorrect)
      ).length;
    }
    
    return 0;
  }

  getIncorrectAnswersCount(): number {
    if (!this.exercise) return 0;
    const total = this.getTotalQuestions();
    return total - this.getCorrectAnswersCount();
  }

  getTotalQuestions(): number {
    if (!this.exercise) return 0;
    
    if (this.exercise.type === 'qcm') {
      return this.exercise.qcmQuestions?.length || 0;
    } else {
      return this.exercise.fillBlankQuestions?.length || 0;
    }
  }

  getAverageTimePerQuestion(): string {
    if (!this.progress || this.getTotalQuestions() === 0) return '0';
    const avgTime = this.progress.timeSpent / this.getTotalQuestions();
    return Math.round(avgTime).toString();
  }

  // QCM Methods
  isQCMAnswerCorrect(questionIndex: number): boolean {
    if (!this.progress?.qcmAnswers) return false;
    const answer = this.progress.qcmAnswers.find(a => a.questionIndex === questionIndex);
    return answer?.isCorrect || false;
  }

  getQCMPoints(questionIndex: number): number {
    if (!this.progress?.qcmAnswers) return 0;
    const answer = this.progress.qcmAnswers.find(a => a.questionIndex === questionIndex);
    return answer?.pointsEarned || 0;
  }

  isOptionSelected(questionIndex: number, optionId: string | undefined): boolean {
    if (!this.progress?.qcmAnswers || !optionId) return false;
    const answer = this.progress.qcmAnswers.find(a => a.questionIndex === questionIndex);
    return answer?.selectedOption === optionId;
  }

  // Fill Blanks Methods
  isFillBlankAnswerCorrect(questionIndex: number): boolean {
    if (!this.progress?.fillBlankAnswers) return false;
    const answer = this.progress.fillBlankAnswers.find(a => a.questionIndex === questionIndex);
    return answer?.blankAnswers.every(ba => ba.isCorrect) || false;
  }

  getFillBlankPoints(questionIndex: number): number {
    if (!this.progress?.fillBlankAnswers) return 0;
    const answer = this.progress.fillBlankAnswers.find(a => a.questionIndex === questionIndex);
    return answer?.pointsEarned || 0;
  }

  getReviewSentenceParts(question: any, questionIndex: number): ReviewSentencePart[] {
    const parts: ReviewSentencePart[] = [];
    const sentence = question.sentence;
    let lastIndex = 0;
    
    const blankRegex = /___/g;
    let match;
    let blankIndex = 0;
    
    const studentAnswer = this.progress?.fillBlankAnswers?.find(
      a => a.questionIndex === questionIndex
    );
    
    while ((match = blankRegex.exec(sentence)) !== null) {
      // Add text before blank
      if (match.index > lastIndex) {
        parts.push({
          text: sentence.substring(lastIndex, match.index),
          isBlank: false
        });
      }
      
      // Add blank with student answer
      const blankAnswer = studentAnswer?.blankAnswers.find(
        ba => ba.blankIndex === blankIndex
      );
      
      parts.push({
        text: '',
        isBlank: true,
        studentAnswer: blankAnswer?.studentAnswer || '',
        correctAnswer: question.blanks[blankIndex]?.correctAnswer || '',
        isCorrect: blankAnswer?.isCorrect || false
      });
      
      blankIndex++;
      lastIndex = match.index + match[0].length;
    }
    
    // Add remaining text
    if (lastIndex < sentence.length) {
      parts.push({
        text: sentence.substring(lastIndex),
        isBlank: false
      });
    }
    
    return parts;
  }

  // Navigation Methods
  canRetry(): boolean {
    if (!this.exercise || !this.progress) return false;
    
    const maxAttempts = this.exercise.metadata?.maxAttempts || 1;
    return this.progress.attemptNumber < maxAttempts;
  }

  getRemainingAttempts(): number {
    if (!this.exercise || !this.progress) return 0;
    
    const maxAttempts = this.exercise.metadata?.maxAttempts || 1;
    return maxAttempts - this.progress.attemptNumber;
  }

  retryExercise(): void {
    this.router.navigate(['/student/exercise', this.exerciseId]);
  }

  backToExercises(): void {
    if (this.exercise?.subject) {
      const subjectId = typeof this.exercise.subject === 'object' 
        ? this.exercise.subject._id 
        : this.exercise.subject;
      this.router.navigate(['/student/exercises', subjectId]);
    } else {
      this.router.navigate(['/student/dashboard']);
    }
  }

  goBack(): void {
    this.backToExercises();
  }

  // Utility Methods
  formatTime(seconds: number): string {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    
    if (minutes > 0) {
      return `${minutes}m ${secs}s`;
    }
    return `${secs}s`;
  }
}
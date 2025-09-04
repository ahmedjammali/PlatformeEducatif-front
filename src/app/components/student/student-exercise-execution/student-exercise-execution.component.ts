// student-exercise-execution.component.ts
import { Component, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Subject, takeUntil, interval } from 'rxjs';
import { ExerciseService } from '../../../services/exercise.service';
import { Exercise, ExerciseSubmission } from '../../../models/exrecice.model';
import { StudentProgress } from '../../../models/progress.model';

interface SentencePart {
  text: string;
  isBlank: boolean;
  blankIndex?: number;
}

@Component({
  selector: 'app-student-exercise-execution',
  templateUrl: './student-exercise-execution.component.html',
  styleUrls: ['./student-exercise-execution.component.css']
})
export class StudentExerciseExecutionComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  private timerSubscription: any;
  
  // Exercise data
  exerciseId: string = '';
  exercise: Exercise | null = null;
  studentProgress: StudentProgress | null = null;
  
  // Current state
  currentQuestionIndex: number = 0;
  qcmAnswers: { [key: number]: string } = {};
  fillBlankAnswers: { questionIndex: number; blanks: string[] }[] = [];
  
  // Timer
  startTime: number = Date.now();
  elapsedTime: number = 0;
  showTimer: boolean = true;
  
  // UI state
  loading: boolean = false;
  error: string = '';
  submitting: boolean = false;
  showResults: boolean = false;
  results: any = null;
  
  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private exerciseService: ExerciseService
  ) {}

  ngOnInit(): void {
    this.route.params.pipe(takeUntil(this.destroy$)).subscribe(params => {
      this.exerciseId = params['id'];
      this.loadExercise();
    });
    
    // Start timer
    this.startTimer();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    if (this.timerSubscription) {
      this.timerSubscription.unsubscribe();
    }
  }

  loadExercise(): void {
    this.loading = true;
    this.error = '';
    
    this.exerciseService.getExerciseById(this.exerciseId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.exercise = response.exercise;

          this.studentProgress = response.studentProgress || null;
 
          this.initializeAnswers();
          this.loading = false;
        },
        error: (error) => {
          this.error = 'Erreur lors du chargement de l\'exercice';
          this.loading = false;
          console.error('Error loading exercise:', error);
        }
      });
  }

 // Fixed initialization method with better null checking
private initializeAnswers(): void {
  if (!this.exercise) return;
  
  if (this.exercise.type === 'fill_blanks' && this.exercise.fillBlankQuestions) {
    this.fillBlankAnswers = this.exercise.fillBlankQuestions.map((question, index) => ({
      questionIndex: index,
      blanks: []
    }));
    
    // Initialize blank arrays with proper null checking
    this.exercise.fillBlankQuestions.forEach((question, qIndex) => {
      if (question && question.blanks && Array.isArray(question.blanks)) {
        this.fillBlankAnswers[qIndex].blanks = new Array(question.blanks.length).fill('');
      } else {
        // Fallback: count blanks from sentence
        const blankCount = (question?.sentence || '').split('___').length - 1;
        this.fillBlankAnswers[qIndex].blanks = new Array(Math.max(0, blankCount)).fill('');
      }
    });
  }
}
  private startTimer(): void {
    this.timerSubscription = interval(1000)
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        this.elapsedTime = Math.floor((Date.now() - this.startTime) / 1000);
      });
  }

  // QCM Methods
  // Update these methods to handle undefined option._id
  selectOption(questionIndex: number, optionId: string | undefined): void {
    if (!optionId) return;
    this.qcmAnswers[questionIndex] = optionId;
  }

  isOptionSelected(questionIndex: number, optionId: string | undefined): boolean {
    if (!optionId) return false;
    return this.qcmAnswers[questionIndex] === optionId;
  }

  // Fixed getSentenceParts method - prevents infinite loops
getSentenceParts(question: any): SentencePart[] {
  const parts: SentencePart[] = [];
  if (!question?.sentence) return parts;
  
  const sentence = question.sentence;
  const blankRegex = /___/g;
  let lastIndex = 0;
  let blankIndex = 0;
  
  // Use split approach instead of regex.exec to avoid infinite loops
  const segments = sentence.split('___');
  
  for (let i = 0; i < segments.length; i++) {
    // Add text segment
    if (segments[i]) {
      parts.push({
        text: segments[i],
        isBlank: false
      });
    }
    
    // Add blank input (except for the last segment)
    if (i < segments.length - 1) {
      parts.push({
        text: '',
        isBlank: true,
        blankIndex: blankIndex++
      });
    }
  }
  
  return parts;
}



// Fixed getInputWidth method
getInputWidth(blank: any): number {
  if (!blank || typeof blank !== 'object') return 8;
  const answer = blank.correctAnswer || '';
  return Math.max(answer.length + 2, 8);
}

// Fixed onBlankChange method
onBlankChange(questionIndex: number, blankIndex: number | undefined): void {
  if (blankIndex === undefined || !this.fillBlankAnswers[questionIndex]) return;
  
  // Ensure the blanks array exists and has the right length
  if (!this.fillBlankAnswers[questionIndex].blanks) {
    this.fillBlankAnswers[questionIndex].blanks = [];
  }
  
  // Auto-resize array if necessary
  while (this.fillBlankAnswers[questionIndex].blanks.length <= blankIndex) {
    this.fillBlankAnswers[questionIndex].blanks.push('');
  }
  

}

  // Navigation
  previousQuestion(): void {
    if (this.currentQuestionIndex > 0) {
      this.currentQuestionIndex--;
    }
  }

  nextQuestion(): void {
    if (this.currentQuestionIndex < this.getTotalQuestions() - 1) {
      this.currentQuestionIndex++;
    }
  }

  goToQuestion(index: number): void {
    this.currentQuestionIndex = index;
  }

  // Helper Methods
  getTotalQuestions(): number {
    if (!this.exercise) return 0;
    
    if (this.exercise.type === 'qcm') {
      return this.exercise.qcmQuestions?.length || 0;
    } else {
      return this.exercise.fillBlankQuestions?.length || 0;
    }
  }

  getQuestions(): any[] {
    if (!this.exercise) return [];
    
    if (this.exercise.type === 'qcm') {
      return this.exercise.qcmQuestions || [];
    } else {
      return this.exercise.fillBlankQuestions || [];
    }
  }

  isQuestionAnswered(index: number): boolean {
    if (!this.exercise) return false;
    
    if (this.exercise.type === 'qcm') {
      return !!this.qcmAnswers[index];
    } else {
      const answer = this.fillBlankAnswers[index];
      return answer && answer.blanks.some(blank => blank.trim() !== '');
    }
  }

  getTotalAnswered(): number {
    let count = 0;
    for (let i = 0; i < this.getTotalQuestions(); i++) {
      if (this.isQuestionAnswered(i)) {
        count++;
      }
    }
    return count;
  }

  getProgressPercentage(): number {
    const total = this.getTotalQuestions();
    if (total === 0) return 0;
    return (this.getTotalAnswered() / total) * 100;
  }

  canSubmit(): boolean {
    return this.getTotalAnswered() > 0 && !this.submitting;
  }

  // Submit Exercise
  submitExercise(): void {
    if (!this.exercise || this.submitting) return;
    
    this.submitting = true;
    let submission: ExerciseSubmission;
    
    if (this.exercise.type === 'qcm') {
      // Convert QCM answers to array format
      const answers: string[] = [];
      for (let i = 0; i < this.getTotalQuestions(); i++) {
        answers.push(this.qcmAnswers[i] || '');
      }
      submission = { answers };
    } else {
      // Format fill blanks answers
      submission = { 
        answers: this.fillBlankAnswers.map(answer => ({
          blanks: answer.blanks
        }))
      };
    }
    
    this.exerciseService.submitExercise(this.exerciseId, submission)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.results = response.progress;
          this.showResults = true;
          this.submitting = false;
        },
        error: (error) => {
          this.error = 'Erreur lors de la soumission de l\'exercice';
          this.submitting = false;
          console.error('Error submitting exercise:', error);
        }
      });
  }

  // Results Methods
  closeResults(event: Event): void {
    if (event.target === event.currentTarget) {
      this.showResults = false;
    }
  }

  viewDetailedResults(): void {
    this.router.navigate(['student/exercises' , this.exercise?.subject._id]);
  }

  finishExercise(): void {
    this.router.navigate(['student/exercises' , this.exercise?.subject._id]);
  }

  // Utility Methods
  formatTime(seconds: number): string {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  }

  getSubjectName(): string {
    if (!this.exercise) return '';
    if (typeof this.exercise.subject === 'object' && this.exercise.subject.name) {
      return this.exercise.subject.name;
    }
    return '';
  }

  getDifficultyLabel(difficulty: string): string {
    const labels: { [key: string]: string } = {
      'easy': 'Facile',
      'medium': 'Moyen',
      'hard': 'Difficile'
    };
    return labels[difficulty] || difficulty;
  }

  goBack(): void {
    if (confirm('Êtes-vous sûr de vouloir quitter l\'exercice? Vos réponses ne seront pas sauvegardées.')) {
      this.router.navigate(['/student/exercises', this.exercise?.subject?._id]);
    }
  }


    // Add these trackBy functions to your component
  trackByFn(index: number, item: any): any {
    return index; // or item.id if available
  }

  trackByPartFn(index: number, item: SentencePart): any {
    return index;
  }

  // Add debugging method to understand the data structure
  debugExerciseData(): void {

    
    if (this.exercise?.fillBlankQuestions) {
      this.exercise.fillBlankQuestions.forEach((question, index) => {

      });
    }
  }
}
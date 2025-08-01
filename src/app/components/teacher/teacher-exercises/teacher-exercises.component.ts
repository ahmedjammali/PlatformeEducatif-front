// teacher-exercises.component.ts
import { Component, Input, Output, EventEmitter, OnInit, OnChanges, SimpleChanges } from '@angular/core';
import { Router } from '@angular/router';
import { ExerciseService } from '../../../services/exercise.service';
import { Exercise } from '../../../models/exrecice.model';
import { Subject } from '../../../models/subject.model';
import { Class } from '../../../models/class.model';
import { User } from 'src/app/models/user.model';

@Component({
  selector: 'app-teacher-exercises',
  templateUrl: './teacher-exercises.component.html',
  styleUrls: ['./teacher-exercises.component.css']
})
export class TeacherExercisesComponent implements OnInit, OnChanges {
  @Input() exercises: Exercise[] = [];
  @Input() subjects: Subject[] = [];
  @Input() classes: Class[] = [];
  @Output() exerciseCreated = new EventEmitter<Exercise>();
  @Output() exerciseUpdated = new EventEmitter<Exercise>();
  @Output() exerciseDeleted = new EventEmitter<string>();
  @Output() refreshExercises = new EventEmitter<void>();
  
  filteredExercises: Exercise[] = [];
  selectedSubjectId: string = '';
  selectedExerciseType: string = '';
  selectedClassId: string = '';
  showCreateExerciseModal = false;
  showEditExerciseModal = false;
  showViewModal = false;
  showDeleteModal = false;
  selectedExercise: Exercise | null = null;
  viewExerciseDetails: Exercise | null = null;
  exerciseToDelete: Exercise | null = null;
  isLoadingDetails = false;

  constructor(
    private router: Router,
    private exerciseService: ExerciseService
  ) {}

  ngOnInit(): void {
    console.log('TeacherExercisesComponent initialized with exercises:', this.exercises);
    this.filteredExercises = [...this.exercises];
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['exercises']) {
      this.filterExercises();
    }
  }

  filterExercises(): void {
    this.filteredExercises = this.exercises.filter(exercise => {
      let matches = true;
      
      if (this.selectedSubjectId) {
        const exerciseSubjectId = typeof exercise.subject === 'string' ? 
          exercise.subject : exercise.subject._id;
        matches = matches && exerciseSubjectId === this.selectedSubjectId;
      }
      
      if (this.selectedExerciseType) {
        matches = matches && exercise.type === this.selectedExerciseType;
      }
      
      if (this.selectedClassId) {
        const exerciseClassId = typeof exercise.class === 'string' ? 
          exercise.class : exercise.class._id;
        matches = matches && exerciseClassId === this.selectedClassId;
      }
      
      return matches;
    });
  }

  getSubjectName(subjectId: string | Subject): string {
    if (typeof subjectId === 'string') {
      const subject = this.subjects.find(s => s._id === subjectId);
      return subject?.name || 'Unknown Subject';
    }
    return subjectId.name;
  }

  getClassName(classId: string | Class): string {
    if (typeof classId === 'string') {
      const classItem = this.classes.find(c => c._id === classId);
      return classItem?.name || 'Unknown Class';
    }
    return classId.name;
  }

  getCreatedByName(createdBy: string | User | undefined): string {
    if (!createdBy) return 'Unknown';
    if (typeof createdBy === 'string') return 'Unknown';
    return createdBy.name || 'Unknown';
  }

  getOptionLetter(index: number): string {
    return String.fromCharCode(65 + index); // A, B, C, D, etc.
  }

  resetFilters(): void {
    this.selectedSubjectId = '';
    this.selectedExerciseType = '';
    this.selectedClassId = '';
    this.filterExercises();
  }

  openCreateExerciseModal(): void {
    this.showCreateExerciseModal = true;
  }

  closeCreateExerciseModal(): void {
    this.showCreateExerciseModal = false;
  }

  onExerciseCreated(exercise: Exercise): void {
    // Add the new exercise to the local exercises array immediately
    this.exercises = [...this.exercises, exercise];
    
    // Re-filter to show the new exercise
    this.filterExercises();
    
    // Emit to parent component to update its list as well
    this.exerciseCreated.emit(exercise);
    
    // Close the modal
    this.closeCreateExerciseModal();
    
    // Optional: Also trigger a refresh from parent to ensure data consistency
    this.refreshExercises.emit();
  }

  viewExercise(exercise: Exercise): void {
    this.isLoadingDetails = true;
    this.showViewModal = true;
    
    // Fetch full exercise details including questions
    this.exerciseService.getExerciseById(exercise._id!).subscribe({
      next: (response) => {
        this.viewExerciseDetails = response.exercise;
        this.isLoadingDetails = false;
      },
      error: (error) => {
        console.error('Error fetching exercise details:', error);
        this.isLoadingDetails = false;
        alert('Failed to load exercise details. Please try again.');
        this.closeViewModal();
      }
    });
  }

  closeViewModal(): void {
    this.showViewModal = false;
    this.viewExerciseDetails = null;
  }

  editExercise(exercise: Exercise): void {
    // First fetch the full exercise details
    this.exerciseService.getExerciseById(exercise._id!).subscribe({
      next: (response) => {
        this.selectedExercise = response.exercise;
        this.showEditExerciseModal = true;
      },
      error: (error) => {
        console.error('Error fetching exercise for edit:', error);
        alert('Failed to load exercise for editing. Please try again.');
      }
    });
  }

  closeEditExerciseModal(): void {
    this.showEditExerciseModal = false;
    this.selectedExercise = null;
  }

  onExerciseUpdated(exercise: Exercise): void {
    // Update the exercise in the local list immediately
    const index = this.exercises.findIndex(e => e._id === exercise._id);
    if (index !== -1) {
      this.exercises[index] = exercise;
      // Create a new array reference to trigger change detection
      this.exercises = [...this.exercises];
      this.filterExercises();
    }
    
    // Emit to parent component
    this.exerciseUpdated.emit(exercise);
    
    // Close the modal
    this.closeEditExerciseModal();
  }

  deleteExercise(exercise: Exercise): void {
    if (confirm(`Are you sure you want to delete "${exercise.title}"?`)) {
      this.exerciseService.deleteExercise(exercise._id!).subscribe({
        next: () => {
          this.exerciseDeleted.emit(exercise._id!);
        },
        error: (error) => {
          console.error('Error deleting exercise:', error);
          alert('Failed to delete exercise. Please try again.');
        }
      });
    }
  }

  openDeleteConfirmation(exercise: Exercise): void {
    this.exerciseToDelete = exercise;
    this.showDeleteModal = true;
  }

  closeDeleteModal(): void {
    this.showDeleteModal = false;
    this.exerciseToDelete = null;
  }

  confirmDelete(): void {
    if (this.exerciseToDelete) {
      this.exerciseService.deleteExercise(this.exerciseToDelete._id!).subscribe({
        next: () => {
          // Remove from local arrays immediately
          this.exercises = this.exercises.filter(e => e._id !== this.exerciseToDelete!._id);
          this.filterExercises();
          
          // Emit to parent component
          this.exerciseDeleted.emit(this.exerciseToDelete!._id!);
          
          // Close the modal
          this.closeDeleteModal();
        },
        error: (error) => {
          console.error('Error deleting exercise:', error);
          alert('Failed to delete exercise. Please try again.');
          this.closeDeleteModal();
        }
      });
    }
  }
}
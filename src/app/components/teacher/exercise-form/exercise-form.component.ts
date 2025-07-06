// exercise-form.component.ts
import { Component, Input, Output, EventEmitter, OnInit, OnChanges, SimpleChanges } from '@angular/core';
import { FormBuilder, FormGroup, FormArray, Validators, AbstractControl } from '@angular/forms';
import { ExerciseService } from '../../../services/exercise.service';
import { Subject } from '../../../models/subject.model';
import { Class } from '../../../models/class.model';
import { Exercise } from '../../../models/exrecice.model';
import { AuthService } from '../../../services/auth.service';
import { User } from '../../../models/user.model';

interface ExtendedUser extends User {
  id?: string;  // Handle API response that might have 'id' instead of '_id'
}

@Component({
  selector: 'app-exercise-form',
  templateUrl: './exercise-form.component.html',
  styleUrls: ['./exercise-form.component.css']
})
export class ExerciseFormComponent implements OnInit, OnChanges {
  @Input() subjects: Subject[] = [];
  @Input() classes: Class[] = [];
  @Input() exerciseToEdit: Exercise | null = null;
  @Input() isEditMode: boolean = false;
  @Output() exerciseCreated = new EventEmitter<Exercise>();
  @Output() cancelled = new EventEmitter<void>();

  exerciseForm!: FormGroup;
  filteredClasses: Class[] = [];
  isSubmitting = false;
  currentUser: ExtendedUser | null = null;

  constructor(
    private fb: FormBuilder,
    private exerciseService: ExerciseService,
    private authService: AuthService
  ) {
    this.currentUser = this.authService.getCurrentUser() as ExtendedUser | null;
    console.log('Current User:', this.currentUser);
  }

  ngOnInit(): void {
    this.initializeForm();
    if (this.isEditMode && this.exerciseToEdit) {
      this.populateFormForEdit();
    }
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['exerciseToEdit'] && this.exerciseToEdit && this.exerciseForm) {
      this.populateFormForEdit();
    }
  }

  private initializeForm(): void {
    this.exerciseForm = this.fb.group({
      title: ['', Validators.required],
      type: ['', Validators.required],
      subject: ['', Validators.required],
      class: ['', Validators.required],
      difficulty: ['medium', Validators.required],
      instructions: [''],
      estimatedTime: [30],
      maxAttempts: [2],
      dueDate: [''],
      qcmQuestions: this.fb.array([]),
      fillBlankQuestions: this.fb.array([])
    });

    // Listen to type changes to clear questions only in create mode
    if (!this.isEditMode) {
      this.exerciseForm.get('type')?.valueChanges.subscribe(type => {
        this.onTypeChange();
      });
    }
  }

  private populateFormForEdit(): void {
    if (!this.exerciseToEdit) return;

    // Get IDs for subject and class
    const subjectId = typeof this.exerciseToEdit.subject === 'string' 
      ? this.exerciseToEdit.subject 
      : this.exerciseToEdit.subject._id;
    
    const classId = typeof this.exerciseToEdit.class === 'string' 
      ? this.exerciseToEdit.class 
      : this.exerciseToEdit.class._id;

    // Basic form values
    this.exerciseForm.patchValue({
      title: this.exerciseToEdit.title,
      type: this.exerciseToEdit.type,
      subject: subjectId,
      class: classId,
      difficulty: this.exerciseToEdit.difficulty || 'medium',
      instructions: this.exerciseToEdit.metadata?.instructions || '',
      estimatedTime: this.exerciseToEdit.metadata?.estimatedTime || 30,
      maxAttempts: this.exerciseToEdit.metadata?.maxAttempts || 2,
      dueDate: this.exerciseToEdit.dueDate ? new Date(this.exerciseToEdit.dueDate).toISOString().slice(0, 16) : ''
    });

    // Disable type change in edit mode
    this.exerciseForm.get('type')?.disable();

    // Trigger subject change to populate filtered classes
    this.onSubjectChange();

    // Clear existing questions
    while (this.qcmQuestions.length !== 0) {
      this.qcmQuestions.removeAt(0);
    }
    while (this.fillBlankQuestions.length !== 0) {
      this.fillBlankQuestions.removeAt(0);
    }

    // Populate questions based on type
    if (this.exerciseToEdit.type === 'qcm' && this.exerciseToEdit.qcmQuestions) {
      this.exerciseToEdit.qcmQuestions.forEach(question => {
        const questionGroup = this.fb.group({
          questionText: [question.questionText, Validators.required],
          options: this.fb.array([]),
          points: [question.points, [Validators.required, Validators.min(1)]]
        });

        const optionsArray = questionGroup.get('options') as FormArray;
        question.options.forEach(option => {
          optionsArray.push(this.fb.group({
            text: [option.text, Validators.required],
            isCorrect: [option.isCorrect]
          }));
        });

        this.qcmQuestions.push(questionGroup);
      });
    } else if (this.exerciseToEdit.type === 'fill_blanks' && this.exerciseToEdit.fillBlankQuestions) {
      this.exerciseToEdit.fillBlankQuestions.forEach(question => {
        const questionGroup = this.fb.group({
          sentence: [question.sentence, Validators.required],
          blanks: this.fb.array([]),
          points: [question.points, [Validators.required, Validators.min(1)]]
        });

        const blanksArray = questionGroup.get('blanks') as FormArray;
        question.blanks.forEach((blank, index) => {
          blanksArray.push(this.fb.group({
            position: [index],
            correctAnswer: [blank.correctAnswer, Validators.required]
          }));
        });

        this.fillBlankQuestions.push(questionGroup);
      });
    }
  }

  get qcmQuestions(): FormArray {
    return this.exerciseForm.get('qcmQuestions') as FormArray;
  }

  get fillBlankQuestions(): FormArray {
    return this.exerciseForm.get('fillBlankQuestions') as FormArray;
  }

  onTypeChange(): void {
    // Clear both question arrays when type changes
    while (this.qcmQuestions.length !== 0) {
      this.qcmQuestions.removeAt(0);
    }
    while (this.fillBlankQuestions.length !== 0) {
      this.fillBlankQuestions.removeAt(0);
    }
  }

  onSubjectChange(): void {
    const selectedSubjectId = this.exerciseForm.get('subject')?.value;
    
    // Filter classes where the current teacher teaches the selected subject
    this.filteredClasses = this.classes.filter(classItem => {
      const teacherSubject = classItem.teacherSubjects.find(ts => {
        console.log('Teacher Subject:', ts);
        const teacherId = typeof ts.teacher === 'string' ? ts.teacher : ts.teacher._id;
        const currentUserId = this.currentUser?._id || this.currentUser?.id;
        return teacherId === currentUserId;
      });
      
      if (teacherSubject?.subjects) {
        return teacherSubject.subjects.some(subject => {
          const subjectId = typeof subject === 'string' ? subject : subject._id;
          return subjectId === selectedSubjectId;
        });
      }
      return false;
    });

    // Reset class selection if current selection is not valid
    const currentClassId = this.exerciseForm.get('class')?.value;
    if (currentClassId && !this.filteredClasses.find(c => c._id === currentClassId)) {
      this.exerciseForm.patchValue({ class: '' });
    }
  }

  // QCM Question Methods
  addQuestion(): void {
    const type = this.exerciseForm.get('type')?.value;
    
    if (type === 'qcm') {
      const questionGroup = this.fb.group({
        questionText: ['', Validators.required],
        options: this.fb.array([
          this.createOption(),
          this.createOption()
        ]),
        points: [1, [Validators.required, Validators.min(1)]]
      });
      this.qcmQuestions.push(questionGroup);
    } else if (type === 'fill_blanks') {
      const questionGroup = this.fb.group({
        sentence: ['', Validators.required],
        blanks: this.fb.array([
          this.createBlank()
        ]),
        points: [1, [Validators.required, Validators.min(1)]]
      });
      this.fillBlankQuestions.push(questionGroup);
    }
  }

  removeQuestion(index: number): void {
    const type = this.exerciseForm.get('type')?.value;
    
    if (type === 'qcm') {
      this.qcmQuestions.removeAt(index);
    } else if (type === 'fill_blanks') {
      this.fillBlankQuestions.removeAt(index);
    }
  }

  createOption(): FormGroup {
    return this.fb.group({
      text: ['', Validators.required],
      isCorrect: [false]
    });
  }

  getOptions(questionIndex: number): FormArray {
    return this.qcmQuestions.at(questionIndex).get('options') as FormArray;
  }

  addOption(questionIndex: number): void {
    const options = this.getOptions(questionIndex);
    if (options.length < 6) {
      options.push(this.createOption());
    }
  }

  removeOption(questionIndex: number, optionIndex: number): void {
    const options = this.getOptions(questionIndex);
    if (options.length > 2) {
      options.removeAt(optionIndex);
    }
  }

  onCorrectOptionChange(questionIndex: number, selectedOptionIndex: number): void {
    const options = this.getOptions(questionIndex);
    const selectedOption = options.at(selectedOptionIndex);
    
    // If this option is being marked as correct, ensure at least one option is correct
    if (selectedOption.get('isCorrect')?.value) {
      // This is fine, at least one option will be correct
    } else {
      // If unchecking, make sure at least one other option is correct
      const hasOtherCorrect = options.controls.some((option, index) => 
        index !== selectedOptionIndex && option.get('isCorrect')?.value
      );
      
      if (!hasOtherCorrect) {
        // Don't allow unchecking if it's the only correct option
        selectedOption.patchValue({ isCorrect: true });
        alert('At least one option must be marked as correct');
      }
    }
  }

  // Fill Blanks Methods
  createBlank(): FormGroup {
    return this.fb.group({
      position: [0],
      correctAnswer: ['', Validators.required]
    });
  }

  getBlanks(questionIndex: number): FormArray {
    return this.fillBlankQuestions.at(questionIndex).get('blanks') as FormArray;
  }

  addBlank(questionIndex: number): void {
    const blanks = this.getBlanks(questionIndex);
    const newBlank = this.createBlank();
    newBlank.patchValue({ position: blanks.length });
    blanks.push(newBlank);
  }

  removeBlank(questionIndex: number, blankIndex: number): void {
    const blanks = this.getBlanks(questionIndex);
    if (blanks.length > 1) {
      blanks.removeAt(blankIndex);
      // Update positions
      blanks.controls.forEach((blank, index) => {
        blank.patchValue({ position: index });
      });
    }
  }

  onSubmit(): void {
    if (this.exerciseForm.valid && !this.isSubmitting) {
      this.isSubmitting = true;
      
      // Get form values including disabled fields
      const formValue = this.exerciseForm.getRawValue();
      
      // Calculate total points
      let totalPoints = 0;
      if (formValue.type === 'qcm') {
        totalPoints = formValue.qcmQuestions.reduce((sum: number, q: any) => sum + (q.points || 0), 0);
      } else if (formValue.type === 'fill_blanks') {
        totalPoints = formValue.fillBlankQuestions.reduce((sum: number, q: any) => sum + (q.points || 0), 0);
      }
      
      // Prepare exercise data
      const exerciseData: any = {
        title: formValue.title,
        type: formValue.type,
        subject: formValue.subject,
        classId: formValue.class,  // API expects classId
        difficulty: formValue.difficulty,
        isActive: true,
        metadata: {
          instructions: formValue.instructions,
          estimatedTime: formValue.estimatedTime,
          maxAttempts: formValue.maxAttempts,
          showAnswersAfterCompletion: true,
          shuffleQuestions: false,
          shuffleOptions: false
        }
      };

      // Add due date if provided
      if (formValue.dueDate) {
        exerciseData.dueDate = new Date(formValue.dueDate);
      }

      // Add questions based on type
      if (formValue.type === 'qcm') {
        exerciseData.qcmQuestions = formValue.qcmQuestions;
      } else if (formValue.type === 'fill_blanks') {
        exerciseData.fillBlankQuestions = formValue.fillBlankQuestions;
      }

      // Call appropriate service method
      const serviceCall = this.isEditMode && this.exerciseToEdit?._id
        ? this.exerciseService.updateExercise(this.exerciseToEdit._id, exerciseData)
        : this.exerciseService.createExercise(exerciseData);

      serviceCall.subscribe({
        next: (exercise) => {
          this.isSubmitting = false;
          this.exerciseCreated.emit(exercise);
          this.resetForm();
        },
        error: (error) => {
          this.isSubmitting = false;
          console.error(`Error ${this.isEditMode ? 'updating' : 'creating'} exercise:`, error);
          alert(`Failed to ${this.isEditMode ? 'update' : 'create'} exercise. Please try again.`);
        }
      });
    } else {
      // Mark all fields as touched to show validation errors
      this.markFormGroupTouched(this.exerciseForm);
    }
  }

  private markFormGroupTouched(formGroup: FormGroup | FormArray): void {
    Object.keys(formGroup.controls).forEach(key => {
      const control = formGroup.get(key);
      control?.markAsTouched();

      if (control instanceof FormGroup || control instanceof FormArray) {
        this.markFormGroupTouched(control);
      }
    });
  }

  onCancel(): void {
    this.cancelled.emit();
    this.resetForm();
  }

  private resetForm(): void {
    this.exerciseForm.reset({
      difficulty: 'medium',
      estimatedTime: 30,
      maxAttempts: 2
    });
    
    // Clear form arrays
    while (this.qcmQuestions.length !== 0) {
      this.qcmQuestions.removeAt(0);
    }
    while (this.fillBlankQuestions.length !== 0) {
      this.fillBlankQuestions.removeAt(0);
    }

    // Re-enable type field if it was disabled
    this.exerciseForm.get('type')?.enable();
  }
}
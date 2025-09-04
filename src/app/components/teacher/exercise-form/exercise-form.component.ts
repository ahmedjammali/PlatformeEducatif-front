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
      estimatedTime: [30, [Validators.required, Validators.min(1)]], // Required and must be positive
      maxAttempts: [2, [Validators.required, Validators.min(1)]], // Required and must be positive
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

  // Custom validator to check if exercise has at least one question
  hasQuestionsValidator(): boolean {
    const type = this.exerciseForm?.get('type')?.value;
    if (!type) return false;

    if (type === 'qcm') {
      return this.qcmQuestions.length > 0;
    } else if (type === 'fill_blanks') {
      return this.fillBlankQuestions.length > 0;
    }
    return false;
  }

  // Check if form is valid including question validation
  get isFormValid(): boolean {
    return this.exerciseForm.valid && this.hasQuestionsValidator();
  }

  // Get question validation error message
  get questionValidationError(): string | null {
    const type = this.exerciseForm?.get('type')?.value;
    if (!type) return null;

    if (!this.hasQuestionsValidator()) {
      return 'Au moins une question est requise pour créer un exercice';
    }
    return null;
  }

  // Get form completion percentage for progress tracking
  get formCompletionPercentage(): number {
    let completed = 0;
    let total = 3;

    // Check basic information
    if (this.exerciseForm.get('title')?.valid && 
        this.exerciseForm.get('type')?.valid && 
        this.exerciseForm.get('subject')?.valid && 
        this.exerciseForm.get('class')?.valid) {
      completed++;
    }

    // Check parameters
    if (this.exerciseForm.get('estimatedTime')?.valid && 
        this.exerciseForm.get('maxAttempts')?.valid) {
      completed++;
    }

    // Check questions
    if (this.hasQuestionsValidator()) {
      completed++;
    }

    return Math.round((completed / total) * 100);
  }

  // Get detailed validation status for each section
  get validationStatus() {
    return {
      basicInfo: {
        valid: this.exerciseForm.get('title')?.valid && 
               this.exerciseForm.get('type')?.valid && 
               this.exerciseForm.get('subject')?.valid && 
               this.exerciseForm.get('class')?.valid,
        touched: this.exerciseForm.get('title')?.touched || 
                 this.exerciseForm.get('type')?.touched || 
                 this.exerciseForm.get('subject')?.touched || 
                 this.exerciseForm.get('class')?.touched
      },
      parameters: {
        valid: this.exerciseForm.get('estimatedTime')?.valid && 
               this.exerciseForm.get('maxAttempts')?.valid,
        touched: this.exerciseForm.get('estimatedTime')?.touched || 
                 this.exerciseForm.get('maxAttempts')?.touched
      },
      questions: {
        valid: this.hasQuestionsValidator(),
        touched: this.qcmQuestions.length > 0 || this.fillBlankQuestions.length > 0
      }
    };
  }

  // Enhanced question validation with detailed feedback
  get detailedQuestionValidation() {
    const type = this.exerciseForm?.get('type')?.value;
    if (!type) return { valid: false, message: 'Veuillez d\'abord sélectionner un type d\'exercice' };

    if (type === 'qcm') {
      if (this.qcmQuestions.length === 0) {
        return { valid: false, message: 'Veuillez ajouter au moins une question QCM' };
      }
      
      // Check if all QCM questions are valid
      for (let i = 0; i < this.qcmQuestions.length; i++) {
        const question = this.qcmQuestions.at(i);
        if (!question.get('questionText')?.value?.trim()) {
          return { valid: false, message: `Question ${i + 1}: Le texte de la question est requis` };
        }
        if (!question.get('points')?.value || question.get('points')?.value <= 0) {
          return { valid: false, message: `Question ${i + 1}: Les points doivent être supérieurs à 0` };
        }
        
        const options = question.get('options') as FormArray;
        if (options.length < 2) {
          return { valid: false, message: `Question ${i + 1}: Au moins 2 options sont requises` };
        }
        
        let hasCorrectOption = false;
        let hasValidOption = false;
        for (let j = 0; j < options.length; j++) {
          const option = options.at(j);
          if (option.get('text')?.value?.trim()) {
            hasValidOption = true;
          }
          if (option.get('isCorrect')?.value) {
            hasCorrectOption = true;
          }
        }
        
        if (!hasValidOption) {
          return { valid: false, message: `Question ${i + 1}: Au moins une option doit avoir du texte` };
        }
        if (!hasCorrectOption) {
          return { valid: false, message: `Question ${i + 1}: Au moins une option doit être marquée comme correcte` };
        }
      }
    } else if (type === 'fill_blanks') {
      if (this.fillBlankQuestions.length === 0) {
        return { valid: false, message: 'Veuillez ajouter au moins une question à trous' };
      }
      
      // Check if all fill-blank questions are valid
      for (let i = 0; i < this.fillBlankQuestions.length; i++) {
        const question = this.fillBlankQuestions.at(i);
        if (!question.get('sentence')?.value?.trim()) {
          return { valid: false, message: `Question ${i + 1}: La phrase avec des trous est requise` };
        }
        if (!question.get('points')?.value || question.get('points')?.value <= 0) {
          return { valid: false, message: `Question ${i + 1}: Les points doivent être supérieurs à 0` };
        }
        
        const sentence = question.get('sentence')?.value;
        const blanksCount = (sentence.match(/___/g) || []).length;
        const blanks = question.get('blanks') as FormArray;
        
        if (blanksCount === 0) {
          return { valid: false, message: `Question ${i + 1}: Utilisez ___ pour indiquer les trous dans la phrase` };
        }
        if (blanks.length !== blanksCount) {
          return { valid: false, message: `Question ${i + 1}: Le nombre de réponses (${blanks.length}) ne correspond pas au nombre de trous (${blanksCount})` };
        }
        
        for (let j = 0; j < blanks.length; j++) {
          const blank = blanks.at(j);
          if (!blank.get('correctAnswer')?.value?.trim()) {
            return { valid: false, message: `Question ${i + 1}, Trou ${j + 1}: La réponse correcte est requise` };
          }
        }
      }
    }
    
    return { valid: true, message: 'Toutes les questions sont valides' };
  }

  // Method to focus on first invalid field
  focusFirstInvalidField(): void {
    const firstInvalidControl = this.findFirstInvalidControl(this.exerciseForm);
    if (firstInvalidControl) {
      firstInvalidControl.focus();
    }
  }

  private findFirstInvalidControl(formGroup: FormGroup | FormArray): HTMLElement | null {
    if (formGroup instanceof FormGroup) {
      const controls = formGroup.controls;
      
      for (const name of Object.keys(controls)) {
        const control = controls[name];
        
        if (control.invalid && control.touched) {
          const element = document.querySelector(`[formControlName="${name}"]`) as HTMLElement;
          if (element) {
            return element;
          }
        }
        
        if (control instanceof FormGroup || control instanceof FormArray) {
          const result = this.findFirstInvalidControl(control);
          if (result) return result;
        }
      }
    } else if (formGroup instanceof FormArray) {
      const controls = formGroup.controls;
      
      for (let i = 0; i < controls.length; i++) {
        const control = controls[i];
        
        if (control instanceof FormGroup || control instanceof FormArray) {
          const result = this.findFirstInvalidControl(control);
          if (result) return result;
        }
      }
    }
    
    return null;
  }

  // Method to validate and count total points
  get totalPoints(): number {
    let total = 0;
    const type = this.exerciseForm?.get('type')?.value;
    
    if (type === 'qcm') {
      this.qcmQuestions.controls.forEach(question => {
        const points = question.get('points')?.value || 0;
        total += points;
      });
    } else if (type === 'fill_blanks') {
      this.fillBlankQuestions.controls.forEach(question => {
        const points = question.get('points')?.value || 0;
        total += points;
      });
    }
    
    return total;
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
        alert('Au moins une option doit être marquée comme correcte');
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
    // Check if form is valid including questions
    if (!this.isFormValid || this.isSubmitting) {
      // Mark all fields as touched to show validation errors
      this.markFormGroupTouched(this.exerciseForm);
      this.focusFirstInvalidField();
      
      // Show question validation error if needed
      if (!this.hasQuestionsValidator()) {
        alert('Vous devez ajouter au moins une question pour créer un exercice');
      } else {
        const questionValidation = this.detailedQuestionValidation;
        if (!questionValidation.valid) {
          alert(questionValidation.message);
        } else {
          alert('Veuillez corriger les erreurs dans le formulaire avant de continuer');
        }
      }
      return;
    }

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
        shuffleOptions: false,
        totalPoints: totalPoints
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
        alert(`Échec de ${this.isEditMode ? 'modification' : 'création'} de l'exercice. Veuillez réessayer.`);
      }
    });
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
}
// teacher-grades.component.ts - FIXED VERSION
import { Component, Input, OnInit, OnDestroy } from '@angular/core';
import { Subject as RxSubject, takeUntil, forkJoin } from 'rxjs';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { GradeService } from '../../../services/grade.service';
import { AuthService } from '../../../services/auth.service';
import { ClassService } from '../../../services/class.service';
import { Grade, CreateGradeRequest } from '../../../models/grader.model';
import { Class } from '../../../models/class.model';
import { Subject } from '../../../models/subject.model';
import { User } from '../../../models/user.model';

interface GradeFilters {
  selectedClass: string;
  selectedSubject: string;
  selectedTrimester: string;
  selectedExamType: string;
  academicYear: string;
}

interface StudentGradeSummary {
  student: User;
  grades: Grade[];
  average: number;
  totalGrades: number;
}

interface StudentBulkGrade {
  student: User;
  grade: number | null;
  comment: string;
  touched: boolean;
}

interface BulkGradeForm {
  examName: string;
  examType: string;
  coefficient: number;
  examDate: Date;
  trimester: string;
  studentGrades: StudentBulkGrade[];
}

interface ConfirmationConfig {
  title: string;
  message: string;
  confirmText: string;
  cancelText: string;
  confirmAction: () => void;
  type: 'warning' | 'danger' | 'info';
}

@Component({
  selector: 'app-teacher-grades',
  templateUrl: './teacher-grades.component.html',
  styleUrls: ['./teacher-grades.component.css']
})
export class TeacherGradesComponent implements OnInit, OnDestroy {
  @Input() classes: Class[] = [];
  @Input() teachingSubjects: Subject[] = [];

  private destroy$ = new RxSubject<void>();
  
  // Data
  allGrades: Grade[] = [];
  filteredGrades: Grade[] = [];
  studentGradeSummaries: StudentGradeSummary[] = [];
  classStudents: User[] = [];
  classStudentsMap: Map<string, User[]> = new Map();
  availableSubjects: Subject[] = [];
  
  // UI State
  isLoading = false;
  viewMode: 'table' | 'students' = 'table';
  showCreateForm = false;
  editingGrade: Grade | null = null;
  showBulkGradeForm = false;
  isSavingBulk = false;
  
  // Delete confirmation modal state
  showDeleteConfirmation = false;
  gradeToDelete: Grade | null = null;
  isDeleting = false;

  // General confirmation modal state
  showConfirmationModal = false;
  confirmationModalConfig: ConfirmationConfig = {
    title: '',
    message: '',
    confirmText: 'Confirmer',
    cancelText: 'Annuler',
    confirmAction: () => {},
    type: 'warning'
  };

  // Form validation state
  gradeInputTouched = false;
  gradeValidationError = '';
  coefficientInputTouched = false;
  coefficientValidationError = '';
  
  // Filters
  filters: GradeFilters = {
    selectedClass: '',
    selectedSubject: '',
    selectedTrimester: '',
    selectedExamType: '',
    academicYear: new Date().getFullYear().toString()
  };
  
  // Options for dropdowns
  trimesters = ['1er Trimestre', '2ème Trimestre', '3ème Trimestre'];
  examTypes = [
    { value: 'controle', label: 'Contrôle' },
    { value: 'devoir', label: 'Devoir' },
    { value: 'examen', label: 'Examen' },
    { value: 'test', label: 'Test' },
    { value: 'oral', label: 'Oral' },
    { value: 'tp', label: 'TP' },
    { value: 'autre', label: 'Autre' }
  ];
  
  // Form data for creating/editing grades
  gradeForm: CreateGradeRequest = {
    studentId: '',
    classId: '',
    subjectId: '',
    examName: '',
    examType: 'controle',
    grade: 0,
    coefficient: 1,
    examDate: new Date(),
    trimester: '1er Trimestre',
    academicYear: new Date().getFullYear().toString(),
    comments: ''
  };
  
  // Bulk grade form data
  bulkGradeForm: BulkGradeForm = {
    examName: '',
    examType: 'controle',
    coefficient: 1,
    examDate: new Date(),
    trimester: '1er Trimestre',
    studentGrades: []
  };
  
  // Current user
  currentUser: User | null = null;

  constructor(
    private gradeService: GradeService,
    private authService: AuthService,
    private classService: ClassService,
    private dialog: MatDialog,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.currentUser = this.authService.getCurrentUser();
    this.initializeFilters();
    this.loadGrades();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private initializeFilters(): void {
    // Set default class if only one class
    if (this.classes.length === 1) {
      this.filters.selectedClass = this.classes[0]._id!;
      this.updateAvailableSubjects();
      // Load students and grades for the default class
      this.loadClassStudentsAndGrades();
    }
    
    // Set default subject if only one subject
    if (this.teachingSubjects.length === 1) {
      this.filters.selectedSubject = this.teachingSubjects[0]._id!;
    }
  }

  loadGrades(): void {
    this.allGrades = [];
    this.filteredGrades = [];
    this.studentGradeSummaries = [];

    // Don't load grades if no class or subject is selected
    if (!this.filters.selectedClass || !this.filters.selectedSubject) {
      this.applyFilters();
      return;
    }

    this.isLoading = true;
    
    const gradeFilters = {
      academicYear: this.filters.academicYear,
      subject: this.filters.selectedSubject, // Always filter by selected subject
      ...(this.filters.selectedTrimester && { trimester: this.filters.selectedTrimester }),
      ...(this.filters.selectedExamType && { examType: this.filters.selectedExamType })
    };

    this.gradeService.getGradesByClass(this.filters.selectedClass, gradeFilters)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          console.log('Grades loaded:', response);
          
          // Get current students in the selected class
          const currentStudentIds = this.classStudents.map(student => student._id);
          console.log('Current students in class:', currentStudentIds);
          
          // Only get grades for:
          // 1. The current teacher's subject
          // 2. Students who are CURRENTLY in this class
          const allGradesBefore = (response.grades || []).filter(grade => {
            const gradeSubjectId = this.getSubjectId(grade.subject);
            return gradeSubjectId === this.filters.selectedSubject;
          });
          
          this.allGrades = allGradesBefore.filter(grade => {
            const gradeStudentId = this.getStudentId(grade.student);
            const isCurrentStudent = currentStudentIds.includes(gradeStudentId);
            
            if (!isCurrentStudent) {
              console.log(`Filtering out grade for student ${gradeStudentId} - not in current class`);
            }
            
            return isCurrentStudent;
          });
          
          console.log(`Filtered grades: ${this.allGrades.length} out of ${allGradesBefore.length} total grades`);
          
          this.applyFilters();
          this.isLoading = false;
        },
        error: (error) => {
          console.error('Error loading grades:', error);
          this.showSnackBar('Erreur lors du chargement des notes', 'error');
          this.allGrades = [];
          this.applyFilters();
          this.isLoading = false;
        }
      });
  }

  applyFilters(): void {
    // Only show grades if both class and subject are selected
    if (!this.filters.selectedClass || !this.filters.selectedSubject) {
      this.filteredGrades = [];
      this.studentGradeSummaries = [];
      return;
    }

    this.filteredGrades = this.allGrades.filter(grade => {
      // Additional filtering for trimester and exam type
      return (!this.filters.selectedTrimester || grade.trimester === this.filters.selectedTrimester) &&
             (!this.filters.selectedExamType || grade.examType === this.filters.selectedExamType);
    });
    
    this.generateStudentSummaries();
  }

  private generateStudentSummaries(): void {
    const studentMap = new Map<string, StudentGradeSummary>();
    
    this.filteredGrades.forEach(grade => {
      const student = typeof grade.student === 'object' ? grade.student : this.findStudentById(grade.student as string);
      const studentId = typeof grade.student === 'string' ? grade.student : grade.student._id;
      
      if (!student || !studentId) return;
      
      if (!studentMap.has(studentId)) {
        studentMap.set(studentId, {
          student,
          grades: [],
          average: 0,
          totalGrades: 0
        });
      }
      
      studentMap.get(studentId)!.grades.push(grade);
    });
    
    // Calculate averages
    studentMap.forEach(summary => {
      if (summary.grades.length > 0) {
        const totalPoints = summary.grades.reduce((sum, grade) => sum + (grade.grade * grade.coefficient), 0);
        const totalCoefficients = summary.grades.reduce((sum, grade) => sum + grade.coefficient, 0);
        summary.average = totalCoefficients > 0 ? totalPoints / totalCoefficients : 0;
        summary.totalGrades = summary.grades.length;
      }
    });
    
    this.studentGradeSummaries = Array.from(studentMap.values()).sort((a, b) => 
      a.student.name.localeCompare(b.student.name)
    );
  }

  // Bulk Grade Methods
  openBulkGradeForm(): void {
    if (!this.filters.selectedClass || !this.filters.selectedSubject) {
      this.showSnackBar('Veuillez sélectionner une classe et une matière', 'warning');
      return;
    }

    // Load students if not already loaded
    if (this.classStudents.length === 0) {
      this.loadClassStudents(this.filters.selectedClass);
    }

    // Initialize bulk form
    this.bulkGradeForm = {
      examName: '',
      examType: 'controle',
      coefficient: 1,
      examDate: new Date(),
      trimester: this.filters.selectedTrimester || '1er Trimestre',
      studentGrades: this.classStudents.map(student => ({
        student,
        grade: null,
        comment: '',
        touched: false
      }))
    };

    this.showBulkGradeForm = true;
  }

  cancelBulkForm(): void {
    if (this.isSavingBulk) {
      return;
    }
    
    // Check if there are unsaved changes
    const hasChanges = this.bulkGradeForm.studentGrades.some(sg => sg.grade !== null || sg.comment);
    
    if (hasChanges) {
      this.showConfirmation(
        'Modifications non enregistrées',
        'Des modifications non enregistrées seront perdues. Voulez-vous continuer ?',
        () => {
          this.closeBulkForm();
        },
        'warning'
      );
    } else {
      this.closeBulkForm();
    }
  }

  private closeBulkForm(): void {
    this.showBulkGradeForm = false;
    this.bulkGradeForm = {
      examName: '',
      examType: 'controle',
      coefficient: 1,
      examDate: new Date(),
      trimester: '1er Trimestre',
      studentGrades: []
    };
  }

  fillAllWithValue(value: number): void {
    this.bulkGradeForm.studentGrades = this.bulkGradeForm.studentGrades.map(sg => ({
      ...sg,
      grade: value,
      touched: true
    }));
  }

  clearAllGrades(): void {
    this.showConfirmation(
      'Effacer toutes les notes',
      'Êtes-vous sûr de vouloir effacer toutes les notes saisies ?',
      () => {
        this.bulkGradeForm.studentGrades = this.bulkGradeForm.studentGrades.map(sg => ({
          ...sg,
          grade: null,
          comment: '',
          touched: false
        }));
      },
      'warning'
    );
  }

  onStudentGradeBlur(index: number): void {
    this.bulkGradeForm.studentGrades[index].touched = true;
  }

  // IMPROVED: Grade validation with proper error messages
  isStudentGradeValid(grade: number | null): boolean {
    return grade === null || (grade >= 0 && grade <= 20);
  }

  validateStudentGrade(grade: number | null): string {
    if (grade === null) return '';
    if (isNaN(grade)) return 'Veuillez saisir un nombre valide';
    if (grade < 0) return 'La note ne peut pas être négative';
    if (grade > 20) return 'La note ne peut pas dépasser 20';
    return '';
  }

  getCompletedGradesCount(): number {
    return this.bulkGradeForm.studentGrades.filter(sg => sg.grade !== null && sg.grade >= 0).length;
  }

  getClassAverage(): number {
    const validGrades = this.bulkGradeForm.studentGrades.filter(sg => sg.grade !== null && sg.grade >= 0);
    if (validGrades.length === 0) return 0;
    
    const sum = validGrades.reduce((acc, sg) => acc + (sg.grade || 0), 0);
    return sum / validGrades.length;
  }

  getGradeAppreciation(grade: number): string {
    if (grade >= 16) return 'Excellent';
    if (grade >= 14) return 'Bien';
    if (grade >= 10) return 'Passable';
    return 'Insuffisant';
  }

  // IMPROVED: Better bulk form validation
  isBulkFormValid(): boolean {
    // Check if exam info is filled
    if (!this.bulkGradeForm.examName || 
        !this.bulkGradeForm.examType || 
        this.bulkGradeForm.coefficient == null ||
        this.bulkGradeForm.coefficient <= 0 ||
        !this.bulkGradeForm.examDate ||
        !this.bulkGradeForm.trimester) {
      return false;
    }

    // Check if at least one grade is entered
    const hasGrades = this.bulkGradeForm.studentGrades.some(sg => sg.grade !== null && sg.grade >= 0);
    if (!hasGrades) {
      return false;
    }

    // Check if all entered grades are valid
    const allGradesValid = this.bulkGradeForm.studentGrades
      .filter(sg => sg.grade !== null)
      .every(sg => sg.grade! >= 0 && sg.grade! <= 20);

    return allGradesValid;
  }

  // IMPROVED: Better coefficient validation
  validateBulkCoefficient(): string {
    const coeff = this.bulkGradeForm.coefficient;
    if (coeff == null || isNaN(coeff)) return 'Veuillez saisir un coefficient valide';
    if (coeff <= 0) return 'Le coefficient doit être supérieur à 0';
    if (coeff > 10) return 'Le coefficient ne peut pas dépasser 10';
    return '';
  }

  onBulkCoefficientInput(): void {
    const error = this.validateBulkCoefficient();
    if (error) {
      this.showSnackBar(error, 'warning');
    }
  }

  saveBulkGrades(): void {
    // Validate coefficient first
    const coeffError = this.validateBulkCoefficient();
    if (coeffError) {
      this.showSnackBar(coeffError, 'warning');
      return;
    }

    if (!this.isBulkFormValid()) {
      this.showSnackBar('Veuillez remplir tous les champs obligatoires et saisir au moins une note valide', 'warning');
      return;
    }

    this.isSavingBulk = true;

    // Prepare grade creation requests
    const gradeRequests = this.bulkGradeForm.studentGrades
      .filter(sg => sg.grade !== null && sg.grade >= 0)
      .map(sg => {
        const request: CreateGradeRequest = {
          studentId: sg.student._id!,
          classId: this.filters.selectedClass,
          subjectId: this.filters.selectedSubject,
          examName: this.bulkGradeForm.examName,
          examType: this.bulkGradeForm.examType,
          grade: sg.grade!,
          coefficient: this.bulkGradeForm.coefficient,
          examDate: this.bulkGradeForm.examDate,
          trimester: this.bulkGradeForm.trimester,
          academicYear: this.filters.academicYear,
          comments: sg.comment || ''
        };
        return this.gradeService.createGrade(request);
      });

    // Execute all requests
    forkJoin(gradeRequests)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (newGrades) => {
          // Populate and add new grades to the list
          newGrades.forEach(newGrade => {
            const populatedGrade = this.populateGradeReferences(newGrade);
            this.allGrades.unshift(populatedGrade);
          });
          
          this.applyFilters();
          this.showSnackBar(
            `${newGrades.length} notes créées avec succès pour "${this.bulkGradeForm.examName}"`, 
            'success'
          );
          this.showBulkGradeForm = false;
          this.isSavingBulk = false;
          
          // Reset bulk form
          this.bulkGradeForm = {
            examName: '',
            examType: 'controle',
            coefficient: 1,
            examDate: new Date(),
            trimester: '1er Trimestre',
            studentGrades: []
          };
        },
        error: (error) => {
          console.error('Error creating bulk grades:', error);
          this.showSnackBar('Erreur lors de la création des notes', 'error');
          this.isSavingBulk = false;
        }
      });
  }

  // Helper method to populate grade references with full objects
  private populateGradeReferences(grade: Grade): Grade {
    const populatedGrade = { ...grade };
    
    // Populate student reference
    if (typeof grade.student === 'string') {
      const student = this.findStudentById(grade.student);
      if (student) {
        populatedGrade.student = student;
      }
    }
    
    // Populate subject reference
    if (typeof grade.subject === 'string') {
      const subject = this.findSubjectById(grade.subject);
      if (subject) {
        populatedGrade.subject = subject;
      }
    }
    
    // Populate class reference
    if (typeof grade.class === 'string') {
      const classObj = this.findClassById(grade.class);
      if (classObj) {
        populatedGrade.class = classObj;
      }
    }
    
    return populatedGrade;
  }

  // Helper method to find student by ID from cached students
  private findStudentById(studentId: string): User | null {
    // First check current class students
    let student = this.classStudents.find(s => s._id === studentId);
    if (student) return student;
    
    // Check all cached students from other classes
    for (const [classId, students] of this.classStudentsMap) {
      student = students.find(s => s._id === studentId);
      if (student) return student;
    }
    
    return null;
  }

  // Helper method to find subject by ID
  private findSubjectById(subjectId: string): Subject | null {
    return this.teachingSubjects.find(s => s._id === subjectId) || null;
  }

  // Helper method to find class by ID
  private findClassById(classId: string): Class | null {
    return this.classes.find(c => c._id === classId) || null;
  }
  
  onFilterChange(): void {
    // Load students and update subjects when class changes
    if (this.filters.selectedClass) {
      // Load students first, then grades
      this.loadClassStudentsAndGrades();
      this.updateAvailableSubjects();
    } else {
      this.classStudents = [];
      this.availableSubjects = [];
      // Reset subject filter when no class is selected
      this.filters.selectedSubject = '';
      // Clear grades when no class selected
      this.allGrades = [];
      this.filteredGrades = [];
      this.studentGradeSummaries = [];
    }
  }

  // NEW: Load students first, then grades to ensure filtering works correctly
  private loadClassStudentsAndGrades(): void {
    if (!this.filters.selectedClass) return;

    // Check if students are already cached
    if (this.classStudentsMap.has(this.filters.selectedClass)) {
      this.classStudents = this.classStudentsMap.get(this.filters.selectedClass)!;
      // Students are loaded, now load grades
      this.loadGrades();
      return;
    }

    // Load students from API
    this.classService.getClassStudents(this.filters.selectedClass)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.classStudents = response.students;
          // Cache the students for this class
          this.classStudentsMap.set(this.filters.selectedClass, response.students);
          
          // Now that students are loaded, load the grades
          this.loadGrades();
        },
        error: (error) => {
          console.error('Error loading class students:', error);
          this.showSnackBar('Erreur lors du chargement des étudiants', 'error');
          this.classStudents = [];
          // Still try to load grades even if students failed
          this.loadGrades();
        }
      });
  }

  // NEW: Refresh data to get current students and their grades
  refreshCurrentStudentsAndGrades(): void {
    if (!this.filters.selectedClass) return;
    
    // Clear cache to force fresh data
    this.classStudentsMap.delete(this.filters.selectedClass);
    
    // Reload students and grades
    this.loadClassStudentsAndGrades();
    
    this.showSnackBar('Données mises à jour', 'success');
  }

  onViewModeChange(mode: 'table' | 'students'): void {
    this.viewMode = mode;
  }

  openCreateGradeForm(): void {
    this.editingGrade = null;
    this.gradeInputTouched = false;
    this.gradeValidationError = '';
    this.coefficientInputTouched = false;
    this.coefficientValidationError = '';
    this.gradeForm = {
      studentId: '',
      classId: this.filters.selectedClass,
      subjectId: this.filters.selectedSubject,
      examName: '',
      examType: 'controle',
      grade: 0,
      coefficient: 1,
      examDate: new Date(),
      trimester: this.filters.selectedTrimester || '1er Trimestre',
      academicYear: this.filters.academicYear,
      comments: ''
    };
    this.showCreateForm = true;
  }

  editGrade(grade: Grade): void {
    this.editingGrade = grade;
    this.gradeInputTouched = false;
    this.gradeValidationError = '';
    this.coefficientInputTouched = false;
    this.coefficientValidationError = '';
    this.gradeForm = {
      studentId: typeof grade.student === 'string' ? grade.student : grade.student._id!,
      classId: typeof grade.class === 'string' ? grade.class : grade.class._id!,
      subjectId: typeof grade.subject === 'string' ? grade.subject : grade.subject._id!,
      examName: grade.examName,
      examType: grade.examType,
      grade: grade.grade,
      coefficient: grade.coefficient,
      examDate: grade.examDate,
      trimester: grade.trimester,
      academicYear: grade.academicYear,
      comments: grade.comments || ''
    };
    this.showCreateForm = true;
  }

  // IMPROVED: Grade validation methods with better error handling
  isGradeRangeValid(): boolean {
    const grade = this.gradeForm.grade;
    return grade >= 0 && grade <= 20 && !isNaN(grade);
  }

  onGradeInput(): void {
    this.gradeInputTouched = true;
    this.validateGradeRange();
  }

  validateGradeRange(): void {
    const grade = this.gradeForm.grade;
    
    if (isNaN(grade)) {
      this.gradeValidationError = 'Veuillez saisir un nombre valide';
    } else if (grade < 0) {
      this.gradeValidationError = 'La note ne peut pas être négative';
    } else if (grade > 20) {
      this.gradeValidationError = 'La note ne peut pas dépasser 20';
    } else {
      this.gradeValidationError = '';
    }
  }

  // NEW: Coefficient validation methods
  isCoefficientValid(): boolean {
    const coeff = this.gradeForm.coefficient;
    return coeff != null && coeff > 0 && coeff <= 10 && !isNaN(coeff);
  }

  onCoefficientInput(): void {
    this.coefficientInputTouched = true;
    this.validateCoefficient();
  }

  validateCoefficient(): void {
    const coeff = this.gradeForm.coefficient;
    
    if (coeff == null || isNaN(coeff)) {
      this.coefficientValidationError = 'Veuillez saisir un nombre valide';
    } else if (coeff <= 0) {
      this.coefficientValidationError = 'Le coefficient doit être supérieur à 0';
    } else if (coeff > 10) {
      this.coefficientValidationError = 'Le coefficient ne peut pas dépasser 10';
    } else {
      this.coefficientValidationError = '';
    }
  }

  saveGrade(): void {
    // Mark all fields as touched to show validation errors
    this.gradeInputTouched = true;
    this.coefficientInputTouched = true;
    this.validateGradeRange();
    this.validateCoefficient();

    if (!this.isFormValid()) {
      if (this.gradeValidationError) {
        this.showSnackBar(this.gradeValidationError, 'warning');
      } else if (this.coefficientValidationError) {
        this.showSnackBar(this.coefficientValidationError, 'warning');
      } else {
        this.showSnackBar('Veuillez remplir tous les champs obligatoires', 'warning');
      }
      return;
    }

    this.isLoading = true;
    
    if (this.editingGrade) {
      // Update existing grade
      const updates = {
        grade: this.gradeForm.grade,
        comments: this.gradeForm.comments
      };
      
      this.gradeService.updateGrade(this.editingGrade._id!, updates)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (updatedGrade) => {
            // Ensure the updated grade has the populated student data
            const populatedGrade = this.populateGradeReferences(updatedGrade);
            const index = this.allGrades.findIndex(g => g._id === updatedGrade._id);
            if (index !== -1) {
              this.allGrades[index] = populatedGrade;
              this.applyFilters();
            }
            this.showSnackBar('Note mise à jour avec succès', 'success');
            this.cancelForm();
            this.isLoading = false;
          },
          error: (error) => {
            console.error('Error updating grade:', error);
            this.showSnackBar('Erreur lors de la mise à jour de la note', 'error');
            this.isLoading = false;
          }
        });
    } else {
      // Create new grade
      this.gradeService.createGrade(this.gradeForm)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (newGrade) => {
            // Populate the new grade with full object references
            const populatedGrade = this.populateGradeReferences(newGrade);
            this.allGrades.unshift(populatedGrade);
            this.applyFilters();
            this.showSnackBar('Note créée avec succès', 'success');
            this.cancelForm();
            this.isLoading = false;
          },
          error: (error) => {
            console.error('Error creating grade:', error);
            this.showSnackBar('Erreur lors de la création de la note', 'error');
            this.isLoading = false;
          }
        });
    }
  }

  // FIXED: Delete confirmation modal methods
  openDeleteConfirmation(grade: Grade): void {
    this.gradeToDelete = grade;
    this.showDeleteConfirmation = true;
    this.isDeleting = false;
  }

  cancelDeleteConfirmation(): void {
    if (this.isDeleting) {
      return; // Prevent closing while deleting
    }
    
    // Reset all modal state
    this.showDeleteConfirmation = false;
    this.gradeToDelete = null;
    this.isDeleting = false;
  }

  // NEW: Force close delete modal (for emergency cases)
  forceCloseDeleteModal(): void {
    this.showDeleteConfirmation = false;
    this.gradeToDelete = null;
    this.isDeleting = false;
  }

  confirmDeleteGrade(): void {
    if (!this.gradeToDelete || this.isDeleting) {
      return;
    }

    this.isDeleting = true;
    const gradeId = this.gradeToDelete._id!;
    const studentName = this.getStudentName(this.gradeToDelete.student);
    const examName = this.gradeToDelete.examName;

    // Safety timeout to prevent modal from staying open indefinitely
    const safetyTimeout = setTimeout(() => {
      if (this.isDeleting) {
        console.warn('Delete operation timed out, force closing modal');
        this.forceCloseDeleteModal();
      }
    }, 10000); // 10 seconds timeout

    this.gradeService.deleteGrade(gradeId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          // Clear the safety timeout
          clearTimeout(safetyTimeout);
          
          // Remove the grade from the local arrays
          this.allGrades = this.allGrades.filter(g => g._id !== gradeId);
          // Re-apply filters to update the student summaries
          this.applyFilters();
          
          // Show success message with grade details
          this.showSnackBar(
            `Note de ${studentName} pour "${examName}" supprimée avec succès`, 
            'success'
          );
          
          // Reset deletion state FIRST
          this.isDeleting = false;
          this.gradeToDelete = null;
          
          // Close the modal AFTER resetting state
          this.showDeleteConfirmation = false;
        },
        error: (error) => {
          // Clear the safety timeout
          clearTimeout(safetyTimeout);
          
          console.error('Error deleting grade:', error);
          this.showSnackBar('Erreur lors de la suppression de la note', 'error');
          // Reset only the loading state on error, keep modal open for retry
          this.isDeleting = false;
          // Keep modal open on error so user can retry
        }
      });
  }

  // Legacy delete method (now replaced by modal confirmation)
  deleteGrade(grade: Grade): void {
    // This method is kept for backward compatibility but now opens the modal
    this.openDeleteConfirmation(grade);
  }

  // FIXED: Cancel form with proper state reset
  cancelForm(): void {
    this.showCreateForm = false;
    this.editingGrade = null;
    this.gradeInputTouched = false;
    this.gradeValidationError = '';
    this.coefficientInputTouched = false;
    this.coefficientValidationError = '';
  }

  // IMPROVED: Better form validation
  isFormValid(): boolean {
    const isBasicFormValid = !!(
      this.gradeForm.studentId &&
      this.gradeForm.classId &&
      this.gradeForm.subjectId &&
      this.gradeForm.examName &&
      this.gradeForm.coefficient != null &&
      this.gradeForm.coefficient > 0
    );
    
    const isGradeValid = this.isGradeRangeValid();
    const isCoefficientValid = this.isCoefficientValid();
    
    return isBasicFormValid && isGradeValid && isCoefficientValid;
  }

  // Helper methods
  getStudentName(student: User | string): string {
    if (typeof student === 'string') {
      // Try to find the student object from cached data
      const studentObj = this.findStudentById(student);
      return studentObj?.name || 'Étudiant inconnu';
    }
    return student.name || 'Étudiant inconnu';
  }

  getStudentId(student: User | string): string {
    return typeof student === 'string' ? student : student._id!;
  }

  getSubjectName(subject: Subject | string): string {
    if (typeof subject === 'string') {
      const subjectObj = this.findSubjectById(subject);
      return subjectObj?.name || 'Matière inconnue';
    }
    return subject.name || 'Matière inconnue';
  }

  getSubjectId(subject: Subject | string): string {
    return typeof subject === 'string' ? subject : subject._id!;
  }

  getClassName(classObj: Class | string): string {
    if (typeof classObj === 'string') {
      const classObjFound = this.findClassById(classObj);
      return classObjFound?.name || 'Classe inconnue';
    }
    return classObj.name || 'Classe inconnue';
  }

  getExamTypeLabel(examType: string): string {
    const examTypeObj = this.examTypes.find(et => et.value === examType);
    return examTypeObj?.label || examType;
  }

  getGradeClass(grade: number): string {
    if (grade >= 16) return 'grade-excellent';
    if (grade >= 14) return 'grade-good';
    if (grade >= 10) return 'grade-average';
    return 'grade-poor';
  }

  resetFilters(): void {
    this.filters = {
      selectedClass: '',
      selectedSubject: '',
      selectedTrimester: '',
      selectedExamType: '',
      academicYear: new Date().getFullYear().toString()
    };
    
    // Clear dependent data
    this.classStudents = [];
    this.availableSubjects = [];
    this.allGrades = [];
    this.filteredGrades = [];
    this.studentGradeSummaries = [];
  }

  private updateAvailableSubjects(): void {
    if (!this.filters.selectedClass) {
      this.availableSubjects = [];
      return;
    }

    const selectedClass = this.classes.find(c => c._id === this.filters.selectedClass);
    if (!selectedClass) {
      this.availableSubjects = [];
      return;
    }

    const currentUserId = (this.currentUser as any)?.id || this.currentUser?._id;
    if (!currentUserId) {
      this.availableSubjects = [];
      return;
    }

    // Find the teacher's subjects in this class
    const teacherSubject = selectedClass.teacherSubjects.find(ts => {
      const teacherId = typeof ts.teacher === 'string' ? ts.teacher : ts.teacher._id;
      return teacherId === currentUserId;
    });

    if (!teacherSubject?.subjects) {
      this.availableSubjects = [];
      // Reset subject filter if no subjects available
      this.filters.selectedSubject = '';
      return;
    }

    // Get the actual subject objects
    this.availableSubjects = teacherSubject.subjects
      .map(subject => {
        if (typeof subject === 'string') {
          return this.teachingSubjects.find(s => s._id === subject);
        }
        return subject;
      })
      .filter(subject => subject !== undefined) as Subject[];

    // Reset subject filter if currently selected subject is not available in this class
    if (this.filters.selectedSubject && 
        !this.availableSubjects.some(s => s._id === this.filters.selectedSubject)) {
      this.filters.selectedSubject = '';
    }

    // Auto-select subject if only one available
    if (this.availableSubjects.length === 1) {
      this.filters.selectedSubject = this.availableSubjects[0]._id!;
    }
  }

  getStudentsForSelectedClass(): User[] {
    return this.classStudents;
  }

  getAvailableSubjects(): Subject[] {
    return this.availableSubjects;
  }

  private loadClassStudents(classId: string): void {
    // Check if students are already cached
    if (this.classStudentsMap.has(classId)) {
      this.classStudents = this.classStudentsMap.get(classId)!;
      return;
    }

    this.classService.getClassStudents(classId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.classStudents = response.students;
          // Cache the students for this class
          this.classStudentsMap.set(classId, response.students);
        },
        error: (error) => {
          console.error('Error loading class students:', error);
          this.showSnackBar('Erreur lors du chargement des étudiants', 'error');
          this.classStudents = [];
        }
      });
  }

  private showSnackBar(message: string, type: 'success' | 'error' | 'warning' = 'success'): void {
    this.snackBar.open(message, 'Fermer', {
      duration: 4000,
      panelClass: [`${type}-snackbar`],
      horizontalPosition: 'right',
      verticalPosition: 'top'
    });
  }

  // Filter helper methods
  hasActiveFilters(): boolean {
    return !!(
      this.filters.selectedClass ||
      this.filters.selectedSubject ||
      this.filters.selectedTrimester ||
      this.filters.selectedExamType
    );
  }

  clearFilter(filterType: string): void {
    switch (filterType) {
      case 'class':
        this.filters.selectedClass = '';
        this.filters.selectedSubject = ''; // Clear dependent filter
        this.classStudents = [];
        this.availableSubjects = [];
        break;
      case 'subject':
        this.filters.selectedSubject = '';
        break;
      case 'trimester':
        this.filters.selectedTrimester = '';
        break;
      case 'examType':
        this.filters.selectedExamType = '';
        break;
    }
    this.onFilterChange();
  }

  // IMPROVED General confirmation modal methods
  showConfirmation(
    title: string, 
    message: string, 
    confirmAction: () => void, 
    type: 'warning' | 'danger' | 'info' = 'warning',
    confirmText: string = 'Confirmer',
    cancelText: string = 'Annuler'
  ): void {
    this.confirmationModalConfig = {
      title,
      message,
      confirmText,
      cancelText,
      confirmAction,
      type
    };
    this.showConfirmationModal = true;
  }

  confirmAction(): void {
    if (this.confirmationModalConfig.confirmAction) {
      this.confirmationModalConfig.confirmAction();
    }
    this.closeConfirmationModal();
  }

  closeConfirmationModal(): void {
    this.showConfirmationModal = false;
    this.confirmationModalConfig = {
      title: '',
      message: '',
      confirmText: 'Confirmer',
      cancelText: 'Annuler',
      confirmAction: () => {},
      type: 'warning'
    };
  }

  // Additional utility methods for improved functionality
  
  /**
   * Gets a formatted date string for display
   */
  getFormattedDate(date: Date | string): string {
    if (!date) return '';
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    return dateObj.toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  }

  /**
   * Checks if a grade is considered passing (>= 10)
   */
  isPassingGrade(grade: number): boolean {
    return grade >= 10;
  }

  /**
   * Gets the total number of grades for a specific student
   */
  getStudentGradeCount(studentId: string): number {
    return this.filteredGrades.filter(grade => 
      this.getStudentId(grade.student) === studentId
    ).length;
  }

  /**
   * Gets the class average for the current filtered grades
   */
  getFilteredClassAverage(): number {
    if (this.filteredGrades.length === 0) return 0;
    
    const totalPoints = this.filteredGrades.reduce((sum, grade) => 
      sum + (grade.grade * grade.coefficient), 0
    );
    const totalCoefficients = this.filteredGrades.reduce((sum, grade) => 
      sum + grade.coefficient, 0
    );
    
    return totalCoefficients > 0 ? totalPoints / totalCoefficients : 0;
  }

  /**
   * Exports grades data (placeholder for future implementation)
   */
  exportGrades(): void {
    // TODO: Implement grade export functionality
    this.showSnackBar('Fonctionnalité d\'export en cours de développement', 'warning');
  }

  /**
   * Handles keyboard shortcuts for common actions
   */
  onKeyboardShortcut(event: KeyboardEvent): void {
    if (event.ctrlKey) {
      switch (event.key) {
        case 'n':
          event.preventDefault();
          if (this.filters.selectedClass && this.filters.selectedSubject) {
            this.openCreateGradeForm();
          }
          break;
        case 'b':
          event.preventDefault();
          if (this.filters.selectedClass && this.filters.selectedSubject) {
            this.openBulkGradeForm();
          }
          break;
        case 'r':
          event.preventDefault();
          this.resetFilters();
          break;
      }
    }
    
    // ESC key to close modals
    if (event.key === 'Escape') {
      if (this.showCreateForm) {
        this.cancelForm();
      } else if (this.showBulkGradeForm) {
        this.cancelBulkForm();
      } else if (this.showDeleteConfirmation) {
        // Only close if not currently deleting
        if (!this.isDeleting) {
          this.cancelDeleteConfirmation();
        }
      } else if (this.showConfirmationModal) {
        this.closeConfirmationModal();
      }
    }
  }

  /**
   * Validates bulk form before submission
   */
  private validateBulkForm(): string[] {
    const errors: string[] = [];
    
    if (!this.bulkGradeForm.examName?.trim()) {
      errors.push('Le nom de l\'examen est obligatoire');
    }
    
    if (!this.bulkGradeForm.examType) {
      errors.push('Le type d\'examen est obligatoire');
    }
    
    if (this.bulkGradeForm.coefficient == null || this.bulkGradeForm.coefficient < 1) {
      errors.push('Le coefficient doit être supérieur à 0');
    }
    
    if (!this.bulkGradeForm.examDate) {
      errors.push('La date de l\'examen est obligatoire');
    }
    
    if (!this.bulkGradeForm.trimester) {
      errors.push('Le trimestre est obligatoire');
    }
    
    const validGrades = this.bulkGradeForm.studentGrades.filter(sg => 
      sg.grade !== null && sg.grade >= 0 && sg.grade <= 20
    );
    
    if (validGrades.length === 0) {
      errors.push('Au moins une note valide doit être saisie');
    }
    
    return errors;
  }

  /**
   * Gets statistics for the current grade set
   */
  getGradeStatistics(): {
    total: number;
    average: number;
    highest: number;
    lowest: number;
    passingCount: number;
    failingCount: number;
  } {
    if (this.filteredGrades.length === 0) {
      return {
        total: 0,
        average: 0,
        highest: 0,
        lowest: 0,
        passingCount: 0,
        failingCount: 0
      };
    }
    
    const grades = this.filteredGrades.map(g => g.grade);
    const average = this.getFilteredClassAverage();
    const highest = Math.max(...grades);
    const lowest = Math.min(...grades);
    const passingCount = grades.filter(g => g >= 10).length;
    const failingCount = grades.filter(g => g < 10).length;
    
    return {
      total: this.filteredGrades.length,
      average,
      highest,
      lowest,
      passingCount,
      failingCount
    };
  }
}
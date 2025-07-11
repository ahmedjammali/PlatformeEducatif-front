// teacher-grades.component.ts
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
  classStudents: User[] = []; // Students for the selected class
  classStudentsMap: Map<string, User[]> = new Map(); // Cache students by class ID
  availableSubjects: Subject[] = []; // Subjects that the teacher teaches in the selected class
  
  // UI State
  isLoading = false;
  viewMode: 'table' | 'students' = 'table';
  showCreateForm = false;
  editingGrade: Grade | null = null;
  
  // Delete confirmation modal state
  showDeleteConfirmation = false;
  gradeToDelete: Grade | null = null;
  isDeleting = false;
  
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
      // Load students for the default class
      this.loadClassStudents(this.filters.selectedClass);
      this.updateAvailableSubjects();
    }
    
    // Set default subject if only one subject
    if (this.teachingSubjects.length === 1) {
      this.filters.selectedSubject = this.teachingSubjects[0]._id!;
    }
  }

  loadGrades(): void {
  // Réinitialiser les données avant de charger
  this.allGrades = [];
  this.filteredGrades = [];
  this.studentGradeSummaries = [];

  if (!this.filters.selectedClass) {
    this.applyFilters();
    return;
  }

  this.isLoading = true;
  
  const gradeFilters = {
    academicYear: this.filters.academicYear,
    ...(this.filters.selectedTrimester && { trimester: this.filters.selectedTrimester }),
    ...(this.filters.selectedSubject && { subject: this.filters.selectedSubject }),
    ...(this.filters.selectedExamType && { examType: this.filters.selectedExamType })
  };

  this.gradeService.getGradesByClass(this.filters.selectedClass, gradeFilters)
    .pipe(takeUntil(this.destroy$))
    .subscribe({
      next: (response) => {
        console.log('Grades loaded:', response);
        this.allGrades = response.grades || []; // Assurez-vous d'avoir un tableau
        this.applyFilters();
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error loading grades:', error);
        this.showSnackBar('Erreur lors du chargement des notes', 'error');
        this.allGrades = []; // Réinitialiser en cas d'erreur
        this.applyFilters();
        this.isLoading = false;
      }
      });
  }
  applyFilters(): void {
    this.filteredGrades = this.allGrades.filter(grade => {
      return (!this.filters.selectedSubject || this.getSubjectId(grade.subject) === this.filters.selectedSubject) &&
             (!this.filters.selectedTrimester || grade.trimester === this.filters.selectedTrimester) &&
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
    // Charger les étudiants et mettre à jour les matières quand la classe change
    if (this.filters.selectedClass) {
      this.loadClassStudents(this.filters.selectedClass);
      this.updateAvailableSubjects();
    } else {
      this.classStudents = [];
      this.availableSubjects = [];
      // Réinitialiser le filtre de matière quand aucune classe n'est sélectionnée
      this.filters.selectedSubject = '';
    }
    
    // Toujours recharger les notes après le changement de filtre
    this.loadGrades();
  }

  onViewModeChange(mode: 'table' | 'students'): void {
    this.viewMode = mode;
  }

  openCreateGradeForm(): void {
    this.editingGrade = null;
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

  saveGrade(): void {
    if (!this.isFormValid()) {
      this.showSnackBar('Veuillez remplir tous les champs obligatoires', 'warning');
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

  // Delete confirmation modal methods
  openDeleteConfirmation(grade: Grade): void {
    this.gradeToDelete = grade;
    this.showDeleteConfirmation = true;
    this.isDeleting = false;
  }

  cancelDeleteConfirmation(): void {
    this.showDeleteConfirmation = false;
    this.gradeToDelete = null;
    this.isDeleting = false;
  }

  confirmDeleteGrade(): void {
    if (!this.gradeToDelete) {
      return;
    }

    this.isDeleting = true;
    const gradeId = this.gradeToDelete._id!;
    const studentName = this.getStudentName(this.gradeToDelete.student);
    const examName = this.gradeToDelete.examName;

    this.gradeService.deleteGrade(gradeId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          // Remove the grade from the local arrays
          this.allGrades = this.allGrades.filter(g => g._id !== gradeId);
          // Re-apply filters to update the student summaries
          this.applyFilters();
          
          // Show success message with grade details
          this.showSnackBar(
            `Note de ${studentName} pour "${examName}" supprimée avec succès`, 
            'success'
          );
          
          // Close the modal
          this.cancelDeleteConfirmation();
        },
        error: (error) => {
          console.error('Error deleting grade:', error);
          this.showSnackBar('Erreur lors de la suppression de la note', 'error');
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

  cancelForm(): void {
    this.showCreateForm = false;
    this.editingGrade = null;
  }

  isFormValid(): boolean {
    return !!(
      this.gradeForm.studentId &&
      this.gradeForm.classId &&
      this.gradeForm.subjectId &&
      this.gradeForm.examName &&
      this.gradeForm.grade >= 0 &&
      this.gradeForm.grade <= 20 &&
      this.gradeForm.coefficient &&
      this.gradeForm.coefficient > 0
    );
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
      duration: 3000,
      panelClass: [`${type}-snackbar`]
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
}
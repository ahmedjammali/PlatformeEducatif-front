// grades-management.component.ts
import { Component, OnInit, OnDestroy } from '@angular/core';
import { Subject, takeUntil, forkJoin } from 'rxjs';
import { GradeService } from '../../../services/grade.service';
import { ClassService } from '../../../services/class.service';
import { SubjectService } from '../../../services/subject.service';
import { UserService } from '../../../services/user.service';
import { Grade, StudentReport } from '../../../models/grader.model';
import { Class } from '../../../models/class.model';
import { Subject as SubjectModel } from '../../../models/subject.model';
import { User } from '../../../models/user.model';

@Component({
  selector: 'app-grades',
  templateUrl: './grades.component.html',
  styleUrls: ['./grades.component.css']
})
export class GradesComponent implements OnInit, OnDestroy {
  // Data
  grades: Grade[] = [];
  filteredGrades: Grade[] = [];
  paginatedGrades: Grade[] = [];
  classes: Class[] = [];
  subjects: SubjectModel[] = [];
  students: User[] = [];
  selectedGrade: Grade | null = null;
  selectedStudent: User | null = null;
  studentReport: StudentReport | null = null;

  // Filters
  selectedClass = '';
  selectedSubject = '';
  selectedTrimester = '';
  selectedExamType = '';
  selectedAcademicYear = '';
  minGrade: number | null = null;
  searchTerm = '';

  // Student view
  selectedStudentId = '';
  studentGrades: Grade[] = [];
  selectedStudentName = '';
  selectedStudentClass = '';

  // View mode
  viewMode: 'table' | 'cards' | 'student' = 'table';

  // Sorting
  sortField = 'examDate';
  sortOrder: 'asc' | 'desc' = 'desc';

  // Pagination
  currentPage = 1;
  itemsPerPage = 10;
  totalPages = 0;

  // UI State
  isLoading = false;
  isLoadingReport = false;
  showDetailsModal = false;
  showBulletinModal = false;

  // Stats
  totalGrades = 0;
  averageGrade = 0;
  studentsWithGrades = 0;
  lowGradesCount = 0;
  academicYears: string[] = [];

  private destroy$ = new Subject<void>();

  constructor(
    private gradeService: GradeService,
    private classService: ClassService,
    private subjectService: SubjectService,
    private userService: UserService
  ) {}

  ngOnInit(): void {
    this.loadInitialData();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private loadInitialData(): void {
    this.isLoading = true;

    forkJoin({
      classes: this.classService.getClasses(),
      subjects: this.subjectService.getSubjects(),
      students: this.userService.getUsers({ role: 'student' })
    }).pipe(takeUntil(this.destroy$))
    .subscribe({
      next: (data) => {
        this.classes = data.classes.classes;
        this.subjects = data.subjects;
        this.students = data.students.users;
        this.generateAcademicYears();
        this.loadAllGrades();
      },
      error: (error) => {
        console.error('Error loading initial data:', error);
        this.isLoading = false;
      }
    });
  }

  private generateAcademicYears(): void {
    const currentYear = new Date().getFullYear();
    this.academicYears = [
      `${currentYear}`,
      `${currentYear - 1}`,
      `${currentYear - 2}`
    ];
  }

  private loadAllGrades(): void {
    if (this.classes.length === 0) {
      this.isLoading = false;
      return;
    }

    // Load grades for all classes
    const gradeRequests = this.classes.map(classItem =>
      this.gradeService.getGradesByClass(classItem._id!)
    );

    forkJoin(gradeRequests)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (responses) => {
          this.grades = [];
          responses.forEach(response => {
            this.grades.push(...response.grades);
          });
          this.calculateStats();
          this.applyFilters();
          this.isLoading = false;
        },
        error: (error) => {
          console.error('Error loading grades:', error);
          this.isLoading = false;
        }
      });
  }

  private calculateStats(): void {
    this.totalGrades = this.grades.length;
    
    if (this.totalGrades > 0) {
      this.averageGrade = this.grades.reduce((sum, grade) => sum + grade.grade, 0) / this.totalGrades;
      this.lowGradesCount = this.grades.filter(grade => grade.grade < 10).length;
      
      const uniqueStudents = new Set(this.grades.map(grade => 
        typeof grade.student === 'string' ? grade.student : grade.student._id
      ));
      this.studentsWithGrades = uniqueStudents.size;
    } else {
      this.averageGrade = 0;
      this.lowGradesCount = 0;
      this.studentsWithGrades = 0;
    }
  }

  // Filter Methods
  onFilterChange(): void {
    this.currentPage = 1;
    this.applyFilters();
  }

  onSearchChange(): void {
    this.currentPage = 1;
    this.applyFilters();
  }

  resetFilters(): void {
    this.selectedClass = '';
    this.selectedSubject = '';
    this.selectedTrimester = '';
    this.selectedExamType = '';
    this.selectedAcademicYear = '';
    this.minGrade = null;
    this.searchTerm = '';
    this.currentPage = 1;
    this.applyFilters();
  }

  private applyFilters(): void {
    let filtered = [...this.grades];

    // Apply class filter
    if (this.selectedClass) {
      filtered = filtered.filter(grade => {
        const classId = typeof grade.class === 'string' ? grade.class : grade.class._id;
        return classId === this.selectedClass;
      });
    }

    // Apply subject filter
    if (this.selectedSubject) {
      filtered = filtered.filter(grade => {
        const subjectId = typeof grade.subject === 'string' ? grade.subject : grade.subject._id;
        return subjectId === this.selectedSubject;
      });
    }

    // Apply trimester filter
    if (this.selectedTrimester) {
      filtered = filtered.filter(grade => grade.trimester === this.selectedTrimester);
    }

    // Apply exam type filter
    if (this.selectedExamType) {
      filtered = filtered.filter(grade => grade.examType === this.selectedExamType);
    }

    // Apply academic year filter
    if (this.selectedAcademicYear) {
      filtered = filtered.filter(grade => grade.academicYear === this.selectedAcademicYear);
    }

    // Apply minimum grade filter
    if (this.minGrade !== null) {
      filtered = filtered.filter(grade => grade.grade >= this.minGrade!);
    }

    // Apply search filter
    if (this.searchTerm) {
      const search = this.searchTerm.toLowerCase();
      filtered = filtered.filter(grade => {
        const studentName = this.getStudentName(grade.student).toLowerCase();
        const examName = grade.examName.toLowerCase();
        const comments = (grade.comments || '').toLowerCase();
        return studentName.includes(search) || 
               examName.includes(search) || 
               comments.includes(search);
      });
    }

    this.filteredGrades = filtered;
    this.applySorting();
    this.updatePagination();
  }

  // Sorting Methods
  sortBy(field: string): void {
    if (this.sortField === field) {
      this.sortOrder = this.sortOrder === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortField = field;
      this.sortOrder = 'asc';
    }
    this.applySorting();
    this.updatePagination();
  }

  private applySorting(): void {
    this.filteredGrades.sort((a, b) => {
      let aValue: any;
      let bValue: any;

      switch (this.sortField) {
        case 'student':
          aValue = this.getStudentName(a.student).toLowerCase();
          bValue = this.getStudentName(b.student).toLowerCase();
          break;
        case 'grade':
          aValue = a.grade;
          bValue = b.grade;
          break;
        case 'examDate':
          aValue = new Date(a.examDate).getTime();
          bValue = new Date(b.examDate).getTime();
          break;
        default:
          aValue = a[this.sortField as keyof Grade];
          bValue = b[this.sortField as keyof Grade];
      }

      if (aValue < bValue) {
        return this.sortOrder === 'asc' ? -1 : 1;
      }
      if (aValue > bValue) {
        return this.sortOrder === 'asc' ? 1 : -1;
      }
      return 0;
    });
  }

  // Pagination Methods
  private updatePagination(): void {
    this.totalPages = Math.ceil(this.filteredGrades.length / this.itemsPerPage);
    const startIndex = (this.currentPage - 1) * this.itemsPerPage;
    const endIndex = startIndex + this.itemsPerPage;
    this.paginatedGrades = this.filteredGrades.slice(startIndex, endIndex);
  }

  goToPage(page: number): void {
    this.currentPage = page;
    this.updatePagination();
  }

  getPageNumbers(): number[] {
    const pages: number[] = [];
    const start = Math.max(1, this.currentPage - 2);
    const end = Math.min(this.totalPages, this.currentPage + 2);

    for (let i = start; i <= end; i++) {
      pages.push(i);
    }
    return pages;
  }

  // View Mode Methods
  setViewMode(mode: 'table' | 'cards' | 'student'): void {
    this.viewMode = mode;
    if (mode !== 'student') {
      this.selectedStudentId = '';
      this.studentGrades = [];
    }
  }

  // Student Selection Methods
  selectStudent(student: User | string): void {
    const studentId = typeof student === 'string' ? student : student._id!;
    this.selectedStudentId = studentId;
    this.selectedStudent = typeof student === 'string' ? 
      this.students.find(s => s._id === student) || null : student;
    this.setViewMode('student');
    this.onStudentSelect();
  }

  onStudentSelect(): void {
    if (!this.selectedStudentId) {
      this.studentGrades = [];
      this.selectedStudentName = '';
      this.selectedStudentClass = '';
      return;
    }

    const student = this.students.find(s => s._id === this.selectedStudentId);
    if (student) {
      this.selectedStudentName = student.name;
      this.selectedStudentClass = this.getStudentClassName(student);
    }

    this.gradeService.getGradesByStudent(this.selectedStudentId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.studentGrades = response.grades;
        },
        error: (error) => {
          console.error('Error loading student grades:', error);
        }
      });
  }

  private getStudentClassName(student: User): string {
    if (typeof student.studentClass === 'string') {
      const classObj = this.classes.find(c => c._id === student.studentClass);
      return classObj ? `${classObj.name} - ${classObj.grade}` : 'Non assigné';
    } else if (student.studentClass) {
      return `${student.studentClass.name} - ${student.studentClass.grade}`;
    }
    return 'Non assigné';
  }

  // Student View Helper Methods
  getStudentAverage(): number {
    if (this.studentGrades.length === 0) return 0;
    return this.studentGrades.reduce((sum, grade) => sum + grade.grade, 0) / this.studentGrades.length;
  }

  getStudentSubjects(): SubjectModel[] {
    const subjectIds = new Set(this.studentGrades.map(grade => 
      typeof grade.subject === 'string' ? grade.subject : grade.subject._id
    ));
    return this.subjects.filter(subject => subjectIds.has(subject._id!));
  }

  getGradesBySubject(subjectId: string): Grade[] {
    return this.studentGrades.filter(grade => {
      const gradeSubjectId = typeof grade.subject === 'string' ? grade.subject : grade.subject._id;
      return gradeSubjectId === subjectId;
    });
  }

  getSubjectAverage(subjectId: string): number {
    const subjectGrades = this.getGradesBySubject(subjectId);
    if (subjectGrades.length === 0) return 0;
    return subjectGrades.reduce((sum, grade) => sum + grade.grade, 0) / subjectGrades.length;
  }

  // Modal Methods
  viewGradeDetails(grade: Grade): void {
    this.selectedGrade = grade;
    this.showDetailsModal = true;
  }

  closeDetailsModal(): void {
    this.showDetailsModal = false;
    this.selectedGrade = null;
  }

  openBulletinModal(): void {
    if (!this.selectedStudent) {
      alert('Veuillez sélectionner un étudiant');
      return;
    }

    this.isLoadingReport = true;
    this.showBulletinModal = true;

    this.gradeService.getStudentReport(this.selectedStudent._id!, {
      academicYear: this.selectedAcademicYear || new Date().getFullYear().toString(),
      trimester: this.selectedTrimester || '1er Trimestre'
    }).pipe(takeUntil(this.destroy$))
    .subscribe({
      next: (report) => {
        this.studentReport = report;
        this.isLoadingReport = false;
      },
      error: (error) => {
        console.error('Error loading student report:', error);
        this.isLoadingReport = false;
        alert('Erreur lors du chargement du bulletin');
      }
    });
  }

  closeBulletinModal(): void {
    this.showBulletinModal = false;
    this.studentReport = null;
    this.isLoadingReport = false;
  }

  printBulletin(): void {
    window.print();
  }

  // Export Methods
  exportGrades(): void {
    if (this.filteredGrades.length === 0) return;

    const csvContent = this.generateCSV(this.filteredGrades);
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    link.setAttribute('href', url);
    link.setAttribute('download', `notes_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  private generateCSV(grades: Grade[]): string {
    const headers = [
      'Etudiant', 'Classe', 'Matiere', 'Examen', 'Type', 'Note', 
      'Coefficient', 'Trimestre', 'Année', 'Date', 'Commentaires'
    ];
    const csvRows = [headers.join(',')];

    grades.forEach(grade => {
      const row = [
        this.escapeCsvField(this.getStudentName(grade.student)),
        this.escapeCsvField(this.getClassName(grade.class)),
        this.escapeCsvField(this.getSubjectName(grade.subject)),
        this.escapeCsvField(grade.examName),
        this.escapeCsvField(this.getExamTypeLabel(grade.examType)),
        grade.grade.toString(),
        grade.coefficient.toString(),
        this.escapeCsvField(grade.trimester),
        this.escapeCsvField(grade.academicYear),
        this.escapeCsvField(this.formatDate(grade.examDate)),
        this.escapeCsvField(grade.comments || '')
      ];
      csvRows.push(row.join(','));
    });

    return csvRows.join('\n');
  }

  private escapeCsvField(field: string): string {
    if (field.includes(',') || field.includes('"') || field.includes('\n')) {
      return `"${field.replace(/"/g, '""')}"`;
    }
    return field;
  }
// Add this method to your GradesComponent class
trackByGradeId(index: number, grade: any): string {
  return grade._id || index.toString();
}
  // Utility Methods
  getStudentName(student: User | string): string {
    if (typeof student === 'string') {
      const studentObj = this.students.find(s => s._id === student);
      return studentObj ? studentObj.name : 'Étudiant inconnu';
    }
    return student.name;
  }

  getClassName(classObj: Class | string): string {
    if (typeof classObj === 'string') {
      const classData = this.classes.find(c => c._id === classObj);
      return classData ? `${classData.name} - ${classData.grade}` : 'Classe inconnue';
    }
    return `${classObj.name} - ${classObj.grade}`;
  }

getSubjectName(subject: SubjectModel | string): string {
  if (typeof subject === 'string') {
    const subjectObj = this.subjects.find(s => s._id === subject);
    return subjectObj?.name || 'Matière supprimée'; // Better label for deleted subjects
  }
  return subject?.name || 'Matière inconnue';
}

  getTeacherName(teacher: User | string): string {
    if (typeof teacher === 'string') {
      // We don't have teachers loaded, so return a placeholder
      return 'Enseignant';
    }
    return teacher.name;
  }

  getExamTypeLabel(type: string): string {
    const labels: { [key: string]: string } = {
      'controle': 'Contrôle',
      'devoir': 'Devoir',
      'examen': 'Examen',
      'test': 'Test',
      'oral': 'Oral',
      'tp': 'TP',
      'autre': 'Autre'
    };
    return labels[type] || type;
  }

  getGradeStatus(grade: number): string {
    if (grade >= 16) return 'excellent';
    if (grade >= 14) return 'good';
    if (grade >= 10) return 'average';
    return 'poor';
  }

  getGradeStatusLabel(grade: number): string {
    if (grade >= 16) return 'Excellent';
    if (grade >= 14) return 'Bien';
    if (grade >= 10) return 'Passable';
    return 'Insuffisant';
  }

  getGradePercentage(grade: number): number {
    return Math.round((grade / 20) * 100);
  }

  getAvatarColor(name: string): string {
    const colors = [
      '#ff6b6b', '#4ecdc4', '#45b7d1', '#96ceb4', '#ffeaa7',
      '#dda0dd', '#98d8c8', '#f7dc6f', '#bb8fce', '#85c1e9'
    ];
    const index = name.charCodeAt(0) % colors.length;
    return colors[index];
  }

  formatDate(dateString: Date | string): string {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  }

  formatFullDate(dateString: Date | string): string {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  }
}
// classes-management.component.ts
import { Component, OnInit, OnDestroy } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Subject, takeUntil } from 'rxjs';
import { ClassService } from '../../../services/class.service';
import { UserService } from '../../../services/user.service';
import { SubjectService } from '../../../services/subject.service';
import { ToasterService } from '../../../services/toaster.service'; // Add this import
import { Class, TeacherSubject } from '../../../models/class.model';
import { User } from '../../../models/user.model';
import { Subject as SubjectModel } from '../../../models/subject.model';

@Component({
  selector: 'app-classes',
  templateUrl: './classes.component.html',
  styleUrls: ['./classes.component.css']
})
export class ClassesComponent implements OnInit, OnDestroy {
  // Data
  classes: Class[] = [];
  filteredClasses: Class[] = [];
  subjects: SubjectModel[] = [];
  allStudents: User[] = [];
  allTeachers: User[] = [];
  availableStudents: User[] = [];
  availableTeachers: User[] = [];
  filteredAvailableStudents: User[] = [];
  classStudents: User[] = [];
  classTeachers: any[] = [];
  classDetails: { class: Class; statistics: any } | null = null;
  
  // UI State
  isLoading = false;
  isSaving = false;
  showClassModal = false;
  showStudentsModal = false;
  showTeachersModal = false;
  showDetailsModal = false;
  showDeleteModal = false; // Add this
  editingClass: Class | null = null;
  selectedClass: Class | null = null;
  classToDelete: Class | null = null; // Add this
  
  // Filters
  searchTerm = '';
  selectedGrade = '';
  selectedYear = '';
  studentSearchTerm = '';
  
  // Teacher Assignment
  selectedTeacherId = '';
  selectedSubjectIds: string[] = [];
  
  // Form
  classForm!: FormGroup;
  
  // Utility
  parseInt = parseInt;
  
  private destroy$ = new Subject<void>();

  constructor(
    private fb: FormBuilder,
    private classService: ClassService,
    private userService: UserService,
    private subjectService: SubjectService,
    private toasterService: ToasterService // Add this
  ) {
    this.initializeForm();
  }

  ngOnInit(): void {
    this.loadClasses();
    this.loadSubjects();
    this.loadAllStudents();
    this.loadAllTeachers();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private initializeForm(): void {
    this.classForm = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(2)]],
      grade: ['', Validators.required],
      academicYear: ['', Validators.required],
      isActive: [true]
    });
  }

  private loadClasses(): void {
    this.isLoading = true;
    
    this.classService.getClasses()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {

          this.classes = response.classes;
          this.applyFilters();
          this.isLoading = false;
        },
        error: (error) => {
          console.error('Error loading classes:', error);
          this.isLoading = false;
          this.toasterService.error('Erreur lors du chargement des classes');
        }
      });
  }

  private loadSubjects(): void {
    this.subjectService.getSubjects()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (subjects) => {
          this.subjects = subjects;
        },
        error: (error) => {
          console.error('Error loading subjects:', error);
          this.toasterService.error('Erreur lors du chargement des matières');
        }
      });
  }

  private loadAllStudents(): void {
    this.userService.getUsers({ role: 'student' })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.allStudents = response.users;
        },
        error: (error) => {
          console.error('Error loading students:', error);
          this.toasterService.error('Erreur lors du chargement des étudiants');
        }
      });
  }

  private loadAllTeachers(): void {
    this.userService.getUsers({ role: 'teacher' })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.allTeachers = response.users;
        },
        error: (error) => {
          console.error('Error loading teachers:', error);
          this.toasterService.error('Erreur lors du chargement des enseignants');
        }
      });
  }

  // Filter Methods
  onSearchChange(): void {
    this.applyFilters();
  }

  onFilterChange(): void {
    this.applyFilters();
  }

  resetFilters(): void {
    this.searchTerm = '';
    this.selectedGrade = '';
    this.selectedYear = '';
    this.applyFilters();
  }

  private applyFilters(): void {
    let filtered = [...this.classes];
    
    if (this.searchTerm) {
      const term = this.searchTerm.toLowerCase();
      filtered = filtered.filter(c => 
        c.name.toLowerCase().includes(term)
      );
    }
    
    if (this.selectedGrade) {
      filtered = filtered.filter(c => c.grade === this.selectedGrade);
    }
    
    if (this.selectedYear) {
      filtered = filtered.filter(c => c.academicYear === this.selectedYear);
    }
    
    this.filteredClasses = filtered;
  }

  // Modal Methods
  openCreateClassModal(): void {
    this.editingClass = null;
    this.classForm.reset({ isActive: true });
    this.showClassModal = true;
  }

  editClass(classItem: Class): void {
    this.editingClass = classItem;
    this.classForm.patchValue({
      name: classItem.name,
      grade: classItem.grade,
      academicYear: classItem.academicYear,
      isActive: classItem.isActive
    });
    this.showClassModal = true;
  }

  editClassFromDetails(): void {
    if (this.classDetails) {
      this.closeDetailsModal();
      this.editClass(this.classDetails.class);
    }
  }

  closeModal(): void {
    this.showClassModal = false;
    this.editingClass = null;
    this.classForm.reset();
  }

  saveClass(): void {
    if (this.classForm.invalid) {
      Object.keys(this.classForm.controls).forEach(key => {
        this.classForm.get(key)?.markAsTouched();
      });
      return;
    }

    this.isSaving = true;
    const formValue = this.classForm.value;

    const isEditing = this.editingClass !== null; // Store the editing state before the API call
    
    const saveObservable = this.editingClass
      ? this.classService.updateClass(this.editingClass._id!, formValue)
      : this.classService.createClass(formValue);
    
    saveObservable.pipe(takeUntil(this.destroy$)).subscribe({
      next: () => {
        this.isSaving = false;
        const message = isEditing ? 'Classe mise à jour avec succès!' : 'Classe créée avec succès!';
        this.toasterService.success(message);
        this.closeModal();
        this.loadClasses();
      },
      error: (error) => {
        console.error('Error saving class:', error);
        this.isSaving = false;
        this.toasterService.error('Erreur lors de l\'enregistrement. Veuillez réessayer.');
      }
    });
  }

  // Delete Methods - Updated
  openDeleteModal(classItem: Class): void {
    this.classToDelete = classItem;
    this.showDeleteModal = true;
  }

  closeDeleteModal(): void {
    this.showDeleteModal = false;
    this.classToDelete = null;
  }

  confirmDeleteClass(): void {
    if (!this.classToDelete) return;

    this.classService.deleteClass(this.classToDelete._id!)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.loadClasses();
          this.toasterService.success(`Classe "${this.classToDelete!.name}" supprimée avec succès!`);
          this.closeDeleteModal();
        },
        error: (error) => {
          console.error('Error deleting class:', error);
          this.toasterService.error('Erreur lors de la suppression. Veuillez réessayer.');
        }
      });
  }

  // Class Details
  viewClassDetails(classItem: Class): void {
    this.classService.getClassById(classItem._id!)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {

          this.classDetails = response;
          this.showDetailsModal = true;
        },
        error: (error) => {
          console.error('Error loading class details:', error);
          this.toasterService.error('Erreur lors du chargement des détails de la classe');
        }
      });
  }

  closeDetailsModal(): void {
    this.showDetailsModal = false;
    this.classDetails = null;
  }

  // Students Management
manageStudents(classItem: Class): void {
  this.selectedClass = classItem;
  // Refresh students data to ensure we have the latest class assignments
  this.refreshStudentsData();
  this.loadClassStudents(classItem._id!);
  this.showStudentsModal = true;
}

  private loadClassStudents(classId: string): void {
    this.classService.getClassStudents(classId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.classStudents = response.students;
          this.updateAvailableStudents();
        },
        error: (error) => {
          console.error('Error loading class students:', error);
          this.toasterService.error('Erreur lors du chargement des étudiants de la classe');
        }
      });
  }

private updateAvailableStudents(): void {
  const classStudentIds = this.classStudents.map(s => s._id);
  this.availableStudents = this.allStudents.filter(s => 
    !classStudentIds.includes(s._id) && !s.studentClass
  );
  this.filterAvailableStudents();
}

private refreshStudentsData(): void {
  this.loadAllStudents(); // This will reload the students with their current class assignments
}

  filterAvailableStudents(): void {
    if (this.studentSearchTerm) {
      const term = this.studentSearchTerm.toLowerCase();
      this.filteredAvailableStudents = this.availableStudents.filter(s =>
        s.name.toLowerCase().includes(term) ||
        s.email.toLowerCase().includes(term)
      );
    } else {
      this.filteredAvailableStudents = [...this.availableStudents];
    }
  }

addStudentToClass(student: User): void {
  if (!this.selectedClass) return;
  
  this.classService.addStudent(this.selectedClass._id!, { studentId: student._id! })
    .pipe(takeUntil(this.destroy$))
    .subscribe({
      next: () => {
        // Update local class students
        this.classStudents.push(student);
        
        // Update the global allStudents array to reflect the class assignment
        const studentIndex = this.allStudents.findIndex(s => s._id === student._id);
        if (studentIndex > -1) {
          this.allStudents[studentIndex].studentClass = this.selectedClass!._id;
        }
        
        this.updateAvailableStudents();
        
        // Update the student count in the main view
        const classIndex = this.classes.findIndex(c => c._id === this.selectedClass!._id);
        if (classIndex > -1) {
          if (!this.classes[classIndex].students) {
            this.classes[classIndex].students = [];
          }
          (this.classes[classIndex].students as string[]).push(student._id!);
          this.applyFilters();
        }
        this.toasterService.success(`${student.name} ajouté à la classe avec succès!`);
      },
      error: (error) => {
        console.error('Error adding student:', error);
        this.toasterService.error('Erreur lors de l\'ajout de l\'étudiant.');
      }
    });
}

removeStudentFromClass(student: User): void {
  if (!this.selectedClass) return;
  
  this.classService.removeStudent(this.selectedClass._id!, student._id!)
    .pipe(takeUntil(this.destroy$))
    .subscribe({
      next: () => {
        // Update local class students
        this.classStudents = this.classStudents.filter(s => s._id !== student._id);
        
        // Update the global allStudents array to remove the class assignment
        const studentIndex = this.allStudents.findIndex(s => s._id === student._id);
        if (studentIndex > -1) {
          delete this.allStudents[studentIndex].studentClass;
          // or set it to null if the property is required
          // this.allStudents[studentIndex].studentClass = null;
        }
        
        this.updateAvailableStudents();
        
        // Update the student count in the main view
        const classIndex = this.classes.findIndex(c => c._id === this.selectedClass!._id);
        if (classIndex > -1 && this.classes[classIndex].students) {
          this.classes[classIndex].students = (this.classes[classIndex].students as string[])
            .filter(id => id !== student._id);
          this.applyFilters();
        }
        this.toasterService.success(`${student.name} retiré de la classe avec succès!`);
      },
      error: (error) => {
        console.error('Error removing student:', error);
        this.toasterService.error('Erreur lors du retrait de l\'étudiant.');
      }
    });
}

  closeStudentsModal(): void {
    this.showStudentsModal = false;
    this.selectedClass = null;
    this.studentSearchTerm = '';
    this.classStudents = [];
    this.availableStudents = [];
    this.filteredAvailableStudents = [];
  }

  // Teachers Management
  manageTeachers(classItem: Class): void {
    this.selectedClass = classItem;
    this.selectedTeacherId = '';
    this.selectedSubjectIds = [];
    this.loadClassTeachers(classItem._id!);
    this.updateAvailableTeachers();
    this.showTeachersModal = true;
  }

  private loadClassTeachers(classId: string): void {
    this.classService.getClassTeachers(classId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.classTeachers = response.teachers;
          this.updateAvailableTeachers();
        },
        error: (error) => {
          console.error('Error loading class teachers:', error);
          this.toasterService.error('Erreur lors du chargement des enseignants de la classe');
        }
      });
  }

  private updateAvailableTeachers(): void {
    const assignedTeacherIds = this.classTeachers.map(t => t.teacher._id);
    this.availableTeachers = this.allTeachers.filter(t => 
      !assignedTeacherIds.includes(t._id)
    );
  }

  toggleSubjectSelection(subjectId: string): void {
    const index = this.selectedSubjectIds.indexOf(subjectId);
    if (index > -1) {
      this.selectedSubjectIds.splice(index, 1);
    } else {
      this.selectedSubjectIds.push(subjectId);
    }
  }

  assignTeacherToClass(): void {
    if (!this.selectedClass || !this.selectedTeacherId || this.selectedSubjectIds.length === 0) {
      return;
    }

    this.classService.assignTeacher(this.selectedClass._id!, {
      teacherId: this.selectedTeacherId,
      subjectIds: this.selectedSubjectIds
    }).pipe(takeUntil(this.destroy$)).subscribe({
      next: () => {
        this.loadClassTeachers(this.selectedClass!._id!);
        this.selectedTeacherId = '';
        this.selectedSubjectIds = [];
        
        // Update the teacher count in the main view
        const classIndex = this.classes.findIndex(c => c._id === this.selectedClass!._id);
        if (classIndex > -1) {
          // Refresh the class data
          this.loadClasses();
        }
        
        this.toasterService.success('Enseignant assigné avec succès!');
      },
      error: (error) => {
        console.error('Error assigning teacher:', error);
        this.toasterService.error('Erreur lors de l\'assignation de l\'enseignant.');
      }
    });
  }

  removeTeacherFromClass(teacherId: string): void {
    if (!this.selectedClass) return;
    
    const teacher = this.classTeachers.find(t => t.teacher._id === teacherId);
    const teacherName = teacher ? teacher.teacher.name : 'cet enseignant';
    
    this.classService.removeTeacher(this.selectedClass._id!, teacherId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.loadClassTeachers(this.selectedClass!._id!);
          
          // Update the teacher count in the main view
          const classIndex = this.classes.findIndex(c => c._id === this.selectedClass!._id);
          if (classIndex > -1) {
            this.loadClasses();
          }
          
          this.toasterService.success(`${teacherName} retiré de la classe avec succès!`);
        },
        error: (error) => {
          console.error('Error removing teacher:', error);
          this.toasterService.error('Erreur lors du retrait de l\'enseignant.');
        }
      });
  }

  closeTeachersModal(): void {
    this.showTeachersModal = false;
    this.selectedClass = null;
    this.selectedTeacherId = '';
    this.selectedSubjectIds = [];
    this.classTeachers = [];
    this.availableTeachers = [];
  }

  // Utility Methods
  isFieldInvalid(fieldName: string): boolean {
    const field = this.classForm.get(fieldName);
    return !!(field && field.invalid && (field.dirty || field.touched));
  }

  getSubjectsForTeacher(teacherSubject: TeacherSubject): string {
    if (!teacherSubject.subjects || teacherSubject.subjects.length === 0) {
      return 'Aucune matière';
    }
    
    return teacherSubject.subjects
      .map(s => {
        if (typeof s === 'string') {
          const subject = this.subjects.find(sub => sub._id === s);
          return subject?.name || 'Matière inconnue';
        }
        return s.name;
      })
      .join(', ');
  }

  getSubjectName(subject: any): string {
    if (!subject) return 'Matière inconnue';
    return typeof subject === 'string' 
      ? this.subjects.find(s => s._id === subject)?.name || subject
      : subject.name;
  }

  getTeacherName(teacher: any): string {
    if (!teacher) return 'Enseignant inconnu';
    return typeof teacher === 'string' 
      ? this.allTeachers.find(t => t._id === teacher)?.name || teacher
      : teacher.name;
  }

  getStudentName(student: any): string {
    if (!student) return 'Étudiant inconnu';
    return typeof student === 'string' 
      ? this.allStudents.find(s => s._id === student)?.name || student
      : student.name;
  }

  getStudentEmail(student: any): string {
    if (!student) return '';
    return typeof student === 'string' 
      ? this.allStudents.find(s => s._id === student)?.email || ''
      : student.email;
  }

  getStudentInitials(student: any): string {
    const name = this.getStudentName(student);
    return name.split(' ').map(n => n.charAt(0)).join('').toUpperCase().substring(0, 2);
  }

  // Helper method to safely get subjects array for template
  getSubjectsArray(subjects: any): any[] {
    if (!subjects) return [];
    return Array.isArray(subjects) ? subjects : [];
  }

  // Helper method to safely get students array for template
  getStudentsArray(students: any): any[] {
    if (!students) return [];
    return Array.isArray(students) ? students : [];
  }
}